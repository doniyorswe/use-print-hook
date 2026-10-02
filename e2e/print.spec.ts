import { expect, test, type Page } from '@playwright/test';

/** Replaces the print iframe's `print()` with a snapshot of computed styles, then fires `afterprint`. */
async function capturePrint(page: Page) {
  await page.evaluate(() => {
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLIFrameElement) || !node.hasAttribute('data-uph-frame')) return;
          const win = node.contentWindow!;
          win.print = () => {
            const doc = win.document;
            const color = (sel: string) => {
              const el = doc.querySelector(sel);
              return el ? win.getComputedStyle(el).color : null;
            };
            window.__result.print = {
              title: doc.title,
              titleColor: color('.title'),
              emotionColor: color('.emotion'),
              font:
                doc.querySelector('.font') &&
                win.getComputedStyle(doc.querySelector('.font')!).fontFamily,
              rows: doc.querySelector('#rows')?.textContent ?? null,
              hasCanvas: !!doc.querySelector('canvas'),
              chartSrc: doc.querySelector('img#chart')?.getAttribute('src')?.slice(0, 22) ?? null,
              input: (doc.querySelector('#name') as HTMLInputElement | null)?.value ?? null,
              hidden: doc.querySelector('#hidden')
                ? win.getComputedStyle(doc.querySelector('#hidden')!).display
                : 'absent',
              pageCss: Array.from(doc.querySelectorAll('style'), (s) => s.textContent)
                .join('')
                .includes('@page { size: A4; margin: 10mm; }'),
              h2: doc.querySelector('h2')?.textContent ?? null,
            };
            win.dispatchEvent(new Event('afterprint'));
          };
        });
      }
    }).observe(document.body, { childList: true });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await capturePrint(page);
});

test('prints a Printable with copied styles, form state, canvas and print mode', async ({
  page,
}) => {
  await page.fill('#name', 'Doniyor');
  await page.click('#print');
  await page.waitForFunction(() => window.__result.print);
  const r = await page.evaluate(() => window.__result.print);
  expect(r).toMatchObject({
    title: 'E2E',
    titleColor: 'rgb(255, 0, 0)',
    emotionColor: 'rgb(0, 128, 0)',
    rows: 'all rows',
    hasCanvas: false,
    chartSrc: 'data:image/png;base64,',
    input: 'Doniyor',
    pageCss: true,
  });
  expect(String((r as { font: string }).font)).toContain('Courier New');
  expect((r as { hidden: string }).hidden).toBe('absent');
  await expect(page.locator('#rows')).toHaveText('page 1');
  await expect(page.locator('iframe[data-uph-frame]')).toHaveCount(0);
});

test('prints unmounted content with app styles', async ({ page }) => {
  await page.click('#content');
  await page.waitForFunction(() => window.__result.print);
  const r = await page.evaluate(() => window.__result.print);
  expect(r).toMatchObject({ h2: 'Unmounted', titleColor: 'rgb(255, 0, 0)' });
});

test('exports a multi-page PDF', async ({ page }) => {
  await page.click('#pdf');
  await page.waitForFunction(() => window.__result.pages, null, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__result.pages)).toBeGreaterThanOrEqual(2);
});

test('exports a PNG', async ({ page }) => {
  await page.click('#png');
  await page.waitForFunction(() => window.__result.png, null, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__result.png)).toBeGreaterThan(1000);
});
