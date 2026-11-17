import { describe, expect, it } from 'vitest';
import {
  getMobileTabs,
  getNavigation,
  getTopLinks,
  isMobileTabActive,
  isTopLinkActive,
  landingPathForRole,
  type MobileTabItem,
  type TopLinkItem,
} from '../src/components/shared/navigation';
import type { Role } from '../src/types/auth';

const ALL_ROLES: Role[] = ['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN'];
const REPORT_ROUTE = '/lost-found/report';

function fullMenuRoutes(role: Role): string[] {
  return getNavigation(role).flatMap((group) => group.items.map((item) => item.to));
}

function linkTabs(role: Role): MobileTabItem[] {
  return getMobileTabs(role).filter((tab) => tab.to);
}

describe('full-menu report visibility (spec 003, drawer since spec 007)', () => {
  it.each(['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER'] as Role[])(
    '%s keeps the report item in the full navigation',
    (role) => {
      expect(fullMenuRoutes(role)).toContain(REPORT_ROUTE);
    },
  );

  it('SUPER_ADMIN has no report item in the full navigation', () => {
    expect(fullMenuRoutes('SUPER_ADMIN')).not.toContain(REPORT_ROUTE);
  });
});

describe('drawer navigation (spec 007)', () => {
  it.each(['STUDENT', 'EMPLOYEE'] as Role[])(
    '%s drawer carries the home page, the everyday pages and the حسامي group',
    (role) => {
      const groups = getNavigation(role);
      expect(groups.flatMap((group) => group.items.map((item) => item.to))).toEqual([
        '/home',
        '/lost-found',
        REPORT_ROUTE,
        '/lost-found/my-reports',
        '/lost-found/claims',
        '/dashboard',
      ]);
      expect(groups[1]?.titleKey).toBe('nav.groupMyAccount');
    },
  );

  it.each(['LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as Role[])(
    '%s drawer keeps the pre-007 menu arrangement (dashboard first, no home page)',
    (role) => {
      const routes = fullMenuRoutes(role);
      expect(routes[0]).toBe('/dashboard');
      expect(routes).not.toContain('/home');
    },
  );
});

describe('top-navbar links (spec 007)', () => {
  it.each(['STUDENT', 'EMPLOYEE'] as Role[])('%s top links are the mockup set', (role) => {
    expect(getTopLinks(role).map((link) => link.to)).toEqual([
      '/home',
      '/lost-found',
      REPORT_ROUTE,
      '/lost-found/my-reports',
      '/lost-found/claims',
      '/dashboard',
    ]);
  });

  it('LOST_FOUND_MANAGER top links are its working set', () => {
    expect(getTopLinks('LOST_FOUND_MANAGER').map((link) => link.to)).toEqual([
      '/dashboard',
      '/statistics',
      '/lost-found/matches',
      '/lost-found/claims',
      '/lost-found/items',
      '/lost-found',
    ]);
  });

  it('SUPER_ADMIN top links lead with the dashboard and users, with no report link', () => {
    const links = getTopLinks('SUPER_ADMIN');
    expect(links.map((link) => link.to)).toEqual([
      '/dashboard',
      '/statistics',
      '/users',
      '/lost-found/items',
      '/lost-found/matches',
      '/lost-found/claims',
      '/lost-found',
    ]);
    expect(links.map((link) => link.to)).not.toContain(REPORT_ROUTE);
  });

  it.each(ALL_ROLES)('%s top links stay within the full menu routes (parity)', (role) => {
    const routes = fullMenuRoutes(role);
    for (const link of getTopLinks(role)) {
      expect(routes).toContain(link.to);
    }
  });

  it('SUPER_ADMIN has no report entry on any navigation surface', () => {
    expect(fullMenuRoutes('SUPER_ADMIN')).not.toContain(REPORT_ROUTE);
    expect(getTopLinks('SUPER_ADMIN').map((link) => link.to)).not.toContain(REPORT_ROUTE);
    expect(getMobileTabs('SUPER_ADMIN').map((tab) => tab.to)).not.toContain(REPORT_ROUTE);
  });
});

describe('statistics navigation (spec 009)', () => {
  const STATISTICS_ROUTE = '/statistics';

  it.each(['LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as Role[])(
    '%s gets statistics right after the dashboard in top links and drawer',
    (role) => {
      const topLinks = getTopLinks(role).map((link) => link.to);
      expect(topLinks.indexOf(STATISTICS_ROUTE)).toBe(topLinks.indexOf('/dashboard') + 1);

      const menu = fullMenuRoutes(role);
      expect(menu.indexOf(STATISTICS_ROUTE)).toBe(menu.indexOf('/dashboard') + 1);
    },
  );

  it.each(['STUDENT', 'EMPLOYEE'] as Role[])(
    '%s has no statistics entry on any navigation surface',
    (role) => {
      expect(fullMenuRoutes(role)).not.toContain(STATISTICS_ROUTE);
      expect(getTopLinks(role).map((link) => link.to)).not.toContain(STATISTICS_ROUTE);
      expect(getMobileTabs(role).map((tab) => tab.to)).not.toContain(STATISTICS_ROUTE);
    },
  );

  it.each(['LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as Role[])(
    '%s statistics top link lights only on /statistics',
    (role) => {
      const link = getTopLinks(role).find(
        (entry) => entry.to === STATISTICS_ROUTE,
      ) as TopLinkItem;
      expect(isTopLinkActive(link, '/statistics')).toBe(true);
      expect(isTopLinkActive(link, '/dashboard')).toBe(false);
    },
  );
});

describe('isTopLinkActive route mapping (spec 007)', () => {
  const linkFor = (role: Role, to: string) =>
    getTopLinks(role).find((link) => link.to === to) as TopLinkItem;

  it('the student home link lights only on /home, not on the dashboard', () => {
    expect(isTopLinkActive(linkFor('STUDENT', '/home'), '/home')).toBe(true);
    expect(isTopLinkActive(linkFor('STUDENT', '/home'), '/dashboard')).toBe(false);
    expect(isTopLinkActive(linkFor('STUDENT', '/dashboard'), '/dashboard')).toBe(true);
  });

  it('item detail lights browse for students and the registry for staff', () => {
    const detail = '/lost-found/items/abc123';
    expect(isTopLinkActive(linkFor('STUDENT', '/lost-found'), detail)).toBe(true);
    expect(isTopLinkActive(linkFor('LOST_FOUND_MANAGER', '/lost-found/items'), detail)).toBe(
      true,
    );
    expect(isTopLinkActive(linkFor('LOST_FOUND_MANAGER', '/lost-found'), detail)).toBe(false);
  });

  it('claim detail lights the claims link; archived lights the staff registry', () => {
    expect(
      isTopLinkActive(linkFor('EMPLOYEE', '/lost-found/claims'), '/lost-found/claims/xyz'),
    ).toBe(true);
    expect(
      isTopLinkActive(linkFor('SUPER_ADMIN', '/lost-found/items'), '/lost-found/archived'),
    ).toBe(true);
    expect(
      isTopLinkActive(linkFor('LOST_FOUND_MANAGER', '/lost-found/claims'), '/lost-found/handovers'),
    ).toBe(true);
  });
});

describe('landingPathForRole (spec 007)', () => {
  it.each(['STUDENT', 'EMPLOYEE'] as Role[])('%s lands on the home page', (role) => {
    expect(landingPathForRole(role)).toBe('/home');
  });

  it.each(['LOST_FOUND_MANAGER', 'SUPER_ADMIN'] as Role[])('%s lands on the dashboard', (role) => {
    expect(landingPathForRole(role)).toBe('/dashboard');
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
      '/home',
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
    '%s mobile link tabs stay within the full menu routes (parity)',
    (role) => {
      const routes = fullMenuRoutes(role);
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
    expect(isMobileTabActive(tabFor('STUDENT', '/home'), detail)).toBe(false);
  });

  it('the student home tab lights on /home only (spec 007)', () => {
    expect(isMobileTabActive(tabFor('STUDENT', '/home'), '/home')).toBe(true);
    expect(isMobileTabActive(tabFor('STUDENT', '/home'), '/dashboard')).toBe(false);
    expect(isMobileTabActive(tabFor('LOST_FOUND_MANAGER', '/dashboard'), '/dashboard')).toBe(
      true,
    );
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
