// Checks the deployed site: loads, installs the service worker, then works offline.
// Usage: node scripts/check-live.mjs https://<user>.github.io/<repo>/
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'https://y71346503-cmd.github.io/physlab/';
const ids = ['pendulum', 'projectile', 'incline', 'circuit', 'lens', 'archimedes'];
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
await context.setOffline(true);
await page.reload();
const cards = await page.locator('.card').count();
const opened = [];
for (const id of ids) {
  await page.goto(`${base}#/exp/${id}`);
  await page.locator('.scene canvas').waitFor({ timeout: 10000 });
  await page.getByRole('tab', { name: 'Theory' }).click();
  await page.locator('.theory .katex').first().waitFor({ timeout: 10000 });
  opened.push(id);
}
console.log(JSON.stringify({ base, offlineCards: cards, offlineExperiments: opened, errors }));
await browser.close();
