import { NextResponse } from 'next/server';
import { AUTH_COOKIE, GUEST_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(GUEST_COOKIE);
  if (request.headers.get('accept')?.includes('text/html')) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    redirectResponse.cookies.delete(AUTH_COOKIE);
    redirectResponse.cookies.delete(GUEST_COOKIE);
    return redirectResponse;
  }
  return response;
}