/**
 * Regression guard for lib/admin.ts's hasArenaAccess — the authorization
 * boundary added 2026-08-31 after auditing for cross-arena privilege
 * escalation once arena_admin gained the ability to be scoped to a SUBSET
 * of turfs (rather than only "one turf" via Manager, or "every turf" via
 * platform-wide arena_admin). See prisma/migrations/
 * 20260831000000_arena_manager_multi_turf.
 */
import { describe, it, expect } from 'vitest';
import { hasArenaAccess } from '@/lib/admin';

const base = { arenaId: null as number | null, assignedArenaIds: [] as number[] };

describe('hasArenaAccess', () => {
  it('super_admin can act on any arena, including one they have no explicit assignment to', () => {
    expect(hasArenaAccess({ ...base, role: 'super_admin' }, 5)).toBe(true);
    expect(hasArenaAccess({ ...base, role: 'super_admin' }, 999)).toBe(true);
  });

  it('platform-wide arena_admin (no assignments) can act on any arena', () => {
    expect(hasArenaAccess({ ...base, role: 'arena_admin', assignedArenaIds: [] }, 5)).toBe(true);
    expect(hasArenaAccess({ ...base, role: 'arena_admin', assignedArenaIds: [] }, 999)).toBe(true);
  });

  it('a scoped arena_admin can only act on their assigned turf(s)', () => {
    const scoped = { ...base, role: 'arena_admin' as const, assignedArenaIds: [3, 7] };
    expect(hasArenaAccess(scoped, 3)).toBe(true);
    expect(hasArenaAccess(scoped, 7)).toBe(true);
    expect(hasArenaAccess(scoped, 4)).toBe(false);
    expect(hasArenaAccess(scoped, 999)).toBe(false);
  });

  it('a Manager can only act on their own single arena', () => {
    expect(hasArenaAccess({ ...base, role: 'manager', arenaId: 3 }, 3)).toBe(true);
    expect(hasArenaAccess({ ...base, role: 'manager', arenaId: 3 }, 4)).toBe(false);
  });

  it('security can only act on their own single arena', () => {
    expect(hasArenaAccess({ ...base, role: 'security', arenaId: 3 }, 3)).toBe(true);
    expect(hasArenaAccess({ ...base, role: 'security', arenaId: 3 }, 4)).toBe(false);
  });

  it('accountant (not arena-scoped at all) is denied for every arena', () => {
    expect(hasArenaAccess({ ...base, role: 'accountant' }, 3)).toBe(false);
  });

  it('a null/undefined target arena is always denied, even for super_admin', () => {
    expect(hasArenaAccess({ ...base, role: 'super_admin' }, null)).toBe(false);
    expect(hasArenaAccess({ ...base, role: 'super_admin' }, undefined)).toBe(false);
  });
});
