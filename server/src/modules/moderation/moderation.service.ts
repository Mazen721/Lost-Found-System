import { Types, type HydratedDocument } from 'mongoose';
import type { Role } from '../../config/constants';
import { logActivity } from '../../shared/services/activityLog.service';
import { notify } from '../../shared/services/notification.service';
import { ApiError } from '../../shared/utils/ApiError';
import { paginate, parsePagination } from '../../shared/utils/paginate';
import {
  toPublicItem,
  type ProjectableItem,
  type PublicItem,
} from '../lost-found/items/item.projection';
import { LostFoundItem } from '../lost-found/items/lostFoundItem.model';
import { runMatchingFor } from '../lost-found/matches/matching.runner';
import {
  POSTING_SETTINGS_KEY,
  PostingSettings,
  type IPostingSettings,
} from './postingSettings.model';
import type {
  ListPendingQuery,
  UpdatePostingSettingsInput,
} from './moderation.validation';

export interface ModerationActor {
  id: string;
  role: Role;
}

export interface SerializedPostingSettings {
  autoPublishStudentReports: boolean;
  updatedAt: Date;
}

export interface PendingItem extends PublicItem {
  reporter: {
    id: string;
    name: string;
    nameAr?: string;
    email?: string;
    department?: string;
    departmentAr?: string;
    role?: Role;
  } | null;
  createdAt?: Date;
}

const LOCATION_POPULATION = {
  path: 'locationId',
  select: 'buildingName buildingNameAr floor floorAr room roomAr locationType',
};

const REPORTER_POPULATION = {
  path: 'reporterId',
  select: 'name nameAr email department departmentAr role',
};

interface PopulatedReporter {
  _id: Types.ObjectId;
  name: string;
  nameAr?: string;
  email?: string;
  department?: string;
  departmentAr?: string;
  role?: Role;
}

interface PopulatedPendingItem extends ProjectableItem {
  reporterId?: Types.ObjectId | PopulatedReporter | null;
  createdAt?: Date;
}

function serializePendingItem(item: PopulatedPendingItem): PendingItem {
  const reporter =
    item.reporterId && !(item.reporterId instanceof Types.ObjectId)
      ? {
          id: item.reporterId._id.toString(),
          name: item.reporterId.name,
          nameAr: item.reporterId.nameAr,
          email: item.reporterId.email,
          department: item.reporterId.department,
          departmentAr: item.reporterId.departmentAr,
          role: item.reporterId.role,
        }
      : null;

  return { ...toPublicItem(item), reporter, createdAt: item.createdAt };
}

/** Reads the singleton, creating it with the default (ON) on first use. */
export async function getPostingSettings(): Promise<HydratedDocument<IPostingSettings>> {
  const settings = await PostingSettings.findOneAndUpdate(
    { key: POSTING_SETTINGS_KEY },
    { $setOnInsert: { key: POSTING_SETTINGS_KEY, autoPublishStudentReports: true } },
    { upsert: true, new: true },
  );
  return settings;
}

export function serializeSettings(
  settings: IPostingSettings,
): SerializedPostingSettings {
  return {
    autoPublishStudentReports: settings.autoPublishStudentReports,
    updatedAt: settings.updatedAt,
  };
}

export async function updatePostingSettings(
  actor: ModerationActor,
  input: UpdatePostingSettingsInput,
): Promise<SerializedPostingSettings> {
  const settings = await getPostingSettings();
  const previous = settings.autoPublishStudentReports;
  settings.autoPublishStudentReports = input.autoPublishStudentReports;
  await settings.save();

  if (previous !== input.autoPublishStudentReports) {
    await logActivity({
      actorId: actor.id,
      action: 'POSTING_MODERATION_SETTING_UPDATED',
      entityType: 'PostingSettings',
      entityId: settings._id,
      description: input.autoPublishStudentReports
        ? 'Enabled automatic publishing for student/employee reports'
        : 'Disabled automatic publishing for student/employee reports — reports now require Super Admin approval',
      descriptionKey: 'postingModerationSettingUpdated',
      params: { autoPublish: input.autoPublishStudentReports },
      metadata: { previous, autoPublishStudentReports: input.autoPublishStudentReports },
    });
  }

  return serializeSettings(settings);
}

