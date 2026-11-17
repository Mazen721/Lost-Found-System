import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/AuthContext';
import { tr } from '@/i18n/localize';
import { enumLabel } from '@/lib/labels';
import { getInitials } from '@/lib/utils';

/**
 * The navbar user chip (spec 007): name + role on the navy bar, opening
 * the account menu (profile, sign out). The dropdown panel itself is the
 * same light menu the pre-007 top bar used.
 */
export function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = tr(user, 'name') || user.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pe-2 ps-1 text-start transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--mnu-navy))]"
          aria-label={t('auth.profileTitle')}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[hsl(var(--mnu-gold))] text-xs font-bold text-[hsl(var(--mnu-navy))]">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 sm:block">
            <bdi className="block max-w-[140px] truncate text-xs font-semibold leading-tight text-white">
              {displayName}
            </bdi>
            <span className="block text-[11.5px] leading-tight text-white/60">
              {enumLabel('role', user.role)}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <bdi className="block truncate text-sm font-semibold text-foreground">{displayName}</bdi>
          <span dir="ltr" className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {t('nav.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
