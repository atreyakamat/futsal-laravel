import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsignValue } from '@/lib/session';
import { getClientIp, authRateLimiter, apiRateLimiter } from '@/lib/rate-limiter';
import { getSecurityHeaders } from '@/lib/env-validate';
import { generateCsrfToken, signCsrfToken, verifyCsrfTokenSigned, getCsrfCookieOptions } from '@/lib/csrf';

// NOTE: '/fg-admin/platform' + '/api/fg-admin/platform' and
// '/fg-admin/arena' + '/api/fg-admin/arena' were left stale by the
// Manager/arena_admin role split (see prisma/migrations/
// 20260817000000_arena_admin_nullable_arena_id and lib/admin.ts's
// getAdminContext) — arena_admin (platform-wide) was granted access to the
// shared platform dashboard/bookings/approvals/reports, and 'manager' was
// introduced as the new name for the per-turf role, but this table was
// never updated to match: it still only allowed 'super_admin' on the
// platform prefixes and only 'arena_admin' (never 'manager') on the arena
// prefixes, silently locking both roles out of their own dashboards.
// Fixed 2026-08-31 — see also the multi-turf admin feature (an arena_admin
// scoped to specific turfs operates through '/fg-admin/arena/*' with a
// 'manager'-shaped session for whichever turf it has selected).
const ROLE_MATRIX: Record<string, string[]> = {
  '/arena-admin': ['arena_admin'],
  '/fg-admin/platform': ['super_admin', 'arena_admin'],
  '/fg-admin/arena': ['arena_admin', 'manager'],
  '/fg-admin/security': ['security'],
  '/fg-admin/accountant': ['accountant', 'super_admin'],
  '/api/fg-admin/platform/slots': ['super_admin', 'arena_admin'],
  '/api/fg-admin/platform': ['super_admin', 'arena_admin'],
  '/api/fg-admin/super-admin': ['super_admin'],
  '/api/fg-admin/security': ['security'],
  '/api/fg-admin/arena': ['arena_admin', 'manager'],
  '/api/fg-admin/accountant': ['accountant', 'super_admin'],
  '/api/security/verify': ['security', 'super_admin'],
  '/api/security/checkin': ['security', 'super_admin'],
};

const PROTECTED_PREFIXES = [
  '/api/fg-admin/platform/slots',
  '/fg-admin/platform',
  '/fg-admin/arena',
  '/fg-admin/security',
  '/fg-admin/accountant',
  '/arena-admin',
  '/api/fg-admin/platform',
  '/api/fg-admin/super-admin',
  '/api/fg-admin/security',
  '/api/fg-admin/arena',
  '/api/fg-admin/accountant',
  '/api/arena-admin'
];

const AUTH_ROUTES = ['/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/super-admin/login', '/api/auth/arena-admin/login', '/api/auth/security/login', '/api/auth/accountant/login'];

function jsonError(message: string, status: number) {
  return new NextResponse(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readCookieFromRequest(req: NextRequest, name: string): Promise<string | null> {
  const cookie = req.cookies.get(name);
  if (!cookie?.value) return null;
  const unsigned = unsignValue(cookie.value);
  return unsigned;
}

function addSecurityHeaders(response: NextResponse) {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Rate limiting for auth routes
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const ip = await getClientIp(req);
    if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      const rateLimit = await authRateLimiter(ip);
      if (!rateLimit.allowed) {
        return new NextResponse(JSON.stringify({ 
          success: false, 
          message: 'Too many requests. Please try again later.' 
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        });
      }
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/') && !AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const ip = await getClientIp(req);
    if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      const rateLimit = await apiRateLimiter(ip);
      if (!rateLimit.allowed) {
        return new NextResponse(JSON.stringify({ 
          success: false, 
          message: 'Rate limit exceeded. Please slow down.' 
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        });
      }
    }
  }

  // Verify or generate CSRF token
  const csrfCookie = req.cookies.get('fg_csrf_token')?.value;
  let response = NextResponse.next();
  let needsCsrfCookie = true;

  if (csrfCookie) {
    if (verifyCsrfTokenSigned(csrfCookie)) {
      needsCsrfCookie = false;
    }
  }

  if (needsCsrfCookie) {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token);
    
    // Pass the cookie to the request so Server Components can read it immediately
    const requestHeaders = new Headers(req.headers);
    const existingCookies = req.headers.get('cookie') || '';
    const separator = existingCookies ? '; ' : '';
    requestHeaders.set('cookie', `${existingCookies}${separator}fg_csrf_token=${signed}`);
    
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    response.cookies.set('fg_csrf_token', signed, getCsrfCookieOptions());
  }

  // Check if path requires protection
  const requiresProtection = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!requiresProtection) {
    return addSecurityHeaders(response);
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

  response = addSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};