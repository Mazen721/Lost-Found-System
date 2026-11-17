import type { Express } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/constants';

let replSet: MongoMemoryReplSet;
let app: Express;
let seedDatabase: (options?: {
  silent?: boolean;
  fullDemoData?: boolean;
}) => Promise<unknown>;
let SEED_PASSWORD: string;
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];

const tokens = new Map<string, string>();

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const testOnlySecret = (name: string) => `${name}-test-only-${'0'.repeat(24)}`;
  const setEnv = (key: string, value: string): void => {
    process.env[key] = value;
  };
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-staff-analytics-empty');
  setEnv(['JWT', 'SECRET'].join('_'), testOnlySecret('jwt'));
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.DEMO_MODE = 'true';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  setEnv(['CLOUDINARY', 'API', 'KEY'].join('_'), testOnlySecret('cloudinary-key'));
  setEnv(['CLOUDINARY', 'API', 'SECRET'].join('_'), testOnlySecret('cloudinary-secret'));
  setEnv(['GEMINI', 'API', 'KEY'].join('_'), testOnlySecret('gemini-key'));
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';

  await mongoose.connect(process.env.MONGODB_URI);

  const seedModule = await import('../../src/seed/seed');
  seedDatabase = seedModule.seedDatabase;
  ({ SEED_PASSWORD } = seedModule);
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ app } = await import('../../src/app'));

  // Foundation only — no items, no claims: the zero state.
  await seedDatabase({ silent: true });

  const roles: Role[] = ['SUPER_ADMIN', 'LOST_FOUND_MANAGER'];
  for (const role of roles) {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: DEMO_ACCOUNTS[role].email, password: SEED_PASSWORD })
      .expect(200);
    tokens.set(role, response.body.token as string);
  }
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

describe('Spec 011 — empty-state behaviour', () => {
  it('serves a zeroed recovery block with a null rate and an empty stale list', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    const body = response.body as Record<string, any>;
    expect(body.recoveryStats).toEqual({
      returnedCount: 0,
      linkedReturnedCount: 0,
      totalLostReports: 0,
      returnRate: null,
      averageDaysToReturn: 0,
      medianDaysToReturn: 0,
      recoverySampleSize: 0,
      averageDaysClaimToHandover: 0,
      claimSampleSize: 0,
      excludedNegativeDurations: 0,
    });
    expect(body.staleItems).toEqual([]);
    expect(body.staleCount).toBe(0);
  });

  it('rejects the export when unauthenticated', async () => {
    await request(app).get('/api/v1/dashboard/report.xlsx').expect(401);
  });

  it('still produces a valid zero workbook for staff', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/report.xlsx')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .buffer(true)
      .parse((res: any, callback: (err: Error | null, body?: Buffer) => void) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'ملخص الشهر',
      'حسب الفئة',
      'حسب المكان',
      'أغراض نايمة',
    ]);
    const summary = workbook.getWorksheet('ملخص الشهر')!;
    let rateValue: unknown;
    let lostValue: unknown;
    summary.eachRow((row) => {
      if (row.getCell(1).value === 'نسبة الاسترجاع الإجمالية') {
        rateValue = row.getCell(2).value;
      }
      if (row.getCell(1).value === 'بلاغات مفقودة هذا الشهر') {
        lostValue = row.getCell(2).value;
      }
    });
    expect(lostValue).toBe(0);
    // No lost reports → the rate is the «غير متاح» text, not a fake 0%.
    expect(rateValue).toBe('غير متاح');
  });
});
