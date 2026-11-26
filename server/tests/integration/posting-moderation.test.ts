import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/constants';

/**
 * Spec 012 — posting moderation. Harness mirrors public-items.test.ts:
 * in-memory replica set + full seed + demo logins per role.
 */
let replSet: MongoMemoryReplSet;
let app: Express;
let seedDatabase: (options?: { silent?: boolean }) => Promise<unknown>;
let SEED_PASSWORD = '';
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];

const tokens = new Map<string, string>();

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

async function activeLocation() {
  const location = await Location.findOne({ isActive: true }).lean();
  if (!location) throw new Error('Seed is missing an active location');
  return location;
}

async function createItem(
  role: Role,
  itemTitle: string,
): Promise<{ id: string; reportNumber: string; publicationStatus: string }> {
  const location = await activeLocation();
  const fields: Record<string, string> = {
    reportType: 'LOST',
    itemTitle,
    description: 'Moderation probe item described in enough detail.',
    privateIdentificationDetails: 'Moderation probe private detail',
    category: 'Bags',
    color: 'Black',
    brand: 'Probe',
    locationId: location._id.toString(),
    locationDetails: 'Bench outside Room 102',
    occurrenceDate: '2026-11-01T10:00:00.000Z',
  };
  let builder = request(app)
    .post('/api/v1/lost-found/items')
    .set('Authorization', bearer(role));
  Object.entries(fields).forEach(([key, value]) => {
    builder = builder.field(key, value);
  });
  const response = await builder.expect(201);
  return response.body.item;
}

function setAutoPublish(role: Role, value: boolean) {
  return request(app)
    .patch('/api/v1/moderation/settings')
    .set('Authorization', bearer(role))
    .send({ autoPublishStudentReports: value });
}

function listItems(role: Role, query = '') {
  return request(app)
    .get(`/api/v1/lost-found/items${query}`)
    .set('Authorization', bearer(role));
}

