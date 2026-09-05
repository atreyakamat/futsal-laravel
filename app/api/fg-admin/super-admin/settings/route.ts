import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateSuperAdminPassword, getSuperAdmin, logAuditAction } from '@/lib/super-admin';
import { getGstConfig, setGstConfig } from '@/lib/gst-config';
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

    // Fetch cutoff hours and refund policy settings
    const { query } = await import('@/lib/domain');
    const settingsRows = await query<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN ('cancellation_cutoff_hours', 'refund_fee_mode', 'refund_fee_value', 'booking_window_days')`
    );
    let cancellation_cutoff_hours = 24;
    let refund_fee_mode = 'FIXED';
    let refund_fee_value = 300;
    let booking_window_days = 15;

    for (const row of settingsRows) {
      if (row.key === 'cancellation_cutoff_hours') {
        cancellation_cutoff_hours = parseInt(row.value, 10) || 24;
      } else if (row.key === 'refund_fee_mode') {
        refund_fee_mode = row.value.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
      } else if (row.key === 'refund_fee_value') {
        const val = parseFloat(row.value);
        if (!isNaN(val) && val >= 0) refund_fee_value = val;
      } else if (row.key === 'booking_window_days') {
        const val = parseInt(row.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 365) booking_window_days = val;
      }
    }

    const gstConfig = await getGstConfig();

    return NextResponse.json({
      success: true,
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        first_name: superAdmin.first_name,
        last_name: superAdmin.last_name,
        role: 'super_admin',
        is_active: superAdmin.is_active,
        last_login: superAdmin.last_login,
        cancellation_cutoff_hours,
        refund_fee_mode,
        refund_fee_value,
        booking_window_days,
        gst_gstin: gstConfig.gstin,
        gst_legal_name: gstConfig.legalName,
        gst_registered_address: gstConfig.registeredAddress,
        gst_hsn_sac: gstConfig.hsnSac,
        gst_rate: gstConfig.rate,
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
    const { query } = await import('@/lib/domain');

    if (payload.action === 'UPDATE_CUTOFF') {
      const cutoff = parseInt(payload.cutoff, 10);
      if (isNaN(cutoff) || cutoff < 24 || cutoff > 72) {
        return NextResponse.json({ success: false, message: 'Cutoff must be an integer between 24 and 72 hours' }, { status: 400 });
      }

      // Get previous value for audit log
      const prevSetting = await query<any>(`SELECT value FROM settings WHERE key = 'cancellation_cutoff_hours'`);
      const prevValue = prevSetting && prevSetting.length > 0 ? prevSetting[0].value : '24';

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

    if (payload.action === 'UPDATE_REFUND_POLICY') {
      const mode = String(payload.mode || '').toUpperCase();
      const val = parseFloat(payload.value);

      if (mode !== 'FIXED' && mode !== 'PERCENTAGE') {
        return NextResponse.json({ success: false, message: 'Refund fee mode must be FIXED or PERCENTAGE' }, { status: 400 });
      }

      if (isNaN(val) || val < 0) {
        return NextResponse.json({ success: false, message: 'Refund fee value must be a non-negative monetary or percentage number' }, { status: 400 });
      }

      if (mode === 'PERCENTAGE' && val > 100) {
        return NextResponse.json({ success: false, message: 'Percentage fee value cannot exceed 100%' }, { status: 400 });
      }

      // Get previous settings for audit log
      const prevSettings = await query<{ key: string; value: string }>(
        `SELECT key, value FROM settings WHERE key IN ('refund_fee_mode', 'refund_fee_value')`
      );
      const prevMode = prevSettings.find(s => s.key === 'refund_fee_mode')?.value || 'FIXED';
      const prevVal = prevSettings.find(s => s.key === 'refund_fee_value')?.value || '300';

      // Upsert mode
      await query(`
        INSERT INTO settings (key, value, created_at, updated_at) 
        VALUES ('refund_fee_mode', ?, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [mode]);

      // Upsert value
      await query(`
        INSERT INTO settings (key, value, created_at, updated_at) 
        VALUES ('refund_fee_value', ?, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [val.toString()]);

      // Audit log
      await logAuditAction(
        superAdminId,
        'UPDATE_REFUND_POLICY',
        'setting',
        0,
        {
          refund_fee_mode: { old: prevMode, new: mode },
          refund_fee_value: { old: prevVal, new: val.toString() }
        },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({
        success: true,
        message: `Refund policy updated to ${mode} mode (${mode === 'FIXED' ? '₹' : ''}${val}${mode === 'PERCENTAGE' ? '%' : ''})`,
        refund_fee_mode: mode,
        refund_fee_value: val
      });
    }

    if (payload.action === 'UPDATE_BOOKING_WINDOW') {
      const windowDays = parseInt(payload.windowDays, 10);
      if (isNaN(windowDays) || windowDays < 1 || windowDays > 365) {
        return NextResponse.json({ success: false, message: 'Booking window must be an integer between 1 and 365 days' }, { status: 400 });
      }

      const prevSetting = await query<any>(`SELECT value FROM settings WHERE key = 'booking_window_days'`);
      const prevValue = prevSetting && prevSetting.length > 0 ? prevSetting[0].value : '15';

      await query(`
        INSERT INTO settings (key, value, created_at, updated_at)
        VALUES ('booking_window_days', ?, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [windowDays.toString()]);

      await logAuditAction(
        superAdminId,
        'UPDATE_SETTING',
        'setting',
        0,
        { key: 'booking_window_days', old_value: prevValue, new_value: windowDays.toString() },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({ success: true, message: 'Booking window updated successfully', windowDays });
    }

    if (payload.action === 'UPDATE_GST_CONFIG') {
      const gstin = String(payload.gstin || '').trim();
      const legalName = String(payload.legal_name || '').trim();
      const registeredAddress = String(payload.registered_address || '').trim();
      const hsnSac = String(payload.hsn_sac || '').trim();
      const rate = parseFloat(payload.rate);

      if (!gstin || !legalName) {
        return NextResponse.json({ success: false, message: 'GSTIN and legal name are required' }, { status: 400 });
      }
      if (!hsnSac) {
        return NextResponse.json({ success: false, message: 'HSN/SAC code is required' }, { status: 400 });
      }
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ success: false, message: 'GST rate must be a number between 0 and 100' }, { status: 400 });
      }

      const prevConfig = await getGstConfig();

      await setGstConfig({ gstin, legalName, registeredAddress, hsnSac, rate });

      await logAuditAction(
        superAdminId,
        'UPDATE_GST_CONFIG',
        'setting',
        0,
        { old: prevConfig, new: { gstin, legalName, registeredAddress, hsnSac, rate } },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );

      return NextResponse.json({ success: true, message: 'GST configuration updated successfully' });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
