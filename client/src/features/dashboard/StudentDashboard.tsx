import { Bell, ChevronRight, PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PortalViewAllLink } from '@/features/dashboard/PortalViewAllLink';
import {
  buildLostFoundTrackerItems,
  type StudentTrackerItem,
  type TrackerTone,
} from '@/features/dashboard/studentHelpers';
import { StudentSummaryGrid } from '@/features/dashboard/StudentSummaryGrid';
import { ReportTypeBadge } from '@/features/lost-found/items/ReportTypeBadge';
import { resolveParams } from '@/i18n/localize';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import type { StudentDashboard as StudentDashboardData } from '@/types/dashboard';

const PROGRESS_BAR_FILL: Record<TrackerTone, string> = {
  navy: 'bg-primary',
  emerald: 'bg-emerald-600',
  danger: 'bg-destructive',
};

function StudentTrackerRow({ item }: { item: StudentTrackerItem }) {
  const { activeStep, tone, steps } = item.progress;
  const activeLabel = steps[activeStep - 1] ?? steps[0];

  return (
    <li className="space-y-4 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span dir="ltr" className="font-mono font-semibold tabular-nums">
              {item.code}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(item.createdAt)}</span>
          </div>
          <Link
            to={item.to}
            dir="auto"
            className="mt-1 block rounded-sm text-start text-sm font-bold text-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.title}
          </Link>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {item.reportType ? <ReportTypeBadge reportType={item.reportType} /> : null}
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div
        role="group"
        aria-label={activeLabel}
        className="rounded-xl bg-secondary/45 p-3.5"
      >
        <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
          {steps.map((stepLabel, index) => {
            const stepNumber = index + 1;
            const isReached = stepNumber <= activeStep;
            const isDangerStep = tone === 'danger' && stepNumber === activeStep;

            return (
              <div key={`${item.id}-step-${stepNumber}`} className="min-w-0 space-y-1.5">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-colors',
                    isReached ? PROGRESS_BAR_FILL[tone] : 'bg-border/80',
                  )}
                />
                <span
                  className={cn(
                    'block truncate',
                    isDangerStep
                      ? 'text-destructive'
                      : isReached
                        ? 'text-foreground'
                        : 'text-muted-foreground/75',
                  )}
                >
                  {stepLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </li>
  );
}

function StudentTrackerPanel({ data }: { data: StudentDashboardData }) {
  const { t } = useTranslation();
  const lostFoundItems = buildLostFoundTrackerItems(data.claims.recent, data.reports.recent, t);
  const lostFoundTotal = data.claims.total + data.reports.total;

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card lg:col-span-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/75 px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">
            {t('dashboard.studentTrackerTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('dashboard.studentTrackerDesc')}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
          {formatNumber(lostFoundTotal)}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        {lostFoundItems.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t('dashboard.studentNoLostFoundTitle')}
            description={t('dashboard.studentNoLostFoundDesc')}
            className="min-h-[240px] flex-1 border-0 bg-transparent px-6 py-8"
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/lost-found">{t('dashboard.studentCardClaimsCta')}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/75 px-6">
            {lostFoundItems.map((item) => (
              <StudentTrackerRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/75 px-6 py-3">
        <PortalViewAllLink to="/lost-found/claims" label={t('nav.myClaims')} />
        <PortalViewAllLink to="/lost-found/my-reports" label={t('nav.myReports')} />
      </div>
    </article>
  );
}

function RecentUpdatesRail({
  notifications,
}: {
  notifications: StudentDashboardData['notifications'];
}) {
  const { t } = useTranslation();

  return (
    <article className="flex min-w-0 flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 lg:col-span-4">
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-border/75 pb-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Bell className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{t('dashboard.studentRecentUpdatesTitle')}</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('dashboard.studentRecentUpdatesDesc')}
            </p>
          </div>

          {notifications.unreadCount > 0 ? (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-500/35 bg-amber-500/[0.12] font-semibold tabular-nums text-amber-800"
            >
              {t('dashboard.unreadBadge', { count: notifications.unreadCount })}
            </Badge>
          ) : null}
        </div>

        {notifications.recent.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t('dashboard.allCaughtUpTitle')}
            description={t('dashboard.allCaughtUpDesc')}
            className="mt-4 min-h-[190px] border-0 bg-transparent px-2 py-6"
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.recent.map((notification) => {
              const title = notification.titleKey
                ? t(`notif.${notification.titleKey}`, {
                    ...resolveParams(notification.params),
                    defaultValue: notification.title,
                  })
                : notification.title;
              const message = notification.messageKey
                ? t(`notif.${notification.messageKey}`, {
                    ...resolveParams(notification.params),
                    defaultValue: notification.message,
                  })
                : notification.message;
              const timestamp = formatDate(notification.createdAt, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              const cardClasses = cn(
                'block rounded-xl border p-3.5 text-xs transition-colors',
                notification.isRead
                  ? 'border-border/75 bg-secondary/40'
                  : 'border-primary/25 bg-primary/[0.04]',
              );

              const inner = (
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          notification.isRead ? 'bg-border' : 'bg-primary',
                        )}
                        aria-hidden="true"
                      />
                      <p
                        dir="auto"
                        className={cn(
                          'truncate leading-snug',
                          notification.isRead
                            ? 'font-medium text-muted-foreground'
                            : 'font-bold text-foreground',
                        )}
                      >
                        {title}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                      <span>{timestamp}</span>
                      {notification.linkUrl ? (
                        <ChevronRight
                          className="h-3.5 w-3.5 text-muted-foreground/75 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </div>
                  <p
                    dir="auto"
                    className="text-pretty ps-4 leading-relaxed text-muted-foreground"
                  >
                    {message}
                  </p>
                </div>
              );

              return (
                <li key={notification.id}>
                  {notification.linkUrl ? (
                    <Link
                      to={notification.linkUrl}
                      className={cn(
                        cardClasses,
                        'group hover:border-primary/40 hover:bg-secondary/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className={cardClasses}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-border/80 bg-secondary/45 p-3.5 text-center text-xs leading-relaxed text-muted-foreground">
        {t('dashboard.studentFacilitiesFooterNote')}
      </div>
    </article>
  );
}

/**
 * Self-service portal for students and employees pairing:
 * - Row 1: friendly self-service action cards (`StudentSummaryGrid`)
 * - Row 2: 8/4 visual 3-step claim/report tracker & recent updates rail
 */
export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-7">
      <StudentSummaryGrid data={data} />
      <section
        aria-label={t('dashboard.studentTrackerTitle')}
        className="grid gap-6 lg:grid-cols-12"
      >
        <StudentTrackerPanel data={data} />
        <RecentUpdatesRail notifications={data.notifications} />
      </section>
    </div>
  );
}
