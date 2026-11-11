import { expect, type Page, test } from '@playwright/test';

interface Hook {
  clash: { phase: string; powerA: number; powerB: number; remainingS: number } | null;
  dummy: { hp: number };
  sounds: string[];
  startClash(): void;
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

test('Punch Clash: mashing J fills the power bar live; the winner breaks through', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?scene=training-yard&playerAt=17.95,13');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.startClash());
  await expect(page.locator('.clash-hud')).toBeVisible();
  await expect(page.locator('.clash-prompt')).toContainText(/GET READY|MASH/);

  // Mash until the clash ends (about 4.4 s).
  const end = Date.now() + 9000;
  let sawPower = false;
  while (Date.now() < end) {
    await page.keyboard.press('KeyJ');
    const s = await hook(page);
    if (s.clash && s.clash.powerA > 3) sawPower = true;
    if (!s.clash && sawPower) break;
  }
  expect(sawPower).toBe(true);
  await expect(page.locator('.clash-banner')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('clash-result.png') });
  const sounds = (await hook(page)).sounds; // the last 16 played
  expect(sounds).toContain('block'); // exchange beats
  expect(sounds.some((id) => id === 'clash-break' || id === 'clash-collide')).toBe(true); // breakthrough or stalemate
  expect(errors).toEqual([]);
});
