import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReport, getArenaReports, logAuditAction } from '@/lib/super-admin';
import { readSuperAdminId } from '@/lib/session';

const generateReportSchema = z.object({
  arena_id: z.coerce.number(),
  report_type: z.enum(['daily', 'weekly', 'monthly']),
  date_range_start: z.string(),
  date_range_end: z.string(),
});

export async function POST(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isJson = request.headers.get('content-type')?.includes('application/json');
    const payload = generateReportSchema.parse(
      isJson ? await request.json() : Object.fromEntries((await request.formData()).entries())
    );

    const report = await generateReport(
      payload.arena_id,
      payload.report_type,
      payload.date_range_start,
      payload.date_range_end,
      superAdminId
    );

    // Log audit action
    await logAuditAction(
      superAdminId,
      'GENERATE_REPORT',
      'report',
      report.id,
      { report_type: payload.report_type, arena_id: payload.arena_id },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      data: report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const superAdminId = await readSuperAdminId();

    if (!superAdminId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get('arena_id');

    if (!arenaId) {
      return NextResponse.json(
        { success: false, message: 'arena_id parameter required' },
        { status: 400 }
      );
    }

    const reports = await getArenaReports(Number(arenaId));

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
