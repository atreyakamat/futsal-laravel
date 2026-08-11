import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

import { query, queryOne } from './lib/domain.js';
import { signValue } from './lib/session.js';
import crypto from 'crypto';

async function run() {
  console.log('Testing Refund Flow...');
  
  // 1. Get a Super Admin ID
  const superAdmin = await queryOne('SELECT id FROM super_admins LIMIT 1');
  if (!superAdmin) {
    console.log('No super admin found');
    process.exit(1);
  }
  
  // 2. Create a test booking
  const bookingRef = `TEST-REF-${Date.now()}`;
  const mihpayid = `PAYU-TEST-${Date.now()}`;
  
  console.log(`Creating dummy booking with ref: ${bookingRef}`);
  
  await query(
    `INSERT INTO bookings (
      ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
      customer_name, customer_mobile, amount, payment_status, payu_mihpayid, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
    )`,
    [`TKT-${Date.now()}`, bookingRef, 1, null, '2026-10-10', '10:00 - 11:00', 'Test Customer', '9999999999', 1000, 'confirmed', mihpayid]
  );
  
  await query(
    `INSERT INTO bookings (
      ticket_number, booking_ref, arena_id, user_id, booking_date, time_slot,
      customer_name, customer_mobile, amount, payment_status, payu_mihpayid, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
    )`,
    [`TKT-${Date.now()+1}`, bookingRef, 1, null, '2026-10-10', '11:00 - 12:00', 'Test Customer', '9999999999', 1000, 'confirmed', mihpayid]
  );

  // 3. Create Cookie
  const signedUserId = await signValue(String((superAdmin as any).id));
  const signedRole = await signValue('super_admin');
  
  // 4. Call Refund API
  console.log(`Triggering Refund API...`);
  const response = await fetch('http://localhost:3000/api/fg-admin/super-admin/refund', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `fg_auth_user=${signedUserId}; fg_auth_role=${signedRole}`
    },
    body: JSON.stringify({ ref: bookingRef, reason: 'Testing refund flow' })
  });
  
  const data = await response.json();
  console.log('API Response:', data);
  
  // 5. Verify DB state
  const updatedBookings = await query('SELECT payment_status, refund_amount, cancellation_reason FROM bookings WHERE booking_ref = ?', [bookingRef]);
  console.log('Updated Bookings:', updatedBookings);
  
  const auditLogs = await query('SELECT * FROM system_audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT 1', ['FORCE_REFUND']);
  console.log('Audit Log:', auditLogs[0]);
  
  process.exit(0);
}

run().catch(console.error);
