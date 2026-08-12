import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';
import { getArenaPaymentMode, setArenaPaymentMode, getArenaUpiVpa, setArenaUpiVpa, getArenaPlaceOfSupply, setArenaPlaceOfSupply } from '@/lib/admin';

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
  payment_mode: z.enum(['online', 'offline']).optional(),
  upi_vpa: z.string().max(100).optional().or(z.literal('')),
  gst_place_of_supply: z.string().max(100).optional().or(z.literal('')),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const arena = await queryOne<any>(
      'SELECT * FROM arenas WHERE id = ?',
      [Number(params.id)]
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    const paymentMode = await getArenaPaymentMode(arena.id);
    const upiVpa = await getArenaUpiVpa(arena.id);
    const gstPlaceOfSupply = await getArenaPlaceOfSupply(arena.id);

    return NextResponse.json({
      success: true,
      data: { ...arena, payment_mode: paymentMode, upi_vpa: upiVpa, gst_place_of_supply: gstPlaceOfSupply },
    });
  } catch (error) {
    console.error('Fetch arena error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const arena = await queryOne(
      'SELECT * FROM arenas WHERE id = ?',
      [Number(params.id)]
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = updateSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const updates: string[] = [];
    const values: any[] = [];

    if (payload.name) {
      updates.push('name = ?');
      values.push(payload.name);
    }
    if (payload.address !== undefined) {
      updates.push('address = ?');
      values.push(payload.address);
    }
    if (payload.description !== undefined) {
      updates.push('description = ?');
      values.push(payload.description);
    }
    if (payload.contact_email) {
      updates.push('contact_email = ?');
      values.push(payload.contact_email);
    }
    if (payload.contact_phone) {
      updates.push('contact_phone = ?');
      values.push(payload.contact_phone);
    }
    if (payload.status) {
      updates.push('status = ?');
      values.push(payload.status);
    }
    if (payload.cover_image !== undefined) {
      updates.push('cover_image = ?');
      values.push(payload.cover_image);
    }
    if (payload.logo_url !== undefined) {
      updates.push('logo_url = ?');
      values.push(payload.logo_url);
    }

    if (updates?.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(Number(params.id));

      await query(
        `UPDATE arenas SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    if (payload.payment_mode) {
      await setArenaPaymentMode(Number(params.id), payload.payment_mode);
    }
    if (payload.upi_vpa !== undefined) {
      await setArenaUpiVpa(Number(params.id), payload.upi_vpa || null);
    }
    if (payload.gst_place_of_supply !== undefined) {
      await setArenaPlaceOfSupply(Number(params.id), payload.gst_place_of_supply || null);
    }

    // Log audit action
    await logAuditAction(
      superAdminId,
      'UPDATE_ARENA',
      'arena',
      Number(params.id),
      payload,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Arena updated successfully',
      data: payload,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Arena update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const arena = await queryOne(
      'SELECT * FROM arenas WHERE id = ?',
      [Number(params.id)]
    );

    if (!arena) {
      return NextResponse.json(
        { success: false, message: 'Arena not found' },
        { status: 404 }
      );
    }

    // Soft delete by marking as inactive
    await query(
      'UPDATE arenas SET status = ?, updated_at = NOW() WHERE id = ?',
      ['inactive', Number(params.id)]
    );

    // Log audit action
    await logAuditAction(
      superAdminId,
      'DELETE_ARENA',
      'arena',
      Number(params.id),
      { status: 'inactive' },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Arena deleted successfully',
    });
  } catch (error) {
    console.error('Arena deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
