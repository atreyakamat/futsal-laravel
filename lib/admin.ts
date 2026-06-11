import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query, queryOne, transaction, getSetting, createBookingBatch } from '@/lib/domain';
import { sendTicketEmail } from '@/lib/ticket';

export type AdminRole = 'super_admin' | 'admin' | 'arena_admin' | 'security' | 'customer';
export type EntryMode = 'open' | 'blocked' | 'free';
export type ApprovalRequestType = 'slot_template_update' | 'entry_mode_update' | 'admin_free_booking' | 'timing_update' | 'image_update';
export type SecurityPermissions = {
  canVerifyTicket: boolean;
  canConfirmEntry: boolean;
};

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
  return ['super_admin', 'arena_admin', 'security'].includes(String(role));
}

export async function getAdminContext(userId: number | null): Promise<AdminContext | null> {
  if (!userId) return null;

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get('fg_auth_role')?.value ?? null;

  // 1. Check Super Admin Table if role is super_admin OR if checking as fallback
  if (roleCookie === 'super_admin' || !roleCookie) {
    const superAdmin = await queryOne<{
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      is_active: boolean;
    }>(
      'SELECT id, email, first_name, last_name, is_active FROM super_admins WHERE id = ? LIMIT 1',
      [userId]
    );

    if (superAdmin && superAdmin.is_active) {
      return {
        id: superAdmin.id,
        name: [superAdmin.first_name, superAdmin.last_name].filter(Boolean).join(' ') || superAdmin.email,
        email: superAdmin.email,
        role: 'super_admin',
        customer_mobile: null,
        arenaId: null,
        arenaRole: null,
      };
    }
  }

  // 2. Check Arena Admin / Security Staff specifically if role cookie suggests it
  if (roleCookie === 'arena_admin') {
    const arenaAdmin = await queryOne<{
      id: number;
      email: string;
      arena_id: number;
      first_name: string | null;
      last_name: string | null;
      is_active: boolean;
    }>(
      'SELECT id, email, arena_id, first_name, last_name, is_active FROM arena_admins WHERE id = ? LIMIT 1',
      [userId]
    );

    if (arenaAdmin && arenaAdmin.is_active) {
      return {
        id: arenaAdmin.id,
        name: [arenaAdmin.first_name, arenaAdmin.last_name].filter(Boolean).join(' ') || arenaAdmin.email,
        email: arenaAdmin.email,
        role: 'arena_admin',
        customer_mobile: null,
        arenaId: arenaAdmin.arena_id,
        arenaRole: 'arena_admin',
      };
    }
  }

  if (roleCookie === 'security') {
    const securityStaff = await queryOne<{
      id: number;
      email: string;
      arena_id: number;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      is_active: boolean;
    }>(
      'SELECT id, email, arena_id, first_name, last_name, phone, is_active FROM security_staff WHERE id = ? LIMIT 1',
      [userId]
    );

    if (securityStaff && securityStaff.is_active) {
      return {
        id: securityStaff.id,
        name: [securityStaff.first_name, securityStaff.last_name].filter(Boolean).join(' ') || securityStaff.email,
        email: securityStaff.email,
        role: 'security',
        customer_mobile: securityStaff.phone,
        arenaId: securityStaff.arena_id,
        arenaRole: 'security',
      };
    }
  }

  // 3. Fallback to unified users table (legacy or standard accounts)
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
      throw new Error('Arena assignment is required for arena admins and security staff.');
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

function securityPermissionSettingKey(userId: number) {
  return `security:${userId}:permissions`;
}

function normalizeSecurityPermissions(input?: Partial<SecurityPermissions> | null): SecurityPermissions {
  return {
    canVerifyTicket: input?.canVerifyTicket ?? true,
    canConfirmEntry: input?.canConfirmEntry ?? true,
  };
}

export async function getSecurityPermissions(userId: number): Promise<SecurityPermissions> {
  const raw = await getSetting(securityPermissionSettingKey(userId));
  if (!raw?.value) {
    return normalizeSecurityPermissions();
  }

  try {
    return normalizeSecurityPermissions(JSON.parse(raw.value) as Partial<SecurityPermissions>);
  } catch {
    return normalizeSecurityPermissions();
  }
}

export async function setSecurityPermissions(userId: number, permissions: Partial<SecurityPermissions>) {
  const normalized = normalizeSecurityPermissions(permissions);
  await query(
    `INSERT INTO settings ("key", value, created_at, updated_at)
     VALUES (?, ?, NOW(), NOW())
     ON CONFLICT ("key")
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [securityPermissionSettingKey(userId), JSON.stringify(normalized)]
  );
}

export async function clearSecurityPermissions(userId: number) {
  await query('DELETE FROM settings WHERE "key" = ?', [securityPermissionSettingKey(userId)]);
}

export async function listSecurityPermissions() {
  const rows = await query<{ key: string; value: string | null }>(
    'SELECT "key", value FROM settings WHERE "key" LIKE ?',
    ['security:%:permissions']
  );

  const permissions = new Map<number, SecurityPermissions>();
  for (const row of rows) {
    const match = row.key.match(/^security:(\d+):permissions$/);
    if (!match) continue;
    const userId = Number(match[1]);
    try {
      permissions.set(userId, normalizeSecurityPermissions(row.value ? JSON.parse(row.value) as Partial<SecurityPermissions> : null));
    } catch {
      permissions.set(userId, normalizeSecurityPermissions());
    }
  }
  return permissions;
}

export async function userHasSecurityPermission(userId: number, action: keyof SecurityPermissions) {
  const permissions = await getSecurityPermissions(userId);
  return permissions[action];
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

export async function createAdminUser(input: {
  name: string;
  email: string;
  mobile?: string | null;
  password: string;
  role: Exclude<AdminRole, 'super_admin' | 'customer'>;
  arenaId?: number | null;
  securityPermissions?: Partial<SecurityPermissions>;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = await queryOne<{ id: number }>(
    `INSERT INTO users (name, email, customer_mobile, password, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
     RETURNING id`,
    [input.name, input.email, input.mobile ?? null, passwordHash, input.role]
  );

  if (!created) {
    throw new Error('Failed to create user.');
  }

  await setArenaAssignment(created.id, input.role, input.arenaId ?? null);

  if (input.role === 'security') {
    await setSecurityPermissions(created.id, input.securityPermissions ?? {});
  } else {
    await clearSecurityPermissions(created.id);
  }

  return created.id;
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

    if (request.request_type === 'timing_update') {
      const timing = payload as { arena_id: number; time_slot: string; start_time: string; end_time: string; day_of_week?: number };
      await query(
        `INSERT INTO slot_timings (arena_id, time_slot, start_time, end_time, day_of_week, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [timing.arena_id, timing.time_slot, timing.start_time, timing.end_time, timing.day_of_week ?? null]
      );
      await createAdminAuditLog({
        action: 'timing_update_approved',
        actorUserId: input.decisionBy,
        arenaId: request.arena_id,
        entityType: 'approval_request',
        entityId: request.id,
        afterData: payload,
      });
    }

    if (request.request_type === 'image_update') {
      const imagePayload = payload as { arena_id: number; cover_image?: string; logo_url?: string };
      const updates = [];
      const values = [];
      
      if (imagePayload.cover_image) {
        updates.push('cover_image = ?');
        values.push(imagePayload.cover_image);
      }
      if (imagePayload.logo_url) {
        updates.push('logo_url = ?');
        values.push(imagePayload.logo_url);
      }

      if (updates?.length > 0) {
        values.push(imagePayload.arena_id || request.arena_id);
        await query(
          `UPDATE arenas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          values
        );
      }

      await createAdminAuditLog({
        action: 'image_update_approved',
        actorUserId: input.decisionBy,
        arenaId: request.arena_id,
        entityType: 'approval_request',
        entityId: request.id,
        afterData: payload,
      });
    }

    if (request.request_type === 'admin_free_booking') {
      const arenaId = Number(payload.arenaId ?? request.arena_id ?? 0);
      const bookingDate = String(payload.bookingDate ?? '');
      const slots = Array.isArray(payload.slots) ? (payload.slots as string[]) : [];
      if (!arenaId || !bookingDate || slots?.length === 0) {
        throw new Error('Approval request is missing booking details.');
      }

      const booking = await createBookingBatch({
        arenaId,
        bookingDate,
        slots,
        customerName: String(payload.customerName ?? 'Guest'),
        customerMobile: String(payload.customerMobile ?? ''),
        customerEmail: payload.customerEmail ? String(payload.customerEmail) : null,
        userId: null,
        sessionId: `approval-${request.id}`,
        freeBooking: true,
      });

      await sendTicketEmail(booking.bookingRef);

      await createAdminAuditLog({
        action: 'admin_free_booking_approved',
        actorUserId: input.decisionBy,
        arenaId,
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
