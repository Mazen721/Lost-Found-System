import { Types, type FilterQuery } from 'mongoose';
import type { ItemStatus, Role } from '../../../config/constants';
import type { ImageAsset } from '../../../shared/schemas/image.schema';
import { assertItemTransition } from '../../../shared/state-machines/item.sm';
import { logActivity } from '../../../shared/services/activityLog.service';
import { nextNumber } from '../../../shared/services/counter.service';
import { ApiError } from '../../../shared/utils/ApiError';
import { paginate, parsePagination } from '../../../shared/utils/paginate';
import { Location } from '../../locations/location.model';
import { runMatchingFor } from '../matches/matching.runner';
import {
  LostFoundItem,
  type ILostFoundItem,
} from './lostFoundItem.model';
import {
  itemValueFields,
  toPublicItem,
  VALUE_FIELDS_SELECT,
  type ItemValueFields,
  type ProjectableItem,
  type PublicItem,
} from './item.projection';
import { estimateItemValue } from './item-value';
import type {
  AdjustItemValueInput,
  CreateItemInput,
  ListItemsQuery,
  UpdateItemInput,
} from './item.validation';

export interface ItemActor {
  id: string;
  role: Role;
}

/** Value data (spec 008) exists for staff roles only — never students. */
export function isStaffRole(role: Role): boolean {
  return role === 'LOST_FOUND_MANAGER' || role === 'SUPER_ADMIN';
}

interface PopulatedReporter {
  _id: Types.ObjectId;
  name: string;
  nameAr?: string;
  email?: string;
  department?: string;
  departmentAr?: string;
  role?: Role;
}

