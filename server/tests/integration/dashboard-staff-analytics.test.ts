import type { Express } from 'express';
import { addMonths, startOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
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
let ClaimRequest: (typeof import('../../src/modules/lost-found/claims/claimRequest.model'))['ClaimRequest'];
let User: (typeof import('../../src/modules/auth/user.model'))['User'];
let DEMO_ACCOUNTS: (typeof import('../../src/config/constants'))['DEMO_ACCOUNTS'];
let computeStaleItems: (typeof import('../../src/modules/dashboard/dashboard.service'))['computeStaleItems'];

const tokens = new Map<string, string>();
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

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

async function userIdByEmail(email: string): Promise<Types.ObjectId> {
  const user = await User.findOne({ email }).select('_id').lean();
  if (!user) throw new Error(`seed user missing: ${email}`);
  return user._id;
}

let itemSeq = 0;
async function makeItem(
  overrides: Record<string, unknown> & {
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Promise<Types.ObjectId> {
  itemSeq += 1;
  const { createdAt, updatedAt, ...fields } = overrides;
  const doc = await LostFoundItem.create({
    reportNumber: `LF-T011-${itemSeq}`,
    reportType: 'LOST',
    itemTitle: `Analytics fixture item ${itemSeq}`,
    description: 'Integration fixture item for spec 011.',
    privateIdentificationDetails: 'Fixture identifying details',
    category: 'Keys',
    locationDetails: 'Fixture location details',
    occurrenceDate: daysAgo(1),
    status: 'OPEN',
    ...fields,
  });
  const stamps: Record<string, Date> = {};
  if (createdAt) stamps.createdAt = createdAt;
  if (updatedAt) stamps.updatedAt = updatedAt;
  if (Object.keys(stamps).length > 0) {
    // Raw write: Mongoose marks createdAt immutable; backdating a
    // fixture is exactly the case that must bypass it.
    await LostFoundItem.collection.updateOne({ _id: doc._id }, { $set: stamps });
  }
  return doc._id as Types.ObjectId;
}

let claimSeq = 0;
async function makeClaim(overrides: {
  itemId: Types.ObjectId;
  linkedLostItemId?: Types.ObjectId;
  status?: string;
  handedOverAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  claimantId: Types.ObjectId;
  managerId: Types.ObjectId;
}): Promise<Types.ObjectId> {
  claimSeq += 1;
  const claim = await ClaimRequest.create({
    claimNumber: `CLM-T011-${claimSeq}`,
    itemId: overrides.itemId,
    linkedLostItemId: overrides.linkedLostItemId,
    claimantId: overrides.claimantId,
    claimDescription: 'Analytics fixture claim for spec 011.',
    identifyingDetailsProvided: 'Fixture identifying details',
    status: overrides.status ?? 'COMPLETED',
    reviewedBy: overrides.managerId,
    handover: overrides.handedOverAt
      ? {
          receivedByName: 'Fixture Receiver',
          handedOverBy: overrides.managerId,
          handedOverAt: overrides.handedOverAt,
        }
      : undefined,
  });
  await ClaimRequest.collection.updateOne(
    { _id: claim._id },
    { $set: { createdAt: overrides.createdAt, updatedAt: overrides.updatedAt } },
  );
  return claim._id as Types.ObjectId;
}

let studentId: Types.ObjectId;
let employeeId: Types.ObjectId;
let managerId: Types.ObjectId;
let locationR: Types.ObjectId;
let locationA: Types.ObjectId;
let locationB: Types.ObjectId;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const testOnlySecret = (name: string) => `${name}-test-only-${'0'.repeat(24)}`;
  const setEnv = (key: string, value: string): void => {
    process.env[key] = value;
  };
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = replSet.getUri('campuscare-staff-analytics');
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
  ({ User } = await import('../../src/modules/auth/user.model'));
  ({ DEMO_ACCOUNTS } = await import('../../src/config/constants'));
  ({ computeStaleItems } = await import(
    '../../src/modules/dashboard/dashboard.service'
  ));
  ({ app } = await import('../../src/app'));

  // Minimal foundation (users + locations only): every figure below is
  // produced by this file's own fixtures.
  await seedDatabase({ silent: true });

  const roles: Role[] = ['SUPER_ADMIN', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'STUDENT'];
  for (const role of roles) {
    const response = await login(DEMO_ACCOUNTS[role].email, SEED_PASSWORD).expect(200);
    tokens.set(role, response.body.token as string);
  }

  studentId = await userIdByEmail(DEMO_ACCOUNTS.STUDENT.email);
  employeeId = await userIdByEmail(DEMO_ACCOUNTS.EMPLOYEE.email);
  managerId = await userIdByEmail(DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email);

  const locations = await Location.find({ isActive: true }).limit(3).lean();
  const [firstLocation, secondLocation, thirdLocation] = locations;
  if (!firstLocation || !secondLocation || !thirdLocation) {
    throw new Error('seed must provide 3 active locations');
  }
  locationR = firstLocation._id;
  locationA = secondLocation._id;
  locationB = thirdLocation._id;
}, 240_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

describe('Spec 011 — recovery stats', () => {
  beforeAll(async () => {
    const base = { locationId: locationR, reporterId: studentId };
    // Three lost reports, filed 30 / 20 / 10 days ago.
    const l1Created = daysAgo(30);
    const l2Created = daysAgo(20);
    const l3Created = daysAgo(10);
    const L1 = await makeItem({
      ...base,
      reportType: 'LOST',
      status: 'RETURNED',
      createdAt: l1Created,
      updatedAt: daysAgo(1),
    });
    const L2 = await makeItem({
      ...base,
      reportType: 'LOST',
      status: 'RETURNED',
      createdAt: l2Created,
      updatedAt: daysAgo(1),
    });
    const L3 = await makeItem({
      ...base,
      reportType: 'LOST',
      status: 'RETURNED',
      createdAt: l3Created,
      updatedAt: daysAgo(1),
    });
    await LostFoundItem.collection.updateOne(
      { _id: L1 },
      { $set: { estimatedValueEGP: 5_000, valueSource: 'AUTO' } },
    );

    const found = async () =>
      makeItem({
        ...base,
        reportType: 'FOUND',
        status: 'RETURNED',
        createdAt: daysAgo(15),
        updatedAt: daysAgo(1),
      });
    const F1 = await found();
    const F2 = await found();
    const F3 = await found();
    const F4 = await found();
    const F5 = await found();
    const F6 = await found();
    await LostFoundItem.collection.updateOne(
      { _id: F1 },
      { $set: { estimatedValueEGP: 1_000, valueSource: 'AUTO' } },
    );

    const claimBase = { claimantId: studentId, managerId };
    const plus = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
    // C1: F1 recovered against L1 — 6 days report→handover, 1 day processing.
    await makeClaim({
      ...claimBase,
      itemId: F1,
      linkedLostItemId: L1,
      createdAt: plus(l1Created, 5),
      handedOverAt: plus(l1Created, 6),
      updatedAt: plus(l1Created, 6),
    });
    // C2: F2 against L2 — 10 days recovery, 1 day processing.
    await makeClaim({
      ...claimBase,
      itemId: F2,
      linkedLostItemId: L2,
      createdAt: plus(l2Created, 9),
      handedOverAt: plus(l2Created, 10),
      updatedAt: plus(l2Created, 10),
    });
    // C3: unlinked walk-in return — 2 days processing, no recovery sample.
    await makeClaim({
      ...claimBase,
      itemId: F3,
      createdAt: daysAgo(5),
      handedOverAt: daysAgo(3),
      updatedAt: daysAgo(3),
    });
    // C4: duplicate completed claim on F1 with a LATER handover — the
    // canonical dedupe must drop it everywhere.
    await makeClaim({
      ...claimBase,
      itemId: F1,
      linkedLostItemId: L1,
      createdAt: plus(l1Created, 8),
      handedOverAt: plus(l1Created, 9),
      updatedAt: plus(l1Created, 9),
    });
    // C6: F4 also claimed against L1 — one physical recovery counts once.
    await makeClaim({
      ...claimBase,
      itemId: F4,
      linkedLostItemId: L1,
      createdAt: plus(l1Created, 7),
      handedOverAt: plus(l1Created, 8),
      updatedAt: plus(l1Created, 8),
    });
    // C7: legacy unlinked claim, no handover record — updatedAt is the
    // instant; 2 days processing.
    await makeClaim({
      ...claimBase,
      itemId: F5,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
    });
    // C8: F6 linked to L3 but handed over BEFORE L3 was filed
    // (retroactive link) — negative duration, excluded and counted.
    await makeClaim({
      ...claimBase,
      itemId: F6,
      linkedLostItemId: L3,
      createdAt: plus(l3Created, -4),
      handedOverAt: plus(l3Created, -1),
      updatedAt: plus(l3Created, -1),
    });
  });

  it('computes the pinned recovery figures for Admin and Manager identically', async () => {
    const admin = await dashboardPayload('SUPER_ADMIN');
    const manager = await dashboardPayload('LOST_FOUND_MANAGER');
    expect(manager.recoveryStats).toEqual(admin.recoveryStats);

    const stats = admin.recoveryStats;
    expect(stats.returnedCount).toBe(5);
    expect(stats.linkedReturnedCount).toBe(3);
    expect(stats.totalLostReports).toBe(3);
    expect(stats.returnRate).toBe(1);
    expect(stats.averageDaysToReturn).toBe(8);
    expect(stats.medianDaysToReturn).toBe(8);
    expect(stats.recoverySampleSize).toBe(2);
    expect(stats.excludedNegativeDurations).toBe(1);
    expect(stats.averageDaysClaimToHandover).toBe(1.8);
    expect(stats.claimSampleSize).toBe(5);
  });

  it('keeps spec-008 value totals on the same canonical winner (no double count)', async () => {
    const admin = await dashboardPayload('SUPER_ADMIN');
    // F1 (1,000) counted once despite two completed claims; L1 (5,000)
    // is the only valued lost report.
    expect(admin.valueStats.totalReturnedValueEGP).toBe(1_000);
    expect(admin.valueStats.totalLostValueEGP).toBe(5_000);
  });
});

describe('Spec 011 — hot locations split', () => {
  beforeAll(async () => {
    const base = { reporterId: employeeId, status: 'CLOSED', updatedAt: new Date() };
    await makeItem({ ...base, locationId: locationA, reportType: 'LOST' });
    await makeItem({ ...base, locationId: locationA, reportType: 'LOST' });
    await makeItem({ ...base, locationId: locationA, reportType: 'FOUND' });
    await makeItem({ ...base, locationId: locationB, reportType: 'LOST' });
    await makeItem({ ...base, locationId: locationB, reportType: 'FOUND' });
    await makeItem({ ...base, locationId: locationB, reportType: 'FOUND' });
    await makeItem({ ...base, locationId: locationB, reportType: 'FOUND' });
  });

  it('splits each top location into lost + found with a server-side share', async () => {
    const totalItems = await LostFoundItem.countDocuments({});
    const { locationsTop } = (await dashboardPayload('LOST_FOUND_MANAGER')).breakdowns;

    const entryA = locationsTop.find(
      (entry: any) => entry.locationId === locationA.toString(),
    );
    const entryB = locationsTop.find(
      (entry: any) => entry.locationId === locationB.toString(),
    );
    expect(entryA).toMatchObject({ lost: 2, found: 1, count: 3 });
    expect(entryB).toMatchObject({ lost: 1, found: 3, count: 4 });

    for (const entry of locationsTop) {
      expect(entry.lost + entry.found).toBe(entry.count);
      expect(entry.sharePercent).toBe(
        Math.round((entry.count / totalItems) * 100 * 10) / 10,
      );
    }
    const counts = locationsTop.map((entry: any) => entry.count);
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });
});

describe('Spec 011 — stale items', () => {
  let s1: Types.ObjectId;
  let s3: Types.ObjectId;
  let s4: Types.ObjectId;
  let s5: Types.ObjectId;
  let s6: Types.ObjectId;

  beforeAll(async () => {
    const base = { locationId: locationR, reporterId: studentId };
    // S1: untouched for 20 days — stale.
    s1 = await makeItem({
      ...base,
      reportType: 'LOST',
      status: 'OPEN',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    });
    // S2: just past the 14-day threshold — stale (boundary bracket).
    await makeItem({
      ...base,
      reportType: 'FOUND',
      status: 'OPEN',
      createdAt: daysAgo(15),
      updatedAt: new Date(Date.now() - 14 * DAY - 5 * 60_000),
    });
    // S3: just inside the threshold — NOT stale.
    s3 = await makeItem({
      ...base,
      reportType: 'LOST',
      status: 'OPEN',
      createdAt: daysAgo(13),
      updatedAt: new Date(Date.now() - 14 * DAY + 60 * 60_000),
    });
    // S4: old but RETURNED — not an active status.
    s4 = await makeItem({
      ...base,
      reportType: 'FOUND',
      status: 'RETURNED',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    });
    // S5: item untouched for 20 days, but a claim on it moved yesterday
    // — claim activity is movement, so NOT stale.
    s5 = await makeItem({
      ...base,
      reportType: 'FOUND',
      status: 'CLAIM_UNDER_REVIEW',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    });
    await makeClaim({
      itemId: s5,
      status: 'UNDER_VERIFICATION',
      claimantId: studentId,
      managerId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    });
    // S6: APPROVED_FOR_HANDOVER is already worked in the handovers
    // queue — excluded by design.
    s6 = await makeItem({
      ...base,
      reportType: 'FOUND',
      status: 'APPROVED_FOR_HANDOVER',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    });
    // 25 bulk stale items, 15–39 days without movement.
    for (let i = 0; i < 25; i++) {
      await makeItem({
        ...base,
        reporterId: employeeId,
        reportType: 'FOUND',
        status: 'OPEN',
        createdAt: daysAgo(15 + i),
        updatedAt: daysAgo(15 + i),
      });
    }
  });

  it('serves the full count with a capped, oldest-first list', async () => {
    const admin = await dashboardPayload('SUPER_ADMIN');
    const manager = await dashboardPayload('LOST_FOUND_MANAGER');
    expect(admin.staleCount).toBe(27);
    expect(manager.staleCount).toBe(27);
    expect(admin.staleItems).toHaveLength(20);
    expect(admin.staleItems[0].ageDays).toBe(39);
    const ages = admin.staleItems.map((entry: any) => entry.ageDays);
    expect(ages).toEqual([...ages].sort((a: number, b: number) => b - a));
  });

  it('applies the movement and eligibility rules in the uncapped computation', async () => {
    const { items, count } = await computeStaleItems();
    expect(count).toBe(27);
    const ids = items.map((entry) => entry.id);
    expect(ids).toContain(s1.toString());
    expect(ids).not.toContain(s3.toString());
    expect(ids).not.toContain(s4.toString());
    expect(ids).not.toContain(s5.toString());
    expect(ids).not.toContain(s6.toString());
    const s1Entry = items.find((entry) => entry.id === s1.toString());
    expect(s1Entry?.ageDays).toBe(20);
    expect(s1Entry?.reporterRole).toBe('STUDENT');
  });
});

describe('Spec 011 — monthly Excel export', () => {
  function parseBinary(res: any, callback: (err: Error | null, body?: Buffer) => void) {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  }

  function summaryValue(sheet: ExcelJS.Worksheet, label: string) {
    let value: unknown;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === label) value = row.getCell(2).value;
    });
    return value;
  }

  it('downloads a workbook whose figures match the database and the API', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/report.xlsx')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .buffer(true)
      .parse(parseBinary)
      .expect(200);

    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    // The client reads the filename cross-origin, so the header must be
    // CORS-exposed — otherwise the download lands under a generic name.
    const exposed = await request(app)
      .get('/api/v1/dashboard/report.xlsx')
      .set('Authorization', bearer('LOST_FOUND_MANAGER'))
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(exposed.headers['access-control-expose-headers'] ?? '').toContain(
      'Content-Disposition',
    );
    const disposition = response.headers['content-disposition'] as string;
    const encoded = disposition.match(/filename\*=UTF-8''(.+)$/)?.[1] ?? '';
    expect(decodeURIComponent(encoded)).toMatch(
      /^تقرير-المفقودات-\d{4}-\d{2}\.xlsx$/,
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'ملخص الشهر',
      'حسب الفئة',
      'حسب المكان',
      'أغراض نايمة',
    ]);

    // Independent month oracles, recomputed from the database.
    const now = new Date();
    const monthStart = startOfMonth(now);
    const nextMonthStart = addMonths(monthStart, 1);
    const inMonth = { createdAt: { $gte: monthStart, $lt: nextMonthStart } };
    const lostThisMonth = await LostFoundItem.countDocuments({
      reportType: 'LOST',
      ...inMonth,
    });
    const foundThisMonth = await LostFoundItem.countDocuments({
      reportType: 'FOUND',
      ...inMonth,
    });
    const completed = await ClaimRequest.find({ status: 'COMPLETED' })
      .select('itemId linkedLostItemId handover updatedAt createdAt')
      .lean();
    const instantOf = (claim: any) =>
      new Date(claim.handover?.handedOverAt ?? claim.updatedAt).getTime();
    const ordered = [...completed].sort((a: any, b: any) => {
      const byInstant = instantOf(a) - instantOf(b);
      if (byInstant !== 0) return byInstant;
      const linkDiff =
        (b.linkedLostItemId ? 1 : 0) - (a.linkedLostItemId ? 1 : 0);
      if (linkDiff !== 0) return linkDiff;
      return String(a._id) < String(b._id) ? -1 : 1;
    });
    const seenItems = new Set<string>();
    const seenLinks = new Set<string>();
    let returnsThisMonth = 0;
    for (const claim of ordered) {
      const itemKey = String(claim.itemId);
      if (seenItems.has(itemKey)) continue;
      seenItems.add(itemKey);
      const linkKey = claim.linkedLostItemId
        ? String(claim.linkedLostItemId)
        : null;
      if (linkKey) {
        if (seenLinks.has(linkKey)) continue;
        seenLinks.add(linkKey);
      }
      const instant = instantOf(claim);
      if (instant >= monthStart.getTime() && instant < nextMonthStart.getTime()) {
        returnsThisMonth += 1;
      }
    }

    const summary = workbook.getWorksheet('ملخص الشهر')!;
    expect(summaryValue(summary, 'بلاغات مفقودة هذا الشهر')).toBe(lostThisMonth);
    expect(summaryValue(summary, 'بلاغات معثور عليها هذا الشهر')).toBe(
      foundThisMonth,
    );
    expect(summaryValue(summary, 'عمليات استرجاع هذا الشهر')).toBe(returnsThisMonth);

    // Cross-surface consistency: the workbook's value and rate figures
    // are the dashboard payload's figures.
    const admin = await dashboardPayload('SUPER_ADMIN');
    expect(
      summaryValue(summary, 'قيمة المفقودات هذا الشهر (ج.م) — تقديرية'),
    ).toBe(admin.valueStats.lostValueThisMonthEGP);
    expect(
      summaryValue(summary, 'قيمة المسترجعات هذا الشهر (ج.م) — تقديرية'),
    ).toBe(admin.valueStats.returnedValueThisMonthEGP);
    expect(summaryValue(summary, 'نسبة الاسترجاع الإجمالية')).toBe(
      admin.recoveryStats.returnRate,
    );
    expect(summaryValue(summary, 'إجمالي المسترجعات')).toBe(
      admin.recoveryStats.returnedCount,
    );

    // Category sheet totals reconcile with the month's item population.
    const byCategory = workbook.getWorksheet('حسب الفئة')!;
    let categoryTotal = 0;
    byCategory.eachRow((row, rowNumber) => {
      if (rowNumber > 3) categoryTotal += Number(row.getCell(4).value ?? 0);
    });
    expect(categoryTotal).toBe(lostThisMonth + foundThisMonth);

    // Stale sheet carries the uncapped list (title + basis + header rows).
    const staleSheet = workbook.getWorksheet('أغراض نايمة')!;
    expect(staleSheet.rowCount - 3).toBe(admin.staleCount);
    expect(admin.staleCount).toBeGreaterThan(20);
  });

  it('forbids students and employees', async () => {
    await request(app)
      .get('/api/v1/dashboard/report.xlsx')
      .set('Authorization', bearer('STUDENT'))
      .expect(403);
    await request(app)
      .get('/api/v1/dashboard/report.xlsx')
      .set('Authorization', bearer('EMPLOYEE'))
      .expect(403);
  });
});

describe('Spec 011 — staff gating', () => {
  it('keeps recoveryStats and stale fields out of student and employee payloads', async () => {
    for (const role of ['STUDENT', 'EMPLOYEE'] as const) {
      const body = await dashboardPayload(role);
      expect(body).not.toHaveProperty('recoveryStats');
      expect(body).not.toHaveProperty('staleItems');
      expect(body).not.toHaveProperty('staleCount');
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('"recoveryStats"');
      expect(serialized).not.toContain('"staleItems"');
      expect(serialized).not.toContain('"staleCount"');
    }
  });
});
