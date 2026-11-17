import type { Role } from '@/types/auth';
import type { InsightContent } from '@/types/insights';

export const DASHBOARD_PERIODS = ['7d', '30d', '90d', 'all'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

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
  createdAt: string;
}

export interface UrgentQueueClaim {
  id: string;
  claimNumber: string;
  itemTitle: string;
  itemTitleAr?: string;
  itemImageUrl: string | null;
  createdAt: string;
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
    createdAt: string;
  }>;
  handoversWaiting: UrgentQueueClaim[];
}

interface DashboardBase {
  period: DashboardPeriod;
  rangeStart: string | null;
  rangeEnd: string;
}

/**
 * Staff-only value aggregates (spec 008). Present only on the Admin and
 * Manager dashboard payloads; the student/employee payload never
 * carries this block.
 */
export interface ValueStats {
  lostValueThisMonthEGP: number;
  returnedValueThisMonthEGP: number;
  totalLostValueEGP: number;
  totalReturnedValueEGP: number;
}

/**
 * Staff-only distribution breakdowns (spec 009), rendered on the
 * Statistics page. Present only on the Admin and Manager payloads.
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
    /** Spec 011: lost/found split + share of ALL reports (server-side). */
    lost: number;
    found: number;
    sharePercent: number;
  }>;
}

/**
 * Staff-only recovery indicators (spec 011). Present only on the Admin
 * and Manager dashboard payloads. The return rate counts only returns
 * linked to a lost report (a physical recovery counts once), so it can
 * never exceed 100%; it is null when there are no lost reports at all.
 * Day averages are measured over linked recoveries only.
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
 * Staff-only stale item (spec 011): an active report with no movement —
 * no edit, no claim activity — for 14+ days. Present only on the Admin
 * and Manager payloads (capped list + full count).
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
  lastMovementAt: string;
  reporterRole: Role;
}

export interface AdminDashboard extends DashboardBase {
  role: 'SUPER_ADMIN';
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
    generatedAt: string;
    rangeStart: string;
    rangeEnd: string;
    insights: InsightContent;
  } | null;
  analytics: {
    usersByRole: Array<{ role: Role; count: number }>;
    activityByBuilding: Array<{
      name?: string;
      nameAr?: string;
      building: string;
      buildingAr?: string;
      lostFound: number;
    }>;
    moduleVolume: Array<{ module: string; count: number }>;
  };
  recentItems: DashboardItemCard[];
  urgentQueue: UrgentQueue;
  valueStats: ValueStats;
  breakdowns: DashboardBreakdowns;
  recoveryStats: RecoveryStats;
  staleItems: StaleItem[];
  staleCount: number;
}

export interface ManagerDashboard extends DashboardBase {
  role: 'LOST_FOUND_MANAGER';
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
  valueStats: ValueStats;
  breakdowns: DashboardBreakdowns;
  recoveryStats: RecoveryStats;
  staleItems: StaleItem[];
  staleCount: number;
}

export interface StudentDashboard extends DashboardBase {
  role: 'STUDENT' | 'EMPLOYEE';
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
      createdAt: string;
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
      createdAt: string;
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
      createdAt: string;
    }>;
  };
}

export type DashboardResponse = AdminDashboard | ManagerDashboard | StudentDashboard;

export const ACTIVITY_RANGES = ['week', 'month', 'year'] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

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
