// Dev helper: full-page screenshots of the running dev server.
// Usage: node scripts/shots.mjs <outDir> <url-hash> [width] [theme] [actions]
import { chromium } from '@playwright/test';

const [outDir, hash = '#/', width = '1280', theme = 'light', ...rest] = process.argv.slice(2);
const base = process.env.BASE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, colorScheme: theme });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + hash);
await page.waitForTimeout(700);
for (const a of rest) {
  if (a.startsWith('click:')) await page.getByRole('button', { name: a.slice(6) }).first().click();
  else if (a.startsWith('tab:')) await page.getByRole('tab', { name: new RegExp(a.slice(4)) }).click();
  else if (a.startsWith('wait:')) await page.waitForTimeout(Number(a.slice(5)));
}
await page.waitForTimeout(400);
const name = `${hash.replace(/[^a-z0-9]+/gi, '_')}_${width}_${theme}.png`;
if (process.env.SHOT_EL) await page.locator(process.env.SHOT_EL).first().screenshot({ path: `${outDir}/el_${name}` });
else await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ shot: name, overflowX: overflow, errors }));
await browser.close();
