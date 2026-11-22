import {
  CheckCircle2,
  GitCompareArrows,
  Handshake,
  ImageOff,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ItemImage } from '@/components/shared/ItemImage';
import { tr } from '@/i18n/localize';
import { fmtDistanceToNow } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';
import type { UrgentQueue, UrgentQueueClaim } from '@/types/dashboard';

function ClaimRow({ claim, action }: { claim: UrgentQueueClaim; action: 'review' | 'handover' }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={`/lost-found/claims/${claim.id}`}
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {claim.itemImageUrl ? (
          <ItemImage
            src={claim.itemImageUrl}
            width={480}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
            placeholderClassName="bg-secondary text-muted-foreground"
            icon={ShieldCheck}
            iconClassName="h-4 w-4"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">
            {tr(claim, 'itemTitle')}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            <span dir="ltr" className="font-mono">{claim.claimNumber}</span>
            {' · '}
            {fmtDistanceToNow(claim.createdAt, { addSuffix: true })}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-bold text-primary">
          {action === 'review' ? t('dashboard.actionReview') : t('dashboard.actionHandover')}
        </span>
      </Link>
    </li>
  );
}

interface QueueColumnProps {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  count: number;
  to: string;
  children?: React.ReactNode;
  emptyText: string;
  footerLabel: string;
}

function QueueColumn({ icon: Icon, iconClass, title, count, to, children, emptyText, footerLabel }: QueueColumnProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
          {title}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
          {count}
        </span>
      </div>
      {count > 0 ? (
        <ul className="flex-1 space-y-1">{children}</ul>
      ) : (
        <p className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {emptyText}
        </p>
      )}
      <Link
        to={to}
        className="mt-3 text-[11px] font-bold text-primary hover:underline"
      >
        {footerLabel}
      </Link>
    </div>
  );
}

/**
 * Urgent triage queue for the Manager and Admin dashboards: claims pending
 * review, suggested matches, and approved claims waiting for handover.
 */
export function UrgentQueuePanel({ queue }: { queue: UrgentQueue }) {
  const { t } = useTranslation();
  const total =
    queue.pendingClaims.length + queue.suggestedMatches.length + queue.handoversWaiting.length;

  return (
    <section aria-label={t('dashboard.urgentQueueTitle')} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">{t('dashboard.urgentQueueTitle')}</h2>
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? t('dashboard.urgentQueueDesc', { count: total })
            : t('dashboard.queueEmptyDesc')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <QueueColumn
          icon={ShieldCheck}
          iconClass="bg-amber-100 text-amber-800"
          title={t('dashboard.queuePendingClaims')}
          count={queue.pendingClaims.length}
          to="/lost-found/claims"
          emptyText={t('dashboard.queueEmptyClaims')}
          footerLabel={t('dashboard.viewClaims')}
        >
          {queue.pendingClaims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} action="review" />
          ))}
        </QueueColumn>

        <QueueColumn
          icon={GitCompareArrows}
          iconClass="bg-emerald-100 text-emerald-700"
          title={t('dashboard.queueSuggestedMatches')}
          count={queue.suggestedMatches.length}
          to="/lost-found/matches"
          emptyText={t('dashboard.noPendingMatchesHint')}
          footerLabel={t('dashboard.reviewMatches')}
        >
          {queue.suggestedMatches.map((match) => (
            <li key={match.id}>
              <Link
                to="/lost-found/matches"
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
                  {match.lostImageUrl ? (
                    <ItemImage src={match.lostImageUrl} width={96} alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-card" placeholderClassName="bg-secondary text-muted-foreground ring-2 ring-card" icon={ImageOff} iconClassName="h-4 w-4" />
                  ) : null}
                  {match.foundImageUrl ? (
                    <ItemImage src={match.foundImageUrl} width={96} alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-card" placeholderClassName="bg-secondary text-muted-foreground ring-2 ring-card" icon={ImageOff} iconClassName="h-4 w-4" />
                  ) : null}
                  {!match.lostImageUrl && !match.foundImageUrl ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-foreground">
                    {tr(match, 'lostTitle')}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {tr(match, 'foundTitle')}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  {t('dashboard.matchScorePill', { score: match.score })}
                </span>
              </Link>
            </li>
          ))}
        </QueueColumn>

        <QueueColumn
          icon={Handshake}
          iconClass="bg-sky-100 text-sky-700"
          title={t('dashboard.queueHandoversWaiting')}
          count={queue.handoversWaiting.length}
          to="/lost-found/handovers"
          emptyText={t('dashboard.queueEmptyHandovers')}
          footerLabel={t('dashboard.openHandovers')}
        >
          {queue.handoversWaiting.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} action="handover" />
          ))}
        </QueueColumn>
      </div>
    </section>
  );
}
