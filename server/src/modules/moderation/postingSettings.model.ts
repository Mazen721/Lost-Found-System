import { Schema, model, models, type Model } from 'mongoose';

export interface IPostingSettings {
  /** Singleton key — there is exactly one settings document. */
  key: string;
  /**
   * Spec 012: when true (default), STUDENT/EMPLOYEE reports publish
   * immediately; when false they wait for SUPER_ADMIN approval.
   */
  autoPublishStudentReports: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const POSTING_SETTINGS_KEY = 'posting';

const postingSettingsSchema = new Schema<IPostingSettings>(
  {
    key: { type: String, required: true, trim: true, default: POSTING_SETTINGS_KEY },
    autoPublishStudentReports: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

postingSettingsSchema.index({ key: 1 }, { unique: true });

export const PostingSettings =
  (models.PostingSettings as Model<IPostingSettings> | undefined) ??
  model<IPostingSettings>('PostingSettings', postingSettingsSchema);
