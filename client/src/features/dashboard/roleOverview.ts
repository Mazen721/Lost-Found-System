import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Eye,
  GitCompareArrows,
  Handshake,
  KeyRound,
  MapPinned,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import type { Role } from '@/types/auth';

export interface RoleCapability {
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

export interface RoleOverview {
  summaryKey: string;
  scopeKey: string;
  capabilities: RoleCapability[];
}

export const ROLE_OVERVIEWS: Record<Role, RoleOverview> = {
  SUPER_ADMIN: {
    summaryKey: 'dashboard.roles.SUPER_ADMIN.summary',
    scopeKey: 'dashboard.roles.SUPER_ADMIN.scope',
    capabilities: [
      {
        labelKey: 'dashboard.roles.SUPER_ADMIN.cap1Label',
        descriptionKey: 'dashboard.roles.SUPER_ADMIN.cap1Desc',
        icon: UserCog,
      },
      {
        labelKey: 'dashboard.roles.SUPER_ADMIN.cap2Label',
        descriptionKey: 'dashboard.roles.SUPER_ADMIN.cap2Desc',
        icon: MapPinned,
      },
      {
        labelKey: 'dashboard.roles.SUPER_ADMIN.cap3Label',
        descriptionKey: 'dashboard.roles.SUPER_ADMIN.cap3Desc',
        icon: ScrollText,
      },
      {
        labelKey: 'dashboard.roles.SUPER_ADMIN.cap4Label',
        descriptionKey: 'dashboard.roles.SUPER_ADMIN.cap4Desc',
        icon: Eye,
      },
    ],
  },
  LOST_FOUND_MANAGER: {
    summaryKey: 'dashboard.roles.LOST_FOUND_MANAGER.summary',
    scopeKey: 'dashboard.roles.LOST_FOUND_MANAGER.scope',
    capabilities: [
      {
        labelKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap1Label',
        descriptionKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap1Desc',
        icon: PackageSearch,
      },
      {
        labelKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap2Label',
        descriptionKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap2Desc',
        icon: GitCompareArrows,
      },
      {
        labelKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap3Label',
        descriptionKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap3Desc',
        icon: ShieldCheck,
      },
      {
        labelKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap4Label',
        descriptionKey: 'dashboard.roles.LOST_FOUND_MANAGER.cap4Desc',
        icon: Handshake,
      },
    ],
  },
  STUDENT: {
    summaryKey: 'dashboard.roles.STUDENT.summary',
    scopeKey: 'dashboard.roles.STUDENT.scope',
    capabilities: [
      {
        labelKey: 'dashboard.roles.STUDENT.cap1Label',
        descriptionKey: 'dashboard.roles.STUDENT.cap1Desc',
        icon: ClipboardList,
      },
      {
        labelKey: 'dashboard.roles.STUDENT.cap2Label',
        descriptionKey: 'dashboard.roles.STUDENT.cap2Desc',
        icon: ClipboardCheck,
      },
      {
        labelKey: 'dashboard.roles.STUDENT.cap3Label',
        descriptionKey: 'dashboard.roles.STUDENT.cap3Desc',
        icon: PackageSearch,
      },
      {
        labelKey: 'dashboard.roles.STUDENT.cap4Label',
        descriptionKey: 'dashboard.roles.STUDENT.cap4Desc',
        icon: BadgeCheck,
      },
    ],
  },
  EMPLOYEE: {
    summaryKey: 'dashboard.roles.EMPLOYEE.summary',
    scopeKey: 'dashboard.roles.EMPLOYEE.scope',
    capabilities: [
      {
        labelKey: 'dashboard.roles.EMPLOYEE.cap1Label',
        descriptionKey: 'dashboard.roles.EMPLOYEE.cap1Desc',
        icon: ClipboardList,
      },
      {
        labelKey: 'dashboard.roles.EMPLOYEE.cap2Label',
        descriptionKey: 'dashboard.roles.EMPLOYEE.cap2Desc',
        icon: ClipboardCheck,
      },
      {
        labelKey: 'dashboard.roles.EMPLOYEE.cap3Label',
        descriptionKey: 'dashboard.roles.EMPLOYEE.cap3Desc',
        icon: PackageSearch,
      },
      {
        labelKey: 'dashboard.roles.EMPLOYEE.cap4Label',
        descriptionKey: 'dashboard.roles.EMPLOYEE.cap4Desc',
        icon: BadgeCheck,
      },
    ],
  },
};

export const ACCOUNT_ICONS = {
  building: Building2,
  calendar: CalendarDays,
  key: KeyRound,
  users: Users,
} as const;
