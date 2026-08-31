import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyArenaAdminCredentials, getAdminArenaAssignments } from '@/lib/super-admin';
import { signValue, getCookieOptions } from '@/lib/session';
import { verifyTurnstileToken } from '@/lib/turnstile';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  turnstileToken: z.string().optional(),
});

// Platform-wide arena_admin login — same arena_admins table/credentials
// lookup as the Manager login (app/api/auth/manager/login), but only
// accepts a row with arena_id NULL (see
// prisma/migrations/20260817000000_arena_admin_nullable_arena_id). A
// Manager account (arena_id set) trying to log in here is rejected with a
// pointer to the right tab, rather than silently succeeding under the
// wrong role.
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

    const admin = await verifyArenaAdminCredentials(payload.email, payload.password);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!admin.is_active) {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 403 }
      );
    }

    if (admin.arena_id !== null) {
      return NextResponse.json(
        { success: false, message: 'This account is a Manager account, scoped to one turf. Please use the Manager tab.' },
        { status: 403 }
      );
    }

    const assignedArenaIds = await getAdminArenaAssignments(admin.id);
    const cookieOpts = getCookieOptions(60 * 60 * 24 * 7);

    if (assignedArenaIds.length === 1) {
      // Scoped to exactly one turf — auto-enter it, same session shape a
      // Manager would get (see lib/admin.ts's getAdminContext).
      const arenaId = assignedArenaIds[0];
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        data: { id: admin.id, email: admin.email, role: 'manager', arena_id: arenaId },
      });
      response.cookies.set('fg_auth_user', await signValue(`${admin.id}`), cookieOpts);
      response.cookies.set('fg_auth_role', await signValue('manager'), cookieOpts);
      response.cookies.set('fg_arena_id', await signValue(`${arenaId}`), cookieOpts);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        id: admin.id,
        email: admin.email,
        role: 'arena_admin',
        // Client uses this to route to the turf picker instead of the
        // platform dashboard when the account is scoped to 2+ turfs.
        needs_arena_selection: assignedArenaIds.length > 1,
      },
    });

    response.cookies.set('fg_auth_user', await signValue(`${admin.id}`), cookieOpts);
    response.cookies.set('fg_auth_role', await signValue('arena_admin'), cookieOpts);

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
