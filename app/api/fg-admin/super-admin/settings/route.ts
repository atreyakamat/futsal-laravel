import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateSuperAdminPassword, getSuperAdmin, logAuditAction } from '@/lib/super-admin';
import * as bcrypt from 'bcryptjs';
import { readSuperAdminId } from '@/lib/session';

const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export async function PUT(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = changePasswordSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    // Get super admin
    const superAdmin = await getSuperAdmin(superAdminId);

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Super admin not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(
      payload.current_password,
      superAdmin.password_hash
    );

    if (!isValidCurrentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password
    const result = await updateSuperAdminPassword(superAdminId, payload.new_password);

    // Log audit action
    await logAuditAction(
      superAdminId,
      'CHANGE_PASSWORD',
      'super_admin',
      superAdminId,
      { email: result.email },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      data: { email: result.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const superAdmin = await getSuperAdmin(superAdminId);

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Super admin not found' },
        { status: 404 }
      );
    }

    // Fetch cutoff hours
    const { query } = await import('@/lib/domain');
    const settingRes = await query<any>(`SELECT value FROM settings WHERE key = 'cancellation_cutoff_hours'`);
    let cancellation_cutoff_hours = 3;
    if (settingRes && settingRes.length > 0 && settingRes[0].value) {
      cancellation_cutoff_hours = parseInt(settingRes[0].value, 10) || 3;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin',
        is_active: superAdmin.is_active,
        last_login: superAdmin.last_login,
        cancellation_cutoff_hours,
      },
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    if (payload.action === 'UPDATE_CUTOFF') {
      const cutoff = parseInt(payload.cutoff, 10);
      if (isNaN(cutoff) || cutoff < 3 || cutoff > 12) {
        return NextResponse.json({ success: false, message: 'Cutoff must be an integer between 3 and 12' }, { status: 400 });
      }

      const { query } = await import('@/lib/domain');
      
      // Get previous value for audit log
      const prevSetting = await query<any>(`SELECT value FROM settings WHERE key = 'cancellation_cutoff_hours'`);
      const prevValue = prevSetting && prevSetting.length > 0 ? prevSetting[0].value : '3';

      // Upsert
      await query(`
        INSERT INTO settings (key, value, created_at, updated_at) 
        VALUES ('cancellation_cutoff_hours', ?, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [cutoff.toString()]);

      // Log audit
      await logAuditAction(
        superAdminId,
        'UPDATE_SETTING',
        'setting',
        0,
        { key: 'cancellation_cutoff_hours', old_value: prevValue, new_value: cutoff.toString() },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({ success: true, message: 'Cancellation cutoff updated successfully', cutoff });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
