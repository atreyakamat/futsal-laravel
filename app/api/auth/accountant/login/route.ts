import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAccountantCredentials } from '@/lib/super-admin';
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

    const accountant = await verifyAccountantCredentials(payload.email, payload.password);

    if (!accountant) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!accountant.is_active) {
      return NextResponse.json(
        { success: false, message: 'Accountant account is inactive' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        id: accountant.id,
        email: accountant.email,
        role: 'accountant',
      },
    });

    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set('fg_auth_user', await signValue(`${accountant.id}`), cookieOpts);
    response.cookies.set('fg_auth_role', await signValue('accountant'), cookieOpts);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Accountant login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
