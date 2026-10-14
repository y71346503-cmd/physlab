// Dev helper: list elements wider than the viewport. Usage: node scripts/probe-overflow.mjs "<hash>" [tab]
import { chromium } from '@playwright/test';

const [hash = '#/', tab] = process.argv.slice(2);
const b = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const p = await b.newPage({ viewport: { width: 360, height: 800 } });
await p.goto((process.env.BASE_URL ?? 'http://localhost:5173/') + hash);
await p.waitForTimeout(500);
if (tab) await p.getByRole('tab', { name: new RegExp(tab) }).click();
await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth + 1) out.push(`${el.tagName}.${el.className} right=${Math.round(rect.right)} w=${Math.round(rect.width)}`);
  }
  return out.slice(0, 15);
});
console.log(r.join('\n') || 'no overflow');
await b.close();
