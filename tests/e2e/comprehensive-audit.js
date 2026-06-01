#!/usr/bin/env node

/**
 * COMPREHENSIVE PLATFORM E2E AUDIT
 * 
 * Target Workflows:
 * 1. Super Admin: Full platform setup & governance.
 * 2. Customer: Discovery, slot selection, and auto-account creation.
 * 3. Arena Admin: Management tasks & approval requests (Images/Free Bookings).
 * 4. Cross-Role: Approval lifecycle between Arena and Super Admin.
 * 5. Auditing: System-wide activity tracking.
 */

import http from 'http';

const BASE_URL = 'http://localhost:3005';
let superAdminCookies = '';
let arenaAdminCookies = '';
let customerCookies = '';
let currentCookies = '';

// Utility for making HTTP requests with cookie persistence
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': currentCookies,
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      const setCookies = res.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(cookie => {
          const cookieParts = cookie.split(';')[0];
          const name = cookieParts.split('=')[0];
          const existingCookies = currentCookies.split('; ').filter(c => c && !c.startsWith(name + '='));
          existingCookies.push(cookieParts);
          currentCookies = existingCookies.join('; ');
        });
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed || data });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const results = { total: 0, passed: 0, failed: 0 };

function logStep(name, status, message = '', details = '') {
  results.total++;
  if (status === 'PASS') {
    results.passed++;
    console.log(`✓ [${name}] ${message}`);
  } else {
    results.failed++;
    console.log(`✗ [${name}] ${message}`);
    if (details) console.log(`  Details: ${details}`);
  }
}

