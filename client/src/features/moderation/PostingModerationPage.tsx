import { Check, ClipboardCheck, PackageSearch, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ItemImage } from '@/components/shared/ItemImage';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { moderationApi } from '@/features/moderation/moderationApi';
import { ReportTypeBadge } from '@/features/lost-found/items/ReportTypeBadge';
import { ItemPagination } from '@/features/lost-found/items/ItemPagination';
import { formatLocation, tr } from '@/i18n/localize';
import { getErrorMessage } from '@/lib/api';
import { enumLabel } from '@/lib/labels';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PendingModerationItem } from '@/types/moderation';

const PAGE_SIZE = 10;

function PendingRow({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: PendingModerationItem;
  busy: boolean;
  onApprove: (item: PendingModerationItem) => void;
  onReject: (item: PendingModerationItem) => void;
}) {
  const { t } = useTranslation();
  const photo = item.images[0]?.url;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Link
        to={`/lost-found/items/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {photo ? (
          <ItemImage
            src={photo}
            alt={tr(item, 'itemTitle')}
            width={160}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <PackageSearch className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {tr(item, 'itemTitle')}
            </span>
            <ReportTypeBadge reportType={item.reportType} />
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {enumLabel('lostFoundCategory', item.category)}
            {' · '}
            {item.reporter
              ? `${t('moderation.reporterLabel')}: ${tr(item.reporter, 'name')}`
              : ''}
            {' · '}
            {formatDate(item.occurrenceDate)}
            {item.location ? ` · ${formatLocation(item.location)}` : ''}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground" dir="ltr">
            {item.reportNumber}
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onApprove(item)}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {t('moderation.approve')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onReject(item)}
          className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('moderation.reject')}
        </Button>
      </div>
    </div>
  );
}

export function PostingModerationPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const settingsQuery = useQuery({
    queryKey: ['moderation-settings'],
    queryFn: () => moderationApi.getSettings(),
  });

  const pendingQuery = useQuery({
    queryKey: ['moderation-pending', page],
    queryFn: () => moderationApi.listPending({ page, limit: PAGE_SIZE }),
  });

  const settingsMutation = useMutation({
    mutationFn: (value: boolean) => moderationApi.updateSettings(value),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['moderation-settings'] });
      toast.success(
        result.settings.autoPublishStudentReports
          ? t('moderation.settingUpdatedOn')
          : t('moderation.settingUpdatedOff'),
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      decision === 'approve' ? moderationApi.approve(id) : moderationApi.reject(id),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['moderation-pending'] }),
        queryClient.invalidateQueries({ queryKey: ['lost-found-items'] }),
      ]);
      toast.success(
        variables.decision === 'approve'
          ? t('moderation.approvedSuccess')
          : t('moderation.rejectedSuccess'),
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const autoPublish = settingsQuery.data?.settings.autoPublishStudentReports;
  const pendingItems = pendingQuery.data?.data ?? [];
  const pendingTotal = pendingQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('moderation.eyebrow')}
        title={t('moderation.title')}
        description={t('moderation.description')}
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('moderation.autoPublishLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {settingsQuery.isLoading ? (
            <LoadingState />
          ) : settingsQuery.isError ? (
            <ErrorState
              message={getErrorMessage(settingsQuery.error)}
              onRetry={() => void settingsQuery.refetch()}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">
                  {t('moderation.autoPublishLabel')}
                </p>
                <button
                  type="button"
                  role="switch"
                  dir="ltr"
                  aria-checked={autoPublish === true}
                  aria-label={t('moderation.autoPublishLabel')}
                  disabled={settingsMutation.isPending || autoPublish === undefined}
                  onClick={() => {
                    if (autoPublish !== undefined) settingsMutation.mutate(!autoPublish);
                  }}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60',
                    autoPublish ? 'bg-primary' : 'bg-muted-foreground/40',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                      autoPublish ? 'left-[1.375rem]' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {autoPublish
                  ? t('moderation.autoPublishOnDesc')
                  : t('moderation.autoPublishOffDesc')}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('moderation.appliesToNote')}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">
            {t('moderation.queueTitle')}
            {pendingTotal > 0 ? (
              <span className="ms-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {pendingTotal}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {pendingQuery.isLoading ? (
            <LoadingState />
          ) : pendingQuery.isError ? (
            <ErrorState
              message={getErrorMessage(pendingQuery.error)}
              onRetry={() => void pendingQuery.refetch()}
            />
          ) : pendingItems.length === 0 ? (
            <EmptyState
              title={t('moderation.queueEmptyTitle')}
              description={t('moderation.queueEmptyDesc')}
              icon={ClipboardCheck}
            />
          ) : (
            <>
              <div className="divide-y">
                {pendingItems.map((item) => (
                  <PendingRow
                    key={item.id}
                    item={item}
                    busy={reviewMutation.isPending}
                    onApprove={(row) =>
                      reviewMutation.mutate({ id: row.id, decision: 'approve' })
                    }
                    onReject={(row) =>
                      reviewMutation.mutate({ id: row.id, decision: 'reject' })
                    }
                  />
                ))}
              </div>
              <ItemPagination
                page={page}
                limit={PAGE_SIZE}
                total={pendingTotal}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
