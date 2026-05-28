import bcrypt from 'bcryptjs';
import { query, queryOne, transaction, getSetting } from '@/lib/domain';

export type AdminRole = 'super_admin' | 'admin' | 'arena_admin' | 'security' | 'customer';
export type EntryMode = 'open' | 'blocked' | 'free';
export type ApprovalRequestType = 'slot_template_update' | 'entry_mode_update';

export type SlotPricingInput = {
  time_slot: string;
  price: number;
  day_of_week?: number | null;
};

export type AdminContext = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  customer_mobile: string | null;
  arenaId: number | null;
  arenaRole: string | null;
};

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return ['super_admin', 'admin', 'arena_admin', 'security'].includes(String(role));
}

export async function getAdminContext(userId: number | null): Promise<AdminContext | null> {
  if (!userId) return null;

  const user = await queryOne<{
    id: number;
    name: string;
    email: string;
    role: AdminRole;
    customer_mobile: string | null;
  }>('SELECT id, name, email, role, customer_mobile FROM users WHERE id = ? LIMIT 1', [userId]);

  if (!user || !isAdminRole(user.role)) {
    return null;
  }

  const manager = await queryOne<{ arena_id: number; role: string }>(
    'SELECT arena_id, role FROM arena_managers WHERE user_id = ? LIMIT 1',
    [userId]
  );

  return {
    ...user,
    arenaId: manager?.arena_id ?? null,
    arenaRole: manager?.role ?? null,
  };
}

export async function getUserRole(userId: number | null) {
  const context = await getAdminContext(userId);
  return context?.role ?? null;
}

export async function isSuperAdmin(userId: number | null) {
  return (await getUserRole(userId)) === 'super_admin';
}

export async function isArenaScopedAdmin(userId: number | null) {
  const role = await getUserRole(userId);
  return role === 'arena_admin' || role === 'security';
}

export async function getManagedArenaId(userId: number | null) {
  const context = await getAdminContext(userId);
  return context?.arenaId ?? null;
}

export async function updateUserPassword(userId: number, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [passwordHash, userId]);
}

export async function setArenaAssignment(userId: number, role: AdminRole, arenaId: number | null) {
  await query('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [role, userId]);

  if (role === 'arena_admin' || role === 'security') {
    if (!arenaId) {
      throw new Error('Arena assignment is required for arena_admin and security roles.');
    }

    await query(
      `INSERT INTO arena_managers (user_id, arena_id, role, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET arena_id = EXCLUDED.arena_id, role = EXCLUDED.role, updated_at = NOW()`,
      [userId, arenaId, role]
    );
    return;
  }

  await query('DELETE FROM arena_managers WHERE user_id = ?', [userId]);
}

export async function listArenas() {
  return query<{
    id: number;
    name: string;
    slug: string;
    address: string | null;
    status: string;
  }>('SELECT id, name, slug, address, status FROM arenas ORDER BY name ASC');
}

export async function listUsersWithArena() {
  return query<{
    id: number;
    name: string;
    email: string;
    customer_mobile: string | null;
    role: string;
    arena_id: number | null;
    arena_name: string | null;
    arena_role: string | null;
    created_at: string;
  }>(`
    SELECT u.id, u.name, u.email, u.customer_mobile, u.role, am.arena_id, a.name AS arena_name, am.role AS arena_role, u.created_at
      FROM users u
      LEFT JOIN arena_managers am ON am.user_id = u.id
      LEFT JOIN arenas a ON a.id = am.arena_id
     ORDER BY u.created_at DESC
     LIMIT 200
  `);
}

export async function getArenaSetting(arenaId: number, suffix: string) {
  return getSetting(`arena:${arenaId}:${suffix}`);
}

export async function setArenaSetting(arenaId: number, suffix: string, value: string | null) {
  await query(
    `INSERT INTO settings ("key", value, created_at, updated_at)
     VALUES (?, ?, NOW(), NOW())
     ON CONFLICT ("key")
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [`arena:${arenaId}:${suffix}`, value]
  );
}

export async function getArenaEntryMode(arenaId: number): Promise<EntryMode> {
  const setting = await getArenaSetting(arenaId, 'entry_mode');
  return (setting?.value as EntryMode | undefined) ?? 'open';
}

export async function setArenaEntryMode(arenaId: number, mode: EntryMode) {
  await setArenaSetting(arenaId, 'entry_mode', mode);
}

export async function getArenaSecurityPasscode(arenaId: number) {
  return getArenaSetting(arenaId, 'security_passcode');
}

export async function setArenaSecurityPasscode(arenaId: number, passcode: string | null) {
  await setArenaSetting(arenaId, 'security_passcode', passcode);
}

export async function replaceArenaPricing(arenaId: number, slots: SlotPricingInput[]) {
  await transaction(async (connection) => {
    await connection.execute('DELETE FROM pricings WHERE arena_id = ?', [arenaId]);

    for (const slot of slots) {
      await connection.execute(
        `INSERT INTO pricings (arena_id, time_slot, price, day_of_week, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [arenaId, slot.time_slot, slot.price, slot.day_of_week ?? null]
      );
    }
  });
}

