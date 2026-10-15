// Frame rate of the running pendulum with the CPU slowed down 4x (a mid-range phone).
// Usage: start `npm run preview`, then `node scripts/perf.mjs` (PW_CHANNEL=msedge on Windows).
import { chromium } from '@playwright/test';

const url = (process.env.BASE_URL ?? 'http://localhost:4173/') + '#/exp/';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
for (const id of ['pendulum', 'projectile', 'incline']) {
  await page.goto(url + id);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Start', exact: true }).first().click();
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = (t) => {
          frames++;
          if (t - t0 < 3000) requestAnimationFrame(tick);
          else resolve((frames * 1000) / (t - t0));
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(`${id}: ${fps.toFixed(1)} fps at 4x CPU slowdown`);
}
await browser.close();
