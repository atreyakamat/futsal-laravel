import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getAdminContext } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';

const requestSchema = z.object({
  request_type: z.enum([
    'ARENA_UPDATE',
    'PRICING_UPDATE',
    'TIMING_UPDATE',
    'IMAGE_UPDATE',
    'FREE_BOOKING_REQUEST',
    'BLOCK_SLOT_REQUEST'
  ]),
  payload: z.any(), // Structure depends on request_type
  reason: z.string().optional(),
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

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const body = requestSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Insert into approval_requests
    await query(
      `INSERT INTO approval_requests (
        arena_id, 
        requested_by, 
        request_type, 
        status, 
        payload_json, 
        notes,
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        context.arenaId,
        context.id,
        body.request_type,
        'pending',
        JSON.stringify(body.payload),
        body.reason || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${body.request_type} submitted for Super Admin approval`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Request submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
