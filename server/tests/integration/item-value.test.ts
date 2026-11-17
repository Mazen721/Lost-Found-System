import type { Express } from 'express';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/constants';

let replSet: MongoMemoryReplSet;
let app: Express;
let seedDatabase: (options?: { silent?: boolean }) => Promise<unknown>;
let SEED_PASSWORD = '';
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let LostFoundItem: (typeof import('../../src/modules/lost-found/items/lostFoundItem.model'))['LostFoundItem'];
let ClaimRequest: (typeof import('../../src/modules/lost-found/claims/claimRequest.model'))['ClaimRequest'];
let ActivityLog: (typeof import('../../src/shared/models/ActivityLog.model'))['ActivityLog'];
let User: (typeof import('../../src/modules/auth/user.model'))['User'];
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];
let getLostFoundInsightStats: (typeof import('../../src/modules/dashboard/dashboard.service'))['getLostFoundInsightStats'];

const tokens = new Map<string, string>();

const VALUE_KEYS = [
  'estimatedValueEGP',
  'valueSource',
  'valueAdjustedBy',
  'valueAdjustedAt',
] as const;

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

function expectNoValueFields(payload: unknown) {
  const serialized = JSON.stringify(payload);
  for (const key of VALUE_KEYS) {
    expect(serialized).not.toContain(`"${key}"`);
  }
}

async function activeLocation() {
  const location = await Location.findOne({ isActive: true }).lean();
  if (!location) throw new Error('Seed is missing an active location');
  return location;
}

interface CreateItemOverrides {
  reportType?: 'LOST' | 'FOUND';
  itemTitle?: string;
  description?: string;
  category?: string;
  brand?: string;
}

async function createItem(
  role: Role,
  overrides: CreateItemOverrides = {},
): Promise<Record<string, any>> {
  const location = await activeLocation();
  const fields: Record<string, string> = {
    reportType: overrides.reportType ?? 'LOST',
    itemTitle: overrides.itemTitle ?? `Value probe backpack ${Date.now()}`,
    description:
      overrides.description ??
      'Lost near the engineering lab after the afternoon lecture.',
    privateIdentificationDetails: 'Serial SN-VALUE-1234 and a blue keychain',
    category: overrides.category ?? 'Bags',
    color: 'Black',
    locationId: location._id.toString(),
    locationDetails: 'Bench outside Room 102',
    occurrenceDate: '2026-11-01T10:00:00.000Z',
  };
  if (overrides.brand !== undefined) fields.brand = overrides.brand;

  let builder = request(app)
    .post('/api/v1/lost-found/items')
    .set('Authorization', bearer(role));
  Object.entries(fields).forEach(([key, value]) => {
    builder = builder.field(key, value);
  });

  const response = await builder.expect(201);
  return response.body.item as Record<string, any>;
}

function getItem(role: Role, id: string) {
  return request(app)
    .get(`/api/v1/lost-found/items/${id}`)
    .set('Authorization', bearer(role));
}

function adjustValue(role: Role | null, id: string, body?: unknown) {
  let builder = request(app).patch(`/api/v1/lost-found/items/${id}/value`);
  if (role) builder = builder.set('Authorization', bearer(role));
  return builder.send(body as Record<string, unknown>);
}

async function userIdByEmail(email: string): Promise<string> {
  const user = await User.findOne({ email }).lean();
  if (!user) throw new Error(`Missing user ${email}`);
  return user._id.toString();
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
  process.env.MONGODB_URI = replSet.getUri('campuscare-item-value');
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
  ({ ClaimRequest } = await import(
    '../../src/modules/lost-found/claims/claimRequest.model'
  ));
  ({ ActivityLog } = await import('../../src/shared/models/ActivityLog.model'));
  ({ User } = await import('../../src/modules/auth/user.model'));
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ getLostFoundInsightStats } = await import(
    '../../src/modules/dashboard/dashboard.service'
  ));
  ({ app } = await import('../../src/app'));

  await seedDatabase({ silent: true });

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

