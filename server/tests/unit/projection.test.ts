import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  toPublicItem,
  type ProjectableItem,
} from '../../src/modules/lost-found/items/item.projection';

const PUBLIC_FIELDS = [
  'brand',
  'brandAr',
  'category',
  'color',
  'colorAr',
  'description',
  'descriptionAr',
  'id',
  'images',
  'itemTitle',
  'itemTitleAr',
  'location',
  'locationDetails',
  'locationDetailsAr',
  'occurrenceDate',
  // Spec 012: publicationStatus joined the public surface deliberately —
  // it is 'PUBLISHED' for every item a public surface can show.
  'publicationStatus',
  'reportNumber',
  'reportType',
  'status',
].sort();

function buildItem(overrides: Partial<ProjectableItem> = {}): ProjectableItem {
  return {
    _id: new Types.ObjectId(),
    reportNumber: 'LF-1001',
    reportType: 'LOST',
    itemTitle: 'Black North Face backpack',
    description: 'Lost near the engineering lab after the afternoon lecture.',
    category: 'Bags',
    color: 'Black',
    brand: 'North Face',
    locationId: {
      _id: new Types.ObjectId(),
      buildingName: 'Engineering Building',
      floor: 'Floor 1',
      room: '102',
      locationType: 'ROOM',
    },
    locationDetails: 'Bench outside Room 102',
    occurrenceDate: new Date('2026-11-01T10:00:00.000Z'),
    images: [
      { url: 'https://cdn.example.com/backpack.jpg', publicId: 'campuscare/backpack' },
    ],
    status: 'OPEN',
    ...overrides,
  };
}

describe('toPublicItem projection', () => {
  it('returns exactly the public fields and nothing private', () => {
    const item = buildItem() as ProjectableItem & {
      privateIdentificationDetails: string;
      reporterId: Types.ObjectId;
    };
    item.privateIdentificationDetails = 'Serial SN-998877 and a scratched keychain';
    item.reporterId = new Types.ObjectId();

    const result = toPublicItem(item);

    expect(Object.keys(result).sort()).toEqual(PUBLIC_FIELDS);
    expect(result).not.toHaveProperty('privateIdentificationDetails');
    expect(result).not.toHaveProperty('reporterId');
    expect(result).not.toHaveProperty('reporter');
    expect(JSON.stringify(result)).not.toContain('SN-998877');
  });

  it('never carries the staff-only value fields (spec 008)', () => {
    const item = buildItem({
      estimatedValueEGP: 28_000,
      valueSource: 'ADJUSTED',
      valueAdjustedBy: new Types.ObjectId(),
      valueAdjustedAt: new Date('2026-11-10T10:00:00.000Z'),
    });

    const result = toPublicItem(item);

    expect(Object.keys(result).sort()).toEqual(PUBLIC_FIELDS);
    expect(result).not.toHaveProperty('estimatedValueEGP');
    expect(result).not.toHaveProperty('valueSource');
    expect(result).not.toHaveProperty('valueAdjustedBy');
    expect(result).not.toHaveProperty('valueAdjustedAt');
  });

  it('serializes a populated location and copies image fields only', () => {
    const item = buildItem();
    const result = toPublicItem(item);

    expect(result.location).toEqual({
      id: (item.locationId as { _id: Types.ObjectId })._id.toString(),
      buildingName: 'Engineering Building',
      floor: 'Floor 1',
      room: '102',
      locationType: 'ROOM',
    });
    expect(result.images).toEqual([
      { url: 'https://cdn.example.com/backpack.jpg', publicId: 'campuscare/backpack' },
    ]);
  });

  it('returns a null location when the reference is not populated', () => {
    const result = toPublicItem(buildItem({ locationId: new Types.ObjectId() }));

    expect(result.location).toBeNull();
    expect(result.status).toBe('OPEN');
    expect(result.reportType).toBe('LOST');
  });
});
