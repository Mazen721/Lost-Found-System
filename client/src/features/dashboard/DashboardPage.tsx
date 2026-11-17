import {
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InsightsPanel } from '@/features/ai/InsightsPanel';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { ManagerDashboard } from '@/features/dashboard/ManagerDashboard';
import { SearchFirstHero } from '@/features/dashboard/SearchFirstHero';
import { StudentDashboard } from '@/features/dashboard/StudentDashboard';
import { DashboardPeriodSelect } from '@/features/dashboard/DashboardPeriodSelect';
import { dashboardApi } from '@/features/dashboard/dashboardApi';
import { useAuth } from '@/features/auth/AuthContext';
import { tr } from '@/i18n/localize';
import { getErrorMessage } from '@/lib/api';
import { enumLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/auth';
import type { DashboardPeriod, DashboardResponse } from '@/types/dashboard';

interface PortalHeaderSpec {
  subtitleKey: string;
  primaryTo: string;
  primaryLabelKey: string;
  PrimaryIcon: LucideIcon;
}

const PORTAL_HEADERS: Record<Role, PortalHeaderSpec> = {
  SUPER_ADMIN: {
    subtitleKey: 'dashboard.adminSubtitle',
    primaryTo: '/users',
    primaryLabelKey: 'dashboard.manageUsers',
    PrimaryIcon: Users,
  },
  LOST_FOUND_MANAGER: {
    subtitleKey: 'dashboard.managerSubtitle',
    primaryTo: '/lost-found/claims',
    primaryLabelKey: 'dashboard.reviewClaims',
    PrimaryIcon: ShieldCheck,
  },
  STUDENT: {
    subtitleKey: 'dashboard.studentSubtitle',
    primaryTo: '/lost-found/report',
    primaryLabelKey: 'dashboard.reportLostFoundItem',
    PrimaryIcon: PackagePlus,
  },
  EMPLOYEE: {
    subtitleKey: 'dashboard.studentSubtitle',
    primaryTo: '/lost-found/report',
    primaryLabelKey: 'dashboard.reportLostFoundItem',
    PrimaryIcon: PackagePlus,
  },
};

function RoleDashboard({ data }: { data: DashboardResponse }) {
  switch (data.role) {
    case 'SUPER_ADMIN':
      return <AdminDashboard data={data} />;
    case 'LOST_FOUND_MANAGER':
      return <ManagerDashboard data={data} />;
    case 'STUDENT':
    case 'EMPLOYEE':
      return <StudentDashboard data={data} />;
    default:
      return null;
  }
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const [aiOpen, setAiOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.id, user?.role, period],
    queryFn: () => dashboardApi.get(period),
    enabled: Boolean(user),
  });

  if (!user) return null;

  const portalHeader = PORTAL_HEADERS[user.role];
  const PrimaryIcon = portalHeader.PrimaryIcon;
  const showHeaderAiDrawer =
    user.role === 'LOST_FOUND_MANAGER' || user.role === 'SUPER_ADMIN';
  const showPeriodFilter = user.role !== 'STUDENT' && user.role !== 'EMPLOYEE';
  // Spec 006: students and employees get the search-first hero instead of
  // the greeting header; Admin/Manager keep the existing header as-is.
  const isSearchFirstRole = user.role === 'STUDENT' || user.role === 'EMPLOYEE';
  const isRoleMatched = Boolean(dashboardQuery.data && dashboardQuery.data.role === user.role);
  const displayName = tr(user, 'name') || user.name;
  const firstName =
    displayName
      .replace(/^(?:م\.|د\.|أ\.|Eng\.|Dr\.)\s+/i, '')
      .trim()
      .split(/\s+/)[0] ?? displayName;
  const greetingSeparator = '، ';
  const errorMessage = dashboardQuery.error ? getErrorMessage(dashboardQuery.error) : null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 18
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');

  return (
    <div className="space-y-7">
      {isSearchFirstRole ? (
        <SearchFirstHero />
      ) : (
      <header className="bg-hero-navy overflow-hidden rounded-3xl px-6 py-7 text-white shadow-hero sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-3xl">
                {greeting}
                {greetingSeparator}
                <bdi>{firstName}</bdi>
              </h1>
              <Badge
                variant="outline"
                className="border-[hsl(var(--mnu-gold))]/50 bg-[hsl(var(--mnu-gold))]/15 font-bold text-[hsl(var(--mnu-gold))]"
              >
                {enumLabel('role', user.role)}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-white/80">
              {t(portalHeader.subtitleKey)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {showHeaderAiDrawer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={aiOpen}
                onClick={() => setAiOpen((prev) => !prev)}
                className={cn(
                  'h-9 gap-1.5 rounded-lg border px-3.5 text-xs font-bold shadow-none transition-colors',
                  aiOpen
                    ? 'border-[hsl(var(--mnu-gold))] bg-[hsl(var(--mnu-gold))] text-[hsl(var(--mnu-navy))] hover:bg-[hsl(var(--mnu-gold))] hover:text-[hsl(var(--mnu-navy))]'
                    : 'border-white/25 bg-white/10 text-white hover:border-[hsl(var(--mnu-gold))]/60 hover:bg-white/15 hover:text-white',
                )}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t('ai.toggleInsights')}</span>
              </Button>
            ) : null}

            {showPeriodFilter ? (
              <DashboardPeriodSelect value={period} onChange={setPeriod} tone="onDark" />
            ) : null}

            <Button
              asChild
              size="sm"
              className="h-9 gap-1.5 rounded-lg bg-[hsl(var(--mnu-gold))] px-3.5 text-xs font-bold text-[hsl(var(--mnu-navy))] shadow-none hover:bg-[hsl(var(--mnu-gold))]/90"
            >
              <Link to={portalHeader.primaryTo}>
                <PrimaryIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(portalHeader.primaryLabelKey)}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      )}

      {showHeaderAiDrawer && aiOpen ? (
        <section aria-label={t('ai.toggleInsights')}>
          <InsightsPanel
            scope={user.role === 'SUPER_ADMIN' ? 'admin' : 'lost-found'}
            defaultPeriod={period === '7d' || period === '30d' ? period : '7d'}
            onClose={() => setAiOpen(false)}
          />
        </section>
      ) : null}

      {dashboardQuery.isLoading || (dashboardQuery.data && !isRoleMatched) ? (
        <LoadingState label={t('common.loading')} />
      ) : errorMessage ? (
        <ErrorState
          title={t('errors.generic')}
          message={errorMessage}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : dashboardQuery.data && isRoleMatched ? (
        <RoleDashboard data={dashboardQuery.data} />
      ) : null}
    </div>
  );
}
