import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/constants';

let replSet: MongoMemoryReplSet;
let app: Express;
let seedDatabase: (options?: { silent?: boolean; fullDemoData?: boolean }) => Promise<unknown>;
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let LostFoundItem: (typeof import('../../src/modules/lost-found/items/lostFoundItem.model'))['LostFoundItem'];
let ItemMatch: (typeof import('../../src/modules/lost-found/matches/itemMatch.model'))['ItemMatch'];
let ClaimRequest: (typeof import('../../src/modules/lost-found/claims/claimRequest.model'))['ClaimRequest'];

const tokens = new Map<Role, string>();

function bearer(role: Role) {
  return `Bearer ${tokens.get(role) ?? ''}`;
}

async function demoLogin(role: Role) {
  const response = await request(app).post('/api/v1/auth/demo-login').send({ role }).expect(200);
  tokens.set(role, response.body.token as string);
  return response.body.user as { id: string; role: Role };
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-roles-access');
  process.env.JWT_SECRET = 'test-only-secret-' + 'x'.repeat(24);
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.DEMO_MODE = 'true';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';
  process.env.GEMINI_API_KEY = '';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';

  await mongoose.connect(process.env.MONGODB_URI);

  ({ seedDatabase } = await import('../../src/seed/seed'));
  ({ Location } = await import('../../src/modules/locations/location.model'));
  ({ LostFoundItem } = await import('../../src/modules/lost-found/items/lostFoundItem.model'));
  ({ ItemMatch } = await import('../../src/modules/lost-found/matches/itemMatch.model'));
  ({ ClaimRequest } = await import('../../src/modules/lost-found/claims/claimRequest.model'));
  ({ app } = await import('../../src/app'));

  await seedDatabase({ silent: true, fullDemoData: true });

  for (const role of ['SUPER_ADMIN', 'LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE'] as Role[]) {
    await demoLogin(role);
  }
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

async function reportFoundItem(role: Role, title: string) {
  const location = await Location.findOne({ isActive: true }).lean();
  const response = await request(app)
    .post('/api/v1/lost-found/items')
    .set('Authorization', bearer(role))
    .field('reportType', 'FOUND')
    .field('itemTitle', title)
    .field('description', 'Found during the access-parity test run.')
    .field('privateIdentificationDetails', 'Stored at the security office')
    .field('category', 'Accessories')
    .field('color', 'Black')
    .field('locationId', location!._id.toString())
    .field('locationDetails', 'Main entrance desk')
    .field('occurrenceDate', '2026-11-03T09:00:00.000Z')
    .expect(201);
  return response.body.item as { id: string; reportNumber: string };
}

async function submitClaim(role: Role, itemId: string) {
  const response = await request(app)
    .post('/api/v1/lost-found/claims')
    .set('Authorization', bearer(role))
    .field('itemId', itemId)
    .field('claimDescription', 'This item is mine; I lost it on campus earlier this week.')
    .field('identifyingDetailsProvided', 'I can describe the unique marks on the item.')
    .expect(201);
  return response.body.claim as { id: string; status: string };
}

describe('STUDENT / EMPLOYEE parity', () => {
  const parityRoles: Role[] = ['STUDENT', 'EMPLOYEE'];
  const reportedByRole = new Map<Role, { id: string; reportNumber: string }>();

  it.each(parityRoles)('%s can demo-login with its own role', async (role) => {
    const user = await demoLogin(role);
    expect(user.role).toBe(role);
  });

  it.each(parityRoles)('%s can report a found item', async (role) => {
    const item = await reportFoundItem(role, `Parity test item reported by ${role}`);
    reportedByRole.set(role, item);
    expect(item.reportNumber).toMatch(/^LF-/);
  });

  it.each(parityRoles)('%s can browse items and open an item detail', async (role) => {
    const list = await request(app)
      .get('/api/v1/lost-found/items')
      .set('Authorization', bearer(role))
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThan(0);

    const own = reportedByRole.get(role)!;
    const detail = await request(app)
      .get(`/api/v1/lost-found/items/${own.id}`)
      .set('Authorization', bearer(role))
      .expect(200);
    expect(detail.body.item.id).toBe(own.id);
  });

  it.each(parityRoles)('%s can submit a claim for an item reported by the other role', async (role) => {
    const other: Role = role === 'STUDENT' ? 'EMPLOYEE' : 'STUDENT';
    const claim = await submitClaim(role, reportedByRole.get(other)!.id);
    expect(claim.status).toBe('PENDING_REVIEW');
  });

  it.each(parityRoles)('%s is refused manager and admin surfaces', async (role) => {
    await request(app)
      .get('/api/v1/lost-found/matches')
      .set('Authorization', bearer(role))
      .expect(403);

    await request(app).get('/api/v1/users').set('Authorization', bearer(role)).expect(403);

    await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', bearer(role))
      .expect(403);

    const claim = await ClaimRequest.findOne({ status: 'PENDING_REVIEW' }).lean();
    await request(app)
      .patch(`/api/v1/lost-found/claims/${claim!._id.toString()}/review`)
      .set('Authorization', bearer(role))
      .send({ action: 'APPROVE' })
      .expect(403);
  });
});

describe('LOST_FOUND_MANAGER access', () => {
  it('lists suggested matches and can dismiss and confirm them', async () => {
    const list = await request(app)
      .get('/api/v1/lost-found/matches?status=SUGGESTED')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(2);

    const suggested = await ItemMatch.find({ status: 'SUGGESTED' }).lean();
    const itemById = new Map(
      (await LostFoundItem.find({}).select('status').lean()).map((item) => [
        item._id.toString(),
        item.status,
      ]),
    );
    const toConfirm = suggested.find(
      (match) =>
        itemById.get(match.lostItemId.toString()) === 'OPEN' &&
        itemById.get(match.foundItemId.toString()) === 'OPEN',
    )!;
    const toDismiss = suggested.find(
      (match) => match._id.toString() !== toConfirm._id.toString(),
    )!;

    const dismissed = await request(app)
      .patch(`/api/v1/lost-found/matches/${toDismiss!._id.toString()}`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ action: 'DISMISS' })
      .expect(200);
    expect(dismissed.body.match.status).toBe('DISMISSED');

    const confirmed = await request(app)
      .patch(`/api/v1/lost-found/matches/${toConfirm!._id.toString()}`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ action: 'CONFIRM' })
      .expect(200);
    expect(confirmed.body.match.status).toBe('CONFIRMED');
  });

  it('reviews claims in the queue and records a handover', async () => {
    const queue = await request(app)
      .get('/api/v1/lost-found/claims')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    expect(queue.body.data.length).toBeGreaterThan(0);

    const pending = await ClaimRequest.findOne({ status: 'PENDING_REVIEW' }).lean();
    const reviewed = await request(app)
      .patch(`/api/v1/lost-found/claims/${pending!._id.toString()}/review`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ action: 'START_VERIFICATION' })
      .expect(200);
    expect(reviewed.body.claim.status).toBe('UNDER_VERIFICATION');

    const approved = await ClaimRequest.findOne({ status: 'APPROVED' }).lean();
    const handover = await request(app)
      .post(`/api/v1/lost-found/claims/${approved!._id.toString()}/handover`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ receivedByName: 'Youssef El-Ashry' })
      .expect(200);
    expect(handover.body.claim.status).toBe('COMPLETED');
  });

  it('can browse all reports including the archive', async () => {
    await request(app)
      .get('/api/v1/lost-found/items')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    const archived = await request(app)
      .get('/api/v1/lost-found/items?scope=archived')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    expect(archived.body.data.length).toBeGreaterThan(0);
  });

  it('is refused admin-only surfaces', async () => {
    await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(403);
    await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(403);
  });
});

