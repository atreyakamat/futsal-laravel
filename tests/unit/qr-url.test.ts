import { describe, it, expect } from 'vitest';
import { buildTicketVerificationUrl } from '../../lib/qr';

describe('ticket verification QR url', () => {
  it('builds an absolute verify-ticket URL for a ticket number', () => {
    const url = buildTicketVerificationUrl('TKT-1234', 'https://example.com/');

    expect(url).toBe('https://example.com/verify-ticket?ticket=TKT-1234');
  });

  it('encodes ticket numbers safely', () => {
    const url = buildTicketVerificationUrl('TKT 123/45', 'https://example.com');

    expect(url).toBe('https://example.com/verify-ticket?ticket=TKT%20123%2F45');
  });
});