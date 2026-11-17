import { api } from '@/lib/api';
import { toQueryString } from '@/lib/queryString';
import type {
  ActivityRange,
  ActivitySeries,
  DashboardPeriod,
  DashboardResponse,
} from '@/types/dashboard';

export const dashboardApi = {
  get(period: DashboardPeriod): Promise<DashboardResponse> {
    return api.get<DashboardResponse>(`/dashboard${toQueryString({ period })}`);
  },

  getActivitySeries(range: ActivityRange): Promise<ActivitySeries> {
    return api.get<ActivitySeries>(
      `/dashboard/activity-series${toQueryString({ range })}`,
    );
  },
};
