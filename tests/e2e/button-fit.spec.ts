import { expect, test } from '@playwright/test';

/**
 * Owner, 12/11/2026: "text must not be outside of the button". Every visible HUD and touch button,
 * in every label it can show (JUMP / GRAB / THROW, DODGE, MELEE, the ultimate's READY), keeps its
 * text inside its own box, on desktop and on the compact phone layout.
 */
async function overflowing(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('button, .ability-slot')) {
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // Measure the text itself, not the box (overflow: hidden would otherwise mask a clip).
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent?.trim()) continue;
        range.selectNodeContents(t);
        const r = range.getBoundingClientRect();
        if (r.width === 0) continue;
        const style = getComputedStyle(el);
        const inset = Number.parseFloat(style.borderLeftWidth) || 0;
        if (r.left < box.left + inset - 0.5 || r.right > box.right - inset + 0.5)
          bad.push(
            `${el.className}: "${t.textContent.trim()}" ${r.width.toFixed(1)}px in ${(box.width - 2 * inset).toFixed(1)}px`,
          );
      }
    }
    return bad;
  });
}

async function check(page: import('@playwright/test').Page, character: string, touch: boolean) {
  await page.goto(`/?scene=training-yard&character=${character}`);
  await expect(page.locator('.ability-slot').first()).toBeVisible();
  if (touch) {
    await page.touchscreen.tap(30, 30); // first touch reveals the touch controls
    await expect(page.locator('.dodge-button')).toBeVisible();
    // The utility button's longest label.
    await page.evaluate(() => {
      const util = document.querySelector('.util-button');
      if (util) util.textContent = 'THROW';
    });
  }
  expect(await overflowing(page)).toEqual([]);
}

for (const character of ['inferno', 'rampage']) {
  test(`every button's text fits inside it (${character})`, async ({ page }, testInfo) => {
    await check(page, character, testInfo.project.name === 'mobile-chromium');
  });
}

test.describe('phone turned sideways (compact layout, smallest buttons)', () => {
  test.use({ viewport: { width: 839, height: 412 } });
  for (const character of ['inferno', 'rampage']) {
    test(`every touch button's text fits inside it (${character})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-chromium', 'touch layout');
      await check(page, character, true);
    });
  }
});
