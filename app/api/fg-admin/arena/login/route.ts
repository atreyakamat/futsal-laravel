import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyArenaAdminCredentials } from '@/lib/super-admin';
import { cookies } from 'next/headers';
import { signValue, getCookieOptions } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = loginSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const admin = await verifyArenaAdminCredentials(payload.email, payload.password);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Set cookies for authentication
    const cookieStore = await cookies();
    
    // In a real app, we would use a proper session/JWT
    // For this prototype, we use simple cookies as per the existing pattern
    const cookieOpts = getCookieOptions(60 * 60 * 24);
    cookieStore.set('fg_auth_role', await signValue('arena_admin'), cookieOpts);
    cookieStore.set('fg_auth_user', await signValue(String(admin.id)), cookieOpts);
    cookieStore.set('fg_arena_id', await signValue(String(admin.arena_id)), cookieOpts);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      id: admin.id,
      arenaId: admin.arena_id
    });
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
