import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSuperAdminId } from '@/lib/session';
import { query } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';
import path from 'path';
import { promises as fs } from 'fs';

// Expect multipart/form-data with fields:
// - type: "cover" | "logo"
// - file: the uploaded image

const bodySchema = z.object({
  type: z.enum(['cover', 'logo']),
});

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

    // Need to parse multipart manually because Next.js request does not parse it for us.
    // We'll use the built‑in FormData API (available in the edge runtime).
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ success: false, message: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const type = form.get('type');
    const file = form.get('file');

    const payload = bodySchema.parse({ type });

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: 'File missing' }, { status: 400 });
    }

    // Generate a safe filename
    const ext = path.extname((file as any).name || '.png');
    const filename = `arena_${arenaId}_${payload.type}_${Date.now()}${ext}`;
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'arenas');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const arrayBuffer = await (file as Blob).arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const publicUrl = `/uploads/arenas/${filename}`;

    // Update arena record
    const column = payload.type === 'cover' ? 'cover_image' : 'logo_url';
    await query(`UPDATE arenas SET ${column} = ?, updated_at = NOW() WHERE id = ?`, [publicUrl, arenaId]);

    // Audit log
    await logAuditAction(
      superAdminId,
      'UPDATE_ARENA_IMAGE',
      'arena',
      arenaId,
      { imageType: payload.type, url: publicUrl },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Image uploaded', url: publicUrl });
  } catch (error) {
    console.error('Arena image upload error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
