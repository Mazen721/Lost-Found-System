import { api } from '@/lib/api';
import { toQueryString } from '@/lib/queryString';
import type { PaginatedResponse } from '@/types/api';
import type { PendingModerationItem, PostingSettings } from '@/types/moderation';

export const moderationApi = {
  getSettings(): Promise<{ settings: PostingSettings }> {
    return api.get<{ settings: PostingSettings }>('/moderation/settings');
  },

  updateSettings(
    autoPublishStudentReports: boolean,
  ): Promise<{ settings: PostingSettings }> {
    return api.patch<{ settings: PostingSettings }>('/moderation/settings', {
      autoPublishStudentReports,
    });
  },

  listPending(params: { page?: number; limit?: number } = {}): Promise<
    PaginatedResponse<PendingModerationItem>
  > {
    return api.get<PaginatedResponse<PendingModerationItem>>(
      `/moderation/pending${toQueryString(params)}`,
    );
  },

  approve(id: string): Promise<{ item: PendingModerationItem }> {
    return api.post<{ item: PendingModerationItem }>(
      `/moderation/items/${id}/approve`,
      {},
    );
  },

  reject(id: string): Promise<{ item: PendingModerationItem }> {
    return api.post<{ item: PendingModerationItem }>(
      `/moderation/items/${id}/reject`,
      {},
    );
  },
};
