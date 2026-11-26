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
  LOST_FOUND_CATEGORIES,
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

/**
 * Staff-only distribution breakdowns (spec 009) for the Statistics page:
 * all-time item counts by category and status, plus the five busiest
 * locations. Like `valueStats`, they ignore the dashboard period and
 * never appear on the student/employee payload.
 */
export interface DashboardBreakdowns {
  itemsByCategory: Array<{
    category: string;
    lost: number;
    found: number;
    total: number;
  }>;
  itemsByStatus: Array<{ status: string; count: number }>;
  locationsTop: Array<{
    locationId: string;
    name: string;
    nameAr?: string;
    count: number;
    lost: number;
    found: number;
    /** Share of all reported items, 1-decimal percent (spec 011). */
    sharePercent: number;
  }>;
}

/**
 * Staff-only recovery statistics (spec 011): what came back, how fast.
 * Computed over the canonical return set (see `selectCanonicalReturns`).
 * `returnRate` is the LINKED recovery rate — distinct lost reports
 * recovered via a linked completed claim over all lost reports — so it
 * is bounded in [0, 1]; it is `null` when there are no lost reports at
 * all. The day averages publish their sample sizes alongside: the
 * recovery average covers linked claims only, the processing average
 * covers every canonical claim from its filing to the handover.
 */
export interface RecoveryStats {
  returnedCount: number;
  linkedReturnedCount: number;
  totalLostReports: number;
  returnRate: number | null;
  averageDaysToReturn: number;
  medianDaysToReturn: number;
  recoverySampleSize: number;
  averageDaysClaimToHandover: number;
  claimSampleSize: number;
  excludedNegativeDurations: number;
}

/**
 * One stale item (spec 011): an active report with no recorded movement
 * — on the item itself or on any claim filed on it — for 14+ days.
 */
export interface StaleItem {
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
  ageDays: number;
  lastMovementAt: Date;
  reporterRole: Role;
}

