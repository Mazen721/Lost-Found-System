export interface ImageAsset {
  url: string;
  publicId: string;
}
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

export const REPORT_TYPES = ['LOST', 'FOUND'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const ITEM_STATUSES = [
  'OPEN',
  'MATCH_CONFIRMED',
  'CLAIM_UNDER_REVIEW',
  'APPROVED_FOR_HANDOVER',
  'RETURNED',
  'CLOSED',
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ACTIVE_BROWSE_STATUSES = [
  'OPEN',
  'MATCH_CONFIRMED',
  'CLAIM_UNDER_REVIEW',
] as const;

export const ARCHIVED_ITEM_STATUSES = [
  'APPROVED_FOR_HANDOVER',
  'RETURNED',
  'CLOSED',
] as const;

export interface LostFoundLocation {
  id: string;
  buildingName: string;
  buildingNameAr?: string;
  floor: string;
  floorAr?: string;
  room: string;
  roomAr?: string;
  locationType?: string;
}

export interface LostFoundReporter {
  id: string;
  name: string;
  nameAr?: string;
  email?: string;
  department?: string;
  departmentAr?: string;
  role?: Role;
}

export interface LostFoundItem {
  id: string;
  reportNumber: string;
  reportType: ReportType;
  itemTitle: string;
  itemTitleAr?: string;
  description: string;
  descriptionAr?: string;
  category: LostFoundCategory;
  color?: string;
  colorAr?: string;
  brand?: string;
  brandAr?: string;
  location: LostFoundLocation | null;
  locationDetails: string;
  locationDetailsAr?: string;
  occurrenceDate: string;
  images: ImageAsset[];
  status: ItemStatus;
  privateIdentificationDetails?: string;
  reporter?: LostFoundReporter | null;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Staff-only value estimate (spec 008). The server includes these
   * fields ONLY in LOST_FOUND_MANAGER / SUPER_ADMIN payloads — they are
   * absent (not null) for students/employees, so render value UI only
   * when `estimatedValueEGP` is a number.
   */
  estimatedValueEGP?: number;
  valueSource?: 'AUTO' | 'ADJUSTED';
  valueAdjustedBy?: string | null;
  valueAdjustedAt?: string | null;
}

export interface CreateLostFoundItemInput {
  reportType: ReportType;
  itemTitle: string;
  description: string;
  privateIdentificationDetails: string;
  category: LostFoundCategory;
  color?: string;
  brand?: string;
  locationId: string;
  locationDetails: string;
  occurrenceDate: string;
  images: File[];
}

export interface UpdateLostFoundItemInput {
  itemTitle?: string;
  description?: string;
  privateIdentificationDetails?: string;
  category?: LostFoundCategory;
  color?: string;
  brand?: string;
  locationId?: string;
  locationDetails?: string;
  occurrenceDate?: string;
  status?: 'CLOSED';
}

export interface ListLostFoundItemsParams {
  q?: string;
  category?: LostFoundCategory;
  reportType?: ReportType;
  locationId?: string;
  building?: string;
  from?: string;
  to?: string;
  color?: string;
  brand?: string;
  status?: ItemStatus;
  scope?: 'active' | 'archived' | 'all';
  mine?: boolean;
  page?: number;
  limit?: number;
}
