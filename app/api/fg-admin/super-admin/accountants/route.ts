import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAccountant, getAccountants, removeAccountant, logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

const createAccountantSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = createAccountantSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const result = await createAccountant(payload.name, payload.email, superAdminId);

    await logAuditAction(
      superAdminId,
      'CREATE_ACCOUNTANT',
      'accountant',
      result.accountant.id,
      { email: result.accountant.email },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Accountant created successfully',
      data: {
        accountant: result.accountant,
        credentials: result.credential,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error('Accountant creation error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const accountants = await getAccountants();
    return NextResponse.json({ success: true, data: accountants });
  } catch (error) {
    console.error('Fetch accountants error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, message: 'id parameter required' }, { status: 400 });
    }

    await removeAccountant(id);

    await logAuditAction(
      superAdminId,
      'DEACTIVATE_ACCOUNTANT',
      'accountant',
      id,
      {},
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Accountant deactivated' });
  } catch (error) {
    console.error('Deactivate accountant error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