export interface AdminDashboard {
  role: 'SUPER_ADMIN';
  period: DashboardPeriod;
  rangeStart: Date | null;
  rangeEnd: Date;
  valueStats: ValueStats;
  breakdowns: DashboardBreakdowns;
  recoveryStats: RecoveryStats;
  staleItems: StaleItem[];
  staleCount: number;
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
  breakdowns: DashboardBreakdowns;
  recoveryStats: RecoveryStats;
  staleItems: StaleItem[];
  staleCount: number;
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

/** «Building — Room» display names for a location, in both languages. */
export function locationDisplayName(location: {
  buildingName: string;
  buildingNameAr?: string | null;
  room?: string | null;
  roomAr?: string | null;
}): { name: string; nameAr?: string } {
  return {
    name: location.room
      ? `${location.buildingName} — ${location.room}`
      : location.buildingName,
    nameAr: location.buildingNameAr
      ? location.roomAr
        ? `${location.buildingNameAr} — ${location.roomAr}`
        : location.buildingNameAr
      : undefined,
  };
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
      LostFoundItem.find({ publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } })
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

interface CompletedClaimForValue {
  itemId: unknown;
  handover?: { handedOverAt?: Date | null } | null;
  updatedAt: Date;
}

/**
 * The minimal claim shape the canonical return machinery (spec 011)
 * works on. `itemId` may be a raw ObjectId or a populated item
 * document depending on the caller; `idKey` unwraps both.
 */
export interface CanonicalClaim {
  _id: unknown;
  itemId: unknown;
  linkedLostItemId?: unknown;
  handover?: { handedOverAt?: Date | null } | null;
  updatedAt: Date;
  createdAt: Date;
}

function idKey(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

/**
 * The moment a completed claim physically returned its item:
 * the recorded handover time, falling back to the claim's `updatedAt`
 * for legacy completed claims (the spec-005/008 instant).
 */
export function handoverInstant(claim: CanonicalClaim): Date {
  return claim.handover?.handedOverAt ?? claim.updatedAt;
}

function compareCanonicalClaims(a: CanonicalClaim, b: CanonicalClaim): number {
  const byInstant = handoverInstant(a).getTime() - handoverInstant(b).getTime();
  if (byInstant !== 0) return byInstant;
  // Prefer the claim that carries a lost-report link: it holds the
  // recovery's true start date.
  const aLinked = a.linkedLostItemId ? 0 : 1;
  const bLinked = b.linkedLostItemId ? 0 : 1;
  if (aLinked !== bLinked) return aLinked - bLinked;
  const aId = idKey(a._id);
  const bId = idKey(b._id);
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

/**
 * The canonical return set (spec 011): one claim per physical return.
 * Claims are ordered by `compareCanonicalClaims`, then selected in two
 * passes — first one claim per claimed item, then one claim per
 * linked lost item — so an object logged twice as found and claimed
 * twice against one lost report still counts as a single return.
 * Spec 008's returned values and spec 011's recovery stats and export
 * all select their winners through this one rule.
 */
export function selectCanonicalReturns<T extends CanonicalClaim>(
  claims: readonly T[],
): T[] {
  const sorted = [...claims].sort(compareCanonicalClaims);
  const byItem = new Map<string, T>();
  for (const claim of sorted) {
    const key = idKey(claim.itemId);
    if (!byItem.has(key)) byItem.set(key, claim);
  }
  const seenLinks = new Set<string>();
  const selected: T[] = [];
  for (const claim of byItem.values()) {
    if (claim.linkedLostItemId) {
      const linkKey = idKey(claim.linkedLostItemId);
      if (seenLinks.has(linkKey)) continue;
      seenLinks.add(linkKey);
    }
    selected.push(claim);
  }
  return selected;
}

const DAY_MS = 86_400_000;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * Pure summarisation of the canonical return set into `RecoveryStats`.
 * `lostCreatedAtById` must contain ONLY lost items, so a link counts
 * as resolvable exactly when the map holds its id.
 */
export function summarizeRecovery(
  canonical: readonly CanonicalClaim[],
  lostCreatedAtById: ReadonlyMap<string, Date>,
  totalLostReports: number,
): RecoveryStats {
  const linkedIds = new Set<string>();
  const recoveryDurations: number[] = [];
  const processingDurations: number[] = [];
  let excludedNegativeDurations = 0;

  for (const claim of canonical) {
    const instant = handoverInstant(claim);
    const processingDays = (instant.getTime() - claim.createdAt.getTime()) / DAY_MS;
    if (processingDays >= 0) processingDurations.push(processingDays);

    if (!claim.linkedLostItemId) continue;
    const linkKey = idKey(claim.linkedLostItemId);
    const lostCreatedAt = lostCreatedAtById.get(linkKey);
    if (!lostCreatedAt) continue;
    linkedIds.add(linkKey);
    const days = (instant.getTime() - lostCreatedAt.getTime()) / DAY_MS;
    if (days < 0) {
      // Retroactively linked report filed after the handover: the
      // return is real, but it has no honest duration — exclude it
      // from the averages instead of clamping it to a fake 0.
      excludedNegativeDurations += 1;
    } else {
      recoveryDurations.push(days);
    }
  }

  const linkedReturnedCount = linkedIds.size;
  return {
    returnedCount: canonical.length,
    linkedReturnedCount,
    totalLostReports,
    returnRate:
      totalLostReports === 0
        ? null
        : roundTo(linkedReturnedCount / totalLostReports, 4),
    averageDaysToReturn: roundTo(mean(recoveryDurations), 1),
    medianDaysToReturn: roundTo(median(recoveryDurations), 1),
    recoverySampleSize: recoveryDurations.length,
    averageDaysClaimToHandover: roundTo(mean(processingDurations), 1),
    claimSampleSize: processingDurations.length,
    excludedNegativeDurations,
  };
}

/** Loads the completed claims the canonical machinery runs on. */
export async function loadCompletedClaims(): Promise<CanonicalClaim[]> {
  const claims = await ClaimRequest.find({ status: 'COMPLETED' })
    .select('itemId linkedLostItemId handover updatedAt createdAt')
    .lean();
  return claims as unknown as CanonicalClaim[];
}

export async function getRecoveryStats(): Promise<RecoveryStats> {
  const [claims, totalLostReports] = await Promise.all([
    loadCompletedClaims(),
    LostFoundItem.countDocuments({ reportType: 'LOST', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
  ]);
  const canonical = selectCanonicalReturns(claims);

  const linkedIds = [
    ...new Set(
      canonical
        .map((claim) => claim.linkedLostItemId)
        .filter(Boolean)
        .map((value) => idKey(value)),
    ),
  ];
  const lostItems =
    linkedIds.length > 0
      ? await LostFoundItem.find({
          _id: { $in: linkedIds },
          reportType: 'LOST',
        })
          .select('createdAt')
          .lean()
      : [];
  const lostCreatedAtById = new Map(
    lostItems.map((item) => [item._id.toString(), item.createdAt]),
  );

  return summarizeRecovery(canonical, lostCreatedAtById, totalLostReports);
}

// ---------------------------------------------------------------------------
// Stale items (spec 011)
// ---------------------------------------------------------------------------

/** Active, awaiting-action statuses eligible for the stale list. */
const STALE_ITEM_STATUSES = ['OPEN', 'MATCH_CONFIRMED', 'CLAIM_UNDER_REVIEW'];
const STALE_THRESHOLD_DAYS = 14;
export const STALE_LIST_CAP = 20;

export interface StaleComputation {
  items: StaleItem[];
  count: number;
}

/**
 * Every stale item (uncapped), stalest first, from one snapshot: an
 * item is stale when neither the item record nor any claim filed on
 * it has moved for 14+ days. Count and list come from this single
 * computation so they can never disagree across a boundary.
 */
export async function computeStaleItems(
  now: Date = new Date(),
): Promise<StaleComputation> {
  // Production-readiness pass (2026-11-22): an item can only be stale
  // when its own updatedAt is already past the cutoff (last movement is
  // max(item.updatedAt, lastClaimAt)), so that necessary condition is
  // pushed into the query — previously EVERY active item was loaded into
  // JS on every dashboard call. Served by the (status, updatedAt) index.
  const staleCutoff = new Date(now.getTime() - STALE_THRESHOLD_DAYS * DAY_MS);
  const candidates = await LostFoundItem.find({
    status: { $in: STALE_ITEM_STATUSES },
    publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] },
    updatedAt: { $lte: staleCutoff },
  })
    .select(
      'reportNumber reportType itemTitle itemTitleAr category status images updatedAt reporterId',
    )
    .populate('locationId', 'buildingName buildingNameAr')
    .populate('reporterId', 'role')
    .lean();
  if (candidates.length === 0) return { items: [], count: 0 };

  const claimRows = await ClaimRequest.aggregate<{
    _id: Types.ObjectId;
    lastClaimAt: Date;
  }>([
    { $match: { itemId: { $in: candidates.map((item) => item._id) } } },
    { $group: { _id: '$itemId', lastClaimAt: { $max: '$updatedAt' } } },
  ]);
  const lastClaimAtByItem = new Map(
    claimRows.map((row) => [row._id.toString(), row.lastClaimAt]),
  );

  const cutoff = now.getTime() - STALE_THRESHOLD_DAYS * DAY_MS;
  const stale = candidates
    .map((item) => {
      const claimAt = lastClaimAtByItem.get(item._id.toString());
      const lastMovementAt =
        claimAt && claimAt > item.updatedAt ? claimAt : item.updatedAt;
      return { item, lastMovementAt };
    })
    .filter((entry) => entry.lastMovementAt.getTime() <= cutoff)
    .sort(
      (a, b) =>
        a.lastMovementAt.getTime() - b.lastMovementAt.getTime() ||
        (a.item._id.toString() < b.item._id.toString() ? -1 : 1),
    );

  return {
    count: stale.length,
    items: stale.map(({ item, lastMovementAt }) => {
      const location = item.locationId as unknown as {
        buildingName?: string;
        buildingNameAr?: string;
      } | null;
      const reporter = item.reporterId as unknown as { role?: Role } | null;
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
        ageDays: ageInDays(lastMovementAt, now),
        lastMovementAt,
        reporterRole: reporter?.role ?? 'STUDENT',
      };
    }),
  };
}

/** The dashboard-payload view of the stale computation (capped list). */
export async function getStaleSummary(
  now: Date = new Date(),
): Promise<{ staleItems: StaleItem[]; staleCount: number }> {
  const { items, count } = await computeStaleItems(now);
  return { staleItems: items.slice(0, STALE_LIST_CAP), staleCount: count };
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

  // Production-readiness pass (2026-11-22): the lost-side sums used to
  // load EVERY lost item into JS. They are now two aggregation sums in
  // the database (total + current month) with identical semantics
  // (missing estimatedValueEGP counts as 0 via $ifNull).
  const [lostAgg, completedClaims] = await Promise.all([
    LostFoundItem.aggregate<{ totalEGP: number; thisMonthEGP: number }>([
      { $match: { reportType: 'LOST', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      {
        $group: {
          _id: null,
          totalEGP: { $sum: { $ifNull: ['$estimatedValueEGP', 0] } },
          thisMonthEGP: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', monthStart] },
                    { $lt: ['$createdAt', nextMonthStart] },
                  ],
                },
                { $ifNull: ['$estimatedValueEGP', 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
    ClaimRequest.find({ status: 'COMPLETED' })
      .select('itemId linkedLostItemId handover updatedAt createdAt')
      .populate('itemId', '+estimatedValueEGP')
      .lean(),
  ]);

  const lost: ValueSums = {
    totalEGP: lostAgg[0]?.totalEGP ?? 0,
    thisMonthEGP: lostAgg[0]?.thisMonthEGP ?? 0,
  };
  // Spec 011: the canonical winner decides which handover instant
  // buckets an item's value, so the value figures and the recovery
  // figures always describe the same returns.
  const returned = sumReturnedItemValues(
    selectCanonicalReturns(
      completedClaims as unknown as CanonicalClaim[],
    ) as unknown as CompletedClaimForValue[],
    inCurrentMonth,
  );

  return {
    lostValueThisMonthEGP: lost.thisMonthEGP,
    returnedValueThisMonthEGP: returned.thisMonthEGP,
    totalLostValueEGP: lost.totalEGP,
    totalReturnedValueEGP: returned.totalEGP,
  };
}

/**
 * All-time distribution breakdowns for the Statistics page (spec 009).
 * Categories and statuses are zero-filled over their full enum lists so
 * the page renders a stable shape; locations are the five busiest by
 * item count, hydrated with their building + room names.
 */
export interface LocationTypeCounts {
  locationId: Types.ObjectId;
  lost: number;
  found: number;
  count: number;
}

/**
 * Fold (location, reportType) aggregation rows into per-location
 * lost/found splits, ranked by count with the location-id tiebreak —
 * the one ranking rule shared by the Statistics-page top-5 and the
 * monthly report's top-10 (spec 011), so the two surfaces can never
 * drift apart.
 */
export function foldLocationTypeRows(
  rows: Array<{
    _id: { locationId: Types.ObjectId; reportType: string };
    count: number;
  }>,
): LocationTypeCounts[] {
  const totals = new Map<string, LocationTypeCounts>();
  for (const row of rows) {
    if (!row._id?.locationId) continue;
    const key = row._id.locationId.toString();
    const current = totals.get(key) ?? {
      locationId: row._id.locationId,
      lost: 0,
      found: 0,
      count: 0,
    };
    if (row._id.reportType === 'LOST') current.lost += row.count;
    if (row._id.reportType === 'FOUND') current.found += row.count;
    current.count += row.count;
    totals.set(key, current);
  }
  return [...totals.values()].sort(
    (a, b) =>
      b.count - a.count ||
      (a.locationId.toString() < b.locationId.toString() ? -1 : 1),
  );
}

export async function getBreakdowns(): Promise<DashboardBreakdowns> {
  const [categoryRows, statusRows, locationRows] = await Promise.all([
    LostFoundItem.aggregate<{
      _id: { category: string; reportType: string };
      count: number;
    }>([
      { $match: { publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      {
        $group: {
          _id: { category: '$category', reportType: '$reportType' },
          count: { $sum: 1 },
        },
      },
    ]),
    LostFoundItem.aggregate<CountRow>([
      { $match: { publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LostFoundItem.aggregate<{
      _id: { locationId: Types.ObjectId; reportType: string };
      count: number;
    }>([
      { $match: { publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      {
        $group: {
          _id: { locationId: '$locationId', reportType: '$reportType' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const categoryMap = new Map<string, { lost: number; found: number }>();
  for (const row of categoryRows) {
    if (!row._id?.category) continue;
    const current = categoryMap.get(row._id.category) ?? { lost: 0, found: 0 };
    if (row._id.reportType === 'LOST') current.lost += row.count;
    if (row._id.reportType === 'FOUND') current.found += row.count;
    categoryMap.set(row._id.category, current);
  }
  const itemsByCategory = LOST_FOUND_CATEGORIES.map((category) => {
    const counts = categoryMap.get(category) ?? { lost: 0, found: 0 };
    return {
      category,
      lost: counts.lost,
      found: counts.found,
      total: counts.lost + counts.found,
    };
  }).sort((a, b) => b.total - a.total);

  const statusMap = new Map(statusRows.map((row) => [row._id, row.count]));
  const itemsByStatus = ITEM_STATUSES.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  }));

  const topLocations = foldLocationTypeRows(locationRows).slice(0, 5);

  const totalItems = statusRows.reduce((sum, row) => sum + row.count, 0);

  const locations = await Location.find({
    _id: { $in: topLocations.map((row) => row.locationId) },
  })
    .select('buildingName buildingNameAr room roomAr')
    .lean();
  const locationById = new Map(
    locations.map((location) => [location._id.toString(), location]),
  );
  const locationsTop = topLocations.flatMap((row) => {
    const location = locationById.get(row.locationId.toString());
    if (!location) return [];
    const { name, nameAr } = locationDisplayName(location);
    return [
      {
        locationId: row.locationId.toString(),
        name,
        nameAr,
        count: row.count,
        lost: row.lost,
        found: row.found,
        sharePercent:
          totalItems > 0 ? roundTo((row.count / totalItems) * 100, 1) : 0,
      },
    ];
  });

  return { itemsByCategory, itemsByStatus, locationsTop };
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
    LostFoundItem.countDocuments({ reportType: 'LOST', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ status: { $in: ['OPEN', 'MATCH_CONFIRMED'] }, publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    ItemMatch.countDocuments({ status: 'SUGGESTED' }),
    ClaimRequest.countDocuments({ status: { $in: ['PENDING_REVIEW', 'UNDER_VERIFICATION'] } }),
    AiInsightCache.findOne({ scope: 'ADMIN', lang: 'ar' })
      .sort({ generatedAt: -1 })
      .lean()
      .then((cached) => cached ?? AiInsightCache.findOne({ scope: 'ADMIN' }).sort({ generatedAt: -1 }).lean()),
    User.aggregate<CountRow>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    LostFoundItem.aggregate<BuildingCountRow>([
      { $match: { ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
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
    LostFoundItem.countDocuments({ reportType: 'LOST', ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    ClaimRequest.countDocuments(createdAtMatch(range)),
    ItemMatch.countDocuments(createdAtMatch(range)),
  ]);

  const [boardExtras, valueStats, breakdowns, recoveryStats, stale] =
    await Promise.all([
      getBoardExtras(),
      getValueStats(),
      getBreakdowns(),
      getRecoveryStats(),
      getStaleSummary(),
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
    breakdowns,
    recoveryStats,
    staleItems: stale.staleItems,
    staleCount: stale.staleCount,
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
    LostFoundItem.countDocuments({ reportType: 'LOST', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'LOST', status: 'OPEN', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', status: 'OPEN', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    ItemMatch.countDocuments({ status: 'SUGGESTED' }),
    ClaimRequest.countDocuments({ status: 'PENDING_REVIEW' }),
    ClaimRequest.countDocuments({ status: 'UNDER_VERIFICATION' }),
    ClaimRequest.countDocuments({ status: 'APPROVED' }),
    ClaimRequest.countDocuments({ status: 'COMPLETED' }),
    LostFoundItem.aggregate<CountRow>([
      { $match: { ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LostFoundItem.aggregate<{ _id: { category: string; reportType: string }; count: number }>([
      { $match: { ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
      { $group: { _id: { category: '$category', reportType: '$reportType' }, count: { $sum: 1 } } },
    ]),
    ClaimRequest.aggregate<CountRow>([
      { $match: { ...createdAtMatch(range), publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } } },
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

  const [boardExtras, valueStats, breakdowns, recoveryStats, stale] =
    await Promise.all([
      getBoardExtras(),
      getValueStats(),
      getBreakdowns(),
      getRecoveryStats(),
      getStaleSummary(),
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
    breakdowns,
    recoveryStats,
    staleItems: stale.staleItems,
    staleCount: stale.staleCount,
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
    LostFoundItem.find({ createdAt: { $gte: windowStart }, publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } })
      .select('reportType createdAt')
      .lean(),
    // Production-readiness pass (2026-11-22): previously EVERY completed
    // claim ever was loaded; only claims whose effective return date
    // (handover.handedOverAt, falling back to updatedAt) falls inside the
    // window can land in a bucket, so the window is pushed into the query.
    ClaimRequest.find({
      status: 'COMPLETED',
      $or: [
        { 'handover.handedOverAt': { $gte: windowStart } },
        { 'handover.handedOverAt': null, updatedAt: { $gte: windowStart } },
      ],
    })
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
    LostFoundItem.countDocuments({ reportType: 'LOST', status: 'OPEN', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', status: 'OPEN', publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] } }),
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
