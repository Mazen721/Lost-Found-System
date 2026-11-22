import { thumbnailUrl } from '@/lib/imageUrl';

/**
 * Load-failure state machine for item photos (2026-11-22). A single
 * failed image request used to leave a browse card blank for the whole
 * page mount — there was no img onError handling anywhere, so one
 * transient stall from an external photo source broke the card until
 * the user happened to load the same photo elsewhere. The stages walk
 * a fixed, terminating path:
 *
 *   thumbnail ──error──▶ original ──error──▶ placeholder
 *
 * When there is no distinct thumbnail variant (non-Cloudinary URLs,
 * where thumbnailUrl passes the URL through unchanged, or full-size
 * gallery views that skip the thumbnail entirely) the walk starts at
 * `original`. `placeholder` is terminal: repeated errors stay there,
 * so the error handler can never loop.
 */
export type ImageLoadStage = 'thumbnail' | 'original' | 'placeholder';

export interface ImageSources {
  original: string;
  thumbnail: string;
  /** True only when the thumbnail is a genuinely different URL. */
  hasThumbnailVariant: boolean;
}

/**
 * Resolve the two candidate URLs for an item photo. Pass `width` for
 * list views to get a Cloudinary thumbnail variant; omit it for
 * full-size views, which start (and stay) on the original.
 */
export function imageSources(originalUrl: string, width?: number): ImageSources {
  const thumbnail = width === undefined ? originalUrl : thumbnailUrl(originalUrl, width);
  return {
    original: originalUrl,
    thumbnail,
    hasThumbnailVariant: thumbnail !== originalUrl,
  };
}

export function initialImageStage(sources: ImageSources): ImageLoadStage {
  return sources.hasThumbnailVariant ? 'thumbnail' : 'original';
}

/** The stage to move to when the currently displayed source errors. */
export function nextImageStageOnError(stage: ImageLoadStage): ImageLoadStage {
  switch (stage) {
    case 'thumbnail':
      return 'original';
    case 'original':
    case 'placeholder':
      return 'placeholder';
  }
}

/** URL to render for a stage, or null when the placeholder shows. */
export function imageSrcForStage(sources: ImageSources, stage: ImageLoadStage): string | null {
  switch (stage) {
    case 'thumbnail':
      return sources.thumbnail;
    case 'original':
      return sources.original;
    case 'placeholder':
      return null;
  }
}
