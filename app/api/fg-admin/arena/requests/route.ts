import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getAdminContextFromRequest, createApprovalRequest } from '@/lib/admin';
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

export async function POST(request: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContextFromRequest(request);

    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    let rawBody: any;
    if (isJson) {
      rawBody = await request.json();
    } else {
      const formData = await request.formData();
      rawBody = {
        request_type: formData.get('request_type'),
        reason: formData.get('reason'),
        payload: {}
      };
      
      // Assemble nested payload fields (e.g. payload[date] or payload.date)
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('payload[')) {
          const innerKey = key.slice(8, -1).replace(']', ''); // extract key
          if (key.endsWith('[]')) {
            const cleanKey = innerKey.replace('[', '');
            if (!rawBody.payload[cleanKey]) rawBody.payload[cleanKey] = [];
            rawBody.payload[cleanKey].push(value);
          } else {
            rawBody.payload[innerKey] = value;
          }
        } else if (key === 'payload') {
          // In case it's sent as a JSON string
          try { rawBody.payload = JSON.parse(String(value)); } catch(e) {}
        }
      }
    }
    
    const body = requestSchema.parse(rawBody);

    if (!context.arenaId) {
      return NextResponse.json({ success: false, message: 'Arena ID required' }, { status: 400 });
    }

    // Insert into approval_requests
    await createApprovalRequest({
      arenaId: context.arenaId,
      requestedBy: context.id,
      requestType: body.request_type,
      payload: body.payload,
      notes: body.reason || null
    });

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
