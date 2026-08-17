import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyArenaAdminCredentials } from '@/lib/super-admin';
import { signValue, getCookieOptions } from '@/lib/session';
import { verifyTurnstileToken } from '@/lib/turnstile';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  turnstileToken: z.string().optional(),
});

// Manager login — the per-turf role that used to be called "arena_admin"
// before arena_admin was widened to a platform-wide role. Same
// arena_admins table/credentials lookup as the arena_admin login
// (app/api/auth/arena-admin/login), but only accepts a row with arena_id
// set (see prisma/migrations/20260817000000_arena_admin_nullable_arena_id).
export async function POST(request: Request) {
  try {
    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = bodySchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const turnstile = await verifyTurnstileToken(payload.turnstileToken, request.headers.get('x-forwarded-for') || undefined);
    if (!turnstile.success) {
      return NextResponse.json(
        { success: false, message: 'Captcha verification failed. Please try again.' },
        { status: 403 }
      );
    }

    const manager = await verifyArenaAdminCredentials(payload.email, payload.password);

    if (!manager) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!manager.is_active) {
      return NextResponse.json(
        { success: false, message: 'Manager account is inactive' },
        { status: 403 }
      );
    }

    if (manager.arena_id === null) {
      return NextResponse.json(
        { success: false, message: 'This account is a platform-wide Arena Admin account. Please use the Arena Admin tab.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        id: manager.id,
        email: manager.email,
        arena_id: manager.arena_id,
        role: 'manager',
      },
    });

    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set('fg_auth_user', await signValue(`${manager.id}`), cookieOpts);
    response.cookies.set('fg_auth_role', await signValue('manager'), cookieOpts);
    response.cookies.set('fg_arena_id', await signValue(`${manager.arena_id}`), cookieOpts);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Manager login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
