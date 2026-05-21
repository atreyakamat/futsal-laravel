import { cookies, headers } from 'next/headers';
import type { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'fg_session_id';
export const AUTH_COOKIE = 'fg_auth_user';
export const GUEST_COOKIE = 'fg_guest_identifier';

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

export function persistSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export async function readAuthUserId() {
  const value = (await cookies()).get(AUTH_COOKIE)?.value;
  return value ? Number(value) : null;
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