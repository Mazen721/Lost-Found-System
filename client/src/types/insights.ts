export interface InsightContent {
  observations: string[];
  repeatedPatterns: string[];
  operationalRisks: string[];
  preventiveRecommendations: string[];
}

export interface LostFoundInsightStats {
  totalLostItems: number;
  totalFoundItems: number;
  openLostItems: number;
  openFoundItems: number;
  pendingMatchesCount: number;
  pendingClaimsCount: number;
  claimsAwaitingHandover: number;
  completedHandovers: number;
  suggestedMatches?: Array<{
    score: number;
    level: string;
    lostCode: string | null;
    lostTitle: string;
    foundCode: string | null;
    foundTitle: string;
  }>;
  activeClaims?: Array<{
    code: string;
    status: string;
    claimant: string;
    itemCode: string | null;
    itemTitle: string;
    daysOpen: number;
  }>;
}

export interface InsightStats {
  scope?: 'LOST_FOUND' | 'ADMIN';
  period?: string;
  users?: {
    total: number;
    active: number;
    inactive: number;
    byRole?: Array<{ role: string; count: number }>;
    inactiveAccounts?: Array<{
      name: string;
      email: string;
      role: string;
      department?: string;
    }>;
  };
  locations?: {
    activeLocations: number;
    inactiveLocations: number;
    buildings: number;
    activityByBuilding?: Array<{
      building: string;
      lostFoundReports: number;
      totalActivity: number;
    }>;
  };
  lostFound?: LostFoundInsightStats;
  recentActivity?: Array<{
    action: string;
    entityType: string;
    actor: string;
    actorRole: string | null;
    description: string;
    createdAt: string;
  }>;
}

export interface LostFoundInsightsResponse {
  available: boolean;
  stats: InsightStats;
  insights?: InsightContent;
  generatedAt?: string;
  rangeStart: string;
  rangeEnd: string;
  message?: string;
}
