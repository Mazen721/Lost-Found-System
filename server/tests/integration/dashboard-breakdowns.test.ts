import type { Express } from 'express';
import mongoose, { Types } from 'mongoose';
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
let ITEM_STATUSES: (typeof import('../../src/config/constants'))['ITEM_STATUSES'];
let LOST_FOUND_CATEGORIES: (typeof import('../../src/config/constants'))['LOST_FOUND_CATEGORIES'];

const tokens = new Map<string, string>();

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

async function dashboardPayload(role: Role) {
  const response = await request(app)
    .get('/api/v1/dashboard')
    .set('Authorization', bearer(role))
    .expect(200);
  return response.body as Record<string, any>;
}

async function createItemAt(locationId: string): Promise<void> {
  const fields: Record<string, string> = {
    reportType: 'LOST',
    itemTitle: `Breakdowns probe keychain ${Date.now()}`,
    description: 'Lost near the main gate during the morning rush.',
    privateIdentificationDetails: 'Brass keyring with a blue tag',
    category: 'Keys',
    color: 'Gold',
    locationId,
    locationDetails: 'Bench by the main gate',
    occurrenceDate: '2026-11-02T09:00:00.000Z',
  };

  let builder = request(app)
    .post('/api/v1/lost-found/items')
    .set('Authorization', bearer('STUDENT'));
  Object.entries(fields).forEach(([key, value]) => {
    builder = builder.field(key, value);
  });
  await builder.expect(201);
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
  process.env.MONGODB_URI = replSet.getUri('campuscare-breakdowns');
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
  ({ DEMO_ACCOUNTS, ITEM_STATUSES, LOST_FOUND_CATEGORIES } = await import(
    '../../src/config/constants'
  ));
  ({ app } = await import('../../src/app'));

  // The breakdown assertions run against the real seeded dataset, so opt
  // into the full demo data (test seeds default to the minimal foundation).
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

describe('Spec 009 — dashboard breakdowns', () => {
  it('serves identical, complete breakdowns to Admin and Manager', async () => {
    const totalItems = await LostFoundItem.countDocuments({});
    expect(totalItems).toBeGreaterThan(0);

    const admin = await dashboardPayload('SUPER_ADMIN');
    const manager = await dashboardPayload('LOST_FOUND_MANAGER');
    expect(manager.breakdowns).toEqual(admin.breakdowns);

    const { itemsByCategory, itemsByStatus, locationsTop } = admin.breakdowns;

    // Every category is present, lost + found reconcile with the total,
    // and the category totals sum to the whole item population.
    expect(itemsByCategory.map((entry: any) => entry.category).sort()).toEqual(
      [...LOST_FOUND_CATEGORIES].sort(),
    );
    for (const entry of itemsByCategory) {
      expect(entry.total).toBe(entry.lost + entry.found);
    }
    expect(
      itemsByCategory.reduce((sum: number, entry: any) => sum + entry.total, 0),
    ).toBe(totalItems);
    const totals = itemsByCategory.map((entry: any) => entry.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));

    // Every status is present and the counts sum to the same population.
    expect(itemsByStatus.map((entry: any) => entry.status)).toEqual([
      ...ITEM_STATUSES,
    ]);
    expect(
      itemsByStatus.reduce((sum: number, entry: any) => sum + entry.count, 0),
    ).toBe(totalItems);

    // Top locations: at most five, ordered, named, and the leader's
    // count matches a direct count for that location.
    expect(locationsTop.length).toBeGreaterThan(0);
    expect(locationsTop.length).toBeLessThanOrEqual(5);
    const counts = locationsTop.map((entry: any) => entry.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    for (const entry of locationsTop) {
      expect(entry.name).toBeTruthy();
    }
    const leaderCount = await LostFoundItem.countDocuments({
      locationId: new Types.ObjectId(locationsTop[0].locationId),
    });
    expect(locationsTop[0].count).toBe(leaderCount);
  });

  it('omits breakdowns and valueStats from student and employee payloads', async () => {
    for (const role of ['STUDENT', 'EMPLOYEE'] as const) {
      const body = await dashboardPayload(role);
      expect(body).not.toHaveProperty('breakdowns');
      expect(body).not.toHaveProperty('valueStats');
      expect(JSON.stringify(body)).not.toContain('"breakdowns"');
    }
  });

  it('moves the category, status and location counts by one when an item is created', async () => {
    const before = (await dashboardPayload('LOST_FOUND_MANAGER')).breakdowns;
    const topLocationId = before.locationsTop[0].locationId as string;
    const location = await Location.findById(topLocationId).lean();
    expect(location?.isActive).toBe(true);

    await createItemAt(topLocationId);

    const after = (await dashboardPayload('LOST_FOUND_MANAGER')).breakdowns;

    const keysBefore = before.itemsByCategory.find(
      (entry: any) => entry.category === 'Keys',
    );
    const keysAfter = after.itemsByCategory.find(
      (entry: any) => entry.category === 'Keys',
    );
    expect(keysAfter.total).toBe(keysBefore.total + 1);
    expect(keysAfter.lost).toBe(keysBefore.lost + 1);

    const openBefore = before.itemsByStatus.find(
      (entry: any) => entry.status === 'OPEN',
    );
    const openAfter = after.itemsByStatus.find(
      (entry: any) => entry.status === 'OPEN',
    );
    expect(openAfter.count).toBe(openBefore.count + 1);

    const locationAfter = after.locationsTop.find(
      (entry: any) => entry.locationId === topLocationId,
    );
    expect(locationAfter?.count).toBe(before.locationsTop[0].count + 1);
  });
});
