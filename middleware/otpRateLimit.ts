import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BUCKETS = new Map<string, { tokens: number; lastRefill: number }>();
const LIMIT = 5;
const INTERVAL_MS = 60 * 60 * 1000;

export async function otpRateLimit(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? (req as any).ip ?? 'unknown';
  const now = Date.now();
  const bucket = BUCKETS.get(ip) ?? { tokens: LIMIT, lastRefill: now };

  if (now - bucket.lastRefill >= INTERVAL_MS) {
    bucket.tokens = LIMIT;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Too many OTP requests. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  bucket.tokens--;
  BUCKETS.set(ip, bucket);
  return NextResponse.next();
}