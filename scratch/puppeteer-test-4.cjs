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
  
  // 3. Go to /dashboard
  console.log('Navigating to /dashboard...');
  await page.goto('https://agnelarenagoa.com/dashboard', { waitUntil: 'networkidle2' });
  let html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on /dashboard!');
  } else {
    console.log('NO CRASH on /dashboard!');
  }

  // 4. Go to /dashboard/profile
  console.log('Navigating to /dashboard/profile...');
  await page.goto('https://agnelarenagoa.com/dashboard/profile', { waitUntil: 'networkidle2' });
  html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on /dashboard/profile!');
  } else {
    console.log('NO CRASH on /dashboard/profile!');
  }
  
  await browser.close();
})();
