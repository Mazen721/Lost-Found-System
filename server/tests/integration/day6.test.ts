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
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];
let Location: (typeof import('../../src/modules/locations/location.model'))['Location'];
let User: (typeof import('../../src/modules/auth/user.model'))['User'];
let LostFoundItem: (typeof import('../../src/modules/lost-found/items/lostFoundItem.model'))['LostFoundItem'];
let ClaimRequest: (typeof import('../../src/modules/lost-found/claims/claimRequest.model'))['ClaimRequest'];
let Notification: (typeof import('../../src/shared/models/Notification.model'))['Notification'];
let ActivityLog: (typeof import('../../src/shared/models/ActivityLog.model'))['ActivityLog'];
let AiInsightCache: (typeof import('../../src/modules/ai/aiInsightCache.model'))['AiInsightCache'];
let Counter: (typeof import('../../src/shared/models/Counter.model'))['Counter'];
let generateLostFoundInsights: (typeof import('../../src/modules/ai/lostFoundInsights.service'))['generateLostFoundInsights'];
let generateAdminInsights: (typeof import('../../src/modules/ai/lostFoundInsights.service'))['generateAdminInsights'];
let parseInsightsContent: (typeof import('../../src/modules/ai/ai.validation'))['parseInsightsContent'];

const tokens = new Map<Role, string>();
let managerId = '';
let adminId = '';

function bearer(role: Role): string {
  return `Bearer ${tokens.get(role) ?? ''}`;
}

