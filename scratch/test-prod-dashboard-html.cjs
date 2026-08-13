const https = require('https');

async function loginAndFetchDashboard() {
  const loginPayload = JSON.stringify({
    email: 'superadmin@agnelarenagoa.com',
    password: 'SuperAdmin@123'
  });

  const reqOptions = {
    hostname: 'agnelarenagoa.com',
    port: 443,
    path: '/api/auth/super-admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginPayload.length
    }
  };

  const loginReq = https.request(reqOptions, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      const cookies = res.headers['set-cookie'];
      const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
      
      const pReq = https.request({
        hostname: 'agnelarenagoa.com',
        port: 443,
        path: '/fg-admin/platform/super-admin',
        method: 'GET',
        headers: { 'Cookie': cookieHeader }
      }, (pRes) => {
        let pData = '';
        pRes.on('data', d => pData += d);
        pRes.on('end', () => {
          console.log('--- HTML RESPONSE ---');
          console.log(pData);
        });
      });
      pReq.end();
    });
  });

  loginReq.write(loginPayload);
  loginReq.end();
}

loginAndFetchDashboard();
