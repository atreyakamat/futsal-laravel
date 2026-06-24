import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyCsrfTokenSigned } from '@/lib/csrf';

const CSRF_COOKIE = 'fg_csrf_token';

/**
 * Extract the CSRF token from the request.
 * Priority: x-csrf-token header → _csrf body field → cookie (double-submit pattern)
 */
async function extractCsrfToken(request: Request): Promise<string | null> {
  const req = request as NextRequest;
  // 1. Check header (for JSON/fetch requests)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;

  // 2. Check form body _csrf field (for HTML form submissions)
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const cloned = request.clone();
      const formData = await cloned.formData();
      const bodyToken = formData.get('_csrf');
      if (bodyToken && typeof bodyToken === 'string') return bodyToken;
    } catch {
      // fall through
    }
  }

  // 3. Fallback: read and verify the cookie itself (dev/simple flows)
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  if (cookieToken) {
    return verifyCsrfTokenSigned(cookieToken);
  }

  return null;
}

/**
 * Verify CSRF: compare extracted token against the signed cookie.
 */
async function verifyToken(request: Request, token: string | null): Promise<boolean> {
  if (!token) return false;
  const req = request as NextRequest;
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  const verified = verifyCsrfTokenSigned(cookieToken);
  return verified === token;
}

export async function verifyCsrfMiddleware(request: Request): Promise<NextResponse | null> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  const token = await extractCsrfToken(request);
  const isValid = await verifyToken(request, token);

  if (!isValid) {
    return NextResponse.json(
      { success: false, message: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null;
}

export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const csrfError = await verifyCsrfMiddleware(request);
    if (csrfError) return csrfError;
    return handler(request);
  };
}