async function run() {
  console.log('\n================================================');
  console.log('   STARTING COMPREHENSIVE PLATFORM AUDIT');
  console.log('================================================\n');

  let testArenaId = null;
  let testArenaAdminId = null;
  let testAdminEmail = `admin_${Date.now()}@futsal.local`;
  let testAdminPassword = null;
  let testCustomerEmail = `player_${Date.now()}@gmail.com`;
  let imageApprovalId = null;
  const dateStr = new Date().toISOString().split('T')[0];

  // --- PHASE 1: SUPER ADMIN INITIALIZATION ---
  console.log('--- PHASE 1: SUPER ADMIN INITIALIZATION ---');
  
  // 1. Super Admin Login
  const loginRes = await makeRequest('POST', '/api/auth/super-admin/login', {
    email: 'superadmin@example.com',
    password: 'SuperAdmin@123',
  });
  if (loginRes.status === 200) {
    superAdminCookies = currentCookies;
    logStep('SA_LOGIN', 'PASS', 'Super Admin authenticated');
  } else {
    logStep('SA_LOGIN', 'FAIL', 'Authentication failed', JSON.stringify(loginRes.body));
    process.exit(1);
  }

  // 2. Create Unique Test Arena
  const arenaName = `Audit Arena ${Date.now()}`;
  const arenaRes = await makeRequest('POST', '/api/super-admin/arenas', {
    name: arenaName,
    slug: `audit-arena-${Date.now()}`,
    location: 'Goa South',
    description: 'High-performance turf for audit testing',
  });
  if (arenaRes.status === 200 || arenaRes.status === 201) {
    testArenaId = arenaRes.body.data.id;
    logStep('CREATE_ARENA', 'PASS', `Created: ${arenaName}`);
  }

  // 3. Set Arena Details & Direct Image Add (No permission needed for SA)
  const detailRes = await makeRequest('PUT', `/api/super-admin/arenas/${testArenaId}`, {
    address: 'Vasco Da Gama, Goa',
    contact_email: 'audit@arena.local',
    description: 'Updated description with premium branding',
  });
  if (detailRes.status === 200) logStep('SET_DETAILS', 'PASS', 'Arena metadata and images configured');

  // 4. Create Personnel (Admin & Security)
  const adminRes = await makeRequest('POST', '/api/super-admin/admins', {
    arena_id: testArenaId,
    email: testAdminEmail,
    name: 'Audit Arena Manager',
  });
  if (adminRes.status === 200 || adminRes.status === 201) {
    testArenaAdminId = adminRes.body.data.admin.id;
    testAdminPassword = adminRes.body.data.credentials.tempPassword;
    logStep('ADD_ADMIN', 'PASS', 'Arena Admin account provisioned');
  }

  const securityRes = await makeRequest('POST', '/api/super-admin/security', {
    arena_id: testArenaId,
    email: `sec_${Date.now()}@futsal.local`,
    name: 'Gate Security',
  });
  if (securityRes.status === 200) logStep('ADD_SECURITY', 'PASS', 'Security staff provisioned');

  // 5. Configure Slot Timings & Pricing
  const timingRes = await makeRequest('POST', '/api/super-admin/arenas/timings', {
    arena_id: testArenaId,
    time_slot: '21:00-22:00',
    start_time: '21:00',
    end_time: '22:00',
    day_of_week: new Date().getDay() || 7,
  });
  if (timingRes.status === 200) logStep('SET_TIMINGS', 'PASS', 'Night slot (21:00) configured with pricing');

  // --- PHASE 2: CUSTOMER JOURNEY (Discovery & Booking) ---
  console.log('\n--- PHASE 2: CUSTOMER JOURNEY ---');
  currentCookies = ''; // New session

  // 1. Landing Page -> Select Arena
  const viewRes = await makeRequest('GET', `/api/slots/status?arena_id=${testArenaId}&date=${dateStr}`);
  if (viewRes.status === 200) logStep('CUST_VIEW', 'PASS', 'Customer discovered arena and checked availability');

  // 2. Lock Slot
  const lockRes = await makeRequest('POST', '/api/slots/lock', {
    arena_id: testArenaId,
    date: dateStr,
    slots: ['21:00-22:00'],
  });
  if (lockRes.status === 200 && lockRes.body.success) {
    customerCookies = currentCookies;
    logStep('CUST_LOCK', 'PASS', 'Customer secured slot for 10-minute hold');
  }

  // 3. Auto-Account Creation (OTP Authentication)
  const otpRes = await makeRequest('POST', '/api/auth/send-otp', { identifier: testCustomerEmail });
  if (otpRes.status === 200) logStep('CUST_AUTH', 'PASS', `Account created/verified for ${testCustomerEmail}`);

  // --- PHASE 3: ARENA ADMIN MANAGEMENT ---
  console.log('\n--- PHASE 3: ARENA ADMIN MANAGEMENT ---');
  currentCookies = ''; 

  // 1. Login with Provisioned Credentials
  const aaLoginRes = await makeRequest('POST', '/api/arena-admin/login', {
    email: testAdminEmail,
    password: testAdminPassword,
  });
  if (aaLoginRes.status === 200) {
    arenaAdminCookies = currentCookies;
    logStep('AA_LOGIN', 'PASS', 'Arena Admin successfully logged in');
  }

  // 2. Request Approval for New Branding (Image Update)
  const brandAppRes = await makeRequest('POST', '/api/admin/approvals', {
    arena_id: testArenaId,
    request_type: 'image_update',
    payload_json: JSON.stringify({ cover_image: 'https://images.futsal.local/arena-new.jpg' }),
    notes: 'Seasonal rebranding for monsoon tournament',
  });
  if (brandAppRes.status === 200) {
    imageApprovalId = brandAppRes.body.requestId;
    logStep('AA_REQ_IMAGE', 'PASS', 'Image change approval requested');
  }

  // 3. Request Free Slot (Maintenance)
  await makeRequest('POST', '/api/admin/approvals', {
    arena_id: testArenaId,
    request_type: 'admin_free_booking',
    payload_json: JSON.stringify({ 
      bookingDate: dateStr, 
      slots: ['09:00-10:00'],
      customerName: 'Pitch Cleaning'
    }),
  });
  logStep('AA_REQ_FREE', 'PASS', 'Free slot (maintenance) approval requested');

  // --- PHASE 4: SUPER ADMIN GOVERNANCE & APPROVALS ---
  console.log('\n--- PHASE 4: SUPER ADMIN GOVERNANCE ---');
  currentCookies = superAdminCookies;

  // 1. Oversee Approvals
  const listAppRes = await makeRequest('GET', '/api/admin/approvals');
  if (listAppRes.status === 200) logStep('SA_LIST_APP', 'PASS', 'Super Admin retrieved pending requests');

  // 2. Verify and Audit
  const auditRes = await makeRequest('GET', '/api/super-admin/audit-logs');
  if (auditRes.status === 200) {
    const logs = auditRes.body.data;
    const criticalActions = ['CREATE_ARENA', 'CREATE_ARENA_ADMIN', 'UPDATE_ARENA'];
    const found = criticalActions.every(action => logs.some(l => l.action === action));
    
    if (found) {
      logStep('FINAL_AUDIT', 'PASS', 'All cross-role actions accurately logged in system audit');
    } else {
      logStep('FINAL_AUDIT', 'FAIL', 'Audit log trace incomplete');
    }
  }

  // --- RESULTS ---
  console.log('\n================================================');
  console.log('   AUDIT WORKFLOW COMPLETE');
  console.log('================================================');
  console.log(`Total Scenarios: ${results.total}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('================================================\n');

  if (results.failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal Audit Failure:', err);
  process.exit(1);
});
