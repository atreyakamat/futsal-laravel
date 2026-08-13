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
  await page.click('button[type="submit"]');
  
  console.log('Waiting for navigation after login...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log('Current URL:', page.url());
  
  // 3. Check for crash
  const html = await page.content();
  if (html.includes('SOMETHING WENT WRONG')) {
    console.log('CRASH FOUND on Dashboard!');
  } else {
    console.log('NO CRASH on Dashboard!');
  }

  // 4. Go to /dashboard/profile just in case
  await page.goto('https://agnelarenagoa.com/dashboard/profile', { waitUntil: 'networkidle2' });
  const html2 = await page.content();
  if (html2.includes('SOMETHING WENT WRONG')) {
    console.log('CRASH FOUND on Profile!');
  } else {
    console.log('NO CRASH on Profile!');
  }
  
  await browser.close();
})();
