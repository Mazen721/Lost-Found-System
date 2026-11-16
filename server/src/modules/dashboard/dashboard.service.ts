import { subDays } from 'date-fns';
import { Types } from 'mongoose';
import {
  CLAIM_STATUSES,
  ITEM_STATUSES,
  ROLES,
  type ClaimStatus,
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
import type { DashboardPeriod } from './dashboard.validation';

export interface DashboardActor {
  id: string;
  role: Role;
}

export interface PeriodRange {
  from: Date | null;
  to: Date;
}

export interface AdminDashboard {
  role: 'SUPER_ADMIN';
  period: DashboardPeriod;
  rangeStart: Date | null;
  rangeEnd: Date;
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
      .populate('itemId', 'itemTitle itemTitleAr')
      .lean(),
    LostFoundItem.aggregate<CountRow>([
      { $match: { reporterId: userId, ...rangeMatch } },
      { $group: { _id: '$reportType', count: { $sum: 1 } } },
    ]),
    LostFoundItem.find({ reporterId: userId, ...rangeMatch })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reportNumber reportType itemTitle itemTitleAr status createdAt')
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
        const item = claim.itemId as unknown as { itemTitle?: string; itemTitleAr?: string } | null;
        return {
          id: claim._id.toString(),
          claimNumber: claim.claimNumber,
          itemTitle: item?.itemTitle ?? 'Lost & found item',
          itemTitleAr: item?.itemTitleAr,
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