export async function listPendingItems(query: ListPendingQuery): Promise<{
  data: PendingItem[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit } = parsePagination(query);
  const filter = { publicationStatus: 'PENDING_APPROVAL' as const };

  const [documents, total] = await Promise.all([
    LostFoundItem.find(filter)
      .populate(LOCATION_POPULATION)
      .populate(REPORTER_POPULATION)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<PopulatedPendingItem[]>(),
    LostFoundItem.countDocuments(filter),
  ]);

  return paginate(documents.map(serializePendingItem), page, limit, total);
}

async function reviewItem(
  actor: ModerationActor,
  id: string,
  decision: 'PUBLISHED' | 'REJECTED',
): Promise<PendingItem> {
  const item = await LostFoundItem.findById(id);

  if (!item) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  if (item.publicationStatus !== 'PENDING_APPROVAL') {
    throw ApiError.conflict(
      'Only items pending approval can be reviewed',
      'pendingApprovalOnlyReview',
      { publicationStatus: item.publicationStatus },
    );
  }

  item.publicationStatus = decision;
  item.publicationReviewedBy = new Types.ObjectId(actor.id);
  item.publicationReviewedAt = new Date();
  await item.save();

  const approved = decision === 'PUBLISHED';

  await notify([item.reporterId], {
    type: approved ? 'ITEM_PUBLICATION_APPROVED' : 'ITEM_PUBLICATION_REJECTED',
    title: approved ? 'Your report was published' : 'Your report was not approved',
    message: approved
      ? `Your report ${item.reportNumber} (${item.itemTitle}) was approved and is now visible to everyone.`
      : `Your report ${item.reportNumber} (${item.itemTitle}) was reviewed and not approved for publishing.`,
    titleKey: approved ? 'itemPublicationApproved' : 'itemPublicationRejected',
    messageKey: approved ? 'itemPublicationApprovedMsg' : 'itemPublicationRejectedMsg',
    params: { code: item.reportNumber, title: item.itemTitle },
    relatedEntityType: 'LostFoundItem',
    relatedEntityId: item._id,
    linkUrl: '/lost-found/my-reports',
  });

  await logActivity({
    actorId: actor.id,
    action: approved ? 'ITEM_PUBLICATION_APPROVED' : 'ITEM_PUBLICATION_REJECTED',
    entityType: 'LostFoundItem',
    entityId: item._id,
    description: approved
      ? `Approved publishing of item ${item.reportNumber}`
      : `Rejected publishing of item ${item.reportNumber}`,
    descriptionKey: approved ? 'itemPublicationApproved' : 'itemPublicationRejected',
    params: { code: item.reportNumber, title: item.itemTitle },
    metadata: { reportType: item.reportType, category: item.category },
  });

  if (approved) {
    // Same background-matching contract as createItem: suggestions are
    // not needed to answer the reviewer, failures are only logged.
    void runMatchingFor(item._id.toString()).catch((error: unknown) => {
      console.error('[campuscare] background matching failed', error);
    });
  }

  const populated = await LostFoundItem.findById(item._id)
    .populate(LOCATION_POPULATION)
    .populate(REPORTER_POPULATION)
    .lean<PopulatedPendingItem | null>();

  if (!populated) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  return serializePendingItem(populated);
}

export async function approveItem(
  actor: ModerationActor,
  id: string,
): Promise<PendingItem> {
  return reviewItem(actor, id, 'PUBLISHED');
}

export async function rejectItem(
  actor: ModerationActor,
  id: string,
): Promise<PendingItem> {
  return reviewItem(actor, id, 'REJECTED');
}
