import { NextResponse } from 'next/server';
import { AUTH_COOKIE, GUEST_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete('fg_auth_role');
  response.cookies.delete('fg_arena_id');
  response.cookies.delete(GUEST_COOKIE);
  if (request.headers.get('accept')?.includes('text/html')) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    redirectResponse.cookies.delete(AUTH_COOKIE);
    redirectResponse.cookies.delete('fg_auth_role');
    redirectResponse.cookies.delete('fg_arena_id');
    redirectResponse.cookies.delete(GUEST_COOKIE);
    return redirectResponse;
  }
  return response;
}