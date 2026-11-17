import {
  Archive,
  BadgeCheck,
  Bell,
  Ellipsis,
  Files,
  FolderSearch,
  GitCompareArrows,
  Handshake,
  Home,
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
  /** Group heading; the first student group renders without one (spec 007 mockup). */
  titleKey?: string;
  items: NavigationItem[];
}

/**
 * Student/Employee drawer arrangement (spec 007, approved mockup): the
 * everyday destinations first, then a «حسابي» group holding the personal
 * pages and the dashboard — which is now a page of its own, not the
 * landing. Staff menus below keep their pre-007 sidebar arrangement.
 */
const STUDENT_NAVIGATION: NavigationGroup[] = [
  {
    items: [
      { labelKey: 'nav.home', to: '/home', icon: Home, end: true },
      { labelKey: 'nav.browseLostFound', to: '/lost-found', icon: Search, end: true },
      { labelKey: 'nav.reportItem', to: '/lost-found/report', icon: PackagePlus },
    ],
  },
  {
    titleKey: 'nav.groupMyAccount',
    items: [
      { labelKey: 'nav.myReports', to: '/lost-found/my-reports', icon: FolderSearch },
      { labelKey: 'nav.myClaims', to: '/lost-found/claims', icon: BadgeCheck },
      { labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
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

/**
 * The complete per-role menu. Since spec 007 this feeds the slide-in
 * drawer (closed by default) — it remains the source of truth for which
 * destinations a role may see, and the parity tests bind the bottom bar
 * and the top links to it.
 */
export function getNavigation(role: Role): NavigationGroup[] {
  return MNU_PORTAL_NAV[role];
}

/** Where a role lands after login: students/employees get the home page. */
export function landingPathForRole(role: Role): string {
  return role === 'STUDENT' || role === 'EMPLOYEE' ? '/home' : '/dashboard';
}

/** Route-matching core shared by the bottom bar and the top links. */
interface RoutableNavItem {
  to?: string;
  end?: boolean;
  activePrefixes?: string[];
}

function routeMatches(item: RoutableNavItem, pathname: string): boolean {
  const matchesPrefix = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (item.to) {
    if (item.end) {
      if (pathname === item.to) return true;
    } else if (matchesPrefix(item.to)) {
      return true;
    }
  }

  return (item.activePrefixes ?? []).some(matchesPrefix);
}

/**
 * Desktop top-navbar links (spec 007): each role's most-used destinations
 * from its full menu, in menu order. Everything not listed here is
 * drawer-only. Labels use the short forms the approved mockup shows.
 */
export interface TopLinkItem {
  labelKey: string;
  to: string;
  end?: boolean;
  /** Extra routes that light this link (detail/secondary routes). */
  activePrefixes?: string[];
}

const STUDENT_TOP_LINKS: TopLinkItem[] = [
  { labelKey: 'nav.home', to: '/home', end: true },
  {
    labelKey: 'nav.topBrowse',
    to: '/lost-found',
    end: true,
    activePrefixes: ['/lost-found/items'],
  },
  { labelKey: 'nav.reportItem', to: '/lost-found/report' },
  { labelKey: 'nav.myReports', to: '/lost-found/my-reports' },
  { labelKey: 'nav.claims', to: '/lost-found/claims' },
  { labelKey: 'nav.dashboard', to: '/dashboard', end: true },
];

const MANAGER_TOP_LINKS: TopLinkItem[] = [
  { labelKey: 'nav.dashboard', to: '/dashboard', end: true },
  { labelKey: 'nav.matches', to: '/lost-found/matches' },
  {
    labelKey: 'nav.claims',
    to: '/lost-found/claims',
    // Handovers are the claims workflow's second half (same rule as the
    // manager's bottom-bar claims tab, spec 003).
    activePrefixes: ['/lost-found/handovers'],
  },
  {
    labelKey: 'nav.allReports',
    to: '/lost-found/items',
    activePrefixes: ['/lost-found/archived'],
  },
  { labelKey: 'nav.topBrowse', to: '/lost-found', end: true },
];

const ADMIN_TOP_LINKS: TopLinkItem[] = [
  { labelKey: 'nav.dashboard', to: '/dashboard', end: true },
  { labelKey: 'nav.users', to: '/users' },
  {
    labelKey: 'nav.allReports',
    to: '/lost-found/items',
    activePrefixes: ['/lost-found/archived'],
  },
  { labelKey: 'nav.matches', to: '/lost-found/matches' },
  { labelKey: 'nav.claims', to: '/lost-found/claims' },
  { labelKey: 'nav.topBrowse', to: '/lost-found', end: true },
];

const TOP_LINKS: Record<Role, TopLinkItem[]> = {
  STUDENT: STUDENT_TOP_LINKS,
  EMPLOYEE: STUDENT_TOP_LINKS,
  LOST_FOUND_MANAGER: MANAGER_TOP_LINKS,
  SUPER_ADMIN: ADMIN_TOP_LINKS,
};

export function getTopLinks(role: Role): TopLinkItem[] {
  return TOP_LINKS[role];
}

/** Whether a top-navbar link represents the current route. */
export function isTopLinkActive(link: TopLinkItem, pathname: string): boolean {
  return routeMatches(link, pathname);
}

/**
 * Mobile bottom-bar model (spec 003). Routes, icons, and `end` flags mirror
 * the full-menu definitions above — the full menu stays the source of truth
 * for permissions, and a parity test asserts every link tab's route exists
 * in the same role's full navigation. `action` tabs are shell actions
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
  // Spec 007: «الرئيسية» is the new home page; the dashboard moved to the
  // drawer/top links as «لوحة التحكم». Staff tabs below still land on
  // their dashboards, which remain their home.
  { labelKey: 'nav.tabHome', to: '/home', icon: Home, end: true },
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
  return routeMatches(tab, pathname);
}
