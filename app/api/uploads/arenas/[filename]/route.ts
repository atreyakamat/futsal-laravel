import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getArenaUploadDir } from '@/lib/arena-image-upload';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  const params = await context.params;
  const filename = params.filename;

  // Reject anything that isn't a bare filename — no path traversal via
  // encoded slashes or ".." segments.
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ success: false, message: 'Invalid filename' }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ success: false, message: 'Invalid filename' }, { status: 400 });
  }

  const filePath = path.join(getArenaUploadDir(), filename);

  try {
    const data = await fs.readFile(filePath);
    return new Response(data as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }
}
