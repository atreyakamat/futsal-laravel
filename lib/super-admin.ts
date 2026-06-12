import { query, queryOne } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

/**
 * Create a new super admin
 */
export async function createSuperAdmin(email: string, password: string, permissions: string[] = []) {
  const existingSuperAdmin = await queryOne<{ id: number }>(
    'SELECT id FROM super_admins WHERE email = ?',
    [email]
  );

  if (existingSuperAdmin) {
    throw new Error('Super admin with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await query(
    'INSERT INTO super_admins (email, password_hash, permissions, is_active, created_at, updated_at) VALUES (?, ?, ?, true, NOW(), NOW())',
    [email, hashedPassword, JSON.stringify(permissions?.length > 0 ? permissions : ['*'])]
  );

  return { id: 1, email, permissions: permissions?.length > 0 ? permissions : ['*'] };
}

/**
 * Verify super admin credentials
 */
export async function verifySuperAdminCredentials(email: string, password: string) {
  const superAdmin = await queryOne<{ id: number; email: string; password_hash: string; is_active: boolean }>(
    'SELECT id, email, password_hash, is_active FROM super_admins WHERE email = ?',
    [email]
  );

  if (!superAdmin) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, superAdmin.password_hash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await query(
    'UPDATE super_admins SET last_login = NOW() WHERE id = ?',
    [superAdmin.id]
  );

  return superAdmin;
}

/**
 * Get super admin by ID
 */
export async function getSuperAdmin(id: number) {
  return queryOne<{ id: number; email: string; password_hash: string; is_active: boolean; last_login: string | null }>(
    'SELECT id, email, password_hash, is_active, last_login FROM super_admins WHERE id = ?',
    [id]
  );
}

/**
 * Update super admin password
 */
export async function updateSuperAdminPassword(id: number, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query(
    'UPDATE super_admins SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [hashedPassword, id]
  );

  return { id, email: 'updated' };
}

/**
 * Create an arena admin for a specific arena
 */
export async function createArenaAdmin(
  arenaId: number,
  name: string,
  email: string,
  phone?: string,
  createdById?: number
) {
  // First, check if user already exists in unified users table
  const existingUser = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Insert into unified users table
  const userResult = await query(
    'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) RETURNING id',
    [name, email, hashedPassword, 'arena_admin']
  );
  
  const userId = (userResult && (userResult as any)?.length > 0) ? (userResult as any)[0].id : null;
  if (!userId) throw new Error('Failed to create user record');

  // Assign to arena in arena_managers
  await query(
    'INSERT INTO arena_managers (user_id, arena_id, role, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [userId, arenaId, 'arena_admin']
  );

  // Maintain legacy arena_admins table for compatibility with super admin module if needed
  await query(
    'INSERT INTO arena_admins (id, arena_id, email, password_hash, first_name, last_name, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW())',
    [userId, arenaId, email, hashedPassword, name.split(' ')[0], name.split(' ')[1] || '', createdById || 1]
  );

  // Create a credential for the admin
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await query(
    'INSERT INTO admin_credentials (admin_id, admin_type, credential_token, is_used, expires_at, created_at) VALUES (?, ?, ?, false, ?, NOW())',
    [userId, 'arena_admin', tempPassword, expiresAt]
  );

  return {
    admin: { id: userId, arena_id: arenaId, email, name },
    credential: {
      email,
      tempPassword,
      message: 'Share these credentials with the admin. They must change password on first login.',
    },
  };
}

/**
 * Create security staff for an arena
 */
export async function createSecurityStaff(
  arenaId: number,
  name: string,
  email: string,
  phone?: string,
  permissions: string[] = [],
  createdById?: number
) {
  // First, check if user already exists in unified users table
  const existingUser = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-8) + 'S1!';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Insert into unified users table
  const userResult = await query(
    'INSERT INTO users (name, email, password, customer_mobile, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id',
    [name, email, hashedPassword, phone || null, 'security']
  );
  
  const userId = (userResult && (userResult as any)?.length > 0) ? (userResult as any)[0].id : null;
  if (!userId) throw new Error('Failed to create user record');

  // Assign to arena in arena_managers
  await query(
    'INSERT INTO arena_managers (user_id, arena_id, role, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [userId, arenaId, 'security']
  );

  // Maintain legacy security_staff table for compatibility
  await query(
    'INSERT INTO security_staff (id, arena_id, email, password_hash, first_name, last_name, phone, permissions, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW())',
    [userId, arenaId, email, hashedPassword, name.split(' ')[0], name.split(' ')[1] || '', phone || null, permissions, createdById || 1]
  );

  // Create a credential for the security staff
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await query(
    'INSERT INTO admin_credentials (admin_id, admin_type, credential_token, is_used, expires_at, created_at) VALUES (?, ?, ?, false, ?, NOW())',
    [userId, 'security', tempPassword, expiresAt]
  );

  return {
    staff: { id: userId, arena_id: arenaId, email, name, permissions },
    credential: {
      email,
      tempPassword,
      permissions,
      message: 'Share these credentials with the security staff member. They must change password on first login.',
    },
  };
}

