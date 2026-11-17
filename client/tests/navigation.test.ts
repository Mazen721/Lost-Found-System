import { describe, expect, it } from 'vitest';
import {
  getMobileTabs,
  getNavigation,
  isMobileTabActive,
  type MobileTabItem,
} from '../src/components/shared/navigation';
import type { Role } from '../src/types/auth';

const ALL_ROLES: Role[] = ['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN'];
const REPORT_ROUTE = '/lost-found/report';

function sidebarRoutes(role: Role): string[] {
  return getNavigation(role).flatMap((group) => group.items.map((item) => item.to));
}

function linkTabs(role: Role): MobileTabItem[] {
  return getMobileTabs(role).filter((tab) => tab.to);
}

describe('sidebar report visibility (spec 003)', () => {
  it.each(['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER'] as Role[])(
    '%s keeps the report item in the sidebar navigation',
    (role) => {
      expect(sidebarRoutes(role)).toContain(REPORT_ROUTE);
    },
  );

  it('SUPER_ADMIN has no report item in the sidebar navigation', () => {
    expect(sidebarRoutes('SUPER_ADMIN')).not.toContain(REPORT_ROUTE);
  });
});

describe('mobile bottom-bar tabs (spec 003)', () => {
  it.each(['STUDENT', 'EMPLOYEE'] as Role[])(
    '%s gets the report route as the single prominent centre tab',
    (role) => {
      const prominent = getMobileTabs(role).filter((tab) => tab.prominent);
      expect(prominent).toHaveLength(1);
      expect(prominent[0]?.to).toBe(REPORT_ROUTE);
    },
  );

  it.each(['STUDENT', 'EMPLOYEE'] as Role[])('%s tab routes are the expected set', (role) => {
    expect(linkTabs(role).map((tab) => tab.to)).toEqual([
      '/dashboard',
      '/lost-found',
      REPORT_ROUTE,
      '/lost-found/my-reports',
      '/lost-found/claims',
    ]);
  });

  it('LOST_FOUND_MANAGER gets a notifications action tab and no prominent tab', () => {
    const tabs = getMobileTabs('LOST_FOUND_MANAGER');
    expect(tabs.some((tab) => tab.action === 'notifications')).toBe(true);
    expect(tabs.some((tab) => tab.prominent)).toBe(false);
    expect(tabs.map((tab) => tab.to)).not.toContain(REPORT_ROUTE);
  });

  it('SUPER_ADMIN gets a more action tab and no report tab of any kind', () => {
    const tabs = getMobileTabs('SUPER_ADMIN');
    expect(tabs.some((tab) => tab.action === 'more')).toBe(true);
    expect(tabs.some((tab) => tab.prominent)).toBe(false);
    expect(tabs.map((tab) => tab.to)).not.toContain(REPORT_ROUTE);
  });

  it.each(ALL_ROLES)('%s renders exactly five bottom-bar slots', (role) => {
    expect(getMobileTabs(role)).toHaveLength(5);
  });

  it.each(ALL_ROLES)(
    '%s mobile link tabs stay within the sidebar routes (parity)',
    (role) => {
      const routes = sidebarRoutes(role);
      for (const tab of linkTabs(role)) {
        expect(routes).toContain(tab.to);
      }
    },
  );
});

describe('isMobileTabActive route mapping (spec 003)', () => {
  const tabFor = (role: Role, to: string) =>
    getMobileTabs(role).find((tab) => tab.to === to) as MobileTabItem;

  it('item detail lights browse for students and the items tab for staff', () => {
    const detail = '/lost-found/items/abc123';
    expect(isMobileTabActive(tabFor('STUDENT', '/lost-found'), detail)).toBe(true);
    expect(isMobileTabActive(tabFor('LOST_FOUND_MANAGER', '/lost-found/items'), detail)).toBe(
      true,
    );
    expect(isMobileTabActive(tabFor('STUDENT', '/dashboard'), detail)).toBe(false);
  });

  it('claim detail lights the claims tab', () => {
    expect(
      isMobileTabActive(tabFor('EMPLOYEE', '/lost-found/claims'), '/lost-found/claims/xyz'),
    ).toBe(true);
    expect(
      isMobileTabActive(tabFor('SUPER_ADMIN', '/lost-found/claims'), '/lost-found/claims/xyz'),
    ).toBe(true);
  });

  it('archived lights the staff items tab; handovers light manager claims', () => {
    expect(
      isMobileTabActive(tabFor('LOST_FOUND_MANAGER', '/lost-found/items'), '/lost-found/archived'),
    ).toBe(true);
    expect(
      isMobileTabActive(
        tabFor('LOST_FOUND_MANAGER', '/lost-found/claims'),
        '/lost-found/handovers',
      ),
    ).toBe(true);
  });

  it('drawer-only admin routes light the more tab', () => {
    const more = getMobileTabs('SUPER_ADMIN').find((tab) => tab.action === 'more') as MobileTabItem;
    for (const route of ['/users', '/locations', '/activity-logs', '/lost-found/handovers']) {
      expect(isMobileTabActive(more, route)).toBe(true);
    }
    expect(isMobileTabActive(more, '/dashboard')).toBe(false);
  });
});
