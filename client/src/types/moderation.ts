import type { LostFoundItem, LostFoundReporter } from '@/types/lostFound';

/** Spec 012 — SUPER_ADMIN posting-moderation surface. */
export interface PostingSettings {
  autoPublishStudentReports: boolean;
  updatedAt: string;
}

export interface PendingModerationItem extends LostFoundItem {
  reporter: LostFoundReporter | null;
  createdAt?: string;
}
