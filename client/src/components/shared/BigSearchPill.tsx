import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BigSearchPillProps {
  inputId: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Optional: the Browse hero binds the input live and needs no submit. */
  onSubmit?: () => void;
}

/**
 * The Concept 1 hero search (spec 006): one oversized white pill — search
 * icon, free-text input, and a gold «دوّر» button inside the pill. Shared
 * by the home hero (submit navigates to Browse) and the Browse hero
 * (input is bound live to the page's search filter). The input stays at
 * 16px on small screens so iOS does not zoom on focus (spec 003 rule).
 */
export function BigSearchPill({ inputId, value, onValueChange, onSubmit }: BigSearchPillProps) {
  const { t } = useTranslation();

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className="mx-auto flex h-16 w-full max-w-[720px] items-center rounded-full bg-white p-[7px] shadow-[0_24px_48px_-16px_rgb(0_0_0/0.45)]"
    >
      <label htmlFor={inputId} className="sr-only">
        {t('common.search')}
      </label>
      <Search
        className="ms-3 h-[22px] w-[22px] shrink-0 text-[#8494AC]"
        strokeWidth={2}
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={t('lostFound.heroSearchPlaceholder')}
        className="min-w-0 flex-1 bg-transparent px-2 text-base font-semibold text-foreground outline-none placeholder:text-[#8494AC] sm:text-[17px]"
      />
      <button
        type="submit"
        className="h-full shrink-0 rounded-full bg-[hsl(var(--mnu-gold))] px-6 text-base font-extrabold text-[hsl(var(--mnu-navy))] transition-colors hover:bg-[hsl(var(--mnu-gold))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mnu-navy))] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-9 sm:text-[17px]"
      >
        {t('lostFound.heroSearchButton')}
      </button>
    </form>
  );
}