describe('SUPER_ADMIN access', () => {
  it('can use every manager Lost & Found endpoint', async () => {
    await request(app)
      .get('/api/v1/lost-found/matches')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    await request(app)
      .get('/api/v1/lost-found/claims')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    await request(app)
      .get('/api/v1/lost-found/items?scope=archived')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    const pending = await ClaimRequest.findOne({ status: 'PENDING_REVIEW' }).lean();
    const reviewed = await request(app)
      .patch(`/api/v1/lost-found/claims/${pending!._id.toString()}/review`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ action: 'START_VERIFICATION' })
      .expect(200);
    expect(reviewed.body.claim.status).toBe('UNDER_VERIFICATION');
  });

  it('can use the governance endpoints', async () => {
    await request(app).get('/api/v1/users').set('Authorization', bearer('SUPER_ADMIN')).expect(200);
    await request(app)
      .get('/api/v1/locations')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
  });
});

describe('removed maintenance surface', () => {
  it.each([
    ['/api/v1/maintenance/requests'],
    ['/api/v1/maintenance/requests/new'],
    ['/api/v1/work-orders'],
    ['/api/v1/technicians'],
    ['/api/v1/maintenance/technicians'],
    ['/api/v1/maintenance/calendar'],
    ['/api/v1/feedback'],
    ['/api/v1/preventive-maintenance'],
  ])('GET %s returns 404', async (path) => {
    await request(app).get(path).set('Authorization', bearer('SUPER_ADMIN')).expect(404);
  });

  it('POST /api/v1/ai/maintenance-insights returns 404', async () => {
    await request(app)
      .post('/api/v1/ai/maintenance-insights')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ period: '7d' })
      .expect(404);
  });
});

describe('legacy role names are rejected', () => {
  it.each([['STUDENT_EMPLOYEE'], ['LOST_FOUND_OFFICER'], ['MAINTENANCE_MANAGER'], ['TECHNICIAN']])(
    'demo-login with role %s returns 400',
    async (role) => {
      await request(app).post('/api/v1/auth/demo-login').send({ role }).expect(400);
    },
  );

  it('creating a user with a legacy role returns 400', async () => {
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        name: 'Legacy Role Test',
        email: 'legacy.role@mansnu.edu.eg',
        password: 'CampusCare#2026',
        role: 'TECHNICIAN',
      })
      .expect(400);
  });
});

describe('Arabic-only API surface', () => {
  it('returns the routeNotFound message key regardless of Accept-Language', async () => {
    const response = await request(app)
      .get('/api/v1/no-such-route')
      .set('Accept-Language', 'en-US')
      .expect(404);
    expect(response.body.error.messageKey).toBe('routeNotFound');
  });

  it('serves notifications with localization keys the Arabic client renders', async () => {
    const inbox = await request(app)
      .get('/api/v1/notifications?limit=30')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);
    expect(inbox.body.data.length).toBeGreaterThan(0);
    for (const notification of inbox.body.data as Array<Record<string, unknown>>) {
      expect(typeof notification.titleKey).toBe('string');
      expect(typeof notification.messageKey).toBe('string');
    }
  });

  it('exposes exactly the four current roles in reference data', async () => {
    const meta = await request(app)
      .get('/api/v1/meta')
      .set('Authorization', bearer('STUDENT'))
      .expect(200);
    expect(meta.body.roles).toEqual(['SUPER_ADMIN', 'LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE']);
  });
});
