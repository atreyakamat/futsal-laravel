import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/admin/arenas/[id]/route';
import * as admin from '@/lib/admin';
import * as domain from '@/lib/domain';

const mockRequest = () => ({
  headers: new Headers({ 'content-type': 'application/json' }),
} as unknown as Request);

vi.mock('@/lib/session', () => ({
  readAuthUserId: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/admin', () => ({
  getAdminContext: vi.fn(),
  createAdminAuditLog: vi.fn(),
}));

vi.mock('@/lib/domain', () => ({
  query: vi.fn(),
}));

describe('DELETE /api/admin/arenas/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if not super_admin', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 2, role: 'admin' } as any);
    const res = await DELETE(mockRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(403);
  });

  it('should return 404 if arena does not exist', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 1, role: 'super_admin' } as any);
    vi.mocked(domain.query).mockResolvedValueOnce([] as any); // no arena
    const res = await DELETE(mockRequest(), { params: Promise.resolve({ id: '99' }) });
    expect(res.status).toBe(404);
  });

  it('should delete arena if super_admin', async () => {
    vi.mocked(admin.getAdminContext).mockResolvedValueOnce({ id: 1, role: 'super_admin' } as any);
    vi.mocked(domain.query)
      .mockResolvedValueOnce([{ id: 1 }] as any) // check exists
      .mockResolvedValueOnce([] as any); // delete

    const res = await DELETE(mockRequest(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    expect(domain.query).toHaveBeenCalledWith('DELETE FROM arenas WHERE id = ?', [1]);
  });
});
