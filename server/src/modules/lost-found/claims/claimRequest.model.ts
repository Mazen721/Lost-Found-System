import { Schema, model, models, type Model, type Types } from 'mongoose';
import { CLAIM_STATUSES, type ClaimStatus } from '../../../config/constants';
import {
  MAX_IMAGES_MESSAGE,
  imageSchema,
  maxImagesValidator,
  type ImageAsset,
} from '../../../shared/schemas/image.schema';

export interface ClaimHandover {
  receivedByName?: string;
  receivedByNameAr?: string;
  handedOverBy?: Types.ObjectId;
  notes?: string;
  notesAr?: string;
  handedOverAt?: Date;
}

export interface IClaimRequest {
  claimNumber: string;
  itemId: Types.ObjectId;
  linkedLostItemId?: Types.ObjectId;
  claimantId: Types.ObjectId;
  claimDescription: string;
  claimDescriptionAr?: string;
  identifyingDetailsProvided: string;
  supportingEvidence: ImageAsset[];
  status: ClaimStatus;
  verificationNotes?: string;
  verificationNotesAr?: string;
  rejectionReason?: string;
  rejectionReasonAr?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  handover?: ClaimHandover;
  createdAt: Date;
  updatedAt: Date;
}

const handoverSchema = new Schema<ClaimHandover>(
  {
    receivedByName: { type: String, trim: true, maxlength: 120 },
    receivedByNameAr: { type: String, trim: true, maxlength: 120 },
    handedOverBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 1000 },
    notesAr: { type: String, trim: true, maxlength: 1000 },
    handedOverAt: { type: Date },
  },
  { _id: false },
);

const claimRequestSchema = new Schema<IClaimRequest>(
  {
    claimNumber: { type: String, required: true, trim: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'LostFoundItem', required: true },
    linkedLostItemId: { type: Schema.Types.ObjectId, ref: 'LostFoundItem' },
    claimantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claimDescription: { type: String, required: true, trim: true, maxlength: 4000 },
    claimDescriptionAr: { type: String, trim: true, maxlength: 4000 },
    identifyingDetailsProvided: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    supportingEvidence: {
      type: [imageSchema],
      default: [],
      validate: { validator: maxImagesValidator, message: MAX_IMAGES_MESSAGE },
    },
    status: { type: String, required: true, enum: CLAIM_STATUSES, default: 'PENDING_REVIEW' },
    verificationNotes: { type: String, trim: true, maxlength: 4000 },
    verificationNotesAr: { type: String, trim: true, maxlength: 4000 },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    rejectionReasonAr: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    handover: { type: handoverSchema },
  },
  { timestamps: true, versionKey: false },
);

claimRequestSchema.index({ claimNumber: 1 }, { unique: true });
claimRequestSchema.index({ itemId: 1, status: 1 });
claimRequestSchema.index({ claimantId: 1 });
// Production-readiness pass (2026-11-22): newest-first claim lists filtered
// by claimant/status, and status-only dashboard counts.
claimRequestSchema.index({ claimantId: 1, status: 1, createdAt: -1 });
claimRequestSchema.index({ status: 1, createdAt: -1 });
// Race guard (found by concurrent-claim load testing, 2026-11-22): the
// service's "already have an active claim" pre-check is check-then-act —
// two simultaneous submissions from the same user both passed it and
// created duplicate active claims. This partial unique index backs the
// check in the database; it mirrors the service rule exactly (active =
// any status except REJECTED / COMPLETED) and createClaim translates its
// duplicate-key error into the same 409.
claimRequestSchema.index(
  { itemId: 1, claimantId: 1 },
  {
    unique: true,
    name: 'item_claimant_active_unique',
    partialFilterExpression: {
      status: { $in: ['PENDING_REVIEW', 'UNDER_VERIFICATION', 'APPROVED'] },
    },
  },
);

export const ClaimRequest =
  (models.ClaimRequest as Model<IClaimRequest> | undefined) ??
  model<IClaimRequest>('ClaimRequest', claimRequestSchema);
