const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('Navigating to LOCAL login...');
  await page.goto('http://localhost:3000/fg-admin/login', { waitUntil: 'networkidle2' });
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'superadmin@example.com');
  await page.type('input[type="password"]', 'password123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);
  
  console.log('Current URL after login:', page.url());
  
  let html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on platform dashboard!');
  } else {
    console.log('NO CRASH on platform dashboard!');
  }

  // Go to /fg-admin/platform/super-admin
  console.log('Navigating to /fg-admin/platform/super-admin...');
  await page.goto('http://localhost:3000/fg-admin/platform/super-admin', { waitUntil: 'networkidle2' });
  html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on super-admin!');
  } else {
    console.log('NO CRASH on super-admin!');
  }

  // Go to /dashboard
  console.log('Navigating to /dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  html = await page.content();
  if (html.toLowerCase().includes('something went wrong')) {
    console.log('CRASH FOUND on /dashboard!');
  } else {
    console.log('NO CRASH on /dashboard!');
  }
  
  await browser.close();
})();
