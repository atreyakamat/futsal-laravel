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
      console.log('Login Status:', res.statusCode);
      
      const cookies = res.headers['set-cookie'];
      const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
      
      const reqs = ['/', '/fg-admin/platform/super-admin', '/dashboard', '/fg-admin/platform/arenas'];

      reqs.forEach(path => {
        const pReq = https.request({
          hostname: 'agnelarenagoa.com',
          port: 443,
          path,
          method: 'GET',
          headers: { 'Cookie': cookieHeader }
        }, (pRes) => {
          let pData = '';
          pRes.on('data', d => pData += d);
          pRes.on('end', () => {
            const isError = pData.toLowerCase().includes('something went wrong');
            if (isError || pRes.statusCode === 500) {
              console.log(`CRASH DETECTED on ${path} (Status: ${pRes.statusCode})`);
            } else {
              console.log(`SUCCESS on ${path} (Status: ${pRes.statusCode})`);
            }
          });
        });
        pReq.end();
      });
    });
  });

  loginReq.write(loginPayload);
  loginReq.end();
}

loginAndFetchDashboard();
