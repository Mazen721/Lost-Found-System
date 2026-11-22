import { describe, expect, it } from 'vitest';
import {
  imageSources,
  imageSrcForStage,
  initialImageStage,
  nextImageStageOnError,
  type ImageLoadStage,
} from '../src/lib/imageFallback';

const CLOUDINARY_URL =
  'https://res.cloudinary.com/demo/image/upload/v1700000000/lost-found/item-1.jpg';
const EXTERNAL_URL = 'https://cdn.example.org/photos/item-1.jpg';

/** Simulate the component: start at the initial stage, keep firing errors. */
function stagesUntilSettled(originalUrl: string, width?: number): ImageLoadStage[] {
  const sources = imageSources(originalUrl, width);
  const stages: ImageLoadStage[] = [initialImageStage(sources)];
  let current = stages[0]!;
  for (let i = 0; i < 10; i += 1) {
    const next = nextImageStageOnError(current);
    if (next === current) break;
    stages.push(next);
    current = next;
  }
  return stages;
}

describe('imageSources', () => {
  it('builds a distinct Cloudinary thumbnail variant for list widths', () => {
    const sources = imageSources(CLOUDINARY_URL, 480);

    expect(sources.hasThumbnailVariant).toBe(true);
    expect(sources.thumbnail).toContain('/upload/w_480,c_limit,q_auto,f_auto/');
    expect(sources.original).toBe(CLOUDINARY_URL);
  });

  it('respects the requested thumbnail width (dashboard match pairs use 96)', () => {
    expect(imageSources(CLOUDINARY_URL, 96).thumbnail).toContain('/upload/w_96,');
  });

  it('passes non-Cloudinary URLs through unchanged, so there is no variant', () => {
    const sources = imageSources(EXTERNAL_URL, 480);

    expect(sources.thumbnail).toBe(EXTERNAL_URL);
    expect(sources.hasThumbnailVariant).toBe(false);
  });

  it('has no thumbnail variant when no width is given (full-size gallery views)', () => {
    const sources = imageSources(CLOUDINARY_URL);

    expect(sources.thumbnail).toBe(CLOUDINARY_URL);
    expect(sources.hasThumbnailVariant).toBe(false);
  });
});

describe('fallback stage walk', () => {
  it('starts on the thumbnail when a variant exists', () => {
    const sources = imageSources(CLOUDINARY_URL, 480);

    expect(initialImageStage(sources)).toBe('thumbnail');
    expect(imageSrcForStage(sources, 'thumbnail')).toBe(sources.thumbnail);
  });

  it('falls back to the original photo when the thumbnail errors', () => {
    const sources = imageSources(CLOUDINARY_URL, 480);

    const afterError = nextImageStageOnError('thumbnail');

    expect(afterError).toBe('original');
    expect(imageSrcForStage(sources, afterError)).toBe(CLOUDINARY_URL);
  });

  it('shows the placeholder when the original also errors', () => {
    const sources = imageSources(CLOUDINARY_URL, 480);

    const afterError = nextImageStageOnError('original');

    expect(afterError).toBe('placeholder');
    expect(imageSrcForStage(sources, afterError)).toBeNull();
  });

  it('starts on the original when thumbnail and original are the same URL', () => {
    const sources = imageSources(EXTERNAL_URL, 480);

    expect(initialImageStage(sources)).toBe('original');
    expect(nextImageStageOnError('original')).toBe('placeholder');
  });

  it('never loops: repeated errors settle on the placeholder within two steps', () => {
    expect(stagesUntilSettled(CLOUDINARY_URL, 480)).toEqual([
      'thumbnail',
      'original',
      'placeholder',
    ]);
    expect(stagesUntilSettled(EXTERNAL_URL, 480)).toEqual(['original', 'placeholder']);
    expect(nextImageStageOnError('placeholder')).toBe('placeholder');
  });
});
