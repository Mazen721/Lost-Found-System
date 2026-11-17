import { z } from 'zod';

export const DASHBOARD_PERIODS = ['7d', '30d', '90d', 'all'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const dashboardQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).default('30d'),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const ACTIVITY_RANGES = ['week', 'month', 'year'] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

export const activitySeriesQuerySchema = z.object({
  range: z.enum(ACTIVITY_RANGES).default('month'),
});

export type ActivitySeriesQuery = z.infer<typeof activitySeriesQuerySchema>;
