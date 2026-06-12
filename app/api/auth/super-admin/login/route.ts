import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySuperAdminCredentials } from '@/lib/super-admin';
import { signValue, getCookieOptions } from '@/lib/session';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const superAdmin = await verifySuperAdminCredentials(payload.email, payload.password);

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!superAdmin.is_active) {
      return NextResponse.json(
        { success: false, message: 'Super admin account is inactive' },
        { status: 403 }
      );
    }

    // Create session response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'super_admin',
      },
    });

    // Set auth cookie with super admin ID encoded with role indicator
    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set('fg_auth_user', await signValue(`${superAdmin.id}`), cookieOpts);

    // Set role cookie
    response.cookies.set('fg_auth_role', await signValue('super_admin'), cookieOpts);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Super admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
