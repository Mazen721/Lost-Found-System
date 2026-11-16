import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../src/config/constants';

let replSet: MongoMemoryReplSet;
let app: Express;
let seedDatabase: (options?: { silent?: boolean }) => Promise<unknown>;
let SEED_PASSWORD: string;
let User: (typeof import('../../src/modules/auth/user.model'))['User'];
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let Notification: (typeof import('../../src/shared/models/Notification.model'))['Notification'];
let ActivityLog: (typeof import('../../src/shared/models/ActivityLog.model'))['ActivityLog'];
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];

const tokens = new Map<Role, string>();

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

function bearer(role: Role) {
  return `Bearer ${tokens.get(role)}`;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-day2');
  process.env.JWT_SECRET = 'campuscare-day2-test-secret-with-32-plus-characters';
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
  ({ User } = await import('../../src/modules/auth/user.model'));
  ({ Location } = await import('../../src/modules/locations/location.model'));
  ({ Notification } = await import('../../src/shared/models/Notification.model'));
  ({ ActivityLog } = await import('../../src/shared/models/ActivityLog.model'));
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ app } = await import('../../src/app'));

  await seedDatabase({ silent: true });

  const roles: Role[] = ['SUPER_ADMIN', 'LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE'];

  for (const role of roles) {
    const response = await login(DEMO_ACCOUNTS[role].email, SEED_PASSWORD).expect(200);
    tokens.set(role, response.body.token as string);
  }
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

describe('Day 2 locations', () => {
  let locationId: string;

  it('lists active locations for any signed-in user', async () => {
    const response = await request(app)
      .get('/api/v1/locations?limit=100')
      .set('Authorization', bearer('STUDENT'))
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(20);
    expect(response.body.data.every((location: { isActive: boolean }) => location.isActive)).toBe(
      true,
    );
  });

  it('refuses location management to a student', async () => {
    await request(app)
      .post('/api/v1/locations')
      .set('Authorization', bearer('STUDENT'))
      .send({
        buildingName: 'Forbidden Building',
        floor: '1',
        room: '101',
        locationType: 'ROOM',
      })
      .expect(403);
  });

  it('creates a location as Admin and refuses a duplicate combination', async () => {
    const response = await request(app)
      .post('/api/v1/locations')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        buildingName: 'Innovation & Robotics Center',
        buildingNameAr: 'مركز الابتكار والروبوتات',
        floor: 'Ground Floor',
        room: 'R01',
        locationType: 'LAB',
        description: 'Robotics fabrication and testing lab',
      })
      .expect(201);

    locationId = response.body.location.id as string;
    expect(response.body.location.isActive).toBe(true);

    await request(app)
      .post('/api/v1/locations')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        buildingName: 'Innovation & Robotics Center',
        buildingNameAr: 'مركز الابتكار والروبوتات',
        floor: 'Ground Floor',
        room: 'R01',
        locationType: 'LAB',
      })
      .expect(409);
  });

  it('edits a location and deactivates it instead of removing the record', async () => {
    const updated = await request(app)
      .patch(`/api/v1/locations/${locationId}`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ description: 'Robotics fabrication, testing and student projects lab' })
      .expect(200);

    expect(updated.body.location.description).toContain('student projects');

    const deactivated = await request(app)
      .delete(`/api/v1/locations/${locationId}`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(deactivated.body.location.isActive).toBe(false);
    expect(await Location.countDocuments({ _id: locationId })).toBe(1);
  });

  it('hides inactive locations from non-admins and includes them for Admin when requested', async () => {
    const student = await request(app)
      .get('/api/v1/locations?includeInactive=true&limit=100')
      .set('Authorization', bearer('STUDENT'))
      .expect(200);

    expect(
      student.body.data.some((location: { id: string }) => location.id === locationId),
    ).toBe(false);

    const admin = await request(app)
      .get('/api/v1/locations?includeInactive=true&limit=100')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(admin.body.data.some((location: { id: string }) => location.id === locationId)).toBe(
      true,
    );
  });

  it('records location changes in the immutable activity log', async () => {
    const actions = await ActivityLog.find({ entityType: 'Location' }).distinct('action');
    expect(actions).toEqual(
      expect.arrayContaining(['LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_DEACTIVATED']),
    );
  });
});

