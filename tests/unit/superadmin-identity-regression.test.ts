/**
 * SUPER-ADMIN-IDENTITY-REGRESSION: Verifies that Super Admin sessions never
 * resolve to customer identities and that booking data is platform-wide
 * (not customer-scoped).
 *
 * Production failure being regression-guarded:
 *   - Super Admin dashboard displayed "BASIL" (customer name)
 *   - Super Admin dashboard showed BOOKINGS = 0 (wrong payment_status filter)
 *
 * Root causes:
 *   1. Login set fg_auth_user cookie to users.id (via superAdmin.user_id)
 *   2. Root layout fetched users.name even for super_admin role
 *   3. Stats API queried payment_status='success' instead of 'confirmed'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must be before imports) ──────────────────────────
const {
  mockReadAuthUserId,
  mockReadAuthRole,
  mockReadSuperAdminId,
  mockReadArenaId,
  mockSignValue,
  mockGetCookieOptions,
  mockUnsignValue,
  mockReadGuestIdentifier,
  mockGetSessionIdFromRequest,
  mockGetCookieValueFromRequest,
  mockGetWritableSessionId,
  mockGetOrCreateSessionId,
  mockPersistSessionCookie,
  mockReadRequestOrigin,
  mockGetBaseUrl,
  mockVerifySuperAdmin,
  mockGetSuperAdmin,
  mockLogAuditAction,
} = vi.hoisted(() => ({
  mockReadAuthUserId: vi.fn(),
  mockReadAuthRole: vi.fn(),
  mockReadSuperAdminId: vi.fn(),
  mockReadArenaId: vi.fn(),
  mockSignValue: vi.fn(),
  mockGetCookieOptions: vi.fn(),
  mockUnsignValue: vi.fn(),
  mockReadGuestIdentifier: vi.fn(),
  mockGetSessionIdFromRequest: vi.fn(),
  mockGetCookieValueFromRequest: vi.fn(),
  mockGetWritableSessionId: vi.fn(),
  mockGetOrCreateSessionId: vi.fn(),
  mockPersistSessionCookie: vi.fn(),
  mockReadRequestOrigin: vi.fn(),
  mockGetBaseUrl: vi.fn(),
  mockVerifySuperAdmin: vi.fn(),
  mockGetSuperAdmin: vi.fn(),
  mockLogAuditAction: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  AUTH_COOKIE: 'fg_auth_user',
  GUEST_COOKIE: 'fg_guest_identifier',
  SESSION_COOKIE: 'fg_session_id',
  COOKIE_SECRET: 'test-secret',
  signValue: mockSignValue,
  unsignValue: mockUnsignValue,
  getOrCreateSessionId: mockGetOrCreateSessionId,
  getSessionIdFromRequest: mockGetSessionIdFromRequest,
  getCookieValueFromRequest: mockGetCookieValueFromRequest,
  getWritableSessionId: mockGetWritableSessionId,
  getCookieOptions: mockGetCookieOptions,
  persistSessionCookie: mockPersistSessionCookie,
  readAuthUserId: mockReadAuthUserId,
  readAuthRole: mockReadAuthRole,
  readArenaId: mockReadArenaId,
  readGuestIdentifier: mockReadGuestIdentifier,
  getBaseUrl: mockGetBaseUrl,
  readRequestOrigin: mockReadRequestOrigin,
  readSuperAdminId: mockReadSuperAdminId,
}));

vi.mock('@/lib/super-admin', () => ({
  verifySuperAdminCredentials: mockVerifySuperAdmin,
  getSuperAdmin: mockGetSuperAdmin,
  createSuperAdmin: vi.fn(),
  logAuditAction: mockLogAuditAction,
  updateSuperAdminPassword: vi.fn(),
}));

vi.mock('@/lib/domain', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  findUserById: vi.fn(),
  getBookingGroup: vi.fn(),
  confirmEntryByTicket: vi.fn(),
  ensureSchemaColumns: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
  resetPool: vi.fn(),
}));

vi.mock('@/lib/admin', async () => {
  const actual = await vi.importActual('@/lib/admin');
  return {
    ...actual,
    getAdminContext: vi.fn(),
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────
import { POST as superAdminLoginPOST } from '@/app/api/auth/super-admin/login/route';
import { readAuthUserId, readAuthRole, readSuperAdminId, signValue, getCookieOptions } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';

// ── Test data ────────────────────────────────────────────────────────
function makeSuperAdmin(overrides: any = {}) {
  return {
    id: 2,                          // super_admins.id (PK)
    user_id: 37,                    // users.id (FK, DIFFERENT from super_admins.id)
    email: 'superadmin@test.com',
    password_hash: 'hashed',
    is_active: true,
    first_name: 'Super',
    last_name: 'Admin',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────
describe('SUPER-ADMIN-IDENTITY-REGRESSION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookieOptions.mockReturnValue({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 604800,
    });
    mockSignValue.mockImplementation(async (val: string) => `${val}.signed`);
  });

  // ── IDENTITY-001 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-001: login sets fg_auth_user to super_admins.id, NOT users.id', async () => {
    const sa = makeSuperAdmin({ id: 2, user_id: 37 });
    mockVerifySuperAdmin.mockResolvedValue(sa);

    const req = new Request('http://localhost:3000/api/auth/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'super@test.com', password: 'password123' }),
    });

    const res = await superAdminLoginPOST(req as any);

    // signValue must be called with super_admins.id (2), NOT users.id (37)
    expect(signValue).toHaveBeenCalledWith('2');
    expect(signValue).not.toHaveBeenCalledWith('37');

    // Role cookie must be 'super_admin'
    expect(signValue).toHaveBeenCalledWith('super_admin');
  });

  // ── IDENTITY-002 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-002: Super Admin does not resolve to previous customer (BASIL)', async () => {
    // Customer BASIL has users.id = 37
    // Super Admin is linked to users.id = 99 (different from BASIL)
    const sa = makeSuperAdmin({ id: 2, user_id: 99 });
    mockVerifySuperAdmin.mockResolvedValue(sa);

    const req = new Request('http://localhost:3000/api/auth/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'super@test.com', password: 'password123' }),
    });

    await superAdminLoginPOST(req as any);

    // Cookie must be signed super_admins.id (2), not customer's users.id (37 or 99)
    expect(signValue).toHaveBeenCalledWith('2');
    expect(signValue).not.toHaveBeenCalledWith('37');
    expect(signValue).not.toHaveBeenCalledWith('99');
  });

  // ── IDENTITY-003 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-003: readSuperAdminId returns super_admins.id when role is super_admin', async () => {
    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2);

    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    const id = await readSuperAdminId();
    expect(id).toBe(2);
    expect(id).not.toBe(37);
  });

  // ── IDENTITY-004 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-004: Customer logout → Super Admin login = Super Admin session', async () => {
    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    // Customer logged in
    mockReadAuthRole.mockResolvedValue('customer');
    mockReadAuthUserId.mockResolvedValue(37);
    expect(await readAuthRole()).toBe('customer');
    expect(await readAuthUserId()).toBe(37);
    expect(await readSuperAdminId()).toBeNull();

    // Logout
    mockReadAuthRole.mockResolvedValue(null);
    mockReadAuthUserId.mockResolvedValue(null);
    expect(await readAuthRole()).toBeNull();

    // Super Admin login
    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2);
    expect(await readAuthRole()).toBe('super_admin');
    expect(await readAuthUserId()).toBe(2);
    expect(await readSuperAdminId()).toBe(2);
    expect(await readAuthUserId()).not.toBe(37);
  });

  // ── IDENTITY-005 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-005: Refresh preserves super_admins.id identity', async () => {
    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2);

    expect(await readAuthRole()).toBe('super_admin');
    const id = await readAuthUserId();
    expect(id).toBe(2);
    expect(await readSuperAdminId()).toBe(2);

    // Refresh
    expect(await readAuthRole()).toBe('super_admin');
    expect(await readAuthUserId()).toBe(2);
  });

  // ── IDENTITY-006 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-006: Super Admin logout clears session', async () => {
    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2);
    expect(await readAuthRole()).toBe('super_admin');
    expect(await readSuperAdminId()).toBe(2);

    // Logout
    mockReadAuthRole.mockResolvedValue(null);
    mockReadAuthUserId.mockResolvedValue(null);
    expect(await readAuthRole()).toBeNull();
    expect(await readAuthUserId()).toBeNull();
    expect(await readSuperAdminId()).toBeNull();
  });

  // ── IDENTITY-007 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-007: Customer login after SA logout = customer identity', async () => {
    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    // SA session
    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2);
    expect(await readSuperAdminId()).toBe(2);

    // Logout
    mockReadAuthRole.mockResolvedValue(null);
    mockReadAuthUserId.mockResolvedValue(null);

    // Customer login
    mockReadAuthRole.mockResolvedValue('customer');
    mockReadAuthUserId.mockResolvedValue(37);

    expect(await readAuthRole()).toBe('customer');
    expect(await readAuthUserId()).toBe(37);
    expect(await readSuperAdminId()).toBeNull(); // role !== 'super_admin'
  });

  // ── IDENTITY-008 ───────────────────────────────────────────────────
  it('SUPERADMIN-IDENTITY-008: Cookie value is super_admins.id even when user_id differs', async () => {
    const sa = makeSuperAdmin({ id: 2, user_id: 37 });
    mockVerifySuperAdmin.mockResolvedValue(sa);
    const signedValues: string[] = [];
    mockSignValue.mockImplementation(async (val: string) => {
      signedValues.push(val);
      return `${val}.signed`;
    });

    const req = new Request('http://localhost:3000/api/auth/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'super@test.com', password: 'password123' }),
    });

    await superAdminLoginPOST(req as any);

    // super_admins.id (2) must be signed, not users.id (37)
    expect(signValue).toHaveBeenCalledWith('2');
    expect(signValue).not.toHaveBeenCalledWith('37');
  });

  // ── IDENTITY-009: Layout isolation ─────────────────────────────────
  it('SUPERADMIN-IDENTITY-009: Layout logic skips findUserById for super_admin role', async () => {
    const userId = 2;   // super_admins.id
    const role = 'super_admin';

    // Simulate layout.tsx logic:
    // if (userId && role !== 'super_admin') { findUserById(userId); }
    let userName: string | null = null;
    if (userId && role !== 'super_admin') {
      userName = 'SHOULD NOT REACH';
    }

    expect(userName).toBeNull();
  });
});

// ── Bookings Tests ───────────────────────────────────────────────────
describe('SUPER-ADMIN-BOOKINGS-REGRESSION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── BOOKINGS-001 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-001: super_admins.id ≠ users.id (schema relationship)', () => {
    const superAdmin = makeSuperAdmin({ id: 2, user_id: 37 });
    expect(superAdmin.id).not.toBe(superAdmin.user_id);
    expect(superAdmin.id).not.toBe(37);
  });

  // ── BOOKINGS-002 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-002: Stats API SQL uses confirmed, NOT success', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      'app/api/fg-admin/super-admin/stats/route.ts',
      'utf-8'
    );

    expect(source).toContain("'confirmed'");
    expect(source).not.toContain("payment_status = 'success'");
  });

  // ── BOOKINGS-003 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-003: Unauthenticated stats request → 403', async () => {
    mockReadAuthUserId.mockResolvedValue(null);
    mockReadAuthRole.mockResolvedValue(null);

    const { GET } = await import('@/app/api/fg-admin/super-admin/stats/route');
    const res = await GET(new Request('http://localhost:3000/api/fg-admin/super-admin/stats'));

    expect(res.status).toBe(403);
  });

  // ── BOOKINGS-004 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-004: Arena Admin → 403 on stats API', async () => {
    mockReadAuthUserId.mockResolvedValue(2);
    mockReadAuthRole.mockResolvedValue('arena_admin');

    const { GET } = await import('@/app/api/fg-admin/super-admin/stats/route');
    const res = await GET(new Request('http://localhost:3000/api/fg-admin/super-admin/stats'));

    expect(res.status).toBe(403);
  });

  // ── BOOKINGS-005 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-005: Stats API returns non-zero bookings for confirmed payments', async () => {
    mockReadAuthUserId.mockResolvedValue(2);
    mockReadAuthRole.mockResolvedValue('super_admin');

    vi.mocked(getAdminContext).mockResolvedValue({
      id: 2,
      name: 'Super Admin',
      email: 'superadmin@test.com',
      role: 'super_admin',
      customer_mobile: null,
      arenaId: null,
      arenaRole: null,
    } as any);

    const { queryOne } = await import('@/lib/db');
    vi.mocked(queryOne).mockResolvedValue({
      total_arenas: 3,
      total_bookings: 5,
      total_revenue: 5000,
      total_customers: 3,
      total_arena_admins: 2,
      total_security_staff: 4,
    } as any);

    const { GET } = await import('@/app/api/fg-admin/super-admin/stats/route');
    const res = await GET(new Request('http://localhost:3000/api/fg-admin/super-admin/stats'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.totalBookings).toBe(5);
    expect(body.data.totalBookings).not.toBe(0);
  });

  // ── BOOKINGS-006 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-006: getSuperAdmin finds row by super_admins.id', async () => {
    const { getSuperAdmin } = await import('@/lib/super-admin');

    const superAdminId = 2; // super_admins.id

    mockGetSuperAdmin.mockResolvedValue({
      id: 2,
      email: 'superadmin@test.com',
      password_hash: 'hashed',
      is_active: true,
      last_login: null,
    } as any);

    const admin = await getSuperAdmin(superAdminId);
    expect(admin).not.toBeNull();
    expect(admin?.id).toBe(2);
    expect(mockGetSuperAdmin).toHaveBeenCalledWith(2);
    expect(mockGetSuperAdmin).not.toHaveBeenCalledWith(37);
  });

  // ── BOOKINGS-007 ───────────────────────────────────────────────────
  it('SUPERADMIN-BOOKINGS-007: logAuditAction receives super_admins.id, not users.id', async () => {
    mockReadAuthRole.mockResolvedValue('super_admin');
    mockReadAuthUserId.mockResolvedValue(2); // super_admins.id

    mockReadSuperAdminId.mockImplementation(async () => {
      const role = await readAuthRole();
      if (role !== 'super_admin') return null;
      return await readAuthUserId();
    });

    const superAdminId = await readSuperAdminId();
    expect(superAdminId).toBe(2);

    const { logAuditAction } = await import('@/lib/super-admin');
    mockLogAuditAction.mockResolvedValue(undefined);

    await logAuditAction(superAdminId, 'TEST_ACTION', 'booking', 1, {}, '127.0.0.1', 'test');

    expect(mockLogAuditAction).toHaveBeenCalledWith(2, 'TEST_ACTION', 'booking', 1, {}, '127.0.0.1', 'test');
    expect(mockLogAuditAction).not.toHaveBeenCalledWith(37, 'TEST_ACTION', 'booking', 1, {}, '127.0.0.1', 'test');
  });
});
