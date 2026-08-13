import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSuperAdminId } from '@/lib/session';
import { query, transaction } from '@/lib/db';
import { logAuditAction } from '@/lib/super-admin';

const putSchema = z.object({
  amenityIds: z.array(z.number()).default([]),
  customNames: z.array(z.string().min(1).max(60)).default([]),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const superAdminId = await readSuperAdminId();
  if (!superAdminId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const params = await context.params;
  const arenaId = Number(params.id);
  if (isNaN(arenaId)) {
    return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
  }

  const [allAmenities, selected] = await Promise.all([
    query<{ id: number; name: string; icon: string }>(`SELECT id, name, icon FROM amenities ORDER BY name ASC`),
    query<{ amenity_id: number }>(`SELECT amenity_id FROM arena_amenities WHERE arena_id = ?`, [arenaId]),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      allAmenities,
      selectedIds: selected.map((s) => s.amenity_id),
    },
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const superAdminId = await readSuperAdminId();
    if (!superAdminId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const params = await context.params;
    const arenaId = Number(params.id);
    if (isNaN(arenaId)) {
      return NextResponse.json({ success: false, message: 'Invalid arena id' }, { status: 400 });
    }

    const payload = putSchema.parse(await request.json());

    await transaction(async (connection) => {
      const finalAmenityIds = new Set(payload.amenityIds);

      for (const name of payload.customNames) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        const [rows] = await connection.execute<{ id: number }>(
          `INSERT INTO amenities (name, icon) VALUES (?, 'check_circle')
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [trimmed]
        );
        if (rows?.[0]?.id) finalAmenityIds.add(rows[0].id);
      }

      await connection.execute(`DELETE FROM arena_amenities WHERE arena_id = ?`, [arenaId]);
      for (const amenityId of finalAmenityIds) {
        await connection.execute(
          `INSERT INTO arena_amenities (arena_id, amenity_id) VALUES (?, ?)`,
          [arenaId, amenityId]
        );
      }
    });

    await logAuditAction(
      superAdminId,
      'UPDATE_ARENA_AMENITIES',
      'arena',
      arenaId,
      { amenityIds: payload.amenityIds, customNames: payload.customNames },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Amenities updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    console.error('Arena amenities update error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
