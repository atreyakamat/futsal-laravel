import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verify Database Connectivity
    const dbCheck = await queryOne<{ result: number }>('SELECT 1 as result');
    const dbHealthy = dbCheck?.result === 1;

    // 2. Measure Memory & Uptime
    const memory = process.memoryUsage();
    const responseTimeMs = Date.now() - startTime;

    const healthData = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      version: 'v1.0.0-RC1',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs,
      checks: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          latencyMs: responseTimeMs,
        },
        memory: {
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
          rssMb: Math.round(memory.rss / 1024 / 1024),
        },
      },
    };

    return NextResponse.json(healthData, {
      status: dbHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version: 'v1.0.0-RC1',
        timestamp: new Date().toISOString(),
        error: 'Database ping failed',
      },
      { status: 503 }
    );
  }
}