describe('Day 2 users', () => {
  let employeeId: string; // employee account created by the users suite
  let otherStudentId: string;

  it('lets Admin list users without password hashes and refuses a student', async () => {
    const response = await request(app)
      .get('/api/v1/users?limit=100')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(4);
    expect(
      response.body.data.every(
        (user: Record<string, unknown>) => !('passwordHash' in user),
      ),
    ).toBe(true);

    await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer('STUDENT'))
      .expect(403);

    await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(403);
  });

  it('creates and edits an employee account as Admin', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        name: 'Nour El-Haddad',
        email: 'n.elhaddad@mansnu.edu.eg',
        password: 'CampusCare#2026',
        role: 'EMPLOYEE',
        department: 'Student Affairs Department',
        contactPhone: '+20 100 555 0177',
      })
      .expect(201);

    employeeId = response.body.user.id as string;
    expect(response.body.user.role).toBe('EMPLOYEE');
    expect(response.body.user).not.toHaveProperty('passwordHash');

    const updated = await request(app)
      .patch(`/api/v1/users/${employeeId}`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ department: 'Information Technology & Digital Transformation Unit' })
      .expect(200);

    expect(updated.body.user.department).toBe(
      'Information Technology & Digital Transformation Unit',
    );
  });

  it('creates a second student for ownership checks', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        name: 'Mariam Fathy',
        email: 'm.fathy@std.mansnu.edu.eg',
        password: 'CampusCare#2026',
        role: 'STUDENT',
        department: 'Faculty of Commerce',
      })
      .expect(201);

    otherStudentId = response.body.user.id as string;
    expect(otherStudentId).toMatch(/^[a-f\d]{24}$/i);
  });

  it('refuses a duplicate email address', async () => {
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({
        name: 'Duplicate Account',
        email: DEMO_ACCOUNTS.STUDENT.email,
        password: 'CampusCare#2026',
        role: 'STUDENT',
      })
      .expect(409);
  });

  it('deactivates and reactivates an account through the status endpoint', async () => {
    await request(app)
      .patch(`/api/v1/users/${employeeId}/status`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ isActive: false })
      .expect(200);

    await login('n.elhaddad@mansnu.edu.eg', 'CampusCare#2026').expect(401);

    await request(app)
      .patch(`/api/v1/users/${employeeId}/status`)
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ isActive: true })
      .expect(200);

    await login('n.elhaddad@mansnu.edu.eg', 'CampusCare#2026').expect(200);
  });

  it('logs every user change', async () => {
    const actions = await ActivityLog.find({ entityType: 'User' }).distinct('action');
    expect(actions).toEqual(
      expect.arrayContaining(['USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_ACTIVATED']),
    );
  });
});

describe('Day 2 reference data', () => {
  it('returns Lost & Found categories, statuses and matching thresholds to any user', async () => {
    const response = await request(app)
      .get('/api/v1/meta')
      .set('Authorization', bearer('STUDENT'))
      .expect(200);

    expect(response.body.roles).toEqual(['SUPER_ADMIN', 'LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE']);
    expect(response.body.lostFoundCategories).toContain('Phones');
    expect(response.body.itemStatuses).toContain('OPEN');
    expect(response.body.claimStatuses).toContain('PENDING_REVIEW');
    expect(response.body.matching.thresholds).toEqual({ STRONG: 80, POSSIBLE: 60 });
    expect(response.body.uploads.maxImages).toBe(3);
    expect(response.body).not.toHaveProperty('maintenanceCategories');
    expect(response.body).not.toHaveProperty('priorities');
    expect(response.body).not.toHaveProperty('requestStatuses');
  });

  it('requires authentication for reference data', async () => {
    await request(app).get('/api/v1/meta').expect(401);
  });
});

