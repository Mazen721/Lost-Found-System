import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getMobileTabs,
  isMobileTabActive,
  type MobileTabItem,
} from '@/components/shared/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { notificationsApi } from '@/features/notifications/notificationsApi';
import { cn } from '@/lib/utils';

/** Hide tab labels in short landscape viewports (icons-only bar). */
const SHORT_LANDSCAPE = '[@media(orientation:landscape)_and_(max-height:500px)]:hidden';

interface MobileBottomNavProps {
  /** True while the on-screen keyboard is open; the bar slides away. */
  hidden: boolean;
  onNotifications: () => void;
  onMore: () => void;
}

/**
 * App-style bottom navigation for the mobile shell (spec 003). Visible
 * below `lg` only; the desktop sidebar is untouched. Navy surface mirrors
 * the sidebar: gold top indicator + gold icon mark the active tab, and the
 * student/employee report action is a raised gold centre button.
 */
export function MobileBottomNav({ hidden, onNotifications, onMore }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const tabs = user ? getMobileTabs(user.role) : [];
  const hasNotificationsTab = tabs.some((tab) => tab.action === 'notifications');

  // Same key + queryFn as the top-bar bell: one shared cache, one count.
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    enabled: hasNotificationsTab,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (!user) return null;

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;

  return (
    <nav
      aria-label={t('nav.bottomNav')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 bg-sidebar text-sidebar-foreground shadow-[0_-6px_24px_-6px_rgba(4,21,62,0.25)] transition-transform duration-200 lg:hidden',
        // Extra 1.5rem so the raised centre button (protruding above the
        // bar) also clears the viewport while the keyboard is open.
        hidden && 'pointer-events-none translate-y-[calc(100%+1.5rem)]',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={cn(
          'flex h-16 items-stretch',
          '[@media(orientation:landscape)_and_(max-height:500px)]:h-12',
        )}
      >
        {tabs.map((tab) => (
          <MobileTab
            key={tab.labelKey}
            tab={tab}
            active={isMobileTabActive(tab, location.pathname)}
            unreadCount={tab.action === 'notifications' ? unreadCount : 0}
            onNotifications={onNotifications}
            onMore={onMore}
          />
        ))}
      </div>
    </nav>
  );
}

interface MobileTabProps {
  tab: MobileTabItem;
  active: boolean;
  unreadCount: number;
  onNotifications: () => void;
  onMore: () => void;
}

function MobileTab({ tab, active, unreadCount, onNotifications, onMore }: MobileTabProps) {
  const { t } = useTranslation();
  const Icon = tab.icon;
  const label = t(tab.labelKey);

  if (tab.prominent && tab.to) {
    return (
      <Link
        to={tab.to}
        aria-current={active ? 'page' : undefined}
        aria-label={t('nav.reportItem')}
        className="group relative flex flex-1 flex-col items-center justify-end pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--mnu-gold))]"
      >
        <span
          className={cn(
            'absolute -top-5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[hsl(var(--mnu-gold))] text-[hsl(var(--mnu-navy))] shadow-[0_8px_20px_-6px_rgba(4,21,62,0.45)] ring-4 ring-sidebar transition-transform duration-150 group-active:scale-95',
            '[@media(orientation:landscape)_and_(max-height:500px)]:-top-3',
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </span>
        <span
          className={cn(
            'text-[11px] font-semibold leading-tight',
            active ? 'text-sidebar-foreground' : 'text-sidebar-muted',
            SHORT_LANDSCAPE,
          )}
        >
          {label}
        </span>
      </Link>
    );
  }

  const content = (
    <>
      {active ? (
        <span
          aria-hidden="true"
          className="absolute top-0 h-[3px] w-10 rounded-full bg-[hsl(var(--mnu-gold))]"
        />
      ) : null}
      <span className="relative">
        <Icon
          className={cn(
            'h-[22px] w-[22px]',
            active ? 'text-[hsl(var(--mnu-gold))]' : 'text-sidebar-muted',
          )}
          strokeWidth={1.9}
          aria-hidden="true"
        />
        {unreadCount > 0 ? (
          <span className="absolute -end-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--mnu-gold))] px-1 text-[10px] font-bold leading-none text-[hsl(var(--mnu-navy))] ring-2 ring-sidebar">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'whitespace-nowrap text-[11px] font-semibold leading-tight',
          active ? 'text-sidebar-foreground' : 'text-sidebar-muted',
          SHORT_LANDSCAPE,
        )}
      >
        {label}
      </span>
    </>
  );

  const slotClassName =
    'relative flex flex-1 flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--mnu-gold))]';

  if (tab.action) {
    return (
      <button
        type="button"
        className={slotClassName}
        onClick={tab.action === 'notifications' ? onNotifications : onMore}
        aria-current={active ? 'page' : undefined}
      >
        {content}
      </button>
    );
  }

  if (!tab.to) return null;

  return (
    <Link to={tab.to} aria-current={active ? 'page' : undefined} className={slotClassName}>
      {content}
    </Link>
  );
}
