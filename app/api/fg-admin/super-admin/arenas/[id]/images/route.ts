import { NextResponse } from 'next/server';
import { readSuperAdminId } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';
import { saveArenaImageFile, ArenaImageUploadError } from '@/lib/arena-image-upload';

const MAX_IMAGES_PER_ARENA = 5;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const params = await context.params;
  const arenaId = Number(params.id);
  if (isNaN(arenaId)) {
    return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
  }

  const images = await query<{ id: number; url: string; sort_order: number }>(
    `SELECT id, url, sort_order FROM arena_images WHERE arena_id = ? ORDER BY sort_order ASC, id ASC`,
    [arenaId]
  );

  return NextResponse.json({ success: true, data: images });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const arenaId = Number(params.id);
    if (isNaN(arenaId)) {
      return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ success: false, message: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: 'File missing' }, { status: 400 });
    }

    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM arena_images WHERE arena_id = ?`,
      [arenaId]
    );
    const currentCount = Number(countRow?.count || 0);
    if (currentCount >= MAX_IMAGES_PER_ARENA) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_IMAGES_PER_ARENA} gallery images per turf. Delete one first.` },
        { status: 400 }
      );
    }

    const publicUrl = await saveArenaImageFile(arenaId, 'gallery', file as Blob);

    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO arena_images (arena_id, url, sort_order, created_at)
       VALUES (?, ?, ?, NOW())
       RETURNING id`,
      [arenaId, publicUrl, currentCount]
    );

    await logAuditAction(
      superAdminId,
      'ADD_ARENA_GALLERY_IMAGE',
      'arena',
      arenaId,
      { url: publicUrl },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Image added', id: inserted?.id, url: publicUrl });
  } catch (error) {
    console.error('Arena gallery image upload error:', error);
    if (error instanceof ArenaImageUploadError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
