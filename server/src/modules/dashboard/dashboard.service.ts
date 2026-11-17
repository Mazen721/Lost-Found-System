import {
  addDays,
  addMonths,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { Types } from 'mongoose';
import {
  CLAIM_STATUSES,
  ITEM_STATUSES,
  ROLES,
  type ClaimStatus,
  type ReportType,
  type Role,
} from '../../config/constants';
import { ActivityLog } from '../../shared/models/ActivityLog.model';
import { Notification } from '../../shared/models/Notification.model';
import { applyNotificationLocalization } from '../../shared/utils/notificationLocalization';
import { User } from '../auth/user.model';
import { AiInsightCache, type InsightContent } from '../ai/aiInsightCache.model';
import { Location } from '../locations/location.model';
import { ClaimRequest } from '../lost-found/claims/claimRequest.model';
import { LostFoundItem } from '../lost-found/items/lostFoundItem.model';
import { ItemMatch } from '../lost-found/matches/itemMatch.model';
import type { ActivityRange, DashboardPeriod } from './dashboard.validation';

export interface DashboardActor {
  id: string;
  role: Role;
}

export interface PeriodRange {
  from: Date | null;
  to: Date;
}

export interface DashboardItemCard {
  id: string;
  reportNumber: string;
  reportType: string;
  itemTitle: string;
  itemTitleAr?: string;
  category: string;
  status: string;
  imageUrl: string | null;
  building: string;
  buildingAr?: string;
  createdAt: Date;
}

export interface UrgentQueueClaim {
  id: string;
  claimNumber: string;
  itemTitle: string;
  itemTitleAr?: string;
  itemImageUrl: string | null;
  createdAt: Date;
}

export interface UrgentQueue {
  pendingClaims: UrgentQueueClaim[];
  suggestedMatches: Array<{
    id: string;
    score: number;
    level: string;
    lostTitle: string;
    lostTitleAr?: string;
    foundTitle: string;
    foundTitleAr?: string;
    lostImageUrl: string | null;
    foundImageUrl: string | null;
    createdAt: Date;
  }>;
  handoversWaiting: UrgentQueueClaim[];
}

/**
 * Staff-only value aggregates (spec 008): sums of the items' CURRENT
 * estimates. Lost = LOST items by `createdAt`; returned = completed
 * handovers by `handover.handedOverAt` (fallback claim `updatedAt`),
 * counting the claimed item's value once. These are live, revisable
 * figures, not month-end snapshots.
 */
export interface ValueStats {
  lostValueThisMonthEGP: number;
  returnedValueThisMonthEGP: number;
  totalLostValueEGP: number;
  totalReturnedValueEGP: number;
}

export interface AdminDashboard {
  role: 'SUPER_ADMIN';
  period: DashboardPeriod;
  rangeStart: Date | null;
  rangeEnd: Date;
  valueStats: ValueStats;
  totals: {
    users: number;
    activeUsers: number;
    locations: number;
    buildings: number;
    lostItems: number;
    foundItems: number;
    openLostFoundItems: number;
    pendingMatches: number;
    pendingClaims: number;
  };
  latestInsights: {
    period: '7d' | '30d';
    generatedAt: Date;
    rangeStart: Date;
    rangeEnd: Date;
    insights: InsightContent;
  } | null;
  recentItems: DashboardItemCard[];
  urgentQueue: UrgentQueue;
  analytics: {
    usersByRole: Array<{ role: Role; count: number }>;
    activityByBuilding: Array<{
      name: string;
      nameAr?: string;
      building: string;
      buildingAr?: string;
      lostFound: number;
    }>;
    moduleVolume: Array<{ module: string; count: number }>;
  };
}

export interface ManagerDashboard {
  role: 'LOST_FOUND_MANAGER';
  period: DashboardPeriod;
  rangeStart: Date | null;
  rangeEnd: Date;
  valueStats: ValueStats;
  counts: {
    totalLostItems: number;
    totalFoundItems: number;
    openLostItems: number;
    openFoundItems: number;
    pendingMatches: number;
    pendingClaims: number;
    underVerificationClaims: number;
    claimsAwaitingHandover: number;
    completedHandovers: number;
  };
  analytics: {
    itemsByStatus: Array<{ status: string; count: number }>;
    itemsByCategory: Array<{ category: string; lost: number; found: number }>;
    claimsByStatus: Array<{ status: string; count: number }>;
  };
  recentItems: DashboardItemCard[];
  urgentQueue: UrgentQueue;
}

export interface StudentDashboard {
  role: 'STUDENT' | 'EMPLOYEE';
  period: DashboardPeriod;
  rangeStart: Date | null;
  rangeEnd: Date;
  claims: {
    total: number;
    recent: Array<{
      id: string;
      claimNumber: string;
      itemTitle: string;
      itemTitleAr?: string;
      itemCategory?: string;
      itemImageUrl: string | null;
      status: string;
      createdAt: Date;
    }>;
  };
  reports: {
    total: number;
    lost: number;
    found: number;
    recent: Array<{
      id: string;
      reportNumber: string;
      reportType: string;
      itemTitle: string;
      itemTitleAr?: string;
      category: string;
      imageUrl: string | null;
      status: string;
      createdAt: Date;
    }>;
  };
  notifications: {
    unreadCount: number;
    recent: Array<{
      id: string;
      title: string;
      titleKey?: string;
      message: string;
      messageKey?: string;
      params?: Record<string, unknown>;
      linkUrl?: string;
      isRead: boolean;
      createdAt: Date;
    }>;
  };
}

export type DashboardResponse = AdminDashboard | ManagerDashboard | StudentDashboard;

interface CountRow {
  _id: string | null;
  count: number;
}

interface BuildingCountRow {
  _id: Types.ObjectId | string | null;
  name: string | null;
  nameAr?: string | null;
  count: number;
}

export function resolvePeriodRange(
  period: DashboardPeriod,
  now: Date = new Date(),
): PeriodRange {
  if (period === 'all') {
    return { from: null, to: now };
  }

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return { from: subDays(now, days), to: now };
}

function createdAtMatch(range: PeriodRange): { createdAt?: { $gte: Date; $lte: Date } } {
  return range.from ? { createdAt: { $gte: range.from, $lte: range.to } } : {};
}

/** Arabic-only UI: prefer the Arabic variant of a bilingual field. */
function localize(en: string | undefined, ar: string | undefined): string {
  return ar?.trim() ? ar : (en ?? '');
}

function ageInDays(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

interface ItemImageDoc {
  images?: Array<{ url?: string }>;
}

function firstImageUrl(doc: ItemImageDoc | null | undefined): string | null {
  return doc?.images?.[0]?.url ?? null;
}

/**
 * Shared Lost & Found board extras for the Manager and Admin dashboards:
 * the newest reported items (with photos) and the urgent triage queue
 * (claims awaiting review, suggested matches, approved claims awaiting
 * handover).
 */
async function getBoardExtras(): Promise<{
  recentItems: DashboardItemCard[];
  urgentQueue: UrgentQueue;
}> {
  const [recentItems, pendingClaims, suggestedMatches, handoversWaiting] =
    await Promise.all([
      LostFoundItem.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .select(
          'reportNumber reportType itemTitle itemTitleAr category status images createdAt',
        )
        .populate('locationId', 'buildingName buildingNameAr')
        .lean(),
      ClaimRequest.find({ status: 'PENDING_REVIEW' })
        .sort({ createdAt: 1 })
        .limit(5)
        .populate('itemId', 'itemTitle itemTitleAr images')
        .lean(),
      ItemMatch.find({ status: 'SUGGESTED' })
        .sort({ score: -1 })
        .limit(5)
        .populate('lostItemId', 'itemTitle itemTitleAr images')
        .populate('foundItemId', 'itemTitle itemTitleAr images')
        .lean(),
      ClaimRequest.find({ status: 'APPROVED' })
        .sort({ createdAt: 1 })
        .limit(5)
        .populate('itemId', 'itemTitle itemTitleAr images')
        .lean(),
    ]);

  const mapClaim = (claim: (typeof pendingClaims)[number]): UrgentQueueClaim => {
    const item = claim.itemId as unknown as {
      itemTitle?: string;
      itemTitleAr?: string;
      images?: Array<{ url?: string }>;
    } | null;
    return {
      id: claim._id.toString(),
      claimNumber: claim.claimNumber,
      itemTitle: item?.itemTitle ?? 'Lost & found item',
      itemTitleAr: item?.itemTitleAr,
      itemImageUrl: firstImageUrl(item),
      createdAt: claim.createdAt,
    };
  };

  return {
    recentItems: recentItems.map((item) => {
      const location = item.locationId as unknown as {
        buildingName?: string;
        buildingNameAr?: string;
      } | null;
      return {
        id: item._id.toString(),
        reportNumber: item.reportNumber,
        reportType: item.reportType,
        itemTitle: item.itemTitle,
        itemTitleAr: (item as unknown as { itemTitleAr?: string }).itemTitleAr,
        category: item.category,
        status: item.status,
        imageUrl: firstImageUrl(item as unknown as ItemImageDoc),
        building: location?.buildingName ?? '',
        buildingAr: location?.buildingNameAr,
        createdAt: item.createdAt,
      };
    }),
    urgentQueue: {
      pendingClaims: pendingClaims.map(mapClaim),
      suggestedMatches: suggestedMatches.map((match) => {
        const lost = match.lostItemId as unknown as {
          itemTitle?: string;
          itemTitleAr?: string;
          images?: Array<{ url?: string }>;
        } | null;
        const found = match.foundItemId as unknown as {
          itemTitle?: string;
          itemTitleAr?: string;
          images?: Array<{ url?: string }>;
        } | null;
        return {
          id: match._id.toString(),
          score: match.score,
          level: match.level,
          lostTitle: lost?.itemTitle ?? 'Lost item',
          lostTitleAr: lost?.itemTitleAr,
          foundTitle: found?.itemTitle ?? 'Found item',
          foundTitleAr: found?.itemTitleAr,
          lostImageUrl: firstImageUrl(lost),
          foundImageUrl: firstImageUrl(found),
          createdAt: match.createdAt,
        };
      }),
      handoversWaiting: handoversWaiting.map(mapClaim),
    },
  };
}

interface ValueSums {
  thisMonthEGP: number;
  totalEGP: number;
}

function sumLostItemValues(
  lostItems: Array<{ createdAt: Date; estimatedValueEGP?: number | null }>,
  inCurrentMonth: (date: Date) => boolean,
): ValueSums {
  const sums: ValueSums = { thisMonthEGP: 0, totalEGP: 0 };
  for (const item of lostItems) {
    const value = item.estimatedValueEGP ?? 0;
    sums.totalEGP += value;
    if (inCurrentMonth(item.createdAt)) sums.thisMonthEGP += value;
  }
  return sums;
}

interface CompletedClaimForValue {
  itemId: unknown;
  handover?: { handedOverAt?: Date | null } | null;
  updatedAt: Date;
}

function sumReturnedItemValues(
  completedClaims: CompletedClaimForValue[],
  inCurrentMonth: (date: Date) => boolean,
): ValueSums {
  const sums: ValueSums = { thisMonthEGP: 0, totalEGP: 0 };
  // A physical item is counted once even if duplicate completed claims
  // reference it — the pair's value is the claimed item's, never both.
  const countedItemIds = new Set<string>();
  for (const claim of completedClaims) {
    const item = claim.itemId as {
      _id?: Types.ObjectId;
      estimatedValueEGP?: number | null;
    } | null;
    if (!item?._id) continue;
    const itemKey = item._id.toString();
    if (countedItemIds.has(itemKey)) continue;
    countedItemIds.add(itemKey);

    const value = item.estimatedValueEGP ?? 0;
    sums.totalEGP += value;
    const handedOverAt = claim.handover?.handedOverAt ?? claim.updatedAt;
    if (handedOverAt && inCurrentMonth(handedOverAt)) {
      sums.thisMonthEGP += value;
    }
  }
  return sums;
}

export async function getValueStats(now: Date = new Date()): Promise<ValueStats> {
  const monthStart = startOfMonth(now);
  const nextMonthStart = addMonths(monthStart, 1);
  const inCurrentMonth = (date: Date): boolean =>
    date >= monthStart && date < nextMonthStart;

  const [lostItems, completedClaims] = await Promise.all([
    LostFoundItem.find({ reportType: 'LOST' })
      .select('createdAt +estimatedValueEGP')
      .lean(),
    ClaimRequest.find({ status: 'COMPLETED' })
      .select('itemId handover updatedAt')
      .populate('itemId', '+estimatedValueEGP')
      .lean(),
  ]);

  const lost = sumLostItemValues(lostItems, inCurrentMonth);
  const returned = sumReturnedItemValues(
    completedClaims as CompletedClaimForValue[],
    inCurrentMonth,
  );

  return {
    lostValueThisMonthEGP: lost.thisMonthEGP,
    returnedValueThisMonthEGP: returned.thisMonthEGP,
    totalLostValueEGP: lost.totalEGP,
    totalReturnedValueEGP: returned.totalEGP,
  };
}

async function getAdminDashboard(
  period: DashboardPeriod,
  range: PeriodRange,
): Promise<AdminDashboard> {
  const [
    users,
    activeUsers,
    locations,
    buildingNames,
    lostItems,
    foundItems,
    openLostFoundItems,
    pendingMatches,
    pendingClaims,
    latestInsight,
    userRoleRows,
    lfBuildingRows,
    lostInRange,
    foundInRange,
    claimsInRange,
    matchesInRange,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    Location.countDocuments({ isActive: true }),
    Location.distinct('buildingName'),
    LostFoundItem.countDocuments({ reportType: 'LOST' }),
    LostFoundItem.countDocuments({ reportType: 'FOUND' }),
    LostFoundItem.countDocuments({ status: { $in: ['OPEN', 'MATCH_CONFIRMED'] } }),
    ItemMatch.countDocuments({ status: 'SUGGESTED' }),
    ClaimRequest.countDocuments({ status: { $in: ['PENDING_REVIEW', 'UNDER_VERIFICATION'] } }),
    AiInsightCache.findOne({ scope: 'ADMIN', lang: 'ar' })
      .sort({ generatedAt: -1 })
      .lean()
      .then((cached) => cached ?? AiInsightCache.findOne({ scope: 'ADMIN' }).sort({ generatedAt: -1 }).lean()),
    User.aggregate<CountRow>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    LostFoundItem.aggregate<BuildingCountRow>([
      { $match: createdAtMatch(range) },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location',
        },
      },
      { $unwind: { path: '$location', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$location.buildingName',
          name: { $first: '$location.buildingName' },
          nameAr: { $max: '$location.buildingNameAr' },
          count: { $sum: 1 },
        },
      },
    ]),
    LostFoundItem.countDocuments({ reportType: 'LOST', ...createdAtMatch(range) }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', ...createdAtMatch(range) }),
    ClaimRequest.countDocuments(createdAtMatch(range)),
    ItemMatch.countDocuments(createdAtMatch(range)),
  ]);

  const [boardExtras, valueStats] = await Promise.all([
    getBoardExtras(),
    getValueStats(),
  ]);

  const userRoleMap = new Map(userRoleRows.map((row) => [row._id, row.count]));
  const usersByRole = ROLES.map((role) => ({
    role,
    count: userRoleMap.get(role) ?? 0,
  }));

  const activityByBuilding = lfBuildingRows
    .filter((row) => row.name)
    .map((row) => ({
      name: row.name as string,
      nameAr: row.nameAr ?? undefined,
      building: row.name as string,
      buildingAr: row.nameAr ?? undefined,
      lostFound: row.count,
    }))
    .sort((a, b) => b.lostFound - a.lostFound)
    .slice(0, 6);

  const moduleVolume = [
    { module: 'Lost Items', count: lostInRange },
    { module: 'Found Items', count: foundInRange },
    { module: 'Claims', count: claimsInRange },
    { module: 'Matches', count: matchesInRange },
  ];

  return {
    role: 'SUPER_ADMIN',
    period,
    rangeStart: range.from,
    rangeEnd: range.to,
    valueStats,
    totals: {
      users,
      activeUsers,
      locations,
      buildings: buildingNames.length,
      lostItems,
      foundItems,
      openLostFoundItems,
      pendingMatches,
      pendingClaims,
    },
    latestInsights: latestInsight
      ? {
          period: latestInsight.period,
          generatedAt: latestInsight.generatedAt,
          rangeStart: latestInsight.rangeStart,
          rangeEnd: latestInsight.rangeEnd,
          insights: latestInsight.insights,
        }
      : null,
    analytics: {
      usersByRole,
      activityByBuilding,
      moduleVolume,
    },
    recentItems: boardExtras.recentItems,
    urgentQueue: boardExtras.urgentQueue,
  };
}

