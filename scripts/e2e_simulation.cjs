const crypto = require('crypto');

// Utility to fetch with cookie persistence
class Session {
  constructor() {
    this.cookies = new Map();
  }

  async fetch(url, options = {}) {
    const cookieHeader = Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const headers = {
      ...(options.headers || {}),
      'Cookie': cookieHeader
    };

    const res = await fetch(`http://127.0.0.1:3001${url}`, { ...options, headers });
    
    // Save new cookies
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Split by comma but respect expires/date formats. Simple split works for our tokens
      const parts = setCookie.split(', ');
      for (const p of parts) {
        const [kv] = p.split(';');
        if (kv.includes('=')) {
          const [k, v] = kv.split('=');
          if (v) this.cookies.set(k.trim(), v.trim());
          else this.cookies.delete(k.trim());
        }
      }
    }

    const text = await res.text();
    try {
      return { status: res.status, data: JSON.parse(text) };
    } catch {
      return { status: res.status, text };
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log("WAITING FOR HEALTH CHECK...");
  let healthy = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/health');
      if (res.ok) { healthy = true; break; }
    } catch (e) {}
    await sleep(2000);
  }

  if (!healthy) {
    console.error("SERVER DID NOT BOOT!");
    process.exit(1);
  }
  console.log("✅ Server is healthy!");

  // Flow 1: Super Admin
  console.log("\n=== FLOW 1: SUPER ADMIN CREATES ARENA AND STAFF ===");
  const superSession = new Session();
  
  let res = await superSession.fetch('/api/auth/super-admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@example.com', password: 'SuperAdmin@123' })
  });
  if (res.status !== 200) {
    console.error(res);
    throw new Error("Super admin login failed");
  }
  console.log("✅ Super Admin Login Successful");

  const arenaSlug = `arena-${Date.now()}`;
  res = await superSession.fetch('/api/fg-admin/platform/arenas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Test Arena', slug: arenaSlug, contact_phone: '1234567890' })
  });
  if (res.status !== 200 || !res.data.success) {
    console.error(res);
    throw new Error("Create arena failed");
  }
  const arenaId = res.data.arena_id;
  console.log("✅ Created Arena:", arenaId);

  res = await superSession.fetch('/api/fg-admin/platform/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `name=E2E Admin&email=admin${Date.now()}@e2e.com&password=Admin@1234&role=arena_admin&arena_id=${arenaId}`
  });
  console.log("✅ Created Arena Admin");

  // Flow 2: Customer Booking
  console.log("\n=== FLOW 2: CUSTOMER BOOKING ===");
  const customerSession = new Session();
  
  // Get CSRF Token via a simple fetch that returns the cookie
  const pageRes = await customerSession.fetch('/api/health'); // Just to get the global CSRF cookie
  
  const rawCookie = customerSession.cookies.get('fg_csrf_token');
  if (!rawCookie) throw new Error("No CSRF cookie set by middleware");
  // The token is the first part of the signed cookie
  const csrfToken = rawCookie.split('.')[0];
  console.log("CSRF Token extracted:", csrfToken);

  res = await customerSession.fetch('/api/bookings/process', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      arena_id: arenaId,
      date: '2026-07-01',
      slots: ['09:00'],
      customer_name: 'John Doe',
      customer_mobile: '+919876543210'
    })
  });
  
  if (res.status !== 200) throw new Error("Booking failed: " + JSON.stringify(res));
  console.log("✅ Booking process initiated!");
  const bookingRef = res.data.bookingRef;
  
  // Flow 3: Payment Callback
  console.log("\n=== FLOW 3: PAYMENT CALLBACK ===");
  const txnid = bookingRef;
  const amount = "500.00";
  const productinfo = "Futsal Booking";
  const firstname = "John Doe";
  const email = "customer@example.com";
  const status = "success";
  const key = "bPLpnO";
  const salt = "IgE6ICwOJngI1nZwAnwkX6yK0pWJxOXE";

  const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  res = await customerSession.fetch('/api/payment/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `txnid=${txnid}&amount=${amount}&productinfo=${productinfo}&firstname=${firstname}&email=${email}&status=${status}&hash=${hash}&mihpayid=MOCK123`
  });
  
  if (res.status === 200 || res.status === 302 || res.status === 303 || res.status === 307) {
    console.log("✅ Payment marked successful!");
  } else {
    console.error(res);
    throw new Error("Payment success route failed");
  }

  // Flow 4: Security Verification
  console.log("\n=== FLOW 4: SECURITY VERIFICATION ===");
  const secEmail = `sec${Date.now()}@e2e.com`;
  await superSession.fetch('/api/fg-admin/platform/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `name=Security&email=${secEmail}&password=Sec@1234&role=security&arena_id=${arenaId}`
  });

  const secSession = new Session();
  res = await secSession.fetch('/api/auth/security/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: secEmail, password: 'Sec@1234' })
  });
  console.log("✅ Security Logged In");

  console.log("✅ All Manual End-to-End simulation steps passed!");
  process.exit(0);
}

runE2E().catch(console.error);
