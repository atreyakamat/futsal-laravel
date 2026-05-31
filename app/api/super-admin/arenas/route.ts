import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  address: z.string().optional(),
  description: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
});

async function readSuperAdminId() {
  const cookieStore = await cookies();
  if (cookieStore.get('fg_auth_role')?.value !== 'super_admin') {
    return null;
  }
  const value = cookieStore.get('fg_auth_user')?.value;
  return value ? Number(value) : null;
}

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    await query(
      'INSERT INTO arenas (name, slug, address, description, contact_email, contact_phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [payload.name, payload.slug, payload.address || null, payload.description || null, payload.contact_email || null, payload.contact_phone || null, 'active']
    );

    // Log audit action
    await logAuditAction(
      superAdminId,
      'CREATE_ARENA',
      'arena',
      undefined,
      { name: payload.name, slug: payload.slug },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Arena created successfully',
      data: payload,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Arena creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const arenas = await query(
      'SELECT * FROM arenas WHERE status = ? ORDER BY created_at DESC',
      ['active']
    );

    return NextResponse.json({
      success: true,
      data: arenas,
    });
  } catch (error) {
    console.error('Fetch arenas error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
