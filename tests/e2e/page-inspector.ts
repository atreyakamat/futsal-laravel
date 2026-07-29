/**
 * Page Inspector — dumps DOM structure and screenshots
 * to understand what is actually rendered in the browser.
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3090';
const ARTIFACTS_DIR = 'C:\\Users\\atkam\\.gemini\\antigravity-cli\\brain\\a0f9fe20-b503-48f4-a355-e86cbaef028e';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to arena page...');
  await page.goto(`${BASE_URL}/arena/aiem-assagao`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Wait a bit for React hydration
  await page.waitForTimeout(4000);

  // Screenshot
  const ss1 = path.join(ARTIFACTS_DIR, 'inspector_mobile_initial.png');
  await page.screenshot({ path: ss1, fullPage: true });
  console.log('Screenshot saved:', ss1);

  // DOM analysis
  const domInfo = await page.evaluate(() => {
    const info: Record<string, unknown> = {};
    
    // All slot-related elements
    info.slotCards = document.querySelectorAll('.slot-card').length;
    info.slotCardsNotDisabled = document.querySelectorAll('.slot-card:not([disabled])').length;
    info.bookingForm = document.querySelector('[data-testid="booking-form"]') ? 'found' : 'not found';
    info.dateSelector = document.querySelector('[data-testid="date-selector"]') ? 'found' : 'not found';
    
    // What input fields exist?
    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, visible: el.offsetParent !== null
    }));
    info.inputs = inputs;
    
    // What buttons exist?
    const buttons = Array.from(document.querySelectorAll('button')).slice(0, 20).map(el => ({
      id: el.id, text: el.textContent?.trim().slice(0, 50), disabled: el.disabled
    }));
    info.buttons = buttons;
    
    // Check for booking steps
    info.steps = {
      step1: document.querySelector('[data-step="1"]') ? 'found' : 'not found',
      step2: document.querySelector('[data-step="2"]') ? 'found' : 'not found',
      step3: document.querySelector('[data-step="3"]') ? 'found' : 'not found',
    };
    
    // Error messages
    const errors = Array.from(document.querySelectorAll('[class*="error"], [class*="Error"]')).map(el => el.textContent?.trim().slice(0, 100));
    info.errorMessages = errors.slice(0, 5);
    
    // Body classes
    info.bodyClasses = document.body.className;
    
    // Check for key selectors
    info.nameInput = document.querySelector('#booking_customer_name') ? 'found' : 'not found';
    info.mobileInput = document.querySelector('#booking_customer_mobile') ? 'found' : 'not found';
    info.emailInput = document.querySelector('#booking_customer_email') ? 'found' : 'not found';
    
    // All IDs on the page
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id.length > 0);
    info.allIds = allIds.slice(0, 50);
    
    // Any date picker or calendar
    info.datePicker = document.querySelector('[class*="date"], [class*="calendar"], [class*="picker"]') ? 'found' : 'not found';
    
    // Classes on main content area
    const mainContent = document.querySelector('main');
    info.mainClasses = mainContent?.className?.slice(0, 200);
    info.mainText = mainContent?.textContent?.slice(0, 500);
    
    return info;
  });

  console.log('\n=== DOM INFO ===');
  console.log(JSON.stringify(domInfo, null, 2));

  // Also scroll down and screenshot
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(1000);
  const ss2 = path.join(ARTIFACTS_DIR, 'inspector_mobile_scrolled.png');
  await page.screenshot({ path: ss2, fullPage: false });
  console.log('Scrolled Screenshot saved:', ss2);

  await browser.close();
  console.log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
