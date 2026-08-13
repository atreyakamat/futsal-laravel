const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 1. Go to Super Admin login
  console.log('Navigating to login...');
  await page.goto('https://agnelarenagoa.com/fg-admin/login', { waitUntil: 'networkidle2' });
  
  // 2. Type credentials
  await page.type('input[type="email"]', 'superadmin@agnelarenagoa.com');
  await page.type('input[type="password"]', 'SuperAdmin@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);
  
  console.log('Current URL after login:', page.url());
  
  // 3. Force go to super-admin dashboard
  console.log('Navigating to Super Admin Dashboard...');
  await page.goto('https://agnelarenagoa.com/fg-admin/platform/super-admin', { waitUntil: 'networkidle2' });
  
  console.log('Current URL:', page.url());
  
  // 4. Check for crash
  const html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on Super Admin Dashboard!');
  } else {
    console.log('NO CRASH on Super Admin Dashboard!');
  }
  
  await browser.close();
})();
