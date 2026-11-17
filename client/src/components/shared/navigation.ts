import {
  Archive,
  BadgeCheck,
  Bell,
  Ellipsis,
  Files,
  FolderSearch,
  GitCompareArrows,
  Handshake,
  LayoutDashboard,
  MapPin,
  PackagePlus,
  PackageSearch,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavigationItem {
  labelKey: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  /** Route ships in a later day; rendered as a non-interactive "Soon" item. */
  soon?: boolean;
}

export interface NavigationGroup {
  titleKey: string;
  items: NavigationItem[];
}

const STUDENT_NAVIGATION: NavigationGroup[] = [
  {
    titleKey: 'nav.groupOverview',
    items: [
      { labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    titleKey: 'nav.lostFound',
    items: [
      { labelKey: 'nav.reportItem', to: '/lost-found/report', icon: PackagePlus },
      { labelKey: 'nav.browseLostFound', to: '/lost-found', icon: Search, end: true },
      { labelKey: 'nav.myClaims', to: '/lost-found/claims', icon: BadgeCheck },
      { labelKey: 'nav.myReports', to: '/lost-found/my-reports', icon: FolderSearch },
    ],
  },
];

const MANAGER_NAVIGATION: NavigationGroup[] = [
  {
    titleKey: 'nav.groupOverview',
    items: [
      { labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    titleKey: 'nav.groupTriageVerification',
    items: [
      { labelKey: 'nav.matches', to: '/lost-found/matches', icon: GitCompareArrows },
      { labelKey: 'nav.claims', to: '/lost-found/claims', icon: ShieldCheck },
      { labelKey: 'nav.handovers', to: '/lost-found/handovers', icon: Handshake },
    ],
  },
  {
    titleKey: 'nav.groupItemRegistry',
    items: [
      { labelKey: 'nav.reportItem', to: '/lost-found/report', icon: PackagePlus },
      { labelKey: 'nav.browseLostFound', to: '/lost-found', icon: Search, end: true },
      { labelKey: 'nav.allReports', to: '/lost-found/items', icon: Files, end: true },
      { labelKey: 'nav.archivedItems', to: '/lost-found/archived', icon: Archive },
    ],
  },
];

const ADMIN_NAVIGATION: NavigationGroup[] = [
  {
    titleKey: 'nav.groupOverview',
    items: [
      { labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    titleKey: 'nav.groupGovernanceDirectory',
    items: [
      { labelKey: 'nav.users', to: '/users', icon: Users },
      { labelKey: 'nav.locations', to: '/locations', icon: MapPin },
      { labelKey: 'nav.activityLogs', to: '/activity-logs', icon: ScrollText },
    ],
  },
  {
    titleKey: 'nav.groupTriageVerification',
    items: [
      { labelKey: 'nav.matches', to: '/lost-found/matches', icon: GitCompareArrows },
      { labelKey: 'nav.claims', to: '/lost-found/claims', icon: ShieldCheck },
      { labelKey: 'nav.handovers', to: '/lost-found/handovers', icon: Handshake },
    ],
  },
  {
    titleKey: 'nav.groupItemRegistry',
    items: [
      { labelKey: 'nav.browseLostFound', to: '/lost-found', icon: Search, end: true },
      { labelKey: 'nav.allReports', to: '/lost-found/items', icon: Files, end: true },
      { labelKey: 'nav.archivedItems', to: '/lost-found/archived', icon: Archive },
      { labelKey: 'nav.lostFoundView', to: '/lost-found/items', icon: PackageSearch },
    ],
  },
];

const MNU_PORTAL_NAV: Record<Role, NavigationGroup[]> = {
  STUDENT: STUDENT_NAVIGATION,
  EMPLOYEE: STUDENT_NAVIGATION,
  LOST_FOUND_MANAGER: MANAGER_NAVIGATION,
  SUPER_ADMIN: ADMIN_NAVIGATION,
};

export function isMnuPortalRole(role?: Role | null): boolean {
  return Boolean(role && role in MNU_PORTAL_NAV);
}

export function getNavigation(role: Role): NavigationGroup[] {
  return MNU_PORTAL_NAV[role];
}

/**
 * Mobile bottom-bar model (spec 003). Routes, icons, and `end` flags mirror
 * the sidebar definitions above — the sidebar stays the source of truth for
 * permissions, and a parity test asserts every link tab's route exists in
 * the same role's sidebar navigation. `action` tabs are shell actions
 * (notifications sheet, full nav drawer), not routes.
 */
export interface MobileTabItem {
  labelKey: string;
  icon: LucideIcon;
  /** Link destination; absent for action tabs. */
  to?: string;
  /** Shell action; absent for link tabs. */
  action?: 'notifications' | 'more';
  end?: boolean;
  /** Raised centre action (student/employee report). */
  prominent?: boolean;
  /** Extra routes that light this tab (detail/secondary routes). */
  activePrefixes?: string[];
}

const STUDENT_MOBILE_TABS: MobileTabItem[] = [
  { labelKey: 'nav.tabHome', to: '/dashboard', icon: LayoutDashboard, end: true },
  {
    labelKey: 'nav.tabBrowse',
    to: '/lost-found',
    icon: Search,
    end: true,
    activePrefixes: ['/lost-found/items'],
  },
  { labelKey: 'nav.tabReport', to: '/lost-found/report', icon: PackagePlus, prominent: true },
  { labelKey: 'nav.myReports', to: '/lost-found/my-reports', icon: FolderSearch },
  { labelKey: 'nav.tabMyClaims', to: '/lost-found/claims', icon: BadgeCheck },
];

const MANAGER_MOBILE_TABS: MobileTabItem[] = [
  { labelKey: 'nav.tabHome', to: '/dashboard', icon: LayoutDashboard, end: true },
  {
    labelKey: 'nav.items',
    to: '/lost-found/items',
    icon: Files,
    end: true,
    activePrefixes: ['/lost-found/items', '/lost-found/archived'],
  },
  { labelKey: 'nav.tabMatches', to: '/lost-found/matches', icon: GitCompareArrows },
  {
    labelKey: 'nav.tabClaims',
    to: '/lost-found/claims',
    icon: ShieldCheck,
    activePrefixes: ['/lost-found/handovers'],
  },
  { labelKey: 'nav.notifications', icon: Bell, action: 'notifications' },
];

const ADMIN_MOBILE_TABS: MobileTabItem[] = [
  { labelKey: 'nav.tabHome', to: '/dashboard', icon: LayoutDashboard, end: true },
  {
    labelKey: 'nav.items',
    to: '/lost-found/items',
    icon: Files,
    end: true,
    activePrefixes: ['/lost-found/items', '/lost-found/archived'],
  },
  { labelKey: 'nav.tabMatches', to: '/lost-found/matches', icon: GitCompareArrows },
  { labelKey: 'nav.tabClaims', to: '/lost-found/claims', icon: ShieldCheck },
  {
    labelKey: 'nav.tabMore',
    icon: Ellipsis,
    action: 'more',
    activePrefixes: ['/users', '/locations', '/activity-logs', '/lost-found/handovers', '/profile'],
  },
];

const MOBILE_TABS: Record<Role, MobileTabItem[]> = {
  STUDENT: STUDENT_MOBILE_TABS,
  EMPLOYEE: STUDENT_MOBILE_TABS,
  LOST_FOUND_MANAGER: MANAGER_MOBILE_TABS,
  SUPER_ADMIN: ADMIN_MOBILE_TABS,
};

export function getMobileTabs(role: Role): MobileTabItem[] {
  return MOBILE_TABS[role];
}

/** Whether a bottom-bar tab represents the current route. */
export function isMobileTabActive(tab: MobileTabItem, pathname: string): boolean {
  const matchesPrefix = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (tab.to) {
    if (tab.end) {
      if (pathname === tab.to) return true;
    } else if (matchesPrefix(tab.to)) {
      return true;
    }
  }

  return (tab.activePrefixes ?? []).some(matchesPrefix);
}
