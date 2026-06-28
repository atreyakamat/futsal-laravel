import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import CryptoJS from 'crypto-js';

const CSRF_COOKIE = 'fg_csrf_token';
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'futsalgoa-super-secret-key-change-me-in-prod';

export function generateCsrfToken(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64url);
}

export function signCsrfToken(token: string): string {
  const signature = CryptoJS.HmacSHA256(token, COOKIE_SECRET).toString(CryptoJS.enc.Base64url);
  return `${token}.${signature}`;
}

export function verifyCsrfTokenSigned(signedToken: string | null): string | null {
  if (!signedToken) return null;
  
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;
  
  const [token, signature] = parts;
  const expectedSignature = CryptoJS.HmacSHA256(token, COOKIE_SECRET).toString(CryptoJS.enc.Base64url);
  
  if (signature.length !== expectedSignature.length) return null;
  
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return mismatch === 0 ? token : null;
}

export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;
  
  if (existing) {
    const verified = verifyCsrfTokenSigned(existing);
    if (verified) return verified;
  }
  
  // If we reach here, middleware hasn't run yet or failed.
  // We cannot set cookies in Server Components, so we just return a fallback.
  // The client will get a 403 if it uses it, but middleware should always prevent this.
  return generateCsrfToken();
}

export async function getCsrfTokenFromRequest(request: NextRequest): Promise<string | null> {
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;
  
  const cookieStore = request.cookies;
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (cookieToken) {
    return verifyCsrfTokenSigned(cookieToken);
  }
  
  return null;
}

export async function verifyCsrfToken(token: string | null, request?: NextRequest): Promise<boolean> {
  if (!token) return false;

  // Accept either request object (from middleware/client) or cookie store (server component)
  const cookieToken = request
    ? request.cookies.get(CSRF_COOKIE)?.value
    : (await cookies()).get(CSRF_COOKIE)?.value;

  if (!cookieToken) return false;

  const verified = verifyCsrfTokenSigned(cookieToken);
  return verified === token;
}

export function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true',
    path: '/',
    maxAge: 60 * 60 * 24,
  };
}