describe('Spec 008 — value privacy', () => {
  it('keeps value fields out of every student/employee item payload, including mutation responses', async () => {
    const created = await createItem('STUDENT', {
      itemTitle: 'Value privacy North Face backpack',
      brand: 'North Face',
    });
    expectNoValueFields(created);
    expect(created.privateIdentificationDetails).toBeTruthy();

    // The reporter's own detail view: private details yes, value no.
    const ownDetail = await getItem('STUDENT', created.id).expect(200);
    expect(ownDetail.body.item.privateIdentificationDetails).toBeTruthy();
    expectNoValueFields(ownDetail.body.item);

    const otherDetail = await getItem('EMPLOYEE', created.id).expect(200);
    expectNoValueFields(otherDetail.body.item);

    for (const role of ['STUDENT', 'EMPLOYEE'] as const) {
      const list = await request(app)
        .get('/api/v1/lost-found/items?limit=100')
        .set('Authorization', bearer(role))
        .expect(200);
      expect(list.body.total).toBeGreaterThan(0);
      expectNoValueFields(list.body);
    }

    // A student PATCH response must stay value-free too.
    const patched = await request(app)
      .patch(`/api/v1/lost-found/items/${created.id}`)
      .set('Authorization', bearer('STUDENT'))
      .send({ color: 'Green' })
      .expect(200);
    expectNoValueFields(patched.body.item);
  });

  it('shows staff the AUTO estimate on detail and list', async () => {
    const created = await createItem('STUDENT', {
      itemTitle: 'Staff visible North Face backpack',
      brand: 'North Face',
    });

    for (const role of ['LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as const) {
      const detail = await getItem(role, created.id).expect(200);
      expect(detail.body.item.estimatedValueEGP).toBe(4_000);
      expect(detail.body.item.valueSource).toBe('AUTO');
      expect(detail.body.item.valueAdjustedBy).toBeNull();
      expect(detail.body.item.valueAdjustedAt).toBeNull();
    }

    const list = await request(app)
      .get('/api/v1/lost-found/items?limit=100')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    const row = (list.body.data as Array<Record<string, any>>).find(
      (entry) => entry.id === created.id,
    );
    expect(row?.estimatedValueEGP).toBe(4_000);
    expect(row?.valueSource).toBe('AUTO');
  });

  it('keeps value fields out of claim payloads for claimants but shows them to staff', async () => {
    const found = await createItem('STUDENT', {
      reportType: 'FOUND',
      itemTitle: 'Value claim wallet',
      category: 'Wallets',
    });
    const lost = await createItem('EMPLOYEE', {
      itemTitle: 'Value claim lost wallet',
      category: 'Wallets',
    });

    const claimResponse = await request(app)
      .post('/api/v1/lost-found/claims')
      .set('Authorization', bearer('EMPLOYEE'))
      .field('itemId', found.id)
      .field('linkedLostItemId', lost.id)
      .field('claimDescription', 'This wallet is mine, I lost it near the library entrance.')
      .field('identifyingDetailsProvided', 'Brown leather with my initials inside')
      .expect(201);

    expectNoValueFields(claimResponse.body);

    const claimantView = await request(app)
      .get(`/api/v1/lost-found/claims/${claimResponse.body.claim.id}`)
      .set('Authorization', bearer('EMPLOYEE'))
      .expect(200);
    expectNoValueFields(claimantView.body);

    const managerView = await request(app)
      .get(`/api/v1/lost-found/claims/${claimResponse.body.claim.id}`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    expect(managerView.body.claim.item.estimatedValueEGP).toBe(600);
    expect(managerView.body.claim.linkedLostItem.estimatedValueEGP).toBe(600);
  });
});

describe('Spec 008 — value adjustment', () => {
  it('enforces staff-only access and input validation', async () => {
    const item = await createItem('STUDENT', {
      itemTitle: 'Adjustment guard backpack',
      brand: 'North Face',
    });

    await adjustValue(null, item.id, { valueEGP: 5_000 }).expect(401);
    await adjustValue('STUDENT', item.id, { valueEGP: 5_000 }).expect(403);
    await adjustValue('EMPLOYEE', item.id, { valueEGP: 5_000 }).expect(403);

    await adjustValue('LOST_FOUND_MANAGER', item.id, { valueEGP: 19 }).expect(400);
    await adjustValue('LOST_FOUND_MANAGER', item.id, { valueEGP: 150_001 }).expect(400);
    await adjustValue('LOST_FOUND_MANAGER', item.id, { valueEGP: 199.5 }).expect(400);
    await adjustValue('LOST_FOUND_MANAGER', item.id, {}).expect(400);
    await adjustValue('LOST_FOUND_MANAGER', item.id, { valueEGP: '5000' }).expect(400);
    await adjustValue(
      'LOST_FOUND_MANAGER',
      new Types.ObjectId().toString(),
      { valueEGP: 5_000 },
    ).expect(404);
  });

  it('adjusts the value, stamps the audit fields and writes a value-free activity log', async () => {
    const item = await createItem('STUDENT', {
      itemTitle: 'Adjustment target backpack',
      brand: 'North Face',
    });
    const managerId = await userIdByEmail(DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email);

    const response = await adjustValue('LOST_FOUND_MANAGER', item.id, {
      valueEGP: 5_000,
    }).expect(200);

    expect(response.body.item.estimatedValueEGP).toBe(5_000);
    expect(response.body.item.valueSource).toBe('ADJUSTED');
    expect(response.body.item.valueAdjustedBy).toBe(managerId);
    expect(response.body.item.valueAdjustedAt).toBeTruthy();

    const log = await ActivityLog.findOne({
      action: 'ITEM_VALUE_ADJUSTED',
      entityId: new Types.ObjectId(item.id),
    }).lean();
    expect(log).not.toBeNull();
    expect(log?.description).not.toContain('5000');
    expect(log?.description).not.toContain('5,000');
    expect((log?.params as Record<string, unknown>)?.value).toBe(5_000);
    expect((log?.metadata as Record<string, unknown>)?.previousValueEGP).toBe(4_000);

    // The adjusted value is staff-visible only; students still see nothing.
    const studentView = await getItem('STUDENT', item.id).expect(200);
    expectNoValueFields(studentView.body.item);
  });

  it('recomputes an AUTO estimate when value inputs are edited, but never an ADJUSTED one', async () => {
    const auto = await createItem('STUDENT', {
      itemTitle: 'Recompute plain backpack',
    });
    const beforeAuto = await getItem('LOST_FOUND_MANAGER', auto.id).expect(200);
    expect(beforeAuto.body.item.estimatedValueEGP).toBe(1_200);

    await request(app)
      .patch(`/api/v1/lost-found/items/${auto.id}`)
      .set('Authorization', bearer('STUDENT'))
      .send({ brand: 'North Face' })
      .expect(200);

    const afterAuto = await getItem('LOST_FOUND_MANAGER', auto.id).expect(200);
    expect(afterAuto.body.item.estimatedValueEGP).toBe(4_000);
    expect(afterAuto.body.item.valueSource).toBe('AUTO');

    const adjusted = await createItem('STUDENT', {
      itemTitle: 'Recompute locked backpack',
    });
    await adjustValue('SUPER_ADMIN', adjusted.id, { valueEGP: 7_500 }).expect(200);

    await request(app)
      .patch(`/api/v1/lost-found/items/${adjusted.id}`)
      .set('Authorization', bearer('STUDENT'))
      .send({ brand: 'North Face', itemTitle: 'Recompute locked North Face backpack' })
      .expect(200);

    const afterAdjusted = await getItem('LOST_FOUND_MANAGER', adjusted.id).expect(200);
    expect(afterAdjusted.body.item.estimatedValueEGP).toBe(7_500);
    expect(afterAdjusted.body.item.valueSource).toBe('ADJUSTED');
  });
});

describe('Spec 008 — dashboard value stats', () => {
  async function dashboardStats(role: Role) {
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', bearer(role))
      .expect(200);
    return response.body as Record<string, any>;
  }

  it('omits valueStats from the student dashboard payload', async () => {
    const body = await dashboardStats('STUDENT');
    expect(body).not.toHaveProperty('valueStats');
    expectNoValueFields(body);
  });

  it('sums current estimates with month boundaries, handover semantics and dedupe', async () => {
    const baseline = (await dashboardStats('LOST_FOUND_MANAGER')).valueStats;

    // This month: a lost iPhone 13 (28,000 AUTO), then adjusted to 31,000.
    const phone = await createItem('STUDENT', {
      itemTitle: 'Stats lost iPhone 13',
      category: 'Phones',
      brand: 'Apple',
    });
    await adjustValue('LOST_FOUND_MANAGER', phone.id, { valueEGP: 31_000 }).expect(200);

    // Last month: a lost item whose estimate we pin directly at 7,777.
    const oldLost = await createItem('STUDENT', {
      itemTitle: 'Stats old lost umbrella',
      category: 'Accessories',
    });
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(15);
    // Raw collection write: Mongoose marks createdAt immutable, and
    // backdating a fixture is exactly the case that must bypass it.
    await LostFoundItem.collection.updateOne(
      { _id: new Types.ObjectId(oldLost.id) },
      { $set: { createdAt: lastMonth, estimatedValueEGP: 7_777 } },
    );

    // A found item reported LAST month but handed over THIS month.
    const foundOld = await createItem('EMPLOYEE', {
      reportType: 'FOUND',
      itemTitle: 'Stats old found keys',
      category: 'Keys',
    });
    await LostFoundItem.collection.updateOne(
      { _id: new Types.ObjectId(foundOld.id) },
      { $set: { createdAt: lastMonth, estimatedValueEGP: 4_444 } },
    );

    const managerId = await userIdByEmail(DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email);
    const claimantId = await userIdByEmail(DEMO_ACCOUNTS.STUDENT.email);
    let claimSeq = 0;
    const insertCompletedClaim = async (
      itemId: string,
      handover: Record<string, unknown> | undefined,
      updatedAt?: Date,
    ) => {
      claimSeq += 1;
      const claim = await ClaimRequest.create({
        claimNumber: `CLM-STAT-${claimSeq}`,
        itemId: new Types.ObjectId(itemId),
        claimantId: new Types.ObjectId(claimantId),
        claimDescription: 'Stats fixture claim for a completed handover.',
        identifyingDetailsProvided: 'Fixture identifying details',
        status: 'COMPLETED',
        reviewedBy: new Types.ObjectId(managerId),
        handover,
      });
      if (updatedAt) {
        await ClaimRequest.updateOne(
          { _id: claim._id },
          { $set: { updatedAt } },
          { timestamps: false },
        );
      }
      return claim;
    };

    await insertCompletedClaim(foundOld.id, {
      receivedByName: 'Stats Receiver',
      handedOverBy: new Types.ObjectId(managerId),
      handedOverAt: new Date(),
    });
    // A second completed claim for the SAME item must not double-count.
    await insertCompletedClaim(foundOld.id, {
      receivedByName: 'Stats Receiver',
      handedOverBy: new Types.ObjectId(managerId),
      handedOverAt: new Date(),
    });
    // Legacy completed claim: no handover timestamp → updatedAt buckets it.
    const legacyItem = await createItem('EMPLOYEE', {
      reportType: 'FOUND',
      itemTitle: 'Stats legacy found book',
      category: 'Books',
    });
    await LostFoundItem.updateOne(
      { _id: new Types.ObjectId(legacyItem.id) },
      { $set: { estimatedValueEGP: 900 } },
    );
    await insertCompletedClaim(legacyItem.id, {}, new Date());

    const managerStats = (await dashboardStats('LOST_FOUND_MANAGER')).valueStats;
    const adminStats = (await dashboardStats('SUPER_ADMIN')).valueStats;
    expect(adminStats).toEqual(managerStats);

    expect(managerStats.lostValueThisMonthEGP).toBe(
      baseline.lostValueThisMonthEGP + 31_000,
    );
    expect(managerStats.totalLostValueEGP).toBe(
      baseline.totalLostValueEGP + 31_000 + 7_777,
    );
    expect(managerStats.returnedValueThisMonthEGP).toBe(
      baseline.returnedValueThisMonthEGP + 4_444 + 900,
    );
    expect(managerStats.totalReturnedValueEGP).toBe(
      baseline.totalReturnedValueEGP + 4_444 + 900,
    );
  });

  it('keeps value aggregates out of the AI insight stats', async () => {
    const { stats } = await getLostFoundInsightStats('7d', 'ADMIN');
    const serialized = JSON.stringify(stats);
    expect(serialized).not.toContain('valueStats');
    expect(serialized).not.toContain('estimatedValueEGP');
  });
});
