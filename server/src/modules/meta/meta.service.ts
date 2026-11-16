import {
  CLAIM_STATUSES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_COUNT,
  IMAGE_MIME_TYPES,
  ITEM_STATUSES,
  LOCATION_TYPES,
  LOST_FOUND_CATEGORIES,
  MATCH_LEVELS,
  MATCH_STATUSES,
  REPORT_TYPES,
  ROLES,
} from '../../config/constants';
import { MATCHING_THRESHOLDS, MATCHING_WEIGHTS } from '../../config/matching.config';

/**
 * Reference data shared by every signed-in user. There is intentionally no
 * settings UI; configuration lives on the server.
 */
export function getMeta() {
  return {
    roles: ROLES,
    lostFoundCategories: LOST_FOUND_CATEGORIES,
    itemStatuses: ITEM_STATUSES,
    claimStatuses: CLAIM_STATUSES,
    matchStatuses: MATCH_STATUSES,
    matchLevels: MATCH_LEVELS,
    reportTypes: REPORT_TYPES,
    locationTypes: LOCATION_TYPES,
    matching: {
      weights: MATCHING_WEIGHTS,
      thresholds: MATCHING_THRESHOLDS,
    },
    uploads: {
      maxImages: IMAGE_MAX_COUNT,
      maxBytes: IMAGE_MAX_BYTES,
      mimeTypes: IMAGE_MIME_TYPES,
    },
  };
}
