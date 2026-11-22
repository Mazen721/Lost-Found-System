/**
 * Thumbnail delivery for list views (production-readiness pass,
 * 2026-11-22). Stored image URLs point at the full (server-optimized,
 * max 1600px) asset; browse cards and dashboard strips used to download
 * that full asset for every row. For Cloudinary URLs we request a small
 * transformed variant instead (width-capped, auto quality/format, CDN
 * cached). Non-Cloudinary URLs (local dev uploads) pass through
 * unchanged, as do detail/gallery views, which intentionally keep the
 * full image for identification.
 */
export function thumbnailUrl(url: string, width = 480): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  return url.replace(
    '/upload/',
    `/upload/w_${width},c_limit,q_auto,f_auto/`,
  );
}
