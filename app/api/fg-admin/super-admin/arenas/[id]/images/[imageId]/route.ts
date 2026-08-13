import { NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';
import { getArenaUploadDir } from '@/lib/arena-image-upload';
import path from 'path';
import { promises as fs } from 'fs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string; imageId: string }> }) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const params = await context.params;
  const arenaId = Number(params.id);
  const imageId = Number(params.imageId);
  if (isNaN(arenaId) || isNaN(imageId)) {
    return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
  }

  const image = await queryOne<{ id: number; url: string }>(
    `SELECT id, url FROM arena_images WHERE id = ? AND arena_id = ?`,
    [imageId, arenaId]
  );
  if (!image) {
    return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 });
  }

  await query(`DELETE FROM arena_images WHERE id = ?`, [imageId]);

  // Best-effort disk cleanup — the DB row is the source of truth either way.
  try {
    if (image.url.startsWith('/api/uploads/arenas/')) {
      const filename = image.url.slice('/api/uploads/arenas/'.length);
      if (filename && !filename.includes('/') && !filename.includes('..')) {
        await fs.unlink(path.join(getArenaUploadDir(), filename));
      }
    }
  } catch (err) {
    console.warn('Failed to delete arena image file from disk:', err);
  }

  await logAuditAction(
    superAdminId,
    'DELETE_ARENA_GALLERY_IMAGE',
    'arena',
    arenaId,
    { imageId, url: image.url },
    request.headers.get('x-forwarded-for') || 'unknown',
    request.headers.get('user-agent') || 'unknown'
  );

  return NextResponse.json({ success: true, message: 'Image deleted' });
}
