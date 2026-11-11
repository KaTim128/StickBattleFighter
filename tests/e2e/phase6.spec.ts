import { expect, type Page, test } from '@playwright/test';

interface Hook {
  player: { ability: string | null; stamina: number; meter: number; x: number; y: number };
  fillMeter(): void;
  dummy: { hp: number; burning: boolean };
  abilities: { slots: { slot: string; cooldownS: number; block: string | null }[]; meter: number } | null;
  sfx: string[];
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[], playerAt = '14,13') {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Default: five metres from the training dummy (19, 13), facing it: inside Fire Bolt's lock range.
  await page.goto(`/?scene=training-yard&playerAt=${playerAt}`);
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
  expect((await hook(page)).sfx).toEqual(expect.arrayContaining(['fire-charge', 'fireball-cast']));
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

test('ultimate aiming (desktop): I aims in a crouch, D moves the spot, I launches the leap there', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  await page.keyboard.press('KeyI');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500); // the aim moves in game time; a software-rendered browser runs slower than real time
  await page.keyboard.up('KeyW');
  const before = await hook(page);
  expect(before.player.ability).toBeNull(); // still aiming
  await page.screenshot({ path: testInfo.outputPath('ult-aiming.png') });
  await page.keyboard.press('KeyI');
  await expect
    .poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] })
    .toBe('meteorFist');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull(); // headroom for a slow software-rendered browser
  expect((await hook(page)).player.y).toBeLessThan(before.player.y - 1); // landed up the screen, where aimed
  expect(errors).toEqual([]);
});

test('ultimate aiming (touch): hold ULT, drag to aim, release to jump', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  // A spot with clear floor straight up the screen (the 2.5D view, TD-045): no pillar in the leap's way.
  await open(page, errors, '17,10');
  await page.touchscreen.tap(30, 30);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  const ult = page.locator('.ability-button[data-slot="ult"]');
  const box = (await ult.boundingBox())!;
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const start = (await hook(page)).player;
  const opts = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true };
  await ult.dispatchEvent('pointerdown', { ...opts, clientX: at.x, clientY: at.y });
  for (let i = 1; i <= 6; i++) {
    await page.evaluate(
      ([o, x, y]) =>
        window.dispatchEvent(
          new PointerEvent('pointermove', { ...(o as object), clientX: x as number, clientY: y as number }),
        ),
      [opts, at.x, at.y - i * 15] as const,
    );
  }
  await page.waitForTimeout(150);
  await page.evaluate(
    ([o, x, y]) =>
      window.dispatchEvent(
        new PointerEvent('pointerup', { ...(o as object), clientX: x as number, clientY: y as number }),
      ),
    [opts, at.x, at.y - 90] as const,
  );
  await expect
    .poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] })
    .toBe('meteorFist');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull(); // headroom for a slow software-rendered browser
  // Dragged up → jumped up the screen: in the 2.5D view screen y follows x + y (TD-045).
  const end = (await hook(page)).player;
  expect(end.x + end.y).toBeLessThan(start.x + start.y - 3);
  expect(errors).toEqual([]);
});