export async function createApprovalRequest(input: {
  arenaId: number;
  requestedBy: number;
  requestType: ApprovalRequestType;
  payload: Record<string, unknown>;
  notes?: string | null;
}) {
  return queryOne<{ id: number }>(
    `INSERT INTO approval_requests (
       booking_id, request_type, arena_id, requested_by, payload_json, notes, status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
     RETURNING id`,
    [null, input.requestType, input.arenaId, input.requestedBy, JSON.stringify(input.payload), input.notes ?? null]
  );
}

export async function listApprovalRequests(scope: { status?: string; arenaId?: number | null } = {}) {
  const clauses = ['1=1'];
  const params: Array<string | number | null> = [];

  if (scope.status) {
    clauses.push('ar.status = ?');
    params.push(scope.status);
  }

  if (scope.arenaId) {
    clauses.push('ar.arena_id = ?');
    params.push(scope.arenaId);
  }

  return query<{
    id: number;
    request_type: string;
    arena_id: number | null;
    arena_name: string | null;
    requested_by: number | null;
    requested_by_name: string | null;
    status: string;
    notes: string | null;
    payload_json: string | null;
    created_at: string;
    decision_by: number | null;
    decision_reason: string | null;
    decision_at: string | null;
    applied_at: string | null;
  }>(`
    SELECT ar.id, ar.request_type, ar.arena_id, a.name AS arena_name, ar.requested_by,
           u.name AS requested_by_name, ar.status, ar.notes, ar.payload_json, ar.created_at,
           ar.decision_by, ar.decision_reason, ar.decision_at, ar.applied_at
      FROM approval_requests ar
      LEFT JOIN arenas a ON a.id = ar.arena_id
      LEFT JOIN users u ON u.id = ar.requested_by
     WHERE ${clauses.join(' AND ')}
     ORDER BY ar.created_at DESC
     LIMIT 200
  `, params);
}

export async function createAdminAuditLog(input: {
  action: string;
  actorUserId: number | null;
  arenaId?: number | null;
  entityType?: string | null;
  entityId?: string | number | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await query(
    `INSERT INTO admin_audit_logs (
       action, actor_user_id, arena_id, entity_type, entity_id, before_json, after_json, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      input.action,
      input.actorUserId,
      input.arenaId ?? null,
      input.entityType ?? null,
      input.entityId != null ? String(input.entityId) : null,
      input.beforeData != null ? JSON.stringify(input.beforeData) : null,
      input.afterData != null ? JSON.stringify(input.afterData) : null,
    ]
  );
}

export async function resolveApprovalRequest(input: {
  requestId: number;
  decisionBy: number;
  decision: 'approved' | 'rejected';
  reason?: string | null;
}) {
  const request = await queryOne<{
    id: number;
    request_type: ApprovalRequestType;
    arena_id: number | null;
    requested_by: number | null;
    payload_json: string | null;
    status: string;
  }>('SELECT id, request_type, arena_id, requested_by, payload_json, status FROM approval_requests WHERE id = ? LIMIT 1', [
    input.requestId,
  ]);

  if (!request) {
    throw new Error('Approval request not found.');
  }

  if (request.status !== 'pending') {
    throw new Error('Approval request is no longer pending.');
  }

  if (input.decision === 'approved') {
    const payload = request.payload_json ? (JSON.parse(request.payload_json) as Record<string, unknown>) : {};

    if (request.request_type === 'slot_template_update') {
      const slots = Array.isArray(payload.slots) ? (payload.slots as SlotPricingInput[]) : [];
      if (!request.arena_id) {
        throw new Error('Approval request is missing an arena.');
      }

      await replaceArenaPricing(request.arena_id, slots);
      await createAdminAuditLog({
        action: 'slot_template_update_approved',
        actorUserId: input.decisionBy,
        arenaId: request.arena_id,
        entityType: 'approval_request',
        entityId: request.id,
        afterData: payload,
      });
    }

    if (request.request_type === 'entry_mode_update') {
      const mode = String(payload.mode ?? 'open') as EntryMode;
      if (request.arena_id) {
        await setArenaEntryMode(request.arena_id, mode);
      }
      await createAdminAuditLog({
        action: 'entry_mode_update_approved',
        actorUserId: input.decisionBy,
        arenaId: request.arena_id,
        entityType: 'approval_request',
        entityId: request.id,
        afterData: payload,
      });
    }
  }

  await query(
    `UPDATE approval_requests
        SET status = ?, decision_by = ?, decision_reason = ?, decision_at = NOW(),
            applied_at = ?, updated_at = NOW()
      WHERE id = ?`,
    [input.decision, input.decisionBy, input.reason ?? null, input.decision === 'approved' ? new Date() : null, input.requestId]
  );

  return request;
}