interface PopulatedItem extends ProjectableItem {
  privateIdentificationDetails?: string;
  reporterId?: Types.ObjectId | PopulatedReporter | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SerializedItem extends PublicItem, Partial<ItemValueFields> {
  privateIdentificationDetails?: string;
  reporter?: {
    id: string;
    name: string;
    nameAr?: string;
    email?: string;
    department?: string;
    departmentAr?: string;
    role?: Role;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const LOCATION_POPULATION = {
  path: 'locationId',
  select: 'buildingName buildingNameAr floor floorAr room roomAr locationType',
};

const REPORTER_POPULATION = {
  path: 'reporterId',
  select: 'name nameAr email department departmentAr role',
};

export const BROWSE_ACTIVE_STATUSES: ItemStatus[] = [
  'OPEN',
  'MATCH_CONFIRMED',
  'CLAIM_UNDER_REVIEW',
];

export const ARCHIVED_ITEM_STATUSES: ItemStatus[] = [
  'APPROVED_FOR_HANDOVER',
  'RETURNED',
  'CLOSED',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function objectIdOf(
  value: Types.ObjectId | { _id: Types.ObjectId } | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value.toString();
  return value._id.toString();
}

function serializeItem(
  item: PopulatedItem,
  includePrivate: boolean,
  includeValue = false,
): SerializedItem {
  const publicItem = toPublicItem(item);
  // Value fields are a separate gate from the private view: the item's
  // own reporter (a student) gets private details but never the value.
  const valueFields = includeValue ? itemValueFields(item) : {};

  if (!includePrivate) {
    return { ...publicItem, ...valueFields };
  }

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

  return {
    ...publicItem,
    ...valueFields,
    privateIdentificationDetails: item.privateIdentificationDetails,
    reporter,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function loadItem(
  id: string,
  includePrivate: boolean,
  includeValue = false,
): Promise<PopulatedItem> {
  const query = LostFoundItem.findById(id)
    .populate(LOCATION_POPULATION)
    .populate(REPORTER_POPULATION);

  if (includePrivate) {
    query.select('+privateIdentificationDetails');
  }
  if (includeValue) {
    query.select(VALUE_FIELDS_SELECT);
  }

  const item = await query.lean<PopulatedItem | null>();

  if (!item) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  return item;
}

async function requireActiveLocation(locationId: string): Promise<void> {
  const location = await Location.findOne({
    _id: locationId,
    isActive: true,
  })
    .select('_id')
    .lean();

  if (!location) {
    throw ApiError.badRequest('Select an active campus location', 'activeLocationRequired');
  }
}

export async function createItem(
  actor: ItemActor,
  input: CreateItemInput,
  images: ImageAsset[],
): Promise<SerializedItem> {
  await requireActiveLocation(input.locationId);

  const reportNumber = await nextNumber('LF');
  const estimate = estimateItemValue({
    category: input.category,
    brand: input.brand,
    title: input.itemTitle,
    description: input.description,
  });
  const item = await LostFoundItem.create({
    reportNumber,
    reportType: input.reportType,
    itemTitle: input.itemTitle,
    description: input.description,
    privateIdentificationDetails: input.privateIdentificationDetails,
    category: input.category,
    color: input.color,
    brand: input.brand,
    locationId: input.locationId,
    locationDetails: input.locationDetails,
    occurrenceDate: input.occurrenceDate,
    images,
    reporterId: actor.id,
    status: 'OPEN',
    estimatedValueEGP: estimate.valueEGP,
    valueSource: 'AUTO',
  });

  await logActivity({
    actorId: actor.id,
    action: 'ITEM_REPORTED',
    entityType: 'LostFoundItem',
    entityId: item._id,
    description: `Reported ${input.reportType.toLowerCase()} item ${reportNumber} — ${input.itemTitle}`,
    descriptionKey: 'itemReported',
    params: { reportType: input.reportType, code: reportNumber, title: input.itemTitle },
    metadata: {
      reportType: input.reportType,
      category: input.category,
      locationId: input.locationId,
      images: images.length,
    },
  });

  await runMatchingFor(item._id.toString());

  const includeValue = isStaffRole(actor.role);
  return serializeItem(
    await loadItem(item._id.toString(), true, includeValue),
    true,
    includeValue,
  );
}

export async function listItems(
  actor: ItemActor,
  query: ListItemsQuery,
): Promise<{
  data: SerializedItem[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit } = parsePagination(query);
  const filter: FilterQuery<ILostFoundItem> = {};

  if (query.mine) {
    filter.reporterId = new Types.ObjectId(actor.id);
  }

  if (query.scope === 'archived') {
    if (actor.role !== 'LOST_FOUND_MANAGER' && actor.role !== 'SUPER_ADMIN') {
      throw ApiError.forbidden(
        'Only Lost & Found Managers can view archived items',
        'managerArchivedOnly',
      );
    }
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $in: ARCHIVED_ITEM_STATUSES };
    }
  } else if (query.scope === 'active') {
    if (query.status && BROWSE_ACTIVE_STATUSES.includes(query.status)) {
      filter.status = query.status;
    } else {
      filter.status = { $in: BROWSE_ACTIVE_STATUSES };
    }
  } else if (query.status) {
    filter.status = query.status;
  }

  if (query.reportType) filter.reportType = query.reportType;
  if (query.category) filter.category = query.category;
  if (query.locationId) filter.locationId = query.locationId;

  if (query.building) {
    const buildingPattern = new RegExp(escapeRegExp(query.building), 'i');
    const locationIds = await Location.find({
      $or: [{ buildingName: buildingPattern }, { buildingNameAr: buildingPattern }],
    }).distinct('_id');
    filter.locationId = { $in: locationIds };
  }

  if (query.color) {
    filter.color = new RegExp(escapeRegExp(query.color), 'i');
  }

  if (query.brand) {
    filter.brand = new RegExp(escapeRegExp(query.brand), 'i');
  }

  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), 'i');
    filter.$or = [
      { reportNumber: pattern },
      { itemTitle: pattern },
      { itemTitleAr: pattern },
      { description: pattern },
      { descriptionAr: pattern },
    ];
  }

  if (query.from || query.to) {
    const occurrenceDate: Record<string, Date> = {};
    if (query.from) occurrenceDate.$gte = query.from;
    if (query.to) occurrenceDate.$lt = inclusiveDayEnd(query.to);
    filter.occurrenceDate = occurrenceDate;
  }

  const includeValue = isStaffRole(actor.role);
  const findQuery = LostFoundItem.find(filter).populate(LOCATION_POPULATION);
  if (includeValue) {
    findQuery.select(VALUE_FIELDS_SELECT);
  }

  const [documents, total] = await Promise.all([
    findQuery
      .sort({ occurrenceDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<PopulatedItem[]>(),
    LostFoundItem.countDocuments(filter),
  ]);

  return paginate(
    documents.map((document) =>
      includeValue ? serializeItem(document, false, true) : toPublicItem(document),
    ),
    page,
    limit,
    total,
  );
}

/** A date-only upper bound includes the whole selected day. */
function inclusiveDayEnd(value: Date): Date {
  const isMidnight =
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0;

  if (!isMidnight) return value;

  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export async function getItem(
  actor: ItemActor,
  id: string,
): Promise<SerializedItem> {
  const includeValue = isStaffRole(actor.role);
  const item = await loadItem(id, true, includeValue);
  const reporterId = objectIdOf(item.reporterId);
  const isReporter = reporterId === actor.id;
  const isPrivileged = isReporter || includeValue;

  return serializeItem(item, isPrivileged, includeValue);
}

export async function updateItem(
  actor: ItemActor,
  id: string,
  input: UpdateItemInput,
): Promise<SerializedItem> {
  const item = await LostFoundItem.findById(id).select(
    '+privateIdentificationDetails +estimatedValueEGP +valueSource',
  );

  if (!item) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  // The estimator's whole input set is editable; remember whether this
  // edit changes any of it (spec 008 re-estimation rule, applied below).
  const valueInputChanged =
    (input.itemTitle !== undefined && input.itemTitle !== item.itemTitle) ||
    (input.description !== undefined && input.description !== item.description) ||
    (input.category !== undefined && input.category !== item.category) ||
    ('brand' in input && (input.brand ?? undefined) !== (item.brand ?? undefined));

  const isReporter = item.reporterId.toString() === actor.id;
  const isManager =
    actor.role === 'LOST_FOUND_MANAGER' || actor.role === 'SUPER_ADMIN';

  if (!isReporter && !isManager) {
    throw ApiError.forbidden('You cannot edit this lost and found item', 'itemEditForbidden');
  }

  const fieldChanges = Object.entries(input).filter(
    ([key, value]) => key !== 'status' && value !== undefined,
  );
  const hasFieldChanges = fieldChanges.length > 0;

  if (hasFieldChanges) {
    if (isReporter && !isManager && item.status !== 'OPEN') {
      throw ApiError.forbidden('Only open reports can be edited', 'openReportsEditOnly');
    }

    if (isManager && (item.status === 'RETURNED' || item.status === 'CLOSED')) {
      throw ApiError.conflict(
        `Items with status ${item.status} cannot be edited`,
        'statusCannotBeEdited',
        { status: item.status },
      );
    }
  }

  if (input.status === 'CLOSED') {
    if (isReporter && !isManager) {
      if (item.reportType !== 'LOST') {
        throw ApiError.forbidden(
          'Only the reporter of a LOST report can close it',
          'lostReportCloseOnly',
        );
      }
      assertItemTransition(item.status, 'CLOSED', 'REPORTER');
    } else {
      assertItemTransition(item.status, 'CLOSED', 'LOST_FOUND_MANAGER');
    }

    item.status = 'CLOSED';
  }

  if (input.locationId !== undefined) {
    await requireActiveLocation(input.locationId);
  }

  if (input.itemTitle !== undefined) {
    item.itemTitle = input.itemTitle;
    item.itemTitleAr = undefined;
  }
  if (input.description !== undefined) {
    item.description = input.description;
    item.descriptionAr = undefined;
  }
  if (input.privateIdentificationDetails !== undefined) {
    item.privateIdentificationDetails = input.privateIdentificationDetails;
  }
  if (input.category !== undefined) item.category = input.category;
  if ('color' in input) {
    item.color = input.color;
    item.colorAr = undefined;
  }
  if ('brand' in input) {
    item.brand = input.brand;
    item.brandAr = undefined;
  }
  if (input.locationId !== undefined) item.locationId = new Types.ObjectId(input.locationId);
  if (input.locationDetails !== undefined) {
    item.locationDetails = input.locationDetails;
    item.locationDetailsAr = undefined;
  }
  if (input.occurrenceDate !== undefined) item.occurrenceDate = input.occurrenceDate;

  // Recompute an AUTO estimate when its inputs were edited; a manual
  // ADJUSTED value is never overwritten by the estimator.
  if (valueInputChanged && item.valueSource !== 'ADJUSTED') {
    item.estimatedValueEGP = estimateItemValue({
      category: item.category,
      brand: item.brand,
      title: item.itemTitle,
      description: item.description,
    }).valueEGP;
    item.valueSource = 'AUTO';
  }

  await item.save();

  const closed = input.status === 'CLOSED';
  await logActivity({
    actorId: actor.id,
    action: closed ? 'ITEM_CLOSED' : 'ITEM_UPDATED',
    entityType: 'LostFoundItem',
    entityId: item._id,
    description: closed
      ? `Closed lost and found item ${item.reportNumber}`
      : `Updated lost and found item ${item.reportNumber}`,
    descriptionKey: closed ? 'itemClosed' : 'itemUpdated',
    params: { code: item.reportNumber, title: item.itemTitle },
    metadata: {
      status: item.status,
      fields: fieldChanges.map(([key]) => key),
    },
  });

  return getItem(actor, id);
}

/**
 * Staff manual adjustment of an item's estimated value (spec 008). The
 * route is staff-only; the service assumes the caller enforced the role.
 * The activity-log description stays value-free on purpose: log
 * descriptions feed the AI-insights pipeline, while the value itself is
 * recorded only in params/metadata of the SUPER_ADMIN-only log surface.
 */
export async function adjustItemValue(
  actor: ItemActor,
  id: string,
  input: AdjustItemValueInput,
): Promise<SerializedItem> {
  const item = await LostFoundItem.findById(id).select(VALUE_FIELDS_SELECT);

  if (!item) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  const previousValueEGP = item.estimatedValueEGP ?? null;
  const previousSource = item.valueSource ?? null;

  item.estimatedValueEGP = input.valueEGP;
  item.valueSource = 'ADJUSTED';
  item.valueAdjustedBy = new Types.ObjectId(actor.id);
  item.valueAdjustedAt = new Date();
  await item.save();

  await logActivity({
    actorId: actor.id,
    action: 'ITEM_VALUE_ADJUSTED',
    entityType: 'LostFoundItem',
    entityId: item._id,
    description: `Adjusted estimated value for item ${item.reportNumber}`,
    descriptionKey: 'itemValueAdjusted',
    params: { code: item.reportNumber, value: input.valueEGP },
    metadata: {
      previousValueEGP,
      newValueEGP: input.valueEGP,
      previousSource,
    },
  });

  return getItem(actor, id);
}
