import { cookies, headers } from 'next/headers';
import type { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
export const SESSION_COOKIE = 'fg_session_id';
export const AUTH_COOKIE = 'fg_auth_user';
export const GUEST_COOKIE = 'fg_guest_identifier';

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'futsalgoa-super-secret-key-change-me-in-prod';

export function signValue(value: string): string {
  const signature = CryptoJS.HmacSHA256(value, COOKIE_SECRET).toString(CryptoJS.enc.Base64url);
  return `${value}.${signature}`;
}

export function unsignValue(signedValue: string | null): string | null {
  if (!signedValue) return null;
  
  const parts = signedValue.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const [value, signature] = parts;
  const expectedSignature = CryptoJS.HmacSHA256(value, COOKIE_SECRET).toString(CryptoJS.enc.Base64url);
  
  if (signature.length === expectedSignature.length) {
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    if (mismatch === 0) {
      return value;
    }
  }
  
  return null;
}

export async function getOrCreateSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  return crypto.randomUUID();
}

export function getSessionIdFromRequest(request: Request) {
  const headerCookie = request.headers.get('cookie') ?? '';
  const match = headerCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));

  return match?.[1] ?? crypto.randomUUID();
}

export function getCookieValueFromRequest(request: Request, name: string) {
  const headerCookie = request.headers.get('cookie') ?? '';
  const match = headerCookie.match(new RegExp(`${name}=([^;]+)`));

  return match?.[1] ?? null;
}

export function getWritableSessionId(request: Request) {
  return getCookieValueFromRequest(request, SESSION_COOKIE) ?? crypto.randomUUID();
}

export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true',
    path: '/',
    ...(maxAge !== undefined && { maxAge }),
  };
}

export function persistSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE, sessionId, getCookieOptions());
}

export async function readAuthUserId() {
  const value = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!value) return null;
  const unsigned = unsignValue(value);
  if (!unsigned) return null;
  const num = Number(unsigned);
  return isNaN(num) ? null : num;
}

export async function readAuthRole() {
  const value = (await cookies()).get('fg_auth_role')?.value;
  if (!value) return null;
  return unsignValue(value);
}

export async function readArenaId() {
  const value = (await cookies()).get('fg_arena_id')?.value;
  if (!value) return null;
  const unsigned = unsignValue(value);
  if (!unsigned) return null;
  const num = Number(unsigned);
  return isNaN(num) ? null : num;
}

export async function readGuestIdentifier() {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

export async function readRequestOrigin(request?: Request) {
  if (request) {
    const origin = request.headers.get('origin');
    if (origin) {
      return origin;
    }
  }

  const headerList = await headers();
  return headerList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export async function readSuperAdminId() {
  const role = await readAuthRole();
  if (role !== 'super_admin') {
    return null;
  }
  return await readAuthUserId();
}
