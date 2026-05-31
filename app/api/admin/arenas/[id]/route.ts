import { NextResponse } from 'next/server';
import { getAdminContext, createAdminAuditLog } from '@/lib/admin';
import { query } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const resolvedParams = await params;
  const arenaId = parseInt(resolvedParams.id, 10);

  if (isNaN(arenaId)) {
    return NextResponse.json({ success: false, message: 'Invalid arena ID' }, { status: 400 });
  }

  // Ensure arena exists
  const existing = await query<{ id: number }>('SELECT id FROM arenas WHERE id = ? LIMIT 1', [arenaId]);
  if (!existing || existing?.length === 0) {
    return NextResponse.json({ success: false, message: 'Arena not found' }, { status: 404 });
  }

  await query('DELETE FROM arenas WHERE id = ?', [arenaId]);

  await createAdminAuditLog({
    action: 'arena_deleted',
    actorUserId: context.id,
    entityType: 'arena',
    entityId: arenaId,
  });

  return NextResponse.json({ success: true, message: 'Arena deleted successfully' });
}
