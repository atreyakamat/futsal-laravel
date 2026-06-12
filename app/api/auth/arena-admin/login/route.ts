import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyArenaAdminCredentials } from '@/lib/super-admin';
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

    const arenaAdmin = await verifyArenaAdminCredentials(payload.email, payload.password);

    if (!arenaAdmin) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!arenaAdmin.is_active) {
      return NextResponse.json(
        { success: false, message: 'Arena admin account is inactive' },
        { status: 403 }
      );
    }

    // Create session response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        id: arenaAdmin.id,
        email: arenaAdmin.email,
        arena_id: arenaAdmin.arena_id,
        role: 'arena_admin',
      },
    });

    // Set auth cookies
    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set('fg_auth_user', await signValue(`${arenaAdmin.id}`), cookieOpts);
    response.cookies.set('fg_auth_role', await signValue('arena_admin'), cookieOpts);
    response.cookies.set('fg_arena_id', await signValue(`${arenaAdmin.arena_id}`), cookieOpts);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Arena admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
