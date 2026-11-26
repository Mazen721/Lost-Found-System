import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  ITEM_STATUSES,
  LOST_FOUND_CATEGORIES,
  PUBLICATION_STATUSES,
  REPORT_TYPES,
  type ItemStatus,
  type LostFoundCategory,
  type PublicationStatus,
  type ReportType,
} from '../../../config/constants';
import {
  MAX_IMAGES_MESSAGE,
  imageSchema,
  maxImagesValidator,
  type ImageAsset,
} from '../../../shared/schemas/image.schema';

export interface ILostFoundItem {
  reportNumber: string;
  reportType: ReportType;
  itemTitle: string;
  itemTitleAr?: string;
  description: string;
  descriptionAr?: string;
  privateIdentificationDetails: string;
  category: LostFoundCategory;
  color?: string;
  colorAr?: string;
  /** Canonical color group derived from `color` (spec 010); internal filter key, never serialized. */
  colorGroup?: string | null;
  brand?: string;
  brandAr?: string;
  locationId: Types.ObjectId;
  locationDetails: string;
  locationDetailsAr?: string;
  occurrenceDate: Date;
  images: ImageAsset[];
  reporterId: Types.ObjectId;
  status: ItemStatus;
  /** Spec 012: moderation gate, independent of the lifecycle `status`. */
  publicationStatus: PublicationStatus;
  publicationReviewedBy?: Types.ObjectId | null;
  publicationReviewedAt?: Date | null;
  /** Staff-only value estimate (spec 008); never serialized for students. */
  estimatedValueEGP?: number | null;
  valueSource?: 'AUTO' | 'ADJUSTED' | null;
  valueAdjustedBy?: Types.ObjectId | null;
  valueAdjustedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const lostFoundItemSchema = new Schema<ILostFoundItem>(
  {
    reportNumber: { type: String, required: true, trim: true },
    reportType: { type: String, required: true, enum: REPORT_TYPES },
    itemTitle: { type: String, required: true, trim: true, maxlength: 160 },
    itemTitleAr: { type: String, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    descriptionAr: { type: String, trim: true, maxlength: 4000 },
    privateIdentificationDetails: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
      select: false,
    },
    category: { type: String, required: true, enum: LOST_FOUND_CATEGORIES },
    color: { type: String, trim: true, maxlength: 60 },
    colorAr: { type: String, trim: true, maxlength: 60 },
    colorGroup: { type: String, trim: true, default: null },
    brand: { type: String, trim: true, maxlength: 80 },
    brandAr: { type: String, trim: true, maxlength: 80 },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    locationDetails: { type: String, required: true, trim: true, maxlength: 500 },
    locationDetailsAr: { type: String, trim: true, maxlength: 500 },
    occurrenceDate: { type: Date, required: true },
    images: {
      type: [imageSchema],
      default: [],
      validate: { validator: maxImagesValidator, message: MAX_IMAGES_MESSAGE },
    },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, required: true, enum: ITEM_STATUSES, default: 'OPEN' },
    // Spec 012: default PUBLISHED so existing/seed data is unaffected;
    // documents predating the field are also treated as published.
    publicationStatus: {
      type: String,
      required: true,
      enum: PUBLICATION_STATUSES,
      default: 'PUBLISHED',
    },
    publicationReviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publicationReviewedAt: { type: Date, default: null },
    // Staff-only (spec 008): select:false like privateIdentificationDetails,
    // so the fields are fetched only where a staff serializer opts in.
    estimatedValueEGP: { type: Number, default: null, select: false },
    valueSource: {
      type: String,
      enum: ['AUTO', 'ADJUSTED'],
      default: 'AUTO',
      select: false,
    },
    valueAdjustedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      select: false,
    },
    valueAdjustedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false },
);

lostFoundItemSchema.index({ reportNumber: 1 }, { unique: true });
lostFoundItemSchema.index({ reportType: 1, status: 1, category: 1 });
lostFoundItemSchema.index({ colorGroup: 1 });
lostFoundItemSchema.index({ itemTitle: 'text', description: 'text' });
lostFoundItemSchema.index({ occurrenceDate: 1 });
// Production-readiness pass (2026-11-22): indexes for the query shapes the
// audit found doing collection scans — "my items" (reporterId), location
// filtering, newest-first browse/dashboard sorts, the matching runner's
// OPEN-opposite-type scan, and the stale-items updatedAt cutoff.
lostFoundItemSchema.index({ reporterId: 1, createdAt: -1 });
lostFoundItemSchema.index({ locationId: 1 });
lostFoundItemSchema.index({ status: 1, createdAt: -1 });
lostFoundItemSchema.index({ reportType: 1, status: 1, occurrenceDate: -1 });
lostFoundItemSchema.index({ status: 1, updatedAt: 1 });
lostFoundItemSchema.index({ publicationStatus: 1, createdAt: -1 });

export const LostFoundItem =
  (models.LostFoundItem as Model<ILostFoundItem> | undefined) ??
  model<ILostFoundItem>('LostFoundItem', lostFoundItemSchema);
