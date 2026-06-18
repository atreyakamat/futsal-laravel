import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import '@/lib/env-validate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  try {
    const db = await queryOne<{ ok: number }>('SELECT 1 AS ok');

    return NextResponse.json({
      status: 'ok',
      database: db?.ok === 1 ? 'up' : 'unknown',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'down',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
