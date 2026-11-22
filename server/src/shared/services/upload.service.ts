import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import { IMAGE_MAX_DIMENSION } from '../../config/constants';
import { env } from '../../config/env';
import type { ImageAsset } from '../schemas/image.schema';
import { ApiError } from '../utils/ApiError';

/**
 * Content sniffing (production-readiness pass, 2026-11-22): the declared
 * MIME type is client-supplied, so verify the actual magic bytes before
 * anything is stored. Only JPEG / PNG / WebP are accepted.
 */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Automatic behind-the-scenes optimization (Mazen's image rule): a normal
 * phone photo is accepted as-is and shrunk here — auto-rotated from EXIF,
 * resized to at most IMAGE_MAX_DIMENSION on the longest edge, metadata
 * stripped, re-encoded at quality 82 in its own format. Identification
 * quality is preserved (1600px is ample for item details); storage and
 * page weight drop by ~80-90% for typical 5-10 MB phone photos. If the
 * optimizer cannot parse a buffer that passed sniffing, the original is
 * stored unchanged rather than failing the user's report.
 */
export async function optimizeImageBuffer(
  file: Express.Multer.File,
): Promise<{ buffer: Buffer; mimetype: string }> {
  try {
    const pipeline = sharp(file.buffer)
      .rotate()
      .resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });
    const format = file.mimetype;
    const buffer =
      format === 'image/png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : format === 'image/webp'
          ? await pipeline.webp({ quality: 82 }).toBuffer()
          : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return { buffer, mimetype: format };
  } catch {
    return { buffer: file.buffer, mimetype: file.mimetype };
  }
}

export const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

let cloudinaryConfigured = false;

function configureCloudinary(): void {
  if (cloudinaryConfigured || !env.CLOUDINARY_CONFIGURED) {
    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

interface PreparedImage {
  buffer: Buffer;
  mimetype: string;
}

async function uploadToCloudinary(prepared: PreparedImage): Promise<ImageAsset> {
  configureCloudinary();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'campuscare', resource_type: 'image' },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error('Cloudinary returned an empty upload result'));
          return;
        }
        resolve(uploaded);
      },
    );

    uploadStream.end(prepared.buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

async function uploadToLocalDisk(
  prepared: PreparedImage,
  baseUrl?: string,
): Promise<ImageAsset> {
  if (env.IS_PRODUCTION) {
    throw new ApiError(
      503,
      'UPLOAD_UNAVAILABLE',
      'Image uploads are not configured on this server yet. Please try again later.',
      'uploadUnavailable',
    );
  }

  const extension = EXTENSION_BY_MIME[prepared.mimetype] ?? 'jpg';
  const filename = `${randomUUID()}.${extension}`;

  await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOADS_DIR, filename), prepared.buffer);

  const origin = (baseUrl ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');
  return {
    url: `${origin}/uploads/${filename}`,
    publicId: `local:${filename}`,
  };
}

/**
 * Uploads request/claim/report images. Every file is content-sniffed and
 * automatically optimized first (see optimizeImageBuffer). Cloudinary is
 * used when configured; otherwise development and test environments write
 * to `server/uploads/`.
 */
export async function uploadImages(
  files: Express.Multer.File[],
  baseUrl?: string,
): Promise<ImageAsset[]> {
  if (files.length === 0) {
    return [];
  }

  const prepared: PreparedImage[] = [];
  for (const file of files) {
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed) {
      throw new ApiError(
        415,
        'UPLOAD_INVALID',
        'Only JPEG, PNG and WebP images are allowed. Please choose a different file.',
        'uploadInvalid',
      );
    }
    prepared.push(
      await optimizeImageBuffer({ ...file, mimetype: sniffed } as Express.Multer.File),
    );
  }

  return Promise.all(
    prepared.map((image) =>
      env.CLOUDINARY_CONFIGURED
        ? uploadToCloudinary(image)
        : uploadToLocalDisk(image, baseUrl),
    ),
  );
}
