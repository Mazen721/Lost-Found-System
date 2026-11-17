import { LogOut, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { BrandMark } from '@/components/shared/BrandMark';
import { getNavigation } from '@/components/shared/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/AuthContext';
import { tr } from '@/i18n/localize';
import { enumLabel } from '@/lib/labels';
import { cn, getInitials } from '@/lib/utils';

interface NavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The full-menu drawer (spec 007): closed by default on every viewport,
 * opened only via the navbar's «القائمة» button (or the admin bottom
 * bar's «المزيد»). Carries the complete per-role navigation from
 * `getNavigation`, the role chip, and the user block with sign-out.
 * Closes on navigation, scrim click, ✕ and Escape (Radix Dialog).
 */
export function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const groups = getNavigation(user.role);
  const displayName = tr(user, 'name') || user.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="fixed inset-y-0 start-0 left-auto top-0 flex h-full w-[86%] max-w-[302px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 border-e border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:rounded-none"
      >
        <DialogTitle className="sr-only">{t('nav.menu')}</DialogTitle>
        <DialogDescription className="sr-only">CampusCare Lost &amp; Found</DialogDescription>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-5 py-4">
          <BrandMark inverted portal />
          <DialogClose
            className="rounded-full border-[1.5px] border-white/25 p-1.5 text-sidebar-foreground transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))] focus-visible:ring-offset-0"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogClose>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-sidebar-border px-5 py-3.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-sidebar-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--mnu-gold))]" aria-hidden="true" />
            {enumLabel('role', user.role)}
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label={t('nav.menu')}>
          {groups.map((group, groupIndex) => (
            <div key={group.titleKey ?? `group-${groupIndex}`}>
              {group.titleKey ? (
                <p className="px-2.5 pb-2 text-xs font-semibold text-sidebar-muted">
                  {t(group.titleKey)}
                </p>
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  if (item.soon) {
                    return (
                      <li key={`${group.titleKey ?? 'main'}-${item.labelKey}`}>
                        <div
                          aria-disabled="true"
                          title={t('common.soon')}
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted/60"
                        >
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                          <span className="truncate">{t(item.labelKey)}</span>
                          <span className="ms-auto rounded-full border border-sidebar-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-muted/80">
                            {t('common.soon')}
                          </span>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={`${group.titleKey ?? 'main'}-${item.labelKey}`}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => onOpenChange(false)}
                        className={({ isActive }) =>
                          cn(
                            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))] focus-visible:ring-offset-0',
                            isActive
                              ? 'bg-white/[0.11] font-semibold text-sidebar-foreground ring-1 ring-inset ring-white/10'
                              : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive ? (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-1.5 start-0 w-[3px] rounded-e-full bg-[hsl(var(--mnu-gold))]"
                              />
                            ) : null}
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                isActive ? 'text-[hsl(var(--mnu-gold))]' : 'text-sidebar-muted',
                              )}
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                            <span className="truncate">{t(item.labelKey)}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] p-2.5">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[hsl(var(--mnu-gold))] text-xs font-bold text-[hsl(var(--mnu-navy))]">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                <bdi>{displayName}</bdi>
              </p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {enumLabel('role', user.role)}
                {tr(user, 'department') ? ` · ${tr(user, 'department')}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-sidebar-muted hover:bg-white/[0.08] hover:text-sidebar-foreground"
              onClick={() => {
                onOpenChange(false);
                logout();
              }}
              aria-label={t('auth.signOut')}
              title={t('auth.signOut')}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
