/**
 * DAILY-BOOKING-DIGEST: Verifies the reworked digest emails —
 *   - 8pm recap: today-only confirmed/cancelled/played counts, sent to
 *     super admins + platform-wide turf admins (consolidated) and each
 *     arena's managers (arena-scoped). Accountants receive nothing.
 *   - 5am morning list: today's detailed booking rows, managers only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateBookingRecapEmail,
  generateMorningBookingListEmail,
  DigestArenaCounts,
  DigestBookingRow,
} from '@/lib/email';

const { mockQuery, mockSendEmail, mockReportServerError } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockSendEmail: vi.fn(),
  mockReportServerError: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: mockQuery,
}));

vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email');
  return {
    ...actual,
    sendEmail: mockSendEmail,
  };
});

vi.mock('@/lib/error-log', () => ({
  reportServerError: mockReportServerError,
}));

describe('generateBookingRecapEmail', () => {
  it('DIGEST-TEMPLATE-001: consolidated "All Turfs" email includes a per-arena breakdown table', () => {
    const breakdown: DigestArenaCounts[] = [
      { arena_id: 1, arena_name: 'Turf A', confirmed: 5, cancelled: 1, played: 3 },
      { arena_id: 2, arena_name: 'Turf B', confirmed: 2, cancelled: 0, played: 2 },
    ];
    const email = generateBookingRecapEmail({
      scopeLabel: 'All Turfs',
      date: '2026-09-06',
      confirmed: 7,
      cancelled: 1,
      played: 5,
      arenaBreakdown: breakdown,
    });

    expect(email.subject).toContain('All Turfs');
    expect(email.subject).toContain('2026-09-06');
    expect(email.html).toContain('Turf A');
    expect(email.html).toContain('Turf B');
    expect(email.html).toContain('By Turf');
    expect(email.text).toContain('7 confirmed');
    expect(email.text).toContain('1 cancelled');
    expect(email.text).toContain('5 played');
  });

  it('DIGEST-TEMPLATE-002: single-arena email has no breakdown table', () => {
    const email = generateBookingRecapEmail({
      scopeLabel: 'Turf A',
      date: '2026-09-06',
      confirmed: 3,
      cancelled: 0,
      played: 1,
    });

    expect(email.html).not.toContain('By Turf');
    expect(email.subject).toContain('Turf A');
  });

  it('DIGEST-TEMPLATE-003: zero-bookings day still renders counts as 0', () => {
    const email = generateBookingRecapEmail({
      scopeLabel: 'Turf A',
      date: '2026-09-06',
      confirmed: 0,
      cancelled: 0,
      played: 0,
    });

    expect(email.text).toContain('0 confirmed');
  });
});

describe('generateMorningBookingListEmail', () => {
  it('DIGEST-TEMPLATE-004: lists every booking row with slot, customer, and amount', () => {
    const bookings: DigestBookingRow[] = [
      { arena_name: 'Turf A', time_slot: '06:00-07:00', customer_name: 'Jane', customer_mobile: '9999999999', amount: 1200 },
    ];
    const email = generateMorningBookingListEmail({
      scopeLabel: 'Turf A',
      date: '2026-09-06',
      bookings,
    });

    expect(email.html).toContain('06:00-07:00');
    expect(email.html).toContain('Jane');
    expect(email.html).toContain('9999999999');
    expect(email.html).toContain('1200.00');
    expect(email.text).toContain('1 bookings');
  });

  it('DIGEST-TEMPLATE-005: empty list renders a "no bookings" message instead of an empty table', () => {
    const email = generateMorningBookingListEmail({
      scopeLabel: 'Turf A',
      date: '2026-09-06',
      bookings: [],
    });

    expect(email.html).toContain('No confirmed bookings for today');
  });
});

describe('sendDailyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DIGEST-CRON-001: sends one consolidated email to super admins and turf admins, and a scoped email to each arena\'s managers — never to accountants', async () => {
    const { sendDailyDigest } = await import('@/lib/daily-digest-cron');

    const managersByArena: Record<number, { email: string }[]> = {
      1: [{ email: 'manager-turf-a@test.com' }],
      2: [], // Turf B has no active managers
    };

    mockQuery.mockImplementation(async (sql: string, params: any[] = []) => {
      if (sql.includes('GROUP BY a.id, a.name')) {
        return [{ arena_id: 1, arena_name: 'Turf A', confirmed: 4, cancelled: 1, played: 2 }];
      }
      if (sql.includes('FROM super_admins')) {
        return [{ email: 'super@test.com' }];
      }
      if (sql.includes('arena_id IS NULL')) {
        return [{ email: 'turfadmin@test.com' }];
      }
      if (sql.includes('FROM arenas WHERE status')) {
        return [{ id: 1, name: 'Turf A' }, { id: 2, name: 'Turf B' }];
      }
      if (sql.includes('arena_id = ?')) {
        return managersByArena[params[0]] ?? [];
      }
      return [];
    });

    await sendDailyDigest();

    const recipients = mockSendEmail.mock.calls.map((call: any[]) => call[0].to);
    expect(recipients).toContain('super@test.com');
    expect(recipients).toContain('turfadmin@test.com');
    expect(recipients).toContain('manager-turf-a@test.com');
    expect(recipients.some((r: string) => r.includes('accountant'))).toBe(false);
    // Turf B had no active managers -> no email sent on its behalf.
    expect(recipients.filter((r: string) => r === 'manager-turf-a@test.com')).toHaveLength(1);

    // No accountants query exists at all in this cron's SQL.
    const executedSql = mockQuery.mock.calls.map((call: any[]) => call[0]);
    expect(executedSql.some((sql: string) => sql.includes('accountants'))).toBe(false);

    expect(mockReportServerError).not.toHaveBeenCalled();
  });

  it('DIGEST-CRON-002: an arena with no active managers is skipped without error', async () => {
    const { sendDailyDigest } = await import('@/lib/daily-digest-cron');

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('GROUP BY a.id, a.name')) return [];
      if (sql.includes('FROM super_admins')) return [];
      if (sql.includes('arena_id IS NULL')) return [];
      if (sql.includes('FROM arenas WHERE status')) return [{ id: 1, name: 'Turf A' }];
      if (sql.includes('arena_id = ?')) return []; // no active managers
      return [];
    });

    await sendDailyDigest();

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockReportServerError).not.toHaveBeenCalled();
  });
});

describe('sendMorningBookingList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DIGEST-CRON-003: sends managers-only booking lists, never super admins/turf admins/accountants', async () => {
    const { sendMorningBookingList } = await import('@/lib/daily-digest-cron');

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM arenas WHERE status')) return [{ id: 1, name: 'Turf A' }, { id: 2, name: 'Turf B' }];
      if (sql.includes('arena_id = ?') && sql.includes('arena_admins')) {
        return [{ email: 'manager@test.com' }];
      }
      if (sql.includes('FROM bookings')) {
        return [{ arena_name: 'Turf A', time_slot: '06:00-07:00', customer_name: 'Jane', customer_mobile: '9999999999', amount: 1200 }];
      }
      return [];
    });

    await sendMorningBookingList();

    expect(mockSendEmail).toHaveBeenCalled();
    const recipients = mockSendEmail.mock.calls.map((call: any[]) => call[0].to);
    expect(recipients.every((r: string) => r === 'manager@test.com')).toBe(true);

    const executedSql = mockQuery.mock.calls.map((call: any[]) => call[0]);
    expect(executedSql.some((sql: string) => sql.includes('super_admins'))).toBe(false);
    expect(executedSql.some((sql: string) => sql.includes('accountants'))).toBe(false);
    expect(executedSql.some((sql: string) => sql.includes('arena_id IS NULL'))).toBe(false);
  });

  it('DIGEST-CRON-004: arena with no bookings today still emails managers with an empty-state message', async () => {
    const { sendMorningBookingList } = await import('@/lib/daily-digest-cron');

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM arenas WHERE status')) return [{ id: 1, name: 'Turf A' }];
      if (sql.includes('arena_id = ?') && sql.includes('arena_admins')) return [{ email: 'manager@test.com' }];
      if (sql.includes('FROM bookings')) return [];
      return [];
    });

    await sendMorningBookingList();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].html).toContain('No confirmed bookings for today');
  });
});
