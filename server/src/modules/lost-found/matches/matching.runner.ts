import { Types, type HydratedDocument } from 'mongoose';
import type {
  ItemStatus,
  LostFoundCategory,
  ReportType,
} from '../../../config/constants';
import { ApiError } from '../../../shared/utils/ApiError';
import { LostFoundItem } from '../items/lostFoundItem.model';
import { ItemMatch, type IItemMatch } from './itemMatch.model';
import {
  canRefreshMatch,
  scorePair,
  type MatchableItem,
  type MatchableLocation,
} from './matching.service';

interface LeanLocation {
  _id: Types.ObjectId;
  buildingName?: string;
  floor?: string;
}

interface LeanItem {
  _id: Types.ObjectId;
  reportType: ReportType;
  category: LostFoundCategory;
  locationId?: Types.ObjectId | LeanLocation | null;
  occurrenceDate: Date;
  color?: string;
  brand?: string;
  itemTitle: string;
  description: string;
  itemTitleAr?: string;
  descriptionAr?: string;
  status: ItemStatus;
  publicationStatus?: string;
  reporterId: Types.ObjectId;
}

export interface MatchingRunResult {
  considered: number;
  created: number;
  updated: number;
  removed: number;
  skipped: number;
}

const LOCATION_POPULATION = {
  path: 'locationId',
  select: 'buildingName floor',
};

function isLeanLocation(value: unknown): value is LeanLocation {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'buildingName' in value
  );
}

function toMatchableLocation(
  value: LeanItem['locationId'],
): MatchableLocation | null {
  if (!value) {
    return null;
  }

  if (value instanceof Types.ObjectId) {
    return { id: value.toString() };
  }

  if (isLeanLocation(value)) {
    return {
      id: value._id.toString(),
      buildingName: value.buildingName,
      floor: value.floor,
    };
  }

  return null;
}

function toMatchableItem(item: LeanItem): MatchableItem {
  return {
    id: item._id.toString(),
    reportType: item.reportType,
    category: item.category,
    location: toMatchableLocation(item.locationId),
    occurrenceDate: item.occurrenceDate,
    color: item.color,
    brand: item.brand,
    itemTitle: item.itemTitle,
    description: item.description,
    itemTitleAr: item.itemTitleAr,
    descriptionAr: item.descriptionAr,
  };
}

