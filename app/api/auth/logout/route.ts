import { NextResponse } from 'next/server';
import { AUTH_COOKIE, GUEST_COOKIE, SESSION_COOKIE } from '@/lib/session';
import { query } from '@/lib/domain';

export async function POST(request: Request) {
  const cookieStore = await import('next/headers').then(m => m.cookies());
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  // Persist session revocation to database
  if (sessionId) {
    try {
      await query(
        'INSERT INTO revoked_sessions (session_id) VALUES (?) ON CONFLICT (session_id) DO NOTHING',
        [sessionId]
      );
    } catch (e) {
      console.error('Failed to revoke session:', e);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete('fg_auth_role');
  response.cookies.delete('fg_arena_id');
  response.cookies.delete(GUEST_COOKIE);
  response.cookies.delete(SESSION_COOKIE);

  if (request.headers.get('accept')?.includes('text/html')) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    redirectResponse.cookies.delete(AUTH_COOKIE);
    redirectResponse.cookies.delete('fg_auth_role');
    redirectResponse.cookies.delete('fg_arena_id');
    redirectResponse.cookies.delete(GUEST_COOKIE);
    redirectResponse.cookies.delete(SESSION_COOKIE);
    return redirectResponse;
  }
  return response;
}