/**
 * Comprehensive Unit Tests for Super Admin Features
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { signValue } from '../../lib/session';

const BASE_URL = (process.env.BASE_URL && process.env.BASE_URL.startsWith('http'))
  ? process.env.BASE_URL
  : 'http://localhost:3001';

async function getSuperAdminCookie() {
  return `fg_auth_role=${await signValue('super_admin')}; fg_auth_user=${await signValue('1')}`;
}

async function getArenaAdminCookie(adminId = 1, arenaId = 1) {
  return `fg_auth_role=${await signValue('arena_admin')}; fg_auth_user=${await signValue(String(adminId))}; fg_arena_id=${await signValue(String(arenaId))}`;
}

class TestClient {
  async request(method: string, path: string, body: any = null, cookies = '') {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies }),
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }
}

let testClient: TestClient;
let testArenaId: any;
let testAdminId: any;

beforeAll(() => {
  testClient = new TestClient();
});

// Arena Management Tests
describe('Arena Management', () => {
  it('should create an arena', async () => {
    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/super-admin/arenas',
      {
        name: `Test Arena ${Date.now()}`,
        slug: `test-${Date.now()}`,
        address: '123 Test St',
      },
      cookie
    );

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    testArenaId = res.data.data?.id;
  });

  it('should fetch arenas', async () => {
    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'GET',
      '/api/fg-admin/super-admin/arenas',
      null,
      cookie
    );

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });

  it('should require auth for arena creation', async () => {
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/super-admin/arenas',
      { name: 'Test', slug: 'test' },
      ''
    );

    expect(res.status).toBe(401);
  });
});

// Admin Management Tests
describe('Admin Management', () => {
  it('should create an arena admin', async () => {
    if (!testArenaId) return;

    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/super-admin/admins',
      {
        arena_id: testArenaId,
        email: `admin-${Date.now()}@test.local`,
        name: 'Test Admin',
      },
      cookie
    );

    expect(res.ok).toBe(true);
    testAdminId = res.data.data?.id;
  });

  it('should fetch arena admins', async () => {
    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'GET',
      `/api/fg-admin/super-admin/admins?arena_id=${testArenaId || 1}`,
      null,
      cookie
    );

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});

// Security Management Tests
describe('Security Management', () => {
  it('should create security staff', async () => {
    if (!testArenaId) return;

    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/super-admin/security',
      {
        arena_id: testArenaId,
        email: `security-${Date.now()}@test.local`,
        name: 'Test Security',
        phone: '9876543210',
        permissions: ['verify_ticket'],
      },
      cookie
    );

    expect(res.ok).toBe(true);
  });

  it('should fetch security staff', async () => {
    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'GET',
      `/api/fg-admin/super-admin/security?arena_id=${testArenaId || 1}`,
      null,
      cookie
    );

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});

// Timing/Slot Management Tests
describe('Timing Management', () => {
  it('should create a time slot', async () => {
    if (!testArenaId) return;

    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/super-admin/arenas/timings',
      {
        arena_id: testArenaId,
        time_slot: 'Morning 09:00-10:00',
        start_time: '09:00',
        end_time: '10:00',
      },
      cookie
    );

    expect(res.ok).toBe(true);
  });

  it('should fetch time slots', async () => {
    const cookie = await getSuperAdminCookie();
    const res = await testClient.request(
      'GET',
      `/api/fg-admin/super-admin/arenas/timings?arena_id=${testArenaId || 1}`,
      null,
      cookie
    );

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});

// Approval Workflow Tests
describe('Approval Workflow', () => {
  it('arena admin should request approval', async () => {
    if (!testAdminId) return;

    const cookie = await getArenaAdminCookie(testAdminId, testArenaId || 1);
    const res = await testClient.request(
      'POST',
      '/api/fg-admin/arena/bookings/request-approval',
      {
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        time_slot: 'Evening 18:00-19:00',
        number_of_rounds: 1,
        reason: 'Free event',
      },
      cookie
    );

    expect(res.ok).toBe(true);
  });

  it('arena admin should view approval requests', async () => {
    if (!testAdminId) return;

    const cookie = await getArenaAdminCookie(testAdminId, testArenaId || 1);
    const res = await testClient.request(
      'GET',
      '/api/fg-admin/arena/bookings/request-approval',
      null,
      cookie
    );

    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});

// Authorization Tests
describe('Authorization', () => {
  it('should deny unauthorized requests', async () => {
    const res = await testClient.request(
      'GET',
      '/api/fg-admin/super-admin/arenas',
      null,
      ''
    );

    expect(res.status).toBe(401);
  });
});