async function getManagerDashboard(
  period: DashboardPeriod,
  range: PeriodRange,
): Promise<ManagerDashboard> {
  const [
    totalLostItems,
    totalFoundItems,
    openLostItems,
    openFoundItems,
    pendingMatches,
    pendingClaims,
    underVerificationClaims,
    claimsAwaitingHandover,
    completedHandovers,
    itemStatusRows,
    categoryReportRows,
    claimStatusRows,
  ] = await Promise.all([
    LostFoundItem.countDocuments({ reportType: 'LOST' }),
    LostFoundItem.countDocuments({ reportType: 'FOUND' }),
    LostFoundItem.countDocuments({ reportType: 'LOST', status: 'OPEN' }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', status: 'OPEN' }),
    ItemMatch.countDocuments({ status: 'SUGGESTED' }),
    ClaimRequest.countDocuments({ status: 'PENDING_REVIEW' }),
    ClaimRequest.countDocuments({ status: 'UNDER_VERIFICATION' }),
    ClaimRequest.countDocuments({ status: 'APPROVED' }),
    ClaimRequest.countDocuments({ status: 'COMPLETED' }),
    LostFoundItem.aggregate<CountRow>([
      { $match: createdAtMatch(range) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LostFoundItem.aggregate<{ _id: { category: string; reportType: string }; count: number }>([
      { $match: createdAtMatch(range) },
      { $group: { _id: { category: '$category', reportType: '$reportType' }, count: { $sum: 1 } } },
    ]),
    ClaimRequest.aggregate<CountRow>([
      { $match: createdAtMatch(range) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const itemStatusMap = new Map(itemStatusRows.map((row) => [row._id, row.count]));
  const itemsByStatus = ITEM_STATUSES.map((status) => ({
    status,
    count: itemStatusMap.get(status) ?? 0,
  }));

  const categoryMap = new Map<string, { lost: number; found: number }>();
  categoryReportRows.forEach((row) => {
    const cat = row._id.category;
    if (!cat) return;
    const current = categoryMap.get(cat) ?? { lost: 0, found: 0 };
    if (row._id.reportType === 'LOST') current.lost = row.count;
    if (row._id.reportType === 'FOUND') current.found = row.count;
    categoryMap.set(cat, current);
  });
  const itemsByCategory = Array.from(categoryMap.entries())
    .map(([category, counts]) => ({
      category,
      lost: counts.lost,
      found: counts.found,
    }))
    .sort((a, b) => b.lost + b.found - (a.lost + a.found))
    .slice(0, 6);

  const [boardExtras, valueStats] = await Promise.all([
    getBoardExtras(),
    getValueStats(),
  ]);

  const claimStatusMap = new Map(claimStatusRows.map((row) => [row._id, row.count]));
  const claimsByStatus = CLAIM_STATUSES.map((status) => ({
    status,
    count: claimStatusMap.get(status) ?? 0,
  }));

  return {
    role: 'LOST_FOUND_MANAGER',
    period,
    rangeStart: range.from,
    rangeEnd: range.to,
    valueStats,
    counts: {
      totalLostItems,
      totalFoundItems,
      openLostItems,
      openFoundItems,
      pendingMatches,
      pendingClaims,
      underVerificationClaims,
      claimsAwaitingHandover,
      completedHandovers,
    },
    analytics: {
      itemsByStatus,
      itemsByCategory,
      claimsByStatus,
    },
    recentItems: boardExtras.recentItems,
    urgentQueue: boardExtras.urgentQueue,
  };
}

async function getStudentDashboard(
  actor: DashboardActor,
  period: DashboardPeriod,
  range: PeriodRange,
): Promise<StudentDashboard> {
  const userId = new Types.ObjectId(actor.id);
  const rangeMatch = createdAtMatch(range);

  const [
    claimStatusRows,
    recentClaims,
    reportTypeRows,
    recentReports,
    unreadCount,
    recentNotifications,
  ] = await Promise.all([
    ClaimRequest.aggregate<CountRow>([
      { $match: { claimantId: userId, ...rangeMatch } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ClaimRequest.find({ claimantId: userId, ...rangeMatch })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('itemId', 'itemTitle itemTitleAr category images')
      .lean(),
    LostFoundItem.aggregate<CountRow>([
      { $match: { reporterId: userId, ...rangeMatch } },
      { $group: { _id: '$reportType', count: { $sum: 1 } } },
    ]),
    LostFoundItem.find({ reporterId: userId, ...rangeMatch })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reportNumber reportType itemTitle itemTitleAr category status images createdAt')
      .lean(),
    Notification.countDocuments({ userId, isRead: false }),
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type title message titleKey messageKey params linkUrl isRead createdAt')
      .lean(),
  ]);

  const totalClaims = claimStatusRows.reduce((sum, row) => sum + row.count, 0);
  const lost = reportTypeRows.find((row) => row._id === 'LOST')?.count ?? 0;
  const found = reportTypeRows.find((row) => row._id === 'FOUND')?.count ?? 0;

  return {
    role: actor.role === 'EMPLOYEE' ? 'EMPLOYEE' : 'STUDENT',
    period,
    rangeStart: range.from,
    rangeEnd: range.to,
    claims: {
      total: totalClaims,
      recent: recentClaims.map((claim) => {
        const item = claim.itemId as unknown as {
          itemTitle?: string;
          itemTitleAr?: string;
          category?: string;
          images?: Array<{ url?: string }>;
        } | null;
        return {
          id: claim._id.toString(),
          claimNumber: claim.claimNumber,
          itemTitle: item?.itemTitle ?? 'Lost & found item',
          itemTitleAr: item?.itemTitleAr,
          itemCategory: item?.category,
          itemImageUrl: firstImageUrl(item),
          status: claim.status,
          createdAt: claim.createdAt,
        };
      }),
    },
    reports: {
      total: lost + found,
      lost,
      found,
      recent: recentReports.map((report) => ({
        id: report._id.toString(),
        reportNumber: report.reportNumber,
        reportType: report.reportType,
        itemTitle: report.itemTitle,
        itemTitleAr: (report as unknown as { itemTitleAr?: string }).itemTitleAr,
        category: report.category,
        imageUrl: firstImageUrl(report as unknown as ItemImageDoc),
        status: report.status,
        createdAt: report.createdAt,
      })),
    },
    notifications: {
      unreadCount,
      recent: recentNotifications.map((notification) => {
        const localized = applyNotificationLocalization(notification);
        return {
          id: notification._id.toString(),
          title: localized.title,
          titleKey: localized.titleKey,
          message: localized.message,
          messageKey: localized.messageKey,
          params: localized.params,
          linkUrl: notification.linkUrl,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        };
      }),
    },
  };
}

/**
 * Builds the role-specific dashboard payload. The role always comes from the
 * authenticated user; there is no role parameter.
 */
export async function getDashboard(
  actor: DashboardActor,
  period: DashboardPeriod,
): Promise<DashboardResponse> {
  const range = resolvePeriodRange(period);

  switch (actor.role) {
    case 'SUPER_ADMIN':
      return getAdminDashboard(period, range);
    case 'LOST_FOUND_MANAGER':
      return getManagerDashboard(period, range);
    case 'STUDENT':
    case 'EMPLOYEE':
      return getStudentDashboard(actor, period, range);
    default: {
      const exhaustive: never = actor.role;
      throw new Error(`Unsupported dashboard role: ${String(exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Activity time series (spec 005)
// ---------------------------------------------------------------------------

export interface ActivityBucket {
  /** ISO day label of the bucket's first day (`yyyy-MM-dd`). */
  date: string;
  lost: number;
  found: number;
  returned: number;
}

export interface ActivitySeries {
  range: ActivityRange;
  granularity: 'day' | 'month';
  buckets: ActivityBucket[];
  totals: { lost: number; found: number; returned: number };
}

export interface ActivityBucketWindow {
  /** Lookup key: `yyyy-MM-dd` for day buckets, `yyyy-MM` for month buckets. */
  key: string;
  /** ISO day label of the bucket's first day (`yyyy-MM-dd`). */
  date: string;
  start: Date;
  /** Exclusive end boundary. */
  end: Date;
}

/**
 * Ordered, contiguous bucket windows for a range, always ending with the
 * bucket that contains `now`: 7 daily buckets for `week`, 30 for `month`,
 * 12 monthly buckets for `year`. Boundaries are server-local (date-fns),
 * matching how the seed and the rest of the dashboard treat days.
 */
export function buildActivityBuckets(
  range: ActivityRange,
  now: Date = new Date(),
): { granularity: 'day' | 'month'; buckets: ActivityBucketWindow[] } {
  if (range === 'year') {
    const first = startOfMonth(subMonths(now, 11));
    return {
      granularity: 'month',
      buckets: Array.from({ length: 12 }, (_, index) => {
        const start = addMonths(first, index);
        return {
          key: format(start, 'yyyy-MM'),
          date: format(start, 'yyyy-MM-dd'),
          start,
          end: addMonths(start, 1),
        };
      }),
    };
  }

  const days = range === 'week' ? 7 : 30;
  const first = startOfDay(subDays(now, days - 1));
  return {
    granularity: 'day',
    buckets: Array.from({ length: days }, (_, index) => {
      const start = addDays(first, index);
      return {
        key: format(start, 'yyyy-MM-dd'),
        date: format(start, 'yyyy-MM-dd'),
        start,
        end: addDays(start, 1),
      };
    }),
  };
}

/** Counts dates into buckets; dates outside every window are ignored. */
export function bucketizeDates(
  buckets: ActivityBucketWindow[],
  dates: Date[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const bucket = buckets.find(
      (entry) => date >= entry.start && date < entry.end,
    );
    if (bucket) {
      counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
    }
  }
  return counts;
}

/** Zero-fills tallies into an ordered series and sums the range totals. */
export function assembleActivitySeries(
  range: ActivityRange,
  granularity: 'day' | 'month',
  windows: ActivityBucketWindow[],
  tallies: {
    lost: Map<string, number>;
    found: Map<string, number>;
    returned: Map<string, number>;
  },
): ActivitySeries {
  const buckets = windows.map((window) => ({
    date: window.date,
    lost: tallies.lost.get(window.key) ?? 0,
    found: tallies.found.get(window.key) ?? 0,
    returned: tallies.returned.get(window.key) ?? 0,
  }));

  return {
    range,
    granularity,
    buckets,
    totals: {
      lost: buckets.reduce((sum, bucket) => sum + bucket.lost, 0),
      found: buckets.reduce((sum, bucket) => sum + bucket.found, 0),
      returned: buckets.reduce((sum, bucket) => sum + bucket.returned, 0),
    },
  };
}

/**
 * Campus-wide Lost & Found activity series for the Admin and Manager
 * dashboards. Counting semantics:
 * - lost / found: items bucketed by `createdAt`, the same date semantic
 *   every other dashboard aggregation in this module uses.
 * - returned: completed handovers (`ClaimRequest` status COMPLETED),
 *   bucketed by `handover.handedOverAt` — the moment the item physically
 *   changed hands — falling back to the claim's `updatedAt` for legacy
 *   completed claims with no handover timestamp. One completed handover
 *   is one item returned to its owner.
 * Tallies are computed in JS so bucket boundaries and counts share a
 * single definition of a day, with no database timezone mismatch.
 */
export async function getActivitySeries(
  range: ActivityRange,
  now: Date = new Date(),
): Promise<ActivitySeries> {
  const { granularity, buckets } = buildActivityBuckets(range, now);
  const windowStart = buckets[0]!.start;

  const [items, completedClaims] = await Promise.all([
    LostFoundItem.find({ createdAt: { $gte: windowStart } })
      .select('reportType createdAt')
      .lean(),
    ClaimRequest.find({ status: 'COMPLETED' })
      .select('handover updatedAt')
      .lean(),
  ]);

  const itemDates = (reportType: ReportType): Date[] =>
    items
      .filter((item) => item.reportType === reportType)
      .map((item) => item.createdAt);
  const handoverDates = completedClaims.map(
    (claim) => claim.handover?.handedOverAt ?? claim.updatedAt,
  );

  return assembleActivitySeries(range, granularity, buckets, {
    lost: bucketizeDates(buckets, itemDates('LOST')),
    found: bucketizeDates(buckets, itemDates('FOUND')),
    returned: bucketizeDates(buckets, handoverDates),
  });
}

interface InsightClaimDetail {
  claimNumber: string;
  status: ClaimStatus;
  createdAt: Date;
  claimantId?: { name?: string; email?: string } | null;
  itemId?: { reportNumber?: string; itemTitle?: string; itemTitleAr?: string } | null;
}

interface InsightMatchDetail {
  score: number;
  level: string;
  lostItemId?: { reportNumber?: string; itemTitle?: string; itemTitleAr?: string } | null;
  foundItemId?: { reportNumber?: string; itemTitle?: string; itemTitleAr?: string } | null;
}

interface InsightActivityDetail {
  action: string;
  entityType: string;
  description: string;
  createdAt: Date;
  actorId?: { name?: string; role?: Role } | null;
}

/**
 * Aggregated Lost & Found statistics used by the AI insights service.
 * Manager scope covers items/matches/claims only; Admin scope adds users,
 * locations and recent activity.
 */
export async function getLostFoundInsightStats(
  period: '7d' | '30d',
  scope: 'LOST_FOUND' | 'ADMIN',
  now: Date = new Date(),
): Promise<{
  stats: Record<string, unknown>;
  rangeStart: Date;
  rangeEnd: Date;
}> {
  const days = period === '7d' ? 7 : 30;
  const rangeEnd = now;
  const rangeStart = subDays(now, days);
  const range: PeriodRange = { from: rangeStart, to: rangeEnd };

  const [
    managerDashboard,
    openLostItemsCount,
    openFoundItemsCount,
    claimsAwaitingHandoverCount,
    completedHandoversCount,
    pendingClaimsList,
    suggestedMatchesList,
  ] = await Promise.all([
    getManagerDashboard(period, range),
    LostFoundItem.countDocuments({ reportType: 'LOST', status: 'OPEN' }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', status: 'OPEN' }),
    ClaimRequest.countDocuments({ status: 'APPROVED' }),
    ClaimRequest.countDocuments({ status: 'COMPLETED' }),
    ClaimRequest.find({ status: { $in: ['PENDING_REVIEW', 'UNDER_VERIFICATION', 'APPROVED'] } })
      .sort({ createdAt: 1 })
      .limit(8)
      .populate('claimantId', 'name email')
      .populate('itemId', 'reportNumber itemTitle itemTitleAr')
      .lean<InsightClaimDetail[]>(),
    ItemMatch.find({ status: 'SUGGESTED' })
      .sort({ score: -1 })
      .limit(6)
      .populate('lostItemId', 'reportNumber itemTitle itemTitleAr')
      .populate('foundItemId', 'reportNumber itemTitle itemTitleAr')
      .lean<InsightMatchDetail[]>(),
  ]);

  const lostFound = {
    totalLostItems: managerDashboard.counts.totalLostItems,
    totalFoundItems: managerDashboard.counts.totalFoundItems,
    openLostItems: openLostItemsCount,
    openFoundItems: openFoundItemsCount,
    pendingMatchesCount: managerDashboard.counts.pendingMatches,
    pendingClaimsCount: managerDashboard.counts.pendingClaims,
    claimsAwaitingHandover: claimsAwaitingHandoverCount,
    completedHandovers: completedHandoversCount,
    suggestedMatches: suggestedMatchesList.map((match) => ({
      score: match.score,
      level: match.level,
      lostCode: match.lostItemId?.reportNumber ?? null,
      lostTitle: localize(match.lostItemId?.itemTitle, match.lostItemId?.itemTitleAr),
      foundCode: match.foundItemId?.reportNumber ?? null,
      foundTitle: localize(match.foundItemId?.itemTitle, match.foundItemId?.itemTitleAr),
    })),
    activeClaims: pendingClaimsList.map((claim) => ({
      code: claim.claimNumber,
      status: claim.status,
      claimant: claim.claimantId?.name ?? 'Unknown claimant',
      itemCode: claim.itemId?.reportNumber ?? null,
      itemTitle: localize(claim.itemId?.itemTitle, claim.itemId?.itemTitleAr),
      daysOpen: ageInDays(claim.createdAt, now),
    })),
  };

  if (scope === 'LOST_FOUND') {
    return {
      stats: { scope: 'LOST_FOUND', period, rangeStart, rangeEnd, lostFound },
      rangeStart,
      rangeEnd,
    };
  }

  const [adminDashboard, inactiveUsers, inactiveLocationsCount, recentLogs] =
    await Promise.all([
      getAdminDashboard(period, range),
      User.find({ isActive: false })
        .select('name email role department departmentAr')
        .limit(10)
        .lean<Array<{ name: string; email: string; role: Role; department?: string; departmentAr?: string }>>(),
      Location.countDocuments({ isActive: false }),
      ActivityLog.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actorId', 'name role')
        .lean<InsightActivityDetail[]>(),
    ]);

  const stats = {
    scope: 'ADMIN',
    period,
    rangeStart,
    rangeEnd,
    users: {
      total: adminDashboard.totals.users,
      active: adminDashboard.totals.activeUsers,
      inactive: Math.max(0, adminDashboard.totals.users - adminDashboard.totals.activeUsers),
      byRole: adminDashboard.analytics.usersByRole,
      inactiveAccounts: inactiveUsers.map((user) => ({
        name: user.name,
        email: user.email,
        role: user.role,
        department: localize(user.department, user.departmentAr),
      })),
    },
    locations: {
      activeLocations: adminDashboard.totals.locations,
      inactiveLocations: inactiveLocationsCount,
      buildings: adminDashboard.totals.buildings,
      activityByBuilding: adminDashboard.analytics.activityByBuilding.map((entry) => ({
        building: localize(entry.name || entry.building, entry.nameAr || entry.buildingAr),
        lostFoundReports: entry.lostFound,
        totalActivity: entry.lostFound,
      })),
    },
    lostFound,
    recentActivity: recentLogs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      actor: log.actorId?.name ?? 'System',
      actorRole: log.actorId?.role ?? null,
      description: log.description,
      createdAt: log.createdAt,
    })),
  };

  return { stats, rangeStart, rangeEnd };
}
