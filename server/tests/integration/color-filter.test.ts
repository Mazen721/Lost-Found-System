import type { Express } from 'express';
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
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let LostFoundItem: (typeof import('../../src/modules/lost-found/items/lostFoundItem.model'))['LostFoundItem'];
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];

const tokens = new Map<string, string>();

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

async function listByColor(
  role: Role,
  color: string,
  pageParams: { limit?: number; page?: number } = {},
): Promise<{ ids: string[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(pageParams.limit ?? 100),
    color,
  });
  if (pageParams.page) params.set('page', String(pageParams.page));
  const response = await request(app)
    .get(`/api/v1/lost-found/items?${params.toString()}`)
    .set('Authorization', bearer(role))
    .expect(200);
  const body = response.body as {
    data: Array<{ id: string }>;
    total: number;
  };
  return { ids: body.data.map((item) => item.id).sort(), total: body.total };
}

async function createItem(color: string): Promise<string> {
  const location = await Location.findOne({ isActive: true }).lean();
  if (!location) throw new Error('Seed is missing an active location');
  const fields: Record<string, string> = {
    reportType: 'FOUND',
    itemTitle: `Color probe wallet ${Date.now()}`,
    description: 'Found on a bench outside the central library.',
    privateIdentificationDetails: 'Library card sleeve in the back pocket',
    category: 'Wallets',
    color,
    locationId: location._id.toString(),
    locationDetails: 'Bench outside the library',
    occurrenceDate: '2026-11-03T08:30:00.000Z',
  };

  let builder = request(app)
    .post('/api/v1/lost-found/items')
    .set('Authorization', bearer('STUDENT'));
  Object.entries(fields).forEach(([key, value]) => {
    builder = builder.field(key, value);
  });
  const response = await builder.expect(201);
  return (response.body.item as { id: string }).id;
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
  process.env.MONGODB_URI = replSet.getUri('campuscare-color-filter');
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
  ({ Location } = await import('../../src/modules/locations/location.model'));
  ({ LostFoundItem } = await import(
    '../../src/modules/lost-found/items/lostFoundItem.model'
  ));
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ app } = await import('../../src/app'));

  // The spelling battery runs against the real seeded dataset.
  await seedDatabase({ silent: true, fullDemoData: true });

  const roles: Role[] = ['SUPER_ADMIN', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'STUDENT'];
  for (const role of roles) {
    const response = await login(DEMO_ACCOUNTS[role].email, SEED_PASSWORD).expect(200);
    tokens.set(role, response.body.token as string);
  }
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

describe('Spec 010 — Arabic-aware color filter', () => {
  it('treats «فضي», «سيلفر», "Silver" and "silver" as the same filter on seeded data', async () => {
    const expectedTotal = await LostFoundItem.countDocuments({
      colorGroup: 'silver',
    });
    expect(expectedTotal).toBeGreaterThan(0);

    const english = await listByColor('STUDENT', 'Silver');
    expect(english.total).toBe(expectedTotal);

    for (const spelling of ['silver', 'فضي', 'سيلفر']) {
      const result = await listByColor('STUDENT', spelling);
      expect(result.total).toBe(expectedTotal);
      expect(result.ids).toEqual(english.ids);
    }
  });

  it('matches navy and grey across Arabic spellings and shades', async () => {
    const navyEnglish = await listByColor('STUDENT', 'Navy');
    expect(navyEnglish.total).toBeGreaterThan(0);
    for (const spelling of ['كحلي', 'أزرق غامق']) {
      const result = await listByColor('STUDENT', spelling);
      expect(result.ids).toEqual(navyEnglish.ids);
    }

    const blackEnglish = await listByColor('STUDENT', 'Black');
    expect(blackEnglish.total).toBeGreaterThan(0);
    const blackArabic = await listByColor('STUDENT', 'اسود');
    expect(blackArabic.ids).toEqual(blackEnglish.ids);

    const greyEnglish = await listByColor('STUDENT', 'Grey');
    expect(greyEnglish.total).toBeGreaterThan(0);
    const greyArabic = await listByColor('STUDENT', 'رمادي');
    expect(greyArabic.ids).toEqual(greyEnglish.ids);
  });

  it('returns an empty 200 list for a color nobody reported', async () => {
    const result = await listByColor('STUDENT', 'مخطط منقط');
    expect(result.total).toBe(0);
    expect(result.ids).toEqual([]);
  });

  it('keeps pagination totals on the group filter', async () => {
    const full = await listByColor('STUDENT', 'فضي');
    const page = await listByColor('STUDENT', 'فضي', { limit: 2, page: 1 });
    expect(page.total).toBe(full.total);
    expect(page.ids).toHaveLength(Math.min(2, full.total));
  });

  it('stores colorGroup on create and recomputes it when the color is edited', async () => {
    const id = await createItem('Silver');

    const created = await LostFoundItem.findById(id).select('color colorGroup').lean();
    expect(created?.colorGroup).toBe('silver');
    const silverHits = await listByColor('STUDENT', 'فضي');
    expect(silverHits.ids).toContain(id);

    await request(app)
      .patch(`/api/v1/lost-found/items/${id}`)
      .set('Authorization', bearer('STUDENT'))
      .send({ color: 'Black' })
      .expect(200);

    const updated = await LostFoundItem.findById(id).select('color colorGroup').lean();
    expect(updated?.colorGroup).toBe('black');

    const blackHits = await listByColor('STUDENT', 'اسود');
    expect(blackHits.ids).toContain(id);
    const silverAfter = await listByColor('STUDENT', 'فضي');
    expect(silverAfter.ids).not.toContain(id);
  });
});
