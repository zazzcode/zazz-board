#!/usr/bin/env node
/**
 * Captures a screenshot of the project page with token pre-set.
 * Run: npx playwright run scripts/screenshot-project-page.mjs
 * Or: node scripts/screenshot-project-page.mjs (uses playwright programmatically)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const BASE = 'http://localhost:3001';
const OUT = join(__dirname, '../project-page-screenshot.png');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome', // Use system Chrome if installed
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set token before any navigation so app sees it on load
  await context.addInitScript((token) => {
    localStorage.setItem('TB_TOKEN', token);
  }, TOKEN);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Home page shows projects; ensure we're there
  await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: OUT, fullPage: true });
  console.log('Screenshot saved to', OUT);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