/**
 * Get all arena admins for an arena
 */
export async function getArenaAdmins(arenaId: number) {
  return query<{ id: number; email: string; first_name: string | null; last_name: string | null; is_active: boolean; created_at: string; last_login: string | null }>(
    'SELECT id, email, first_name, last_name, is_active, created_at, last_login FROM arena_admins WHERE arena_id = ? ORDER BY created_at DESC',
    [arenaId]
  );
}

/**
 * Get all security staff for an arena
 */
export async function getSecurityStaff(arenaId: number) {
  return query<{ id: number; email: string; first_name: string | null; last_name: string | null; phone: string | null; permissions: string; is_active: boolean; created_at: string; last_login: string | null }>(
    'SELECT id, email, first_name, last_name, phone, permissions, is_active, created_at, last_login FROM security_staff WHERE arena_id = ? ORDER BY created_at DESC',
    [arenaId]
  );
}

/**
 * Remove an arena admin
 */
export async function removeArenaAdmin(arenaId: number, adminId: number) {
  const admin = await queryOne<{ id: number; arena_id: number }>(
    'SELECT id, arena_id FROM arena_admins WHERE id = ?',
    [adminId]
  );

  if (!admin || admin.arena_id !== arenaId) {
    throw new Error('Arena admin not found');
  }

  await query(
    'UPDATE arena_admins SET is_active = false, updated_at = NOW() WHERE id = ?',
    [adminId]
  );

  return { id: adminId, is_active: false };
}

/**
 * Remove security staff
 */
export async function removeSecurityStaff(arenaId: number, staffId: number) {
  const staff = await queryOne<{ id: number; arena_id: number }>(
    'SELECT id, arena_id FROM security_staff WHERE id = ?',
    [staffId]
  );

  if (!staff || staff.arena_id !== arenaId) {
    throw new Error('Security staff not found');
  }

  await query(
    'UPDATE security_staff SET is_active = false, updated_at = NOW() WHERE id = ?',
    [staffId]
  );

  return { id: staffId, is_active: false };
}

/**
 * Create a slot approval request
 */
export async function createSlotApprovalRequest(
  arenaId: number,
  requestedById: number,
  bookingDate: string,
  timeSlot: string,
  reason?: string
) {
  await query(
    'INSERT INTO slot_approval_requests (arena_id, requested_by, request_type, booking_date, time_slot, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [arenaId, requestedById, 'block_slot', bookingDate, timeSlot, reason || null, 'pending']
  );

  return { id: 1, arena_id: arenaId };
}

/**
 * Get pending approval requests
 */
export async function getPendingApprovalRequests(arenaId?: number) {
  if (arenaId) {
    return query(
      'SELECT * FROM slot_approval_requests WHERE status = ? AND arena_id = ? ORDER BY created_at DESC',
      ['pending', arenaId]
    );
  }
  return query(
    'SELECT * FROM slot_approval_requests WHERE status = ? ORDER BY created_at DESC',
    ['pending']
  );
}

/**
 * Approve an approval request
 */