function login(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

function uniqueTitle(label: string): string {
  return `${label} ${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function activeLocationId(): Promise<string> {
  const location = await Location.findOne({ isActive: true }).select('_id').lean();
  if (!location) throw new Error('Seed is missing an active location');
  return location._id.toString();
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-day6');
  process.env.JWT_SECRET = 'campuscare-day6-test-secret-with-32-plus-characters';
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
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ Location } = await import('../../src/modules/locations/location.model'));
  ({ User } = await import('../../src/modules/auth/user.model'));
  ({ LostFoundItem } = await import(
    '../../src/modules/lost-found/items/lostFoundItem.model'
  ));
  ({ ClaimRequest } = await import(
    '../../src/modules/lost-found/claims/claimRequest.model'
  ));
  ({ Notification } = await import('../../src/shared/models/Notification.model'));
  ({ ActivityLog } = await import('../../src/shared/models/ActivityLog.model'));
  ({ AiInsightCache } = await import('../../src/modules/ai/aiInsightCache.model'));
  ({ Counter } = await import('../../src/shared/models/Counter.model'));
  ({ generateLostFoundInsights, generateAdminInsights } = await import(
    '../../src/modules/ai/lostFoundInsights.service'
  ));
  ({ parseInsightsContent } = await import('../../src/modules/ai/ai.validation'));
  ({ app } = await import('../../src/app'));

  await seedDatabase({ silent: true, fullDemoData: true });

  const roles: Role[] = ['SUPER_ADMIN', 'LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE'];

  for (const role of roles) {
    const response = await login(DEMO_ACCOUNTS[role].email, SEED_PASSWORD).expect(200);
    tokens.set(role, response.body.token as string);
    if (role === 'SUPER_ADMIN') adminId = response.body.user.id as string;
    if (role === 'LOST_FOUND_MANAGER') managerId = response.body.user.id as string;
  }
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

describe('Day 6 — demo seed (T067)', () => {
  it('seeds the full Lost & Found demo dataset', async () => {
    expect(await LostFoundItem.countDocuments({})).toBe(26);
    expect(await ClaimRequest.countDocuments({})).toBe(9);
    expect(await Notification.countDocuments({})).toBe(6);
    expect(await ActivityLog.countDocuments({})).toBe(8);
    expect(await AiInsightCache.countDocuments({})).toBe(2);
  });

  it('seeds demo numbers separately and leaves counters zeroed', async () => {
    const seededItem = await LostFoundItem.findOne({
      reportNumber: 'LF-2001',
    }).lean();
    expect(seededItem).not.toBeNull();

    const counters = await Counter.find({}).lean();
    expect(counters).toHaveLength(2);
    expect(counters.every((counter) => counter.seq === 0)).toBe(true);
  });
});

describe('Day 6 — dashboard (T060)', () => {
  it('returns a Lost & Found manager payload with triage counts', async () => {
    const week = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: '7d' })
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(week.body.role).toBe('LOST_FOUND_MANAGER');
    expect(week.body.period).toBe('7d');
    expect(week.body.rangeStart).toBeTruthy();
    expect(week.body.rangeEnd).toBeTruthy();

    const all = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: 'all' })
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(all.body.rangeStart).toBeNull();
    expect(all.body.counts).toMatchObject({
      totalLostItems: 12,
      totalFoundItems: 14,
      openLostItems: 6,
      openFoundItems: 5,
      pendingMatches: 3,
      pendingClaims: 2,
      underVerificationClaims: 2,
      claimsAwaitingHandover: 2,
      completedHandovers: 2,
    });
    expect(all.body.analytics.itemsByCategory.length).toBeGreaterThan(0);
    expect(all.body.analytics.claimsByStatus.length).toBeGreaterThan(0);
  });

  it('returns role-specific payloads for every role', async () => {
    const admin = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: 'all' })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(admin.body.role).toBe('SUPER_ADMIN');
    expect(admin.body.totals.users).toBe(9);
    expect(admin.body.totals.lostItems).toBe(12);
    expect(admin.body.totals.foundItems).toBe(14);
    expect(admin.body.totals).not.toHaveProperty('maintenanceRequests');
    expect(admin.body.totals).not.toHaveProperty('workOrders');
    expect(admin.body.totals).not.toHaveProperty('technicians');
    expect(admin.body.latestInsights).not.toBeNull();
    expect(admin.body.latestInsights.period).toBe('7d');

    const student = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: 'all' })
      .set('Authorization', bearer('STUDENT'))
      .expect(200);

    expect(student.body.role).toBe('STUDENT');
    expect(student.body).not.toHaveProperty('requests');
    expect(student.body.claims.total).toBe(3);
    expect(student.body.reports).toMatchObject({ total: 5, lost: 4, found: 1 });
    expect(student.body.notifications.unreadCount).toBeGreaterThanOrEqual(1);

    const employee = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: 'all' })
      .set('Authorization', bearer('EMPLOYEE'))
      .expect(200);

    expect(employee.body.role).toBe('EMPLOYEE');
    expect(employee.body).not.toHaveProperty('requests');
    expect(employee.body.claims).toBeTruthy();
    expect(employee.body.reports).toBeTruthy();
    expect(employee.body.notifications).toBeTruthy();
  });

  it('takes the role from the JWT only and validates the period', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard')
      .query({ period: '30d', role: 'SUPER_ADMIN' })
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(200);

    expect(response.body.role).toBe('LOST_FOUND_MANAGER');

    await request(app)
      .get('/api/v1/dashboard')
      .query({ period: 'weekly' })
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .expect(400);

    await request(app).get('/api/v1/dashboard').expect(401);
  });
});

describe('Day 6 — activity logs (T062)', () => {
  it('restricts the audit trail to administrators', async () => {
    for (const role of ['LOST_FOUND_MANAGER', 'STUDENT', 'EMPLOYEE'] as Role[]) {
      await request(app)
        .get('/api/v1/activity-logs')
        .set('Authorization', bearer(role))
        .expect(403);
    }
  });

  it('returns paginated entries with populated actor details', async () => {
    const response = await request(app)
      .get('/api/v1/activity-logs')
      .query({ page: 1, limit: 5 })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(5);
    expect(response.body.total).toBe(8);
    expect(response.body.data).toHaveLength(5);

    const entry = response.body.data[0] as {
      actor: { id: string; name: string; role: string } | null;
      description: string;
      createdAt: string;
    };
    expect(entry.actor).not.toBeNull();
    expect(typeof entry.actor?.name).toBe('string');
    expect(typeof entry.actor?.role).toBe('string');
    expect(typeof entry.description).toBe('string');

    const timestamps = (response.body.data as Array<{ createdAt: string }>).map((row) =>
      new Date(row.createdAt).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));

    const pageTwo = await request(app)
      .get('/api/v1/activity-logs')
      .query({ page: 2, limit: 5 })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);
    expect(pageTwo.body.data).toHaveLength(3);
    expect(pageTwo.body.data[0].id).not.toBe(response.body.data[0].id);
  });

  it('filters by entity type, actor and date range', async () => {
    const byEntity = await request(app)
      .get('/api/v1/activity-logs')
      .query({ entityType: 'ClaimRequest', limit: 100 })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(byEntity.body.total).toBe(3);
    expect(
      (byEntity.body.data as Array<{ entityType: string }>).every(
        (entry) => entry.entityType === 'ClaimRequest',
      ),
    ).toBe(true);

    const byActor = await request(app)
      .get('/api/v1/activity-logs')
      .query({ actorId: managerId, limit: 100 })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(byActor.body.total).toBeGreaterThanOrEqual(3);
    expect(
      (byActor.body.data as Array<{ actor: { id: string } | null }>).every(
        (entry) => entry.actor?.id === managerId,
      ),
    ).toBe(true);

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const empty = await request(app)
      .get('/api/v1/activity-logs')
      .query({ from: future, limit: 100 })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(200);

    expect(empty.body.total).toBe(0);
    expect(empty.body.data).toEqual([]);

    await request(app)
      .get('/api/v1/activity-logs')
      .query({ from: future, to: new Date().toISOString() })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(400);

    await request(app)
      .get('/api/v1/activity-logs')
      .query({ actorId: 'not-an-object-id' })
      .set('Authorization', bearer('SUPER_ADMIN'))
      .expect(400);
  });
});

describe('Day 6 — AI Lost & Found insights (T063)', () => {
  it('is manager-only for Lost & Found insights and validates the period', async () => {
    await request(app)
      .post('/api/v1/ai/lost-found-insights')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ period: '7d' })
      .expect(403);

    await request(app)
      .post('/api/v1/ai/lost-found-insights')
      .set('Authorization', bearer('STUDENT'))
      .send({ period: '7d' })
      .expect(403);

    await request(app)
      .post('/api/v1/ai/lost-found-insights')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ period: '90d' })
      .expect(400);
  });

  it('is admin-only for platform insights', async () => {
    await request(app)
      .post('/api/v1/ai/admin-insights')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ period: '7d' })
      .expect(403);

    const admin = await request(app)
      .post('/api/v1/ai/admin-insights')
      .set('Authorization', bearer('SUPER_ADMIN'))
      .send({ period: '7d' })
      .expect(200);

    expect(admin.body.available).toBe(true);
    expect(admin.body.insights).toBeTruthy();
    expect(admin.body.stats.scope).toBe('ADMIN');
  });

  it('serves the seeded Arabic cache and falls back gracefully without Gemini', async () => {
    const withCache = await request(app)
      .post('/api/v1/ai/lost-found-insights')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ period: '7d' })
      .expect(200);

    expect(withCache.body.available).toBe(true);
    expect(withCache.body.message).toBeUndefined();
    expect(withCache.body.stats.lostFound.totalLostItems).toBeGreaterThan(0);
    expect(withCache.body.insights).toBeTruthy();
    expect(withCache.body.insights.observations[0]).toMatch(/[\u0600-\u06FF]/);
    expect(withCache.body.generatedAt).toBeTruthy();
    expect(withCache.body.rangeStart).toBeTruthy();

    const withoutCache = await request(app)
      .post('/api/v1/ai/lost-found-insights')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .send({ period: '30d' })
      .expect(200);

    expect(withoutCache.body.available).toBe(false);
    expect(withoutCache.body.message).toContain('GEMINI_API_KEY');
    expect(withoutCache.body.stats.lostFound.totalLostItems).toBeGreaterThanOrEqual(0);
    expect(withoutCache.body.insights).toBeUndefined();
  });

  it('parses wrapped insight JSON and rejects unreadable payloads', () => {
    const content = {
      observations: ['Electronics dominate the open lost reports this week.'],
      repeatedPatterns: ['Losses cluster around the central library in the evening.'],
      operationalRisks: ['Suggested matches waiting too long reduce recovery chances.'],
      preventiveRecommendations: ['Review suggested matches within 48 hours.'],
    };

    expect(parseInsightsContent(JSON.stringify({ insights: content }))).toEqual(content);
    expect(parseInsightsContent('not-json')).toBeNull();
    expect(parseInsightsContent(JSON.stringify({ observations: [] }))).toBeNull();
  });

  it('caches generated insights, serves the cache and supports regeneration', async () => {
    await AiInsightCache.deleteMany({});

    const firstContent = {
      observations: ['Bags are the largest open lost category this week.'],
      repeatedPatterns: ['Library losses repeat on weekday evenings.'],
      operationalRisks: ['Two claims have waited a week for verification.'],
      preventiveRecommendations: ['Verify pending claims within two days.'],
    };
    const secondContent = {
      observations: ['Phone reports increased slightly this week.'],
      repeatedPatterns: ['Found wallets recur near the sports complex.'],
      operationalRisks: ['Unreviewed matches may go stale.'],
      preventiveRecommendations: ['Add a weekly found-items announcement.'],
    };

    let capturedPrompt = '';
    let capturedInstruction = '';
    let calls = 0;
    const firstGenerator = async (
      prompt: string,
      systemInstruction: string,
    ): Promise<{ available: true; text: string }> => {
      calls += 1;
      capturedPrompt = prompt;
      capturedInstruction = systemInstruction;
      return { available: true, text: JSON.stringify(firstContent) };
    };

    const manager = { id: managerId, role: 'LOST_FOUND_MANAGER' as const };
    const generated = await generateLostFoundInsights(
      manager,
      { period: '7d' },
      firstGenerator,
    );

    expect(generated.available).toBe(true);
    expect(generated.insights).toEqual(firstContent);
    expect(generated.generatedAt).toBeInstanceOf(Date);
    expect(calls).toBe(1);
    expect(capturedPrompt).toContain('Period: 7d');
    expect(capturedInstruction).toContain('Arabic');

    const cachedDoc = await AiInsightCache.findOne({
      scope: 'LOST_FOUND',
      period: '7d',
    }).lean();
    expect(cachedDoc).not.toBeNull();
    expect(cachedDoc?.lang).toBe('ar');
    expect(cachedDoc?.model).toBe(process.env.GEMINI_MODEL);
    expect(cachedDoc?.insights).toEqual(firstContent);
    expect(cachedDoc?.stats).toBeTruthy();

    const cacheGenerator = async (): Promise<{ available: true; text: string }> => {
      throw new Error('The generator must not run when a cache exists');
    };
    const fromCache = await generateLostFoundInsights(
      manager,
      { period: '7d' },
      cacheGenerator,
    );

    expect(fromCache.available).toBe(true);
    expect(fromCache.insights).toEqual(firstContent);
    expect(fromCache.generatedAt).toBeInstanceOf(Date);

    calls = 0;
    const regenerateGenerator = async (): Promise<{
      available: true;
      text: string;
    }> => {
      calls += 1;
      return { available: true, text: JSON.stringify(secondContent) };
    };
    const regenerated = await generateLostFoundInsights(
      manager,
      { period: '7d', regenerate: true },
      regenerateGenerator,
    );

    expect(calls).toBe(1);
    expect(regenerated.insights).toEqual(secondContent);
    expect(
      (await AiInsightCache.findOne({ scope: 'LOST_FOUND', period: '7d' }).lean())
        ?.insights,
    ).toEqual(secondContent);

    const malformed = await generateLostFoundInsights(
      manager,
      { period: '7d', regenerate: true },
      async () => ({ available: true, text: 'not valid JSON' }),
    );

    expect(malformed.available).toBe(false);
    expect(malformed.message).toContain('unreadable');
    expect(malformed.insights).toEqual(secondContent);

    const offline = await generateLostFoundInsights(
      manager,
      { period: '30d', regenerate: true },
      async () => ({ available: false, message: 'AI is offline for this test' }),
    );

    expect(offline.available).toBe(false);
    expect(offline.message).toBe('AI is offline for this test');
    expect(offline.insights).toBeUndefined();
    expect(offline.stats.lostFound).toBeTruthy();
  });

  it('refuses cross-scope service calls', async () => {
    await expect(
      generateLostFoundInsights({ id: adminId, role: 'SUPER_ADMIN' }, { period: '7d' }),
    ).rejects.toMatchObject({ statusCode: 403 });

    await expect(
      generateAdminInsights(
        { id: managerId, role: 'LOST_FOUND_MANAGER' },
        { period: '7d' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
