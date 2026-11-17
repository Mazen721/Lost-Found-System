import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { HomeHero } from '@/components/shared/HomeHero';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { MobileNotificationsSheet } from '@/components/shared/MobileNotificationsSheet';
import { NavDrawer } from '@/components/shared/NavDrawer';
import { TopNavbar } from '@/components/shared/TopNavbar';
import { isMnuPortalRole } from '@/components/shared/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

const FORM_CONTROL_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

/**
 * Tracks whether the on-screen keyboard is likely open (spec 003): focus
 * inside a form control is the primary signal; a visual-viewport shrink
 * beyond 120px is the secondary one. Used to slide the mobile bottom bar
 * (and its content spacer) away while the user is typing.
 */
function useMobileKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    let focusInForm = false;
    let viewportShrunk = false;
    const update = () => setKeyboardOpen(focusInForm || viewportShrunk);

    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as HTMLElement | null)?.matches?.(FORM_CONTROL_SELECTOR)) {
        focusInForm = true;
        update();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as HTMLElement | null;
      if (!next?.matches?.(FORM_CONTROL_SELECTOR)) {
        focusInForm = false;
        update();
      }
    };

    let resizeTimer: number | undefined;
    const onViewportResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const viewport = window.visualViewport;
        viewportShrunk = viewport ? window.innerHeight - viewport.height > 120 : false;
        update();
      }, 100);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
      window.clearTimeout(resizeTimer);
    };
  }, []);

  return keyboardOpen;
}

/**
 * Website shell (spec 007): a navy top navbar for every role — no
 * persistent sidebar. The full menu lives in a drawer that is closed by
 * default. On the home route the navbar sits inside the navy zone that
 * continues into the hero, so the page top is one continuous navy block;
 * everywhere else the navbar is a sticky bar and the page content runs
 * full-width under it (≈1280px container). The spec 003 mobile bottom
 * bar and notifications sheet are unchanged.
 */
export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const keyboardOpen = useMobileKeyboardOpen();

  const isMnuPortal = isMnuPortalRole(user?.role);
  const isHome = location.pathname === '/home';

  useEffect(() => {
    document.body.classList.toggle('mnu-portal-surface', isMnuPortal);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isMnuPortal ? '#04153E' : '#12372c');
    }
    return () => {
      document.body.classList.remove('mnu-portal-surface');
      themeMeta?.setAttribute('content', '#04153E');
    };
  }, [isMnuPortal]);

  if (!user) return null;

  const openDrawer = () => setDrawerOpen(true);

  return (
    <div className={cn('flex min-h-screen flex-col bg-background', isMnuPortal && 'mnu-portal-surface')}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        CampusCare Lost &amp; Found
      </a>

      {isHome ? (
        <div className="bg-hero-concept">
          <TopNavbar flush onMenu={openDrawer} />
          <HomeHero />
        </div>
      ) : (
        <TopNavbar onMenu={openDrawer} />
      )}

      <main
        id="main-content"
        className={
          isHome
            ? 'w-full flex-1'
            : 'mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:py-8'
        }
      >
        <Outlet />
      </main>

      {/* Clearance for the fixed mobile bottom bar (spec 003); collapses
          while the keyboard is open, together with the bar itself. */}
      <div
        aria-hidden="true"
        className={cn(
          'shrink-0 transition-[height] duration-200 lg:hidden',
          keyboardOpen ? 'h-0' : 'h-[calc(5.25rem+env(safe-area-inset-bottom))]',
        )}
      />

      <NavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <MobileBottomNav
        hidden={keyboardOpen}
        onNotifications={() => setNotificationsOpen(true)}
        onMore={openDrawer}
      />
      <MobileNotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </div>
  );
}
