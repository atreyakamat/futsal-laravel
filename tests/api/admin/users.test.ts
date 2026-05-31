import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/admin/users/create/route';
import * as domain from '@/lib/domain';
import * as admin from '@/lib/admin';

// Mock Next.js Request and Response
const mockRequest = (body: any) => ({
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
} as unknown as Request);

// Mock the dependencies
vi.mock('@/lib/session', () => ({
  readAuthUserId: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/admin', () => ({
  getAdminContext: vi.fn().mockResolvedValue({ id: 1, role: 'super_admin' }),
  createAdminAuditLog: vi.fn(),
  setArenaAssignment: vi.fn(),
}));

vi.mock('@/lib/domain', () => ({
  query: vi.fn(),
}));

describe('POST /api/admin/users/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if not super_admin', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 2, role: 'admin' } as any);
    const req = mockRequest({ name: 'Test', email: 'test@test.com', password: 'password', role: 'admin' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should return 400 if user already exists', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 1, role: 'super_admin' } as any);
    vi.mocked(domain.query).mockResolvedValueOnce([{ id: 99 }] as any); // existing user
    const req = mockRequest({ name: 'Test', email: 'test@test.com', password: 'password', role: 'admin' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('User already exists');
  });

  it('should create user and assign arena if super_admin', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 1, role: 'super_admin' } as any);
    vi.mocked(domain.query)
      .mockResolvedValueOnce([] as any) // existing user check
      .mockResolvedValueOnce([{ id: 100 }] as any); // insert returning id

    const req = mockRequest({ 
      name: 'New Admin', 
      email: 'newadmin@test.com', 
      password: 'password123', 
      role: 'admin',
      arena_id: '5'
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBe(100);

    expect(admin.setArenaAssignment).toHaveBeenCalledWith(100, 'admin', 5);
    expect(admin.createAdminAuditLog).toHaveBeenCalled();
  });
});
