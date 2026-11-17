import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { UserMenu } from '@/components/shared/UserMenu';
import {
  getTopLinks,
  isTopLinkActive,
  landingPathForRole,
} from '@/components/shared/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

interface TopNavbarProps {
  /** Opens the full-menu drawer (closed by default, spec 007). */
  onMenu: () => void;
  /**
   * Flush variant for the home page: transparent and static, rendered
   * inside the navy zone that continues into the hero so the two read as
   * one block. Everywhere else the navbar is a sticky navy bar.
   */
  flush?: boolean;
}

/**
 * Website-style top navbar (spec 007): brand, the role's top links on the
 * navy, «القائمة» button, notifications bell and the user chip. There is
 * no persistent sidebar anymore; the complete menu lives in the drawer.
 */
export function TopNavbar({ onMenu, flush = false }: TopNavbarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const topLinks = getTopLinks(user.role);

  return (
    <header
      className={cn(
        flush
          ? 'relative'
          : 'sticky top-0 z-30 bg-hero-concept shadow-[0_12px_32px_-16px_rgba(4,21,62,0.55)]',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-3 px-4 sm:h-[76px] sm:gap-5 sm:px-6">
        <Link
          to={landingPathForRole(user.role)}
          className="flex flex-none items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))] sm:gap-3"
          aria-label={t('meta.tagline')}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white sm:h-11 sm:w-11 sm:rounded-xl">
            <img
              src="/Mansoura%20National%20University%20Emblem.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold leading-tight text-white sm:text-base">
              {t('meta.tagline')}
            </span>
            <span className="block truncate text-[11px] font-semibold leading-tight text-white/55 sm:text-xs">
              {t('meta.university')}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t('nav.groupOverview')}
          className="hidden min-w-0 items-center gap-1 lg:flex"
        >
          {topLinks.map((link) => {
            const active = isTopLinkActive(link, location.pathname);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))]',
                  active
                    ? 'bg-[hsl(var(--mnu-gold))]/[0.13] text-[hsl(var(--mnu-gold))]'
                    : 'text-[#B9C7DE] hover:text-white',
                )}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex flex-none items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex items-center gap-2 rounded-full border-[1.5px] border-white/35 px-3.5 py-2 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))] sm:px-4 sm:text-[13.5px]"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
            {t('nav.menu')}
          </button>
          <NotificationBell tone="onDark" />
          <div className="hidden lg:block">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