async function studentNotifications() {
  const response = await request(app)
    .get('/api/v1/notifications?limit=50')
    .set('Authorization', bearer('STUDENT'))
    .expect(200);
  return response.body.data as Array<{ type: string; titleKey?: string }>;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-spec012-moderation');
  process.env.JWT_SECRET = 'campuscare-day4-public-items-test-secret-32-plus';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.DEMO_MODE = 'true';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';
  process.env.GEMINI_API_KEY = '';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';

  await mongoose.connect(process.env.MONGODB_URI);

  ({ seedDatabase, SEED_PASSWORD } = await import('../../src/seed/seed'));
  ({ Location } = await import('../../src/modules/locations/location.model'));
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
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

describe('Spec 012 — posting moderation', () => {
  it('defaults to auto-publish ON: a student report publishes immediately', async () => {
    const settings = await request(app)
      .get('/api/v1/moderation/settings')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(settings.body.settings.autoPublishStudentReports).toBe(true);

    const item = await createItem('STUDENT', 'Moderation default-on umbrella');
    expect(item.publicationStatus).toBe('PUBLISHED');

    const browse = await listItems('EMPLOYEE', '?limit=100').expect(200);
    expect(browse.body.data.map((row: { id: string }) => row.id)).toContain(item.id);
  });

  it('forbids non-admin roles from reading or changing the setting', async () => {
    for (const role of ['LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE'] as Role[]) {
      await request(app)
        .get('/api/v1/moderation/settings')
        .set('Authorization', bearer(role))
        .expect(403);
      await setAutoPublish(role, false).expect(403);
      await request(app)
        .get('/api/v1/moderation/pending')
        .set('Authorization', bearer(role))
        .expect(403);
    }
  });

  it('with the setting OFF a student report is pending and invisible to everyone else', async () => {
    await setAutoPublish('SUPER_ADMIN', false).expect(200);

    const item = await createItem('STUDENT', 'Moderation pending red scarf');
    expect(item.publicationStatus).toBe('PENDING_APPROVAL');

    // Hidden from browse + search for another user and for the manager.
    for (const role of ['EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as Role[]) {
      const browse = await listItems(role, '?limit=100').expect(200);
      expect(browse.body.data.map((row: { id: string }) => row.id)).not.toContain(item.id);
      const search = await listItems(role, '?q=Moderation%20pending%20red%20scarf').expect(200);
      expect(search.body.total).toBe(0);
    }

    // Detail: 404 for other student-side users and the manager alike;
    // visible to the reporter and to the SUPER_ADMIN (moderation).
    await request(app)
      .get(`/api/v1/lost-found/items/${item.id}`)
      .set('Authorization', bearer('EMPLOYEE'))
      .expect(404);
    await request(app)
      .get(`/api/v1/lost-found/items/${item.id}`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(404);
    await request(app)
      .get(`/api/v1/lost-found/items/${item.id}`)
      .set('Authorization', bearer('STUDENT'))
      .expect(200);
    await request(app)
      .get(`/api/v1/lost-found/items/${item.id}`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    // The reporter still sees it in My Reports, flagged pending.
    const mine = await listItems('STUDENT', '?mine=true&limit=100').expect(200);
    const own = mine.body.data.find((row: { id: string }) => row.id === item.id);
    expect(own?.publicationStatus).toBe('PENDING_APPROVAL');

    // It sits in the SUPER_ADMIN queue.
    const pending = await request(app)
      .get('/api/v1/moderation/pending?limit=100')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(pending.body.data.map((row: { id: string }) => row.id)).toContain(item.id);
    const queued = pending.body.data.find((row: { id: string }) => row.id === item.id);
    expect(queued.reporter?.name).toBeTruthy();
  });

  it('a manager report publishes immediately even with the setting OFF', async () => {
    const item = await createItem('LOST_FOUND_MANAGER', 'Moderation manager keys');
    expect(item.publicationStatus).toBe('PUBLISHED');
    const browse = await listItems('STUDENT', '?limit=100').expect(200);
    expect(browse.body.data.map((row: { id: string }) => row.id)).toContain(item.id);
  });

  it('only the SUPER_ADMIN can approve; approval publishes and notifies the reporter', async () => {
    const item = await createItem('STUDENT', 'Moderation approve-me gloves');
    expect(item.publicationStatus).toBe('PENDING_APPROVAL');

    await request(app)
      .post(`/api/v1/moderation/items/${item.id}/approve`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(403);
    await request(app)
      .post(`/api/v1/moderation/items/${item.id}/approve`)
      .set('Authorization', bearer('STUDENT'))
      .expect(403);

    const approved = await request(app)
      .post(`/api/v1/moderation/items/${item.id}/approve`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(approved.body.item.publicationStatus).toBe('PUBLISHED');

    const browse = await listItems('EMPLOYEE', '?limit=100').expect(200);
    expect(browse.body.data.map((row: { id: string }) => row.id)).toContain(item.id);

    const notifications = await studentNotifications();
    expect(
      notifications.some((n) => n.type === 'ITEM_PUBLICATION_APPROVED'),
    ).toBe(true);

    // A second review of a no-longer-pending item conflicts.
    await request(app)
      .post(`/api/v1/moderation/items/${item.id}/approve`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(409);
  });

  it('rejection marks the item REJECTED, notifies, and keeps it hidden', async () => {
    const item = await createItem('STUDENT', 'Moderation reject-me notebook');
    expect(item.publicationStatus).toBe('PENDING_APPROVAL');

    const rejected = await request(app)
      .post(`/api/v1/moderation/items/${item.id}/reject`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(rejected.body.item.publicationStatus).toBe('REJECTED');

    const browse = await listItems('EMPLOYEE', '?limit=100').expect(200);
    expect(browse.body.data.map((row: { id: string }) => row.id)).not.toContain(item.id);
    await request(app)
      .get(`/api/v1/lost-found/items/${item.id}`)
      .set('Authorization', bearer('EMPLOYEE'))
      .expect(404);

    const mine = await listItems('STUDENT', '?mine=true&limit=100').expect(200);
    const own = mine.body.data.find((row: { id: string }) => row.id === item.id);
    expect(own?.publicationStatus).toBe('REJECTED');

    const notifications = await studentNotifications();
    expect(
      notifications.some((n) => n.type === 'ITEM_PUBLICATION_REJECTED'),
    ).toBe(true);

    // Out of the pending queue.
    const pending = await request(app)
      .get('/api/v1/moderation/pending?limit=100')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(pending.body.data.map((row: { id: string }) => row.id)).not.toContain(item.id);
  });

  it('pending items from a manual period stay in the queue after the toggle goes back ON', async () => {
    const item = await createItem('STUDENT', 'Moderation leftover pending cap');
    expect(item.publicationStatus).toBe('PENDING_APPROVAL');

    await setAutoPublish('SUPER_ADMIN', true).expect(200);

    const pending = await request(app)
      .get('/api/v1/moderation/pending?limit=100')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(pending.body.data.map((row: { id: string }) => row.id)).toContain(item.id);

    // New student reports publish immediately again.
    const fresh = await createItem('STUDENT', 'Moderation back-on bottle');
    expect(fresh.publicationStatus).toBe('PUBLISHED');
  });
});
