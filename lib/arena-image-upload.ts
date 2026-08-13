import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

export class ArenaImageUploadError extends Error {}

/**
 * Uploaded images are written outside `.next` and served back through
 * `/api/uploads/arenas/[filename]` rather than Next's static `/public`
 * folder. The standalone server's `process.cwd()` at runtime is
 * `.next/standalone` — anything resolved relative to it (including
 * `public/`) lives inside `.next` and gets deleted by a `rm -rf .next`
 * clean rebuild, which is exactly the redeploy step this app's deploy
 * flow uses. ARENA_UPLOAD_DIR must be set (in the VPS .env) to an
 * absolute path OUTSIDE the `.next` directory, e.g. a `storage/uploads`
 * folder sibling to `.next` in the project checkout, so uploads survive
 * rebuilds. Falls back to a path under cwd for local dev, where this
 * distinction doesn't matter (`npm run dev` never deletes `.next`).
 */
export function getArenaUploadDir() {
  return process.env.ARENA_UPLOAD_DIR
    ? path.resolve(process.env.ARENA_UPLOAD_DIR)
    : path.resolve(process.cwd(), 'storage', 'uploads', 'arenas');
}

/**
 * Validates and writes an uploaded arena image to disk, returning its public URL.
 * Rejects anything outside a small image-mime whitelist (arbitrary extensions
 * from client-supplied filenames — e.g. .svg or .html — could otherwise be
 * written to disk and served back to browsers).
 */
export async function saveArenaImageFile(arenaId: number, label: string, file: Blob): Promise<string> {
  const mime = (file as any).type as string | undefined;
  const ext = mime ? ALLOWED_MIME_EXT[mime] : undefined;
  if (!ext) {
    throw new ArenaImageUploadError('Unsupported image type. Please upload a JPEG, PNG, or WebP file.');
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new ArenaImageUploadError('Image must be 5MB or smaller.');
  }
  if (arrayBuffer.byteLength === 0) {
    throw new ArenaImageUploadError('Uploaded file is empty.');
  }

  const filename = `arena_${arenaId}_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const uploadDir = getArenaUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(arrayBuffer));

  return `/api/uploads/arenas/${filename}`;
}
