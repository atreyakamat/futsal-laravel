import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCsrfToken } from '@/lib/csrf';

/**
 * Extract the CSRF token from the request.
 * Priority: x-csrf-token header → _csrf body field
 */
async function extractCsrfToken(request: Request): Promise<string | null> {
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

  return null;
}

/**
 * Verify CSRF: compare extracted token against the signed cookie.
 */
async function verifyToken(token: string | null, request: Request): Promise<boolean> {
  return verifyCsrfToken(token, request as NextRequest);
}

export async function verifyCsrfMiddleware(request: Request): Promise<NextResponse | null> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  const token = await extractCsrfToken(request);
  const isValid = await verifyToken(token, request);

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