function pairKey(lostItemId: string, foundItemId: string): string {
  return `${lostItemId}:${foundItemId}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function emptyResult(): MatchingRunResult {
  return { considered: 0, created: 0, updated: 0, removed: 0, skipped: 0 };
}

/**
 * Scores one item against every OPEN candidate of the opposite type and
 * persists the suggestions. Only SUGGESTED matches may be refreshed; confirmed
 * and dismissed decisions are never resurrected (MASTER_SPEC section 6.3).
 */
export async function runMatchingFor(
  itemId: string,
): Promise<MatchingRunResult> {
  const source = await LostFoundItem.findById(itemId)
    .populate(LOCATION_POPULATION)
    .lean<LeanItem | null>();

  if (!source) {
    throw ApiError.notFound('Lost and found item not found', 'itemNotFound');
  }

  if (source.status !== 'OPEN') {
    return emptyResult();
  }

  // Spec 012: unpublished items never match, in either direction.
  if (
    source.publicationStatus === 'PENDING_APPROVAL' ||
    source.publicationStatus === 'REJECTED'
  ) {
    return emptyResult();
  }

  const oppositeType: ReportType = source.reportType === 'LOST' ? 'FOUND' : 'LOST';
  // Bounded (production-readiness pass, 2026-11-22): previously EVERY open
  // opposite-type item was scored per run. The 500 most recent candidates
  // are far beyond any realistic match window for a campus lost & found;
  // the (reportType, status, occurrenceDate) index serves this directly.
  const candidates = await LostFoundItem.find({
    _id: { $ne: source._id },
    reportType: oppositeType,
    status: 'OPEN',
    publicationStatus: { $nin: ['PENDING_APPROVAL', 'REJECTED'] },
  })
    .sort({ occurrenceDate: -1 })
    .limit(500)
    .populate(LOCATION_POPULATION)
    .lean<LeanItem[]>();

  const existingMatches = await ItemMatch.find({
    $or: [{ lostItemId: source._id }, { foundItemId: source._id }],
  });

  const existingByPair = new Map<string, HydratedDocument<IItemMatch>>();
  existingMatches.forEach((match) => {
    existingByPair.set(
      pairKey(match.lostItemId.toString(), match.foundItemId.toString()),
      match,
    );
  });

  const result = emptyResult();
  const sourceItem = toMatchableItem(source);

  // Production-readiness pass (2026-11-22): the loop used to await one DB
  // write per candidate (deleteOne / save / create). All mutations are now
  // collected and flushed in ONE bulkWrite; counts come from the bulk
  // result so the returned tallies keep their exact previous meaning.
  type BulkOp = Parameters<typeof ItemMatch.bulkWrite>[0][number];
  const ops: BulkOp[] = [];
  let plannedCreates = 0;

  for (const candidate of candidates) {
    result.considered += 1;

    const candidateItem = toMatchableItem(candidate);
    const lost =
      source.reportType === 'LOST' ? sourceItem : candidateItem;
    const found =
      source.reportType === 'FOUND' ? sourceItem : candidateItem;

    const key = pairKey(lost.id, found.id);
    const existing = existingByPair.get(key);

    if (existing && !canRefreshMatch(existing.status)) {
      result.skipped += 1;
      continue;
    }

    const scored = scorePair(lost, found);

    if (!scored || scored.level === null) {
      if (existing) {
        ops.push({ deleteOne: { filter: { _id: existing._id } } });
        existingByPair.delete(key);
      }
      continue;
    }

    if (existing) {
      ops.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              score: scored.score,
              level: scored.level,
              breakdown: scored.breakdown,
            },
          },
        },
      });
      continue;
    }

    plannedCreates += 1;
    ops.push({
      insertOne: {
        document: {
          lostItemId: new Types.ObjectId(lost.id),
          foundItemId: new Types.ObjectId(found.id),
          score: scored.score,
          level: scored.level,
          breakdown: scored.breakdown,
          status: 'SUGGESTED',
        } as never,
      },
    });
  }

  if (ops.length > 0) {
    try {
      const bulk = await ItemMatch.bulkWrite(ops, { ordered: false });
      result.created += bulk.insertedCount;
      result.updated += bulk.modifiedCount;
      result.removed += bulk.deletedCount;
    } catch (error) {
      // With ordered:false a duplicate (lostItemId, foundItemId) pair —
      // e.g. two runs racing — surfaces as a BulkWriteError that still
      // carries the counts of everything that DID apply. Duplicates are
      // "skipped", exactly as the old per-create catch treated them.
      const bulkResult = (error as { result?: unknown }).result as
        | { insertedCount?: number; modifiedCount?: number; deletedCount?: number }
        | undefined;
      if (!bulkResult || !isDuplicateKeyError(error)) {
        // BulkWriteError wraps code 11000 per write error, not top-level.
        const writeErrors = (error as { writeErrors?: Array<{ code?: number }> })
          .writeErrors;
        const onlyDuplicates =
          Array.isArray(writeErrors) &&
          writeErrors.length > 0 &&
          writeErrors.every((writeError) => writeError.code === 11000);
        if (!onlyDuplicates) {
          throw error;
        }
      }
      result.created += bulkResult?.insertedCount ?? 0;
      result.updated += bulkResult?.modifiedCount ?? 0;
      result.removed += bulkResult?.deletedCount ?? 0;
    }
    // Any planned create that did not land was a duplicate pair.
    result.skipped += Math.max(0, plannedCreates - result.created);
    void plannedCreates;
  }

  return result;
}
