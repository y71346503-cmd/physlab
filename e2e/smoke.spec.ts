import { expect, test, type Page } from '@playwright/test';

const EXPERIMENTS = ['pendulum', 'projectile', 'incline', 'circuit', 'lens', 'archimedes'];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function noHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(0);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test('home page lists all experiments', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.card')).toHaveCount(EXPERIMENTS.length);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(scheme);
      expect(errors).toEqual([]);
    });

    for (const id of EXPERIMENTS) {
      test(`${id} opens with every tab`, async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(`./#/exp/${id}`);
        await expect(page.locator('.scene canvas')).toBeVisible();
        for (const tab of ['Theory', 'Tasks', 'Lab work']) {
          await page.getByRole('tab', { name: new RegExp(tab) }).click();
          await expect(page.getByRole('tabpanel')).toBeVisible();
        }
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('phone width 360 px', () => {
  test.use({ viewport: { width: 360, height: 760 } });

  test('home has no horizontal scroll', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.card').first()).toBeVisible();
    await noHorizontalScroll(page);
  });

  for (const id of EXPERIMENTS) {
    test(`${id} has no horizontal scroll`, async ({ page }) => {
      await page.goto(`./#/exp/${id}`);
      await expect(page.locator('.scene canvas')).toBeVisible();
      await noHorizontalScroll(page);
      for (const tab of ['Tasks', 'Lab work']) {
        await page.getByRole('tab', { name: new RegExp(tab) }).click();
        await noHorizontalScroll(page);
      }
    });
  }
});

test('share link restores parameters', async ({ page }) => {
  await page.goto('./#/exp/pendulum?L=1.5&world=1');
  await expect(page.getByLabel('Length, m')).toHaveValue('1.50');
  await expect(page.getByLabel('Location')).toHaveValue('1');
  await page.getByLabel('Length, m').fill('0,8');
  await page.getByLabel('Length, m').press('Enter');
  await expect(page).toHaveURL(/L=0\.8/);
});

test('circuit lab: record points and get the resistance', async ({ page }) => {
  await page.goto('./#/exp/circuit?R1=20');
  await page.getByRole('tab', { name: /Lab work/ }).click();
  const emf = page.getByLabel('EMF of the source, V');
  for (const v of ['2', '4', '6', '8', '10']) {
    await emf.fill(v);
    await emf.press('Enter');
    await page.getByRole('button', { name: 'Record measurement' }).click();
  }
  await expect(page.locator('table.data tbody tr')).toHaveCount(5);
  const result = page.locator('.result').first();
  await expect(result).toContainText('R =');
  await expect(result).toContainText('Reference: 20');
});

test('numeric task accepts a decimal comma', async ({ page }) => {
  await page.goto('./#/exp/lens');
  await page.getByRole('tab', { name: /Tasks/ }).click();
  const card = page.locator('article.task').filter({ hasText: 'optical power' });
  const prompt = await card.locator('p').first().innerText();
  const F = Number(/focal length of (\d+) cm/.exec(prompt)![1]);
  const sign = prompt.includes('diverging') ? -1 : 1;
  const answer = ((sign * 100) / F).toFixed(2).replace('.', ',');
  await card.getByLabel('Answer in dpt').fill(answer);
  await card.getByRole('button', { name: 'Check' }).click();
  await expect(card.getByRole('status')).toContainText('Correct');
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Make sure the worker controls the page before going offline.
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.card')).toHaveCount(EXPERIMENTS.length);
  for (const id of EXPERIMENTS) {
    await page.goto(`./#/exp/${id}`);
    await expect(page.locator('.scene canvas')).toBeVisible();
    await page.getByRole('tab', { name: 'Theory' }).click();
    await expect(page.locator('.theory .katex').first()).toBeVisible();
  }
  await context.setOffline(false);
});

test('pendulum lab: time oscillations with the stopwatch and record', async ({ page }) => {
  await page.goto('./#/exp/pendulum?L=0.25');
  await page.getByRole('tab', { name: /Lab work/ }).click();
  await page.getByRole('button', { name: 'Record measurement' }).click();
  await expect(page.getByRole('alert')).toContainText('stopwatch');
  await page.getByRole('button', { name: 'Start', exact: true }).first().click();
  const sw = page.getByRole('group', { name: 'Stopwatch' });
  await sw.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(3500);
  await sw.getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('button', { name: 'Record measurement' }).click();
  await expect(page.locator('table.data tbody tr')).toHaveCount(1);
  // L = 0.25 m: T is about 1.0 s, so 3.5 s holds 2 or 3 full oscillations.
  const n = Number(await page.locator('table.data tbody tr td').nth(2).innerText());
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(4);
});
