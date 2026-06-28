import { NextResponse } from 'next/server';
import { getAdminContext, createAdminAuditLog } from '@/lib/admin';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || context.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const newStatus = body.status === 'disabled' ? 'disabled' : 'active';

    await query('UPDATE arenas SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);

    await createAdminAuditLog({
      action: newStatus === 'disabled' ? 'ARENA_DISABLED' : 'ARENA_ENABLED',
      approvedBy: context.id,
      arenaId: Number(id),
      fieldChanged: 'Status',
      newValue: newStatus,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to change arena status:', err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || context.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Attempt hard delete, fallback to soft delete
    try {
      await query('DELETE FROM arenas WHERE id = ?', [id]);
    } catch (dbErr) {
      await query('UPDATE arenas SET status = ? WHERE id = ?', ['deleted', id]);
    }

    await createAdminAuditLog({
      action: 'ARENA_DELETED',
      approvedBy: context.id,
      arenaId: Number(id),
      fieldChanged: 'Deleted',
      newValue: 'deleted',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete arena:', err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
