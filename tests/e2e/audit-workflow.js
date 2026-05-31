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
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
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
      superAdminId = loginRes.body.id || loginRes.body.superAdminId || 1;
      logTest('Super Admin Login', 'PASS', 'Successfully logged in', `Admin ID: ${superAdminId}`);
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
  const testAreneName = `Test Arena ${Date.now()}`;
  let testArenaId = null;
  
  try {
    const createArenaRes = await makeRequest('POST', '/api/super-admin/arenas', {
      name: testAreneName,
      location: 'Test Location',
      capacity: 100,
      description: 'Test arena for E2E workflow',
    }, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (createArenaRes.status === 200 || createArenaRes.status === 201) {
      testArenaId = createArenaRes.body.id || createArenaRes.body.arenaId;
      logTest('Create Test Arena', 'PASS', `Arena created: ${testAreneName}`, `Arena ID: ${testArenaId}`);
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
    const arenaRes = await makeRequest('GET', `/api/super-admin/arenas?arenaId=${testArenaId}`, null, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (arenaRes.status === 200 && arenaRes.body) {
      logTest('Fetch Arena Details', 'PASS', `Arena details retrieved`, `Name: ${arenaRes.body.name || arenaRes.body[0]?.name}`);
    } else {
      logTest('Fetch Arena Details', 'FAIL', `HTTP ${arenaRes.status}`);
    }
  } catch (e) {
    logTest('Fetch Arena Details', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 4: Create arena admin credentials
  console.log('\n--- Phase 4: Create Arena Admin ---');
  const testAdminEmail = `admin_${Date.now()}@test.local`;
  const testAdminPassword = 'AdminTest@123';
  let testArenaAdminId = null;

  try {
    const createAdminRes = await makeRequest('POST', '/api/super-admin/admins', {
      arenaId: testArenaId,
      email: testAdminEmail,
      password: testAdminPassword,
    }, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (createAdminRes.status === 200 || createAdminRes.status === 201) {
      testArenaAdminId = createAdminRes.body.id || createAdminRes.body.adminId;
      logTest('Create Arena Admin', 'PASS', `Admin created: ${testAdminEmail}`, `Admin ID: ${testArenaAdminId}`);
    } else {
      logTest('Create Arena Admin', 'FAIL', `HTTP ${createAdminRes.status}`, JSON.stringify(createAdminRes.body));
    }
  } catch (e) {
    logTest('Create Arena Admin', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 5: Create security staff credentials
  console.log('\n--- Phase 5: Create Security Staff ---');
  const testSecurityEmail = `security_${Date.now()}@test.local`;
  const testSecurityPassword = 'SecTest@123';
  let testSecurityId = null;

  try {
    const createSecurityRes = await makeRequest('POST', '/api/super-admin/security', {
      arenaId: testArenaId,
      email: testSecurityEmail,
      password: testSecurityPassword,
    }, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (createSecurityRes.status === 200 || createSecurityRes.status === 201) {
      testSecurityId = createSecurityRes.body.id || createSecurityRes.body.securityId;
      logTest('Create Security Staff', 'PASS', `Security created: ${testSecurityEmail}`, `Security ID: ${testSecurityId}`);
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
      arenaId: testArenaId,
      startTime: '09:00',
      endTime: '22:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7], // All days
    }, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (timingRes.status === 200 || timingRes.status === 201) {
      logTest('Create Time Slots', 'PASS', 'Time slots created (09:00 - 22:00)');
    } else {
      logTest('Create Time Slots', 'FAIL', `HTTP ${timingRes.status}`, JSON.stringify(timingRes.body));
    }
  } catch (e) {
    logTest('Create Time Slots', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 7: Verify time slots
  console.log('\n--- Phase 7: Verify Time Slots ---');
  try {
    const fetchTimingRes = await makeRequest('GET', `/api/super-admin/arenas/timings?arenaId=${testArenaId}`, null, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (fetchTimingRes.status === 200 && fetchTimingRes.body) {
      const hasTimings = Array.isArray(fetchTimingRes.body) && fetchTimingRes.body.length > 0;
      if (hasTimings) {
        logTest('Fetch Time Slots', 'PASS', `Time slots retrieved`, `Count: ${fetchTimingRes.body.length}`);
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
      arenaId: testArenaId,
      slotType: '1R',
      date: new Date().toISOString().split('T')[0],
      slotTime: '10:00',
      reason: 'Maintenance block',
    }, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (bookingRes.status === 200 || bookingRes.status === 201) {
      logTest('Create Super Admin Booking', 'PASS', 'Booking created (slots blocked)', 'No approval needed');
    } else {
      logTest('Create Super Admin Booking', 'FAIL', `HTTP ${bookingRes.status}`, JSON.stringify(bookingRes.body));
    }
  } catch (e) {
    logTest('Create Super Admin Booking', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 9: Arena Admin login (as created admin)
  console.log('\n--- Phase 9: Arena Admin Login ---');
  try {
    const arenaAdminLoginRes = await makeRequest('POST', '/api/arena-admin/login', {
      email: testAdminEmail,
      password: testAdminPassword,
    });

    if (arenaAdminLoginRes.status === 200 || (arenaAdminLoginRes.body && arenaAdminLoginRes.body.id)) {
      const arenaAdminId = arenaAdminLoginRes.body.id || testArenaAdminId;
      logTest('Arena Admin Login', 'PASS', `Admin logged in: ${testAdminEmail}`, `Admin ID: ${arenaAdminId}`);
    } else {
      logTest('Arena Admin Login', 'FAIL', `HTTP ${arenaAdminLoginRes.status}`, JSON.stringify(arenaAdminLoginRes.body));
    }
  } catch (e) {
    logTest('Arena Admin Login', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 10: Arena Admin requests approval for free booking
  console.log('\n--- Phase 10: Arena Admin Request Approval ---');
  try {
    const approvalReqRes = await makeRequest('POST', '/api/arena-admin/bookings/request-approval', {
      arenaId: testArenaId,
      slotType: '2R',
      date: new Date().toISOString().split('T')[0],
      slotTime: '11:00',
      reason: 'Team practice - request approval',
    }, {
      'fg_auth_role': 'arena_admin',
      'fg_auth_user': (testArenaAdminId || 1).toString(),
      'fg_arena_id': testArenaId.toString(),
    });

    if (approvalReqRes.status === 200 || approvalReqRes.status === 201) {
      logTest('Arena Admin Request Approval', 'PASS', 'Approval request submitted', 'Waiting for super admin approval');
    } else {
      logTest('Arena Admin Request Approval', 'FAIL', `HTTP ${approvalReqRes.status}`, JSON.stringify(approvalReqRes.body));
    }
  } catch (e) {
    logTest('Arena Admin Request Approval', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 11: Super Admin fetches pending approvals
  console.log('\n--- Phase 11: Super Admin Fetch Approvals ---');
  try {
    const approvalsRes = await makeRequest('GET', `/api/super-admin/approvals?arenaId=${testArenaId}`, null, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

    if (approvalsRes.status === 200 && approvalsRes.body) {
      const hasApprovals = Array.isArray(approvalsRes.body) && approvalsRes.body.length > 0;
      logTest('Fetch Approvals', 'PASS', `Approvals retrieved`, `Count: ${hasApprovals ? approvalsRes.body.length : 0}`);
    } else {
      logTest('Fetch Approvals', 'FAIL', `HTTP ${approvalsRes.status}`);
    }
  } catch (e) {
    logTest('Fetch Approvals', 'FAIL', `Request failed: ${e.message}`);
  }

  // Test 12: Super Admin dashboard accessibility
  console.log('\n--- Phase 12: Dashboard Accessibility ---');
  try {
    const dashRes = await makeRequest('GET', '/admin/super-admin', null, {
      'fg_auth_role': 'super_admin',
      'fg_auth_user': superAdminId.toString(),
    });

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
