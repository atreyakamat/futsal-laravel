#!/usr/bin/env node
/**
 * Super Admin Dashboard - Smoke Tests
 * Tests all major features with functional workflows
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authCookie = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(authCookie && { 'Cookie': authCookie }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.status,
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers,
          });
        } catch {
          resolve({
            status: res.status,
            statusCode: res.statusCode,
            body: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 Starting Super Admin Dashboard Smoke Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Login
    console.log('📝 Test 1: Super Admin Login');
    const loginRes = await request('POST', '/api/auth/super-admin/login', {
      email: 'superadmin@example.com',
      password: 'SuperAdmin@123',
    });
    if (loginRes.body.success && loginRes.body.data.id) {
      console.log('✅ Login successful');
      testsPassed++;
      // Extract auth cookie from response headers
      if (loginRes.headers['set-cookie']) {
        authCookie = loginRes.headers['set-cookie'].join(';');
      }
    } else {
      console.log('❌ Login failed:', loginRes.body.message);
      testsFailed++;
    }

    // Test 2: Get Arenas
    console.log('\n📝 Test 2: Get Arenas');
    const arenasRes = await request('GET', '/api/fg-admin/super-admin/arenas');
    if (arenasRes.statusCode === 200) {
      console.log('✅ Arenas API working');
      testsPassed++;
    } else {
      console.log('❌ Arenas API failed:', arenasRes.statusCode);
      testsFailed++;
    }

    // Test 3: Create Arena
    console.log('\n📝 Test 3: Create Arena');
    const createArenaRes = await request('POST', '/api/fg-admin/super-admin/arenas', {
      name: 'Test Arena ' + Date.now(),
      slug: 'test-arena-' + Date.now(),
      address: 'Test Address',
      contact_email: 'arena@test.com',
      contact_phone: '9876543210',
    });
    let createdArenaId = null;
    if (createArenaRes.body.success && createArenaRes.body.data.id) {
      console.log('✅ Arena created successfully');
      createdArenaId = createArenaRes.body.data.id;
      testsPassed++;
    } else {
      console.log('❌ Arena creation failed:', createArenaRes.body.message);
      testsFailed++;
    }

    // Test 4: Get Arena Details
    if (createdArenaId) {
      console.log('\n📝 Test 4: Get Arena Details');
      const arenaDetailsRes = await request('GET', `/api/fg-admin/super-admin/arenas/${createdArenaId}`);
      if (arenaDetailsRes.body.success && arenaDetailsRes.body.data.id === createdArenaId) {
        console.log('✅ Arena details retrieved successfully');
        testsPassed++;
      } else {
        console.log('❌ Failed to get arena details');
        testsFailed++;
      }
    }

    // Test 5: Create Arena Admin
    console.log('\n📝 Test 5: Create Arena Admin');
    const adminEmail = `admin-${Date.now()}@test.com`;
    const createAdminRes = await request('POST', '/api/fg-admin/super-admin/admins', {
      arena_id: createdArenaId || 1,
      name: 'Test Admin',
      email: adminEmail,
    });
    let createdAdminId = null;
    if (createAdminRes.body.success && createAdminRes.body.data.admin?.id) {
      console.log('✅ Arena admin created successfully');
      createdAdminId = createAdminRes.body.data.admin.id;
      testsPassed++;
    } else {
      console.log('❌ Admin creation failed:', createAdminRes.body.message);
      testsFailed++;
    }

    // Test 6: Get Admins List
    console.log('\n📝 Test 6: Get Admins List');
    const adminsRes = await request('GET', `/api/fg-admin/super-admin/admins?arena_id=${createdArenaId || 1}`);
    if (adminsRes.statusCode === 200) {
      console.log('✅ Admins list API working');
      testsPassed++;
    } else {
      console.log('❌ Admins list API failed');
      testsFailed++;
    }

    // Test 7: Create Security Staff
    console.log('\n📝 Test 7: Create Security Staff');
    const securityEmail = `security-${Date.now()}@test.com`;
    const createSecurityRes = await request('POST', '/api/fg-admin/super-admin/security', {
      arena_id: createdArenaId || 1,
      name: 'Test Security',
      email: securityEmail,
      permissions: ['checkin', 'checkout'],
    });
    let createdSecurityId = null;
    if (createSecurityRes.body.success && createSecurityRes.body.data.staff?.id) {
      console.log('✅ Security staff created successfully');
      createdSecurityId = createSecurityRes.body.data.staff.id;
      testsPassed++;
    } else {
      console.log('❌ Security staff creation failed:', createSecurityRes.body.message);
      testsFailed++;
    }

    // Test 8: Get Security Staff List
    console.log('\n📝 Test 8: Get Security Staff List');
    const securityRes = await request('GET', `/api/fg-admin/super-admin/security?arena_id=${createdArenaId || 1}`);
    if (securityRes.statusCode === 200) {
      console.log('✅ Security staff list API working');
      testsPassed++;
    } else {
      console.log('❌ Security staff list API failed');
      testsFailed++;
    }

    // Test 9: Get Pending Approvals
    console.log('\n📝 Test 9: Get Pending Approvals');
    const approvalsRes = await request('GET', '/api/fg-admin/super-admin/approvals');
    if (approvalsRes.statusCode === 200) {
      console.log('✅ Approvals API working');
      testsPassed++;
    } else {
      console.log('❌ Approvals API failed');
      testsFailed++;
    }

    // Test 10: Generate Report
    console.log('\n📝 Test 10: Generate Report');
    const reportRes = await request('POST', '/api/fg-admin/super-admin/reports', {
      arena_id: createdArenaId || 1,
      report_type: 'daily',
      date_range_start: '2024-01-01',
      date_range_end: '2024-01-31',
    });
    if (reportRes.body.success && reportRes.body.data.id) {
      console.log('✅ Report generated successfully');
      testsPassed++;
    } else {
      console.log('❌ Report generation failed:', reportRes.body.message);
      testsFailed++;
    }

    // Test 11: Get Reports
    console.log('\n📝 Test 11: Get Reports');
    const getReportsRes = await request('GET', `/api/fg-admin/super-admin/reports?arena_id=${createdArenaId || 1}`);
    if (getReportsRes.statusCode === 200) {
      console.log('✅ Reports list API working');
      testsPassed++;
    } else {
      console.log('❌ Reports list API failed');
      testsFailed++;
    }

    // Test 12: Update Settings (Change Password)
    console.log('\n📝 Test 12: Change Password');
    const settingsRes = await request('PUT', '/api/fg-admin/super-admin/settings', {
      current_password: 'SuperAdmin@123',
      new_password: 'NewPassword@456',
      confirm_password: 'NewPassword@456',
    });
    if (settingsRes.body.success) {
      console.log('✅ Password change API working');
      testsPassed++;
    } else {
      console.log('❌ Password change failed:', settingsRes.body.message);
      testsFailed++;
    }

    // Test 13: Super Admin Dashboard Page
    console.log('\n📝 Test 13: Super Admin Dashboard Page');
    const dashboardRes = await request('GET', '/fg-admin/platform/super-admin');
    if (dashboardRes.statusCode === 200) {
      console.log('✅ Dashboard page loads successfully');
      testsPassed++;
    } else {
      console.log('❌ Dashboard page failed to load:', dashboardRes.statusCode);
      testsFailed++;
    }
 
    // Test 14: Super Admin Login Page
    console.log('\n📝 Test 14: Super Admin Login Page');
    const loginPageRes = await request('GET', '/fg-admin/login');
    if (loginPageRes.statusCode === 200) {
      console.log('✅ Login page loads successfully');
      testsPassed++;
    } else {
      console.log('❌ Login page failed to load:', loginPageRes.statusCode);
      testsFailed++;
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`✨ Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('='.repeat(50) + '\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
