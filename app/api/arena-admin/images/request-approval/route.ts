import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';

const requestSchema = z.object({
  cover_image: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = requestSchema.parse(await request.json());

    if (!payload.cover_image && !payload.logo_url) {
      return NextResponse.json(
        { success: false, message: 'Must provide at least one image URL to update' },
        { status: 400 }
      );
    }

    // Insert into approval_requests
    await query(
      `INSERT INTO approval_requests (
        arena_id, 
        requested_by, 
        request_type, 
        status, 
        payload_json, 
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        context.arenaId,
        context.userId,
        'arena_image_update',
        'pending',
        JSON.stringify(payload)
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Image update request submitted for approval',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Image request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
