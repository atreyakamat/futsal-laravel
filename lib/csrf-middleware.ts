import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCsrfTokenFromRequest, verifyCsrfToken } from '@/lib/csrf';

export async function verifyCsrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  const token = await getCsrfTokenFromRequest(request);
  const isValid = await verifyCsrfToken(token);

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