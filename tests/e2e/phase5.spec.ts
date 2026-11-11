import { expect, type Page, test } from '@playwright/test';
import { comboToHeavy } from './combo';

interface Hook {
  player: { hp: number; stamina: number; state: string; attack: string | null };
  dummy: { x: number; y: number; hp: number; state: string };
  dummyAttacks: boolean;
}
type DebugWindow = Window & { __stickmanDebug?: Hook & { player: Hook['player'] & { x: number; y: number } } };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Start right beside the dummy (19,13), facing it: positioning by keyboard is covered by the Phase 2 tests.
  await page.goto('/?scene=training-yard&playerAt=17.95,13&character=base-stickman'); // shared rules on the Base Stickman
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('combat: combo damage with floating numbers; hold J to block; T toggles dummy attacks', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  test.setTimeout(60_000);
  const errors: string[] = [];
  await open(page, errors);
  await page.waitForTimeout(300);

  await comboToHeavy(page, async () => (await hook(page)).player.attack);
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 3000 }).toBeLessThanOrEqual(760);
  await expect(page.locator('.combat-text').first()).toBeAttached(); // floating numbers appeared
  await page.screenshot({ path: testInfo.outputPath('combo-damage.png') });

  // Hold J: guard up, no attack.
  await page.waitForTimeout(1500);
  await page.keyboard.down('KeyJ');
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000 }).toBe('guarding');
  expect((await hook(page)).player.attack).toBeNull();
  await page.screenshot({ path: testInfo.outputPath('guard.png') });
  await page.keyboard.up('KeyJ');
  await expect.poll(async () => (await hook(page)).player.state).toBe('free');

  await page.keyboard.press('KeyT');
  await expect.poll(async () => (await hook(page)).dummyAttacks).toBe(true);
  await expect(page.locator('#status')).toContainText('dummy attacks ON');
  expect(errors).toEqual([]);
});

test('combat: with dummy attacks on, an unguarded player takes damage; Shift dodges', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  test.setTimeout(60_000);
  const errors: string[] = [];
  await open(page, errors);
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyT');
  await expect.poll(async () => (await hook(page)).player.hp, { timeout: 8000 }).toBeLessThan(1000);
  await page.keyboard.press('KeyT'); // dummy attacks off again, so the player can recover
  // A stunned fighter cannot dodge: wait until free, then dodge.
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000, intervals: [20] }).toBe('free');
  await expect.poll(async () => (await hook(page)).player.stamina, { timeout: 3000 }).toBe(100);
  await page.keyboard.press('ShiftLeft');
  await expect
    .poll(async () => (await hook(page)).player.stamina, { timeout: 2000, intervals: [20] })
    .toBeLessThan(100);
  expect(errors).toEqual([]);
});
