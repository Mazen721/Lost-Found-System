import {
  Backpack,
  BookOpen,
  FileText,
  Glasses,
  Headphones,
  KeyRound,
  Laptop,
  Package,
  Shirt,
  Smartphone,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { LostFoundCategory } from '@/types/lostFound';

export interface CategoryStyle {
  icon: LucideIcon;
  /** Soft tinted chip used on cards and lists. */
  chipClass: string;
  /** Solid icon tile used when no photo is available. */
  tileClass: string;
}

const CATEGORY_STYLES: Record<LostFoundCategory, CategoryStyle> = {
  Electronics: {
    icon: Zap,
    chipClass: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    tileClass: 'bg-violet-100 text-violet-700',
  },
  Phones: {
    icon: Smartphone,
    chipClass: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    tileClass: 'bg-sky-100 text-sky-700',
  },
  Laptops: {
    icon: Laptop,
    chipClass: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    tileClass: 'bg-indigo-100 text-indigo-700',
  },
  Headphones: {
    icon: Headphones,
    chipClass: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20',
    tileClass: 'bg-fuchsia-100 text-fuchsia-700',
  },
  Wallets: {
    icon: Wallet,
    chipClass: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    tileClass: 'bg-amber-100 text-amber-800',
  },
  Bags: {
    icon: Backpack,
    chipClass: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    tileClass: 'bg-orange-100 text-orange-700',
  },
  Keys: {
    icon: KeyRound,
    chipClass: 'bg-yellow-50 text-yellow-800 ring-yellow-600/25',
    tileClass: 'bg-yellow-100 text-yellow-800',
  },
  Documents: {
    icon: FileText,
    chipClass: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    tileClass: 'bg-teal-100 text-teal-700',
  },
  Clothing: {
    icon: Shirt,
    chipClass: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    tileClass: 'bg-rose-100 text-rose-700',
  },
  Books: {
    icon: BookOpen,
    chipClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    tileClass: 'bg-emerald-100 text-emerald-700',
  },
  Accessories: {
    icon: Glasses,
    chipClass: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    tileClass: 'bg-cyan-100 text-cyan-700',
  },
  Other: {
    icon: Package,
    chipClass: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    tileClass: 'bg-slate-200 text-slate-700',
  },
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category as LostFoundCategory] ?? CATEGORY_STYLES.Other;
}
