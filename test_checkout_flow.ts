import crypto from 'crypto';

async function run() {
  const prodUrl = 'https://agnelarenagoa.com';

  console.log('Locking slot...');
  const lockRes = await fetch(`${prodUrl}/api/slots/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      arenaId: 1,
      bookingDate: '2026-07-22',
      slots: ['11:00 - 12:00'],
      sessionId: 'test-session-12345'
    })
  });
  console.log('Lock Status:', lockRes.status);
  const text = await lockRes.text();
  console.log('Lock Body:', text.substring(0, 200));
}
run();
