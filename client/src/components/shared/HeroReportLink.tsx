import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/**
 * The gold «أبلغ عن غرض» pill action used by both spec 006 hero surfaces
 * (home and Browse) — one definition so the two CTAs cannot drift apart.
 */
export function HeroReportLink() {
  const { t } = useTranslation();

  return (
    <Link
      to="/lost-found/report"
      className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--mnu-gold))] px-6 py-3 text-base font-extrabold text-[hsl(var(--mnu-navy))] shadow-[0_12px_24px_-10px_rgb(201_162_39/0.7)] transition-colors hover:bg-[hsl(var(--mnu-gold))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--mnu-navy))]"
    >
      <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
      {t('lostFound.reportAnItem')}
    </Link>
  );
}
