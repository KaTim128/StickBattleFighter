import { expect, type Page, test } from '@playwright/test';

interface Hook {
  player: { ability: string | null; stamina: number; meter: number };
  dummy: { hp: number; burning: boolean };
  abilities: { slots: { slot: string; cooldownS: number; block: string | null }[]; meter: number } | null;
  sfx: string[];
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Five metres from the training dummy (19, 13), facing it: inside Fire Bolt's lock range.
  await page.goto('/?scene=training-yard&playerAt=14,13');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('abilities: Q fires a Fire Bolt that hits and burns the dummy; the ability bar shows the cooldown', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  await expect(page.locator('.ability-bar')).toBeVisible();
  await expect(page.locator('.ability-slot')).toHaveCount(4);
  await expect(page.locator('.ability-button').first()).toBeHidden(); // desktop never shows touch buttons

  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 5000 }).toBeLessThan(1000);
  expect((await hook(page)).sfx).toEqual(expect.arrayContaining(['fire-charge', 'fire-whoosh']));
  await expect(page.locator('.ability-slot[data-slot="a1"]')).toHaveClass(/cooling/);
  await page.screenshot({ path: testInfo.outputPath('fire-bolt.png') });

  // The ultimate is not ready at the start (charge meter, OQ-04).
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(200);
  expect((await hook(page)).player.ability).not.toBe('meteorFist');
  expect(errors).toEqual([]);
});

test('touch: five combat buttons (MELEE, A1–A3, ULT); A1 casts the Fire Bolt', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors);
  await page.touchscreen.tap(30, 30); // first touch reveals the touch controls
  await expect(page.locator('.melee-button')).toBeVisible();
  await expect(page.locator('.ability-button')).toHaveCount(4);
  for (const slot of ['a1', 'a2', 'a3', 'ult']) {
    await expect(page.locator(`.ability-button[data-slot="${slot}"]`)).toBeVisible();
  }
  await expect(page.locator('.ability-bar')).toBeHidden(); // cooldowns are drawn on the buttons instead
  await page.locator('.ability-button[data-slot="a1"]').tap();
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 5000 }).toBeLessThan(1000);
  await page.screenshot({ path: testInfo.outputPath('touch-buttons.png') });
  expect(errors).toEqual([]);
});
