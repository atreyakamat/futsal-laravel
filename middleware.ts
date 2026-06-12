import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsignValue } from '@/lib/session';
import { otpRateLimit } from './otpRateLimit';

const ROLE_MATRIX: Record<string, string[]> = {
  '/admin': ['super_admin'],
  '/api/admin': ['super_admin'],
  '/api/super-admin': ['super_admin'],
  '/api/security': ['security'],
  '/api/arena-admin': ['arena_admin'],
};

const PROTECTED_PREFIXES = ['/admin', '/api/admin', '/api/super-admin', '/api/security', '/api/arena-admin'];

function jsonError(message: string, status: number) {
  return new NextResponse(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readCookieFromRequest(req: NextRequest, name: string): string | null {
  const cookie = req.cookies.get(name);
  if (!cookie?.value) return null;
  const unsigned = unsignValue(cookie.value);
  return unsigned;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Apply OTP rate limiting to send-otp endpoints
  if (pathname.startsWith('/api/auth/') && pathname.endsWith('/send-otp')) {
    const rateResult = await otpRateLimit(req);
    if (rateResult instanceof NextResponse && rateResult.status !== 200) {
      return rateResult;
    }
  }

  // Check if path requires protection
  const requiresProtection = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!requiresProtection) {
    return NextResponse.next();
  }

  // Read and verify cookies
  const userIdRaw = readCookieFromRequest(req, 'fg_auth_user');
  const role = readCookieFromRequest(req, 'fg_auth_role');

  if (!userIdRaw || !role) {
    return jsonError('Authentication required', 401);
  }

  const userId = Number(userIdRaw);
  if (isNaN(userId)) {
    return jsonError('Invalid session', 401);
  }

  // Find which prefix matched
  const matchedPrefix = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p))!;
  const allowedRoles = ROLE_MATRIX[matchedPrefix] || [];

  if (!allowedRoles.includes(role)) {
    return jsonError('Forbidden: insufficient privileges', 403);
  }

  // For arena-admin routes, verify arena_id matches
  if (matchedPrefix === '/api/arena-admin') {
    const arenaIdCookie = readCookieFromRequest(req, 'fg_arena_id');
    if (!arenaIdCookie) {
      return jsonError('Forbidden: arena assignment required', 403);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/super-admin/:path*',
    '/api/security/:path*',
    '/api/arena-admin/:path*',
  ],
};