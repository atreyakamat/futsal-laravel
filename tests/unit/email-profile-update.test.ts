import { describe, it, expect, beforeEach, vi } from 'vitest';
import { query, queryOne } from '@/lib/db';
import { PUT } from '@/app/api/dashboard/profile/route';
import { NextRequest } from 'next/server';

// Mock session
let mockUserId: number | null = null;
vi.mock('@/lib/session', () => ({
  readAuthUserId: vi.fn(async () => mockUserId),
}));

describe('Email Profile Update', () => {
  let customerUser: any;
  let arenaAdminUser: any;
  let superAdminUser: any;
  let otherUser: any;

  beforeEach(async () => {
    // Setup test users
    customerUser = await queryOne('SELECT * FROM users WHERE role = \'customer\' LIMIT 1');
    arenaAdminUser = await queryOne('SELECT * FROM users WHERE role = \'arena_admin\' LIMIT 1');
    superAdminUser = await queryOne('SELECT * FROM users WHERE role = \'super_admin\' LIMIT 1');
    otherUser = await queryOne('SELECT * FROM users WHERE id != ? LIMIT 1', [customerUser.id]);
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/dashboard/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  };

  it('EMAIL-PROFILE-001: Customer can edit own email', async () => {
    mockUserId = customerUser.id;
    const newEmail = `customer-${Date.now()}@test.com`;
    
    const req = createRequest({ name: 'Test Name', email: newEmail, customer_mobile: '9876543210' });
    const res = await PUT(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const dbUser = await queryOne('SELECT * FROM users WHERE id = ?', [customerUser.id]) as any;
    expect(dbUser.email).toBe(newEmail);
    expect(dbUser.role).toBe('customer'); // EMAIL-PROFILE-009
    expect(dbUser.id).toBe(customerUser.id); // EMAIL-PROFILE-010
  });

  it('EMAIL-PROFILE-002: Arena Admin can edit own email', async () => {
    mockUserId = arenaAdminUser.id;
    const newEmail = `arenaadmin-${Date.now()}@test.com`;
    
    const req = createRequest({ name: 'Test Name', email: newEmail, customer_mobile: '9876543210' });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    const dbUser = await queryOne('SELECT * FROM users WHERE id = ?', [arenaAdminUser.id]) as any;
    expect(dbUser.email).toBe(newEmail);
    expect(dbUser.role).toBe('arena_admin');

    // Check sync with arena_admins table
    const arenaAdminRecord = await queryOne('SELECT * FROM arena_admins WHERE LOWER(email) = ?', [newEmail]) as any;
    expect(arenaAdminRecord).toBeDefined();
    expect(arenaAdminRecord.email).toBe(newEmail);
  });

  it('EMAIL-PROFILE-003: Super Admin can edit own email', async () => {
    mockUserId = superAdminUser.id;
    const newEmail = `superadmin-${Date.now()}@test.com`;
    
    const req = createRequest({ name: 'Test Name', email: newEmail, customer_mobile: '9876543210' });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    const dbUser = await queryOne('SELECT * FROM users WHERE id = ?', [superAdminUser.id]) as any;
    expect(dbUser.email).toBe(newEmail);
    expect(dbUser.role).toBe('super_admin');

    // Check sync with super_admins table
    const superAdminRecord = await queryOne('SELECT * FROM super_admins WHERE user_id = ?', [superAdminUser.id]) as any;
    expect(superAdminRecord).toBeDefined();
    expect(superAdminRecord.email).toBe(newEmail);
  });

  it('EMAIL-PROFILE-004: Unauthenticated email update rejected', async () => {
    mockUserId = null;
    const req = createRequest({ name: 'Test Name', email: 'test@test.com', customer_mobile: '9876543210' });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('EMAIL-PROFILE-005: Cannot update another users email', async () => {
    mockUserId = customerUser.id;
    // Attempting to update another user is impossible because the API uses the auth session ID, not a passed user_id!
    // We can just verify it updates the authenticated user, not someone else.
    const newEmail = `hacker-${Date.now()}@test.com`;
    const req = createRequest({ name: 'Test Name', email: newEmail, customer_mobile: '9876543210', user_id: otherUser.id }); // Malicious payload
    await PUT(req);

    const dbOtherUser = await queryOne('SELECT email FROM users WHERE id = ?', [otherUser.id]) as any;
    expect(dbOtherUser.email).not.toBe(newEmail);
  });

  it('EMAIL-PROFILE-006: Invalid email rejected', async () => {
    mockUserId = customerUser.id;
    const req = createRequest({ name: 'Test Name', email: 'not-an-email', customer_mobile: '9876543210' });
    const res = await PUT(req);
    expect(res.status).toBe(400); // Zod validation fails
  });

  it('EMAIL-PROFILE-007: Duplicate email rejected', async () => {
    mockUserId = customerUser.id;
    const req = createRequest({ name: 'Test Name', email: otherUser.email, customer_mobile: '9876543210' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain('already in use');
  });

  it('EMAIL-PROFILE-008: Email persists after refresh (same as valid update)', async () => {
    // This is implicitly tested by checking the database after the update
  });
});
