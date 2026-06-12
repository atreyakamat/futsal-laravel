import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsignValue } from '@/lib/session';

const ROLE_MATRIX: Record<string, string[]> = {
  '/fg-admin/platform': ['super_admin'],
  '/fg-admin/arena': ['arena_admin'],
  '/fg-admin/security': ['security'],
  '/api/fg-admin/platform': ['super_admin'],
  '/api/fg-admin/super-admin': ['super_admin'],
  '/api/fg-admin/security': ['security'],
  '/api/fg-admin/arena': ['arena_admin'],
};

const PROTECTED_PREFIXES = ['/fg-admin/platform', '/fg-admin/arena', '/fg-admin/security', '/api/fg-admin/platform', '/api/fg-admin/super-admin', '/api/fg-admin/security', '/api/fg-admin/arena'];

function jsonError(message: string, status: number) {
  return new NextResponse(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readCookieFromRequest(req: NextRequest, name: string): Promise<string | null> {
  const cookie = req.cookies.get(name);
  if (!cookie?.value) return null;
  const unsigned = await unsignValue(cookie.value);
  return unsigned;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Check if path requires protection
  const requiresProtection = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!requiresProtection) {
    return NextResponse.next();
  }

  // Read and verify cookies
  const userIdRaw = await readCookieFromRequest(req, 'fg_auth_user');
  const role = await readCookieFromRequest(req, 'fg_auth_role');

  const isApiRoute = pathname.startsWith('/api/');

  if (!userIdRaw || !role) {
    if (isApiRoute) return jsonError('Authentication required', 401);
    return NextResponse.redirect(new URL('/fg-admin/login', req.url));
  }

  const userId = Number(userIdRaw);
  if (isNaN(userId)) {
    if (isApiRoute) return jsonError('Invalid session', 401);
    return NextResponse.redirect(new URL('/fg-admin/login', req.url));
  }

  // Find which prefix matched
  const matchedPrefix = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p))!;
  const allowedRoles = ROLE_MATRIX[matchedPrefix] || [];

  if (!allowedRoles.includes(role)) {
    if (isApiRoute) return jsonError('Forbidden: insufficient privileges', 403);
    return NextResponse.redirect(new URL('/fg-admin/login', req.url));
  }

  // For arena-admin routes, verify arena_id matches
  if (matchedPrefix === '/fg-admin/arena' || matchedPrefix === '/api/fg-admin/arena') {
    const arenaIdCookie = await readCookieFromRequest(req, 'fg_arena_id');
    if (!arenaIdCookie) {
      if (isApiRoute) return jsonError('Forbidden: arena assignment required', 403);
      return NextResponse.redirect(new URL('/fg-admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/fg-admin/:path*',
    '/api/fg-admin/:path*',
  ],
};