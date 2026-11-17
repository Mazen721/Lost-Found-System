import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi } from '@/features/dashboard/dashboardApi';
import {
  ACTIVITY_SERIES_STYLES,
  buildActivityTooltipRows,
  formatActivityTick,
  formatActivityTooltipTitle,
  summarizeActivity,
} from '@/features/dashboard/activityChartModel';
import { cn, formatNumber } from '@/lib/utils';
import {
  ACTIVITY_RANGES,
  type ActivityBucket,
  type ActivityRange,
} from '@/types/dashboard';

const RANGE_LABEL_KEYS: Record<ActivityRange, string> = {
  week: 'dashboard.activityRangeWeek',
  month: 'dashboard.activityRangeMonth',
  year: 'dashboard.activityRangeYear',
};

interface ActivityTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ActivityBucket }>;
  granularity: 'day' | 'month';
}

/** Arabic hover tooltip: bucket date plus the three labelled counts. */
function ActivityTooltipContent({
  active,
  payload,
  granularity,
}: ActivityTooltipProps) {
  const { t } = useTranslation();
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;

  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3.5 py-3 shadow-lg">
      <p className="text-xs font-bold text-foreground">
        {formatActivityTooltipTitle(bucket, granularity)}
      </p>
      <div className="mt-2 space-y-1.5">
        {buildActivityTooltipRows(bucket).map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
              {t(row.labelKey)}
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Time-series activity card shared by the Admin and Manager dashboards:
 * lost / found / returned counts per day (week, month) or per month
 * (year), with range tabs and the selected range's totals in the header.
 */
export function ActivityChart() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<ActivityRange>('month');
  const isRtl = i18n.dir() === 'rtl';

  const seriesQuery = useQuery({
    queryKey: ['dashboard', 'activity-series', range],
    queryFn: () => dashboardApi.getActivitySeries(range),
  });

  const data = seriesQuery.data;
  const totals = data ? summarizeActivity(data.buckets) : null;
  const hasActivity = totals
    ? totals.lost + totals.found + totals.returned > 0
    : false;
  const chartData = data
    ? data.buckets.map((bucket) => ({
        ...bucket,
        tick: formatActivityTick(bucket, data.granularity),
      }))
    : [];

  return (
    <section
      aria-label={t('dashboard.activityChartTitle')}
      className="rounded-xl border border-border/80 bg-card p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
            {t('dashboard.activityChartTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('dashboard.activityChartDesc')}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/60 p-1"
          role="tablist"
          aria-label={t('dashboard.activityChartTitle')}
        >
          {ACTIVITY_RANGES.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={range === value}
              onClick={() => setRange(value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                range === value
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(RANGE_LABEL_KEYS[value])}
            </button>
          ))}
        </div>
      </div>

      {totals ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="font-semibold text-muted-foreground">
            {t('dashboard.activityRangeTotal')}:
          </span>
          {ACTIVITY_SERIES_STYLES.map((style) => (
            <span key={style.key} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: style.color }}
                aria-hidden="true"
              />
              <span className="font-medium text-muted-foreground">
                {t(style.labelKey)}
              </span>
              <strong className="font-bold tabular-nums text-foreground">
                {formatNumber(totals[style.key])}
              </strong>
            </span>
          ))}
        </div>
      ) : null}

      {seriesQuery.isLoading ? (
        <div
          className="mt-5 h-[280px] animate-pulse rounded-lg bg-secondary/40"
          aria-hidden="true"
        />
      ) : seriesQuery.isError ? (
        <p className="mt-5 flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-secondary/35 px-4 text-center text-sm text-muted-foreground">
          {t('errors.generic')}
        </p>
      ) : data && !hasActivity ? (
        <p className="mt-5 flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-secondary/35 px-4 text-center text-sm text-muted-foreground">
          {t('dashboard.noItemsInPeriod')}
        </p>
      ) : data ? (
        <div className="mt-5 h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 6, right: 6, bottom: 0, left: 6 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="tick"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                reversed={isRtl}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={30}
                orientation={isRtl ? 'right' : 'left'}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                content={<ActivityTooltipContent granularity={data.granularity} />}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.35 }}
              />
              {ACTIVITY_SERIES_STYLES.map((style) => (
                <Area
                  key={style.key}
                  type="monotone"
                  dataKey={style.key}
                  name={t(style.labelKey)}
                  stroke={style.color}
                  strokeWidth={2}
                  fill={style.color}
                  fillOpacity={0.16}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 1.5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}