describe('Day 2 notifications', () => {
  let managerNotificationId: string;

  async function reportFoundItem(title: string) {
    const location = await Location.findOne({ isActive: true }).lean();
    const response = await request(app)
      .post('/api/v1/lost-found/items')
      .set('Authorization', bearer('STUDENT'))
      .field('reportType', 'FOUND')
      .field('itemTitle', title)
      .field('description', 'Found near the central library entrance.')
      .field('privateIdentificationDetails', 'Kept at the security office desk')
      .field('category', 'Accessories')
      .field('color', 'Brown')
      .field('locationDetails', 'Bench by the main entrance')
      .field('locationId', location!._id.toString())
      .field('occurrenceDate', '2026-11-02T09:00:00.000Z')
      .expect(201);
    return response.body.item as { id: string; reportNumber: string };
  }

  async function claimAsEmployee(itemId: string) {
    await request(app)
      .post('/api/v1/lost-found/claims')
      .set('Authorization', bearer('EMPLOYEE'))
      .field('itemId', itemId)
      .field('claimDescription', 'This item belongs to me; I lost it near the library earlier today.')
      .field('identifyingDetailsProvided', 'Brown leather with a brass clasp and my initials inside.')
      .expect(201);
  }

  it('lists only the signed-in user notifications with an unread count', async () => {
    const first = await reportFoundItem('Brown leather wallet for notification checks');
    const second = await reportFoundItem('Silver key ring for notification checks');
    await claimAsEmployee(first.id);
    await claimAsEmployee(second.id);

    const managerInbox = await request(app)
      .get('/api/v1/notifications?limit=30')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(managerInbox.body.unreadCount).toBeGreaterThanOrEqual(2);
    managerNotificationId = managerInbox.body.data[0].id as string;

    const studentInbox = await request(app)
      .get('/api/v1/notifications?limit=30')
      .set('Authorization', bearer('STUDENT'))
      .expect(200);

    const managerIds = new Set(
      managerInbox.body.data.map((notification: { id: string }) => notification.id),
    );
    expect(
      studentInbox.body.data.every(
        (notification: { id: string }) => !managerIds.has(notification.id),
      ),
    ).toBe(true);
  });

  it('marks one notification as read for its owner only', async () => {
    await request(app)
      .patch(`/api/v1/notifications/${managerNotificationId}/read`)
      .set('Authorization', bearer('STUDENT'))
      .expect(404);

    const response = await request(app)
      .patch(`/api/v1/notifications/${managerNotificationId}/read`)
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(response.body.notification.isRead).toBe(true);
  });

  it('marks all notifications as read and updates the unread count', async () => {
    const before = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(before.body.unreadCount).toBeGreaterThan(0);

    const result = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(result.body.updated).toBeGreaterThan(0);

    const after = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(after.body.unreadCount).toBe(0);
    expect(after.body.data).toHaveLength(0);
  });

  it('returns 400 for an invalid notification id', async () => {
    await request(app)
      .patch('/api/v1/notifications/not-an-id/read')
      .set('Authorization', bearer('STUDENT'))
      .expect(400);
  });

  it('stores notifications with links the client can follow', async () => {
    const notification = await Notification.findOne({
      type: 'CLAIM_SUBMITTED',
    });

    expect(notification).not.toBeNull();
    expect(notification?.linkUrl).toMatch(/^\/lost-found\/claims\//);
  });
});

describe('Day 2 persistence checks', () => {
  it('keeps seeded Lost & Found items consistent', async () => {
    const documents = await mongoose.connection
      .collection('lostfounditems')
      .find({})
      .toArray();

    expect(documents.length).toBeGreaterThanOrEqual(2);
    expect(documents.every((document) => document.reportNumber.startsWith('LF-'))).toBe(true);
    expect(
      documents.every((document) => ['LOST', 'FOUND'].includes(document.reportType)),
    ).toBe(true);
  });
});
