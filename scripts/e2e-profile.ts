import 'dotenv/config';
import { chromium } from 'playwright';
import { query, queryOne } from '../lib/db';
import { signValue } from '../lib/session';

async function ensureUser(email: string | null, mobile: string | null, name: string) {
  // Try find by email or mobile
  let user = null;
  if (email) user = await queryOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user && mobile) user = await queryOne('SELECT id FROM users WHERE customer_mobile = ? LIMIT 1', [mobile]);
  if (user) return user.id;
  const ensuredEmail = email || `user-${Math.random().toString(36).slice(2,10)}@agnelarena.com`;
  const res = await query('INSERT INTO users (name, email, customer_mobile, role, created_at, updated_at) VALUES (?, ?, ?,\'player\', NOW(), NOW()) RETURNING id', [name, ensuredEmail, mobile]);
  return res[0]?.id;
}

async function run() {
  // Create two test users
  const userAEmail = 'e2e_user_a@example.com';
  const userBEmail = null; // missing email
  const userAMobile = '9990000001';
  const userBMobile = '9990000002';

  const userAId = await ensureUser(userAEmail, userAMobile, 'E2E User A');
  const userBId = await ensureUser(userBEmail, userBMobile, 'E2E User B');

  console.log('UserA id', userAId, 'UserB id', userBId);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  // Find an active arena and pricing slots to use
  const arenaRow = await queryOne('SELECT id, slug FROM arenas WHERE status = \'active\' ORDER BY id LIMIT 1');
  const arenaId = arenaRow?.id || 1;
  const arenaSlug = arenaRow?.slug || 'test-booking-turf';
  const pricingRows = await query('SELECT time_slot FROM pricings WHERE arena_id = ? ORDER BY time_slot LIMIT 3', [arenaId]);
  const slotsToUse = pricingRows.map((r: any) => r.time_slot).filter(Boolean);
  if (slotsToUse.length === 0) {
    console.log('No pricing slots configured for arena', arenaId);
    // Fallback to a common slot format if none configured
    slotsToUse[0] = '20:00-21:00';
  }

  // Test User A (complete profile)
  const cookieA = signValue(String(userAId));
  await context.addCookies([{ name: 'fg_auth_user', value: cookieA, domain: 'localhost', path: '/', httpOnly: true }]);
  const page = await context.newPage();
  // Directly open checkout page with selected slots to bypass client slot selection
  const dateToday = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const slotA = slotsToUse[0] || '20:00-21:00';
  const slotB = slotsToUse[1] || (slotA === '20:00-21:00' ? '21:00-22:00' : '20:00-21:00');
  const slotsParam = encodeURIComponent(JSON.stringify([slotA]));
  const checkoutUrl = `http://localhost:3001/booking/checkout?arena_id=${arenaId}&date=${dateToday}&slots=${slotsParam}`;
  await page.goto(checkoutUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // We're on the checkout page: read prefilled inputs
  await page.waitForSelector('#customer_name', { timeout: 5000 });
  const nameVal = await page.$eval('#customer_name', (el: any) => el.defaultValue || '');
  const mobileVal = await page.$eval('#customer_mobile', (el: any) => el.defaultValue || '');
  const emailVal = await page.$eval('#customer_email', (el: any) => el.defaultValue || '');
  console.log('UserA checkout values:', { nameVal, mobileVal, emailVal });

  // Submit booking via API to ensure correct server and port
  const csrfTokenA = await page.$eval('input[name="_csrf"]', (el: any) => el.value || '');
  const payloadA = {
    arena_id: arenaId,
    date: dateToday,
    slots: [slotA],
    customer_name: nameVal,
    customer_mobile: mobileVal,
    customer_email: emailVal || null,
  };
  const respA = await page.request.post('http://localhost:3001/api/bookings/process', {
    data: JSON.stringify(payloadA),
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfTokenA,
    },
  });
  console.log('UserA booking API status:', respA.status(), await respA.text());

  // Test User B (missing email) -- set cookie for B in new page
  const pageB = await context.newPage();
  const cookieB = signValue(String(userBId));
  await context.addCookies([{ name: 'fg_auth_user', value: cookieB, domain: 'localhost', path: '/', httpOnly: true }]);
  const dateTodayB = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const slotsParamB = encodeURIComponent(JSON.stringify([slotB]));
  const checkoutUrlB = `http://localhost:3001/booking/checkout?arena_id=${arenaId}&date=${dateTodayB}&slots=${slotsParamB}`;
  await pageB.goto(checkoutUrlB, { waitUntil: 'networkidle' });

  await pageB.waitForTimeout(500);
  // For UserB, read current email, update it and submit
  await pageB.waitForSelector('#customer_email', { timeout: 5000 });
  const emailValB = await pageB.$eval('#customer_email', (el: any) => el.defaultValue || '');
  console.log('UserB initial email value:', emailValB);

  const newEmail = 'e2e_user_b_new@example.com';
  await pageB.fill('#customer_email', newEmail);
  const csrfTokenB = await pageB.$eval('input[name="_csrf"]', (el: any) => el.value || '');
  const payloadB = {
    arena_id: arenaId,
    date: dateTodayB,
    slots: [slotB],
    customer_name: (await pageB.$eval('#customer_name', (el: any) => el.defaultValue || '')),
    customer_mobile: (await pageB.$eval('#customer_mobile', (el: any) => el.defaultValue || '')),
    customer_email: newEmail,
  };
  const respB = await pageB.request.post('http://localhost:3001/api/bookings/process', {
    data: JSON.stringify(payloadB),
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfTokenB,
    },
  });
  console.log('UserB booking API status:', respB.status(), await respB.text());
  console.log('Submitted booking for UserB');

  // Verify user's email in DB
  const updated = await queryOne('SELECT email FROM users WHERE id = ? LIMIT 1', [userBId]);
  console.log('DB email for UserB now:', updated?.email);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
