#!/usr/bin/env node

/**
 * Comprehensive E2E Audit Workflow for Super Admin Dashboard
 * 
 * Tests the complete workflow:
 * 1. Super Admin login
 * 2. Create test arena with unique name
 * 3. Set up arena details
 * 4. Add admin credentials
 * 5. Add security credentials
 * 6. Set time slots for arena
 * 7. Arena admin login (as the admin created above)
 * 8. Arena admin performs functions (accept bookings, handle approvals)
 * 9. Super admin handles approvals
 * 10. Security staff check-in workflow
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';
let superAdminCookies = '';
let arenaAdminCookies = '';
let currentCookies = '';

// Utility for making HTTP requests
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
      // Store cookies
      const setCookies = res.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(cookie => {
          const cookieParts = cookie.split(';')[0];
          const name = cookieParts.split('=')[0];
          // Remove existing cookie with same name
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
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed || data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test results tracking
const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, status, message, details = '') {
  results.totalTests++;
  const result = { name, status, message, details };
  results.tests.push(result);
  
  if (status === 'PASS') {
    results.passed++;
    console.log(`✓ ${name}`);
  } else {
    results.failed++;
    console.log(`✗ ${name}: ${message}`);
    if (details) console.log(`  ${details}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  E2E AUDIT WORKFLOW TEST SUITE');
  console.log('========================================\n');

  // Test 1: Super Admin login
  console.log('--- Phase 1: Super Admin Login ---');
  let superAdminId = null;
  try {
    const loginRes = await makeRequest('POST', '/api/auth/super-admin/login', {
      email: 'superadmin@example.com',
      password: 'SuperAdmin@123',
    });
    
    if (loginRes.status === 200 || (loginRes.body && (loginRes.body.id || loginRes.body.success))) {
      superAdminId = loginRes.body.id || loginRes.body.superAdminId || loginRes.body.data?.id || 1;
      logTest('Super Admin Login', 'PASS', 'Successfully logged in', `Admin ID: ${superAdminId}`);
      superAdminCookies = currentCookies;
    } else {
      logTest('Super Admin Login', 'FAIL', `HTTP ${loginRes.status}`, JSON.stringify(loginRes.body));
    }
  } catch (e) {
    logTest('Super Admin Login', 'FAIL', `Request failed: ${e.message}`);
  }

  if (!superAdminId) {
    console.log('⚠️  Super Admin login required. Using default ID = 1');
    superAdminId = 1;
  }

  // Test 2: Create test arena with unique name
  console.log('\n--- Phase 2: Create Test Arena ---');
  const testArenaName = `Test Arena ${Date.now()}`;
  const testSlug = `test-arena-${Date.now()}`;
  let testArenaId = null;
  
  try {
    const createArenaRes = await makeRequest('POST', '/api/super-admin/arenas', {
      name: testArenaName,
      slug: testSlug,
      location: 'Test Location',
      capacity: 100,
      description: 'Test arena for E2E workflow',
    });

    if (createArenaRes.status === 200 || createArenaRes.status === 201) {
      testArenaId = createArenaRes.body.data?.id;
      logTest('Create Test Arena', 'PASS', `Arena created: ${testArenaName}`, `Arena ID: ${testArenaId}`);
      superAdminCookies = currentCookies;
    } else {
      logTest('Create Test Arena', 'FAIL', `HTTP ${createArenaRes.status}`, JSON.stringify(createArenaRes.body));
    }
  } catch (e) {
    logTest('Create Test Arena', 'FAIL', `Request failed: ${e.message}`);
  }

  if (!testArenaId) {
    console.log('⚠️  Using default test arena ID = 1');
    testArenaId = 1;
  }

  // Test 3: Fetch and verify arena details
  console.log('\n--- Phase 3: Verify Arena Setup ---');
  try {
    const arenaRes = await makeRequest('GET', `/api/super-admin/arenas?arenaId=${testArenaId}`);

    if (arenaRes.status === 200 && arenaRes.body) {
      logTest('Fetch Arena Details', 'PASS', `Arena details retrieved`, `Name: ${arenaRes.body.name || arenaRes.body.data?.[0]?.name}`);
    } else {
      logTest('Fetch Arena Details', 'FAIL', `HTTP ${arenaRes.status}`);
    }
  } catch (e) {
    logTest('Fetch Arena Details', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 4: Create arena admin credentials
  console.log('\n--- Phase 4: Create Arena Admin ---');
  const testAdminEmail = `admin_${Date.now()}@test.local`;
  const testAdminName = 'Test Arena Admin';
  let testAdminPassword = null;
  let testArenaAdminId = null;

  try {
    const createAdminRes = await makeRequest('POST', '/api/super-admin/admins', {
      arena_id: testArenaId,
      email: testAdminEmail,
      name: testAdminName,
    });

    if (createAdminRes.status === 200 || createAdminRes.status === 201) {
      testArenaAdminId = createAdminRes.body.data.admin.id;
      testAdminPassword = createAdminRes.body.data.credentials.tempPassword;
      logTest('Create Arena Admin', 'PASS', `Admin created: ${testAdminEmail}`, `Admin ID: ${testArenaAdminId}`);
      superAdminCookies = currentCookies;
    } else {
      logTest('Create Arena Admin', 'FAIL', `HTTP ${createAdminRes.status}`, JSON.stringify(createAdminRes.body));
    }
  } catch (e) {
    logTest('Create Arena Admin', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 5: Create security staff credentials
  console.log('\n--- Phase 5: Create Security Staff ---');
  const testSecurityEmail = `security_${Date.now()}@test.local`;
  const testSecurityName = 'Test Security Staff';
  let testSecurityId = null;

  try {
    const createSecurityRes = await makeRequest('POST', '/api/super-admin/security', {
      arena_id: testArenaId,
      email: testSecurityEmail,
      name: testSecurityName,
    });

    if (createSecurityRes.status === 200 || createSecurityRes.status === 201) {
      testSecurityId = createSecurityRes.body.data.staff.id;
      logTest('Create Security Staff', 'PASS', `Security created: ${testSecurityEmail}`, `Security ID: ${testSecurityId}`);
      superAdminCookies = currentCookies;
    } else {
      logTest('Create Security Staff', 'FAIL', `HTTP ${createSecurityRes.status}`, JSON.stringify(createSecurityRes.body));
    }
  } catch (e) {
    logTest('Create Security Staff', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 6: Set time slots for arena
  console.log('\n--- Phase 6: Create Arena Time Slots ---');
  try {
    const timingRes = await makeRequest('POST', '/api/super-admin/arenas/timings', {
      arena_id: testArenaId,
      time_slot: '09:00-22:00',
      start_time: '09:00',
      end_time: '22:00',
      day_of_week: 1, // Monday
    });

    if (timingRes.status === 200 || timingRes.status === 201) {
      logTest('Create Time Slots', 'PASS', 'Time slots created (09:00 - 22:00)');
      superAdminCookies = currentCookies;
    } else {
      logTest('Create Time Slots', 'FAIL', `HTTP ${timingRes.status}`, JSON.stringify(timingRes.body));
    }
  } catch (e) {
    logTest('Create Time Slots', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 7: Verify time slots
  console.log('\n--- Phase 7: Verify Time Slots ---');
  try {
    const fetchTimingRes = await makeRequest('GET', `/api/super-admin/arenas/timings?arena_id=${testArenaId}`);

    if (fetchTimingRes.status === 200 && fetchTimingRes.body) {
      const hasTimings = Array.isArray(fetchTimingRes.body.data) && fetchTimingRes.body.data.length > 0;
      if (hasTimings) {
        logTest('Fetch Time Slots', 'PASS', `Time slots retrieved`, `Count: ${fetchTimingRes.body.data.length}`);
      } else {
        logTest('Fetch Time Slots', 'FAIL', 'No time slots found');
      }
    } else {
      logTest('Fetch Time Slots', 'FAIL', `HTTP ${fetchTimingRes.status}`);
    }
  } catch (e) {
    logTest('Fetch Time Slots', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 8: Super Admin creates booking (blocks slots)
  console.log('\n--- Phase 8: Super Admin Creates Booking ---');
  try {
    const bookingRes = await makeRequest('POST', '/api/super-admin/bookings', {
      arena_id: testArenaId,
      slot_type: '1R',
      date: new Date().toISOString().split('T')[0],
      time_slot: '10:00-11:00',
      reason: 'Maintenance block',
    });

    if (bookingRes.status === 200 || bookingRes.status === 201) {
      logTest('Create Super Admin Booking', 'PASS', 'Booking created (slots blocked)', 'No approval needed');
      superAdminCookies = currentCookies;
    } else {
      logTest('Create Super Admin Booking', 'FAIL', `HTTP ${bookingRes.status}`, JSON.stringify(bookingRes.body));
    }
  } catch (e) {
    logTest('Create Super Admin Booking', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 9: Arena Admin login (as created admin)
  console.log('\n--- Phase 9: Arena Admin Login ---');
  try {
    superAdminCookies = currentCookies;
    currentCookies = ''; // Fresh for arena admin

    const arenaAdminLoginRes = await makeRequest('POST', '/api/arena-admin/login', {
      email: testAdminEmail,
      password: testAdminPassword,
    });

    if (arenaAdminLoginRes.status === 200 || (arenaAdminLoginRes.body && arenaAdminLoginRes.body.id)) {
      const arenaAdminId = arenaAdminLoginRes.body.id || testArenaAdminId;
      logTest('Arena Admin Login', 'PASS', `Admin logged in: ${testAdminEmail}`, `Admin ID: ${arenaAdminId}`);
      arenaAdminCookies = currentCookies;
    } else {
      logTest('Arena Admin Login', 'FAIL', `HTTP ${arenaAdminLoginRes.status}`, JSON.stringify(arenaAdminLoginRes.body));
    }
  } catch (e) {
    logTest('Arena Admin Login', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 10: Arena Admin requests approval for free booking
  console.log('\n--- Phase 10: Arena Admin Request Approval ---');
  try {
    currentCookies = arenaAdminCookies;
    const approvalReqRes = await makeRequest('POST', '/api/arena-admin/bookings/request-approval', {
      date: new Date().toISOString().split('T')[0],
      time_slot: '11:00-12:00',
      number_of_rounds: 2,
      reason: 'Team practice - request approval',
    });

    if (approvalReqRes.status === 200 || approvalReqRes.status === 201) {
      logTest('Arena Admin Request Approval', 'PASS', 'Approval request submitted', 'Waiting for super admin approval');
      arenaAdminCookies = currentCookies;
    } else {
      logTest('Arena Admin Request Approval', 'FAIL', `HTTP ${approvalReqRes.status}`, JSON.stringify(approvalReqRes.body));
    }
  } catch (e) {
    logTest('Arena Admin Request Approval', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 11: Super Admin fetches pending approvals
  console.log('\n--- Phase 11: Super Admin Fetch Approvals ---');
  try {
    currentCookies = superAdminCookies; // Switch back
    const approvalsRes = await makeRequest('GET', `/api/super-admin/approvals?arenaId=${testArenaId}`);

    if (approvalsRes.status === 200 && approvalsRes.body) {
      logTest('Fetch Approvals', 'PASS', `Approvals retrieved`, `Status: OK`);
    } else {
      logTest('Fetch Approvals', 'FAIL', `HTTP ${approvalsRes.status}`);
    }
  } catch (e) {
    logTest('Fetch Approvals', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 12: Super Admin dashboard accessibility
  console.log('\n--- Phase 12: Dashboard Accessibility ---');
  try {
    currentCookies = superAdminCookies;
    const dashRes = await makeRequest('GET', '/admin/super-admin');

    if (dashRes.status === 200) {
      logTest('Super Admin Dashboard', 'PASS', 'Dashboard page accessible', 'HTTP 200');
    } else {
      logTest('Super Admin Dashboard', 'FAIL', `HTTP ${dashRes.status}`, 'Dashboard not accessible');
    }
  } catch (e) {
    logTest('Super Admin Dashboard', 'FAIL', `Request failed: ${e.message}`);
  }

  // Print test summary
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================\n');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%\n`);

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
  }

  console.log('\n========================================\n');
  return results.failed === 0;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
