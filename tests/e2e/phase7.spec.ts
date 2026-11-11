import { expect, type Page, test } from '@playwright/test';

interface Hook {
  player: { carrying: string | null; utility: 'jump' | 'pickup' | 'throw' };
  dummy: { hp: number };
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[], query: string) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

// Boss room: the player beside a meeting-room chair, the dummy across the room beyond the table.
const SPOT = '?playerAt=28.6,10.8&dummyAt=31.6,6.4&character=base-stickman';

test('Phase 7: G picks up the chair, G throws it over the table and it hits the dummy', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors, SPOT);
  await expect.poll(async () => (await hook(page)).player.utility, { timeout: 5000 }).toBe('pickup');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await hook(page)).player.carrying, { timeout: 5000 }).toBe('office-chair');
  await page.screenshot({ path: testInfo.outputPath('carry.png') });
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await hook(page)).player.carrying, { timeout: 5000 }).toBeNull();
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 10_000 }).toBeLessThan(1000);
  await page.screenshot({ path: testInfo.outputPath('thrown.png') });
  expect(errors).toEqual([]);
});

test('Phase 7 (touch): the utility button reads GRAB near an object, THROW while carrying', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors, SPOT);
  await page.touchscreen.tap(30, 30); // shows the touch controls
  const util = page.locator('.util-button');
  await expect(util).toHaveText('GRAB', { timeout: 5000 });
  await util.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 3, isPrimary: true, bubbles: true });
  await util.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 3, isPrimary: true, bubbles: true });
  await expect.poll(async () => (await hook(page)).player.carrying, { timeout: 5000 }).toBe('office-chair');
  await expect(util).toHaveText('THROW');
  expect(errors).toEqual([]);
});