export async function approveApprovalRequest(requestId: number, approvedById: number) {
  // First, get the request details
  const request = await queryOne<any>(
    'SELECT * FROM approval_requests WHERE id = ? AND status = ?',
    [requestId, 'pending']
  );

  if (!request) {
    throw new Error('Approval request not found or already processed');
  }

  // Update status
  await query(
    'UPDATE approval_requests SET status = ?, decision_by = ?, decision_at = NOW(), applied_at = NOW(), updated_at = NOW() WHERE id = ?',
    ['approved', approvedById, requestId]
  );

  // Apply the changes based on request_type
  const payload = request.payload_json ? (typeof request.payload_json === 'string' ? JSON.parse(request.payload_json) : request.payload_json) : {};

  if (request.request_type === 'IMAGE_UPDATE' || request.request_type === 'ARENA_UPDATE') {
    const updates: string[] = [];
    const values: any[] = [];
    
    // Example: update arenas table dynamically based on payload
    Object.keys(payload).forEach(key => {
      updates.push(`${key} = ?`);
      values.push(payload[key]);
    });

    if (updates.length > 0 && request.arena_id) {
      values.push(request.arena_id);
      await query(
        `UPDATE arenas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }
  }

  return { id: requestId, status: 'approved' };
}

/**
 * Reject an approval request
 */
export async function rejectApprovalRequest(requestId: number, rejectionReason: string, rejectedById: number) {
  await query(
    'UPDATE approval_requests SET status = ?, decision_reason = ?, decision_by = ?, decision_at = NOW(), updated_at = NOW() WHERE id = ?',
    ['rejected', rejectionReason, rejectedById, requestId]
  );

  return { id: requestId, status: 'rejected' };
}

/**
 * Generate a report
 */
export async function generateReport(
  arenaId: number,
  reportType: 'daily' | 'weekly' | 'monthly',
  dateRangeStart: string,
  dateRangeEnd: string,
  generatedById: number
) {
  // Get bookings in the date range
  const bookings = await query<{ id: number; checked_in: boolean }>(
    'SELECT id, checked_in FROM bookings WHERE arena_id = ? AND booking_date BETWEEN ? AND ?',
    [arenaId, dateRangeStart, dateRangeEnd]
  );

  // Calculate statistics
  const totalBookings = bookings?.length || 0;
  const totalRevenue = 0;
  const checkedInCount = (bookings || []).filter((b) => b.checked_in)?.length || 0;
  const avgDuration = 0;

  await query(
    `INSERT INTO reports (arena_id, report_type, date_range_start, date_range_end, total_bookings, total_revenue, total_visitors, average_duration, report_data, created_by, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [arenaId, reportType, dateRangeStart, dateRangeEnd, totalBookings, totalRevenue, checkedInCount, avgDuration, JSON.stringify({}), generatedById]
  );

  return { id: 1, arena_id: arenaId, report_type: reportType };
}

/**
 * Get reports for an arena
 */
export async function getArenaReports(arenaId: number, limit: number = 10) {
  return query(
    'SELECT * FROM reports WHERE arena_id = ? ORDER BY created_at DESC LIMIT ?',
    [arenaId, limit]
  );
}

/**
 * Log a system audit action
 */
export async function logAuditAction(
  superAdminId: number,
  action: string,
  entityType: string,
  entityId?: number,
  changes?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  await query(
    'INSERT INTO system_audit_logs (super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [superAdminId, action, entityType, entityId || null, JSON.stringify(changes || {}), ipAddress || null, userAgent || null]
  );
}

/**
 * Get all system audit logs
 */
export async function getSystemAuditLogs(limit: number = 100) {
  return query(
    'SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

/**
 * Verify arena admin credentials
 */
export async function verifyArenaAdminCredentials(email: string, password: string) {
  const admin = await queryOne<{ id: number; email: string; password_hash: string; is_active: boolean; arena_id: number }>(
    'SELECT id, email, password_hash, is_active, arena_id FROM arena_admins WHERE email = ?',
    [email]
  );

  if (!admin || !admin.is_active) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, admin.password_hash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await query(
    'UPDATE arena_admins SET last_login = NOW() WHERE id = ?',
    [admin.id]
  );

  return admin;
}

/**
 * Verify security staff credentials
 */
export async function verifySecurityStaffCredentials(email: string, password: string) {
  const staff = await queryOne<{ id: number; email: string; password_hash: string; is_active: boolean; arena_id: number }>(
    'SELECT id, email, password_hash, is_active, arena_id FROM security_staff WHERE email = ?',
    [email]
  );

  if (!staff || !staff.is_active) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, staff.password_hash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await query(
    'UPDATE security_staff SET last_login = NOW() WHERE id = ?',
    [staff.id]
  );

  return staff;
}
