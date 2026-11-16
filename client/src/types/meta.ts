import type { Role } from '@/types/auth';

export const LOST_FOUND_CATEGORIES = [
  'Electronics',
  'Phones',
  'Laptops',
  'Headphones',
  'Wallets',
  'Bags',
  'Keys',
  'Documents',
  'Accessories',
  'Books',
  'Clothing',
  'Other',
] as const;
export type LostFoundCategory = (typeof LOST_FOUND_CATEGORIES)[number];

export const LOCATION_TYPES = ['BUILDING', 'FLOOR', 'ROOM', 'LAB', 'OTHER'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export type MatchLevel = 'STRONG' | 'POSSIBLE';

export interface Meta {
  roles: Role[];
  lostFoundCategories: string[];
  itemStatuses: string[];
  claimStatuses: string[];
  matchStatuses: string[];
  matchLevels: MatchLevel[];
  reportTypes: string[];
  locationTypes: LocationType[];
  matching: {
    weights: Record<string, number>;
    thresholds: Record<MatchLevel, number>;
  };
  uploads: {
    maxImages: number;
    maxBytes: number;
    mimeTypes: string[];
  };
}
