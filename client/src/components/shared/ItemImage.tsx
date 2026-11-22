import { ImageOff, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import {
  imageSources,
  imageSrcForStage,
  initialImageStage,
  nextImageStageOnError,
  type ImageLoadStage,
} from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

interface ItemImageProps {
  /** Stored (full) photo URL. */
  src: string;
  alt: string;
  /**
   * Thumbnail width for list views — the Cloudinary thumbnail variant
   * is tried first and the original is the fallback. Omit for
   * full-size views (gallery), which load the original directly.
   */
  width?: number;
  /** Box classes shared by the img and the placeholder (size/shape). */
  className?: string;
  /** Extra img-only classes (hover transitions etc.). */
  imgClassName?: string;
  /** Placeholder tile classes (background/text tint). */
  placeholderClassName?: string;
  /** Placeholder icon; defaults to a generic image-off glyph. */
  icon?: LucideIcon;
  iconClassName?: string;
  iconStrokeWidth?: number;
  /** Optional placeholder caption (e.g. the browse card's «لا توجد صورة»). */
  label?: string;
}

/**
 * Item photo with a load-failure fallback (2026-11-22): thumbnail
 * first, the original photo if the thumbnail request fails, and a
 * category-tinted placeholder tile if the original fails too — so a
 * single transient image error never leaves a permanently blank card.
 * The stage machine lives in `@/lib/imageFallback` and is unit-tested;
 * the placeholder keeps the exact box classes of the img it replaces,
 * so swapping stages never shifts the layout.
 */
export function ItemImage(props: ItemImageProps) {
  // Remount when the photo changes (recycled list rows) so a previous
  // photo's failure never hides a new one.
  return <ItemImageView key={`${props.src}|${props.width ?? 'full'}`} {...props} />;
}

function ItemImageView({
  src,
  alt,
  width,
  className,
  imgClassName,
  placeholderClassName,
  icon: Icon = ImageOff,
  iconClassName,
  iconStrokeWidth,
  label,
}: ItemImageProps) {
  const sources = imageSources(src, width);
  const [stage, setStage] = useState<ImageLoadStage>(() => initialImageStage(sources));
  const currentSrc = imageSrcForStage(sources, stage);

  if (currentSrc === null) {
    return (
      <span
        className={cn(
          className,
          'flex items-center justify-center',
          label ? 'flex-col gap-2' : undefined,
          placeholderClassName,
        )}
        aria-hidden={alt === '' ? true : undefined}
        role={alt === '' ? undefined : 'img'}
        aria-label={alt === '' ? undefined : alt}
      >
        <Icon className={iconClassName} strokeWidth={iconStrokeWidth} aria-hidden="true" />
        {label ? <span className="text-[11px] font-semibold">{label}</span> : null}
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      className={cn(className, imgClassName)}
      onError={() => setStage((current) => nextImageStageOnError(current))}
    />
  );
}
