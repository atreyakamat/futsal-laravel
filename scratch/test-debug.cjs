const http = require('http');

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  setFromHeaders(headers) {
    const setCookies = headers['set-cookie'];
    if (setCookies) {
      for (const cookie of setCookies) {
        const parts = cookie.split(';')[0];
        const [name, value] = parts.split('=');
        this.cookies.set(name.trim(), value ? value.trim() : '');
      }
    }
  }
  getCookieHeader() {
    const list = [];
    for (const [name, value] of this.cookies.entries()) {
      list.push(`${name}=${value}`);
    }
    return list.join('; ');
  }
}

function request(method, path, body = null, cookieJar = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:3000' + path);
    const reqBody = body ? JSON.stringify(body) : '';

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookieJar && { 'Cookie': cookieJar.getCookieHeader() }),
      },
    };

    const req = http.request(options, (res) => {
      if (cookieJar) {
        cookieJar.setFromHeaders(res.headers);
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            body: parsed,
            headers: res.headers,
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            body: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(reqBody);
    req.end();
  });
}

async function main() {
  const saJar = new CookieJar();
  const login = await request('POST', '/api/auth/super-admin/login', {
    email: 'superadmin@example.com',
    password: 'SuperAdmin@123',
  }, saJar);

  console.log('Status Code:', login.statusCode);
  console.log('Headers:', login.headers);
  console.log('Body:', login.body);
  console.log('Cookies in Jar:', saJar.getCookieHeader());
}

main();
