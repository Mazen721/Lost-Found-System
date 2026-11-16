import {
  Archive,
  BadgeCheck,
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
      { labelKey: 'nav.reportItem', to: '/lost-found/report', icon: PackagePlus },
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
