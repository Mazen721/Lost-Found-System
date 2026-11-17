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
