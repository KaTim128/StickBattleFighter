import { expect, type Page, test } from '@playwright/test';

interface Hook {
  player: { ability: string | null; stamina: number; meter: number; x: number; y: number };
  fillMeter(): void;
  aimSpot: { x: number; y: number } | null;
  dummy: { hp: number; burning: boolean };
  abilities: { slots: { slot: string; cooldownS: number; block: string | null }[]; meter: number } | null;
  sfx: string[];
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[], playerAt = '14,13') {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Default: five metres from the training dummy (19, 13), facing it: inside the Fireball's lock range.
  await page.goto(`/?scene=training-yard&playerAt=${playerAt}`);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('abilities: Q fires a Fireball that hits and burns the dummy; the ability bar shows the cooldown', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  await expect(page.locator('.ability-bar')).toBeVisible();
  await expect(page.locator('.ability-slot')).toHaveCount(5);
  await expect(page.locator('.ability-button').first()).toBeHidden(); // desktop never shows touch buttons

  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 5000 }).toBeLessThan(1000);
  expect((await hook(page)).sfx).toEqual(expect.arrayContaining(['fireball-charge', 'fireball-cast']));
  await expect(page.locator('.ability-slot[data-slot="a1"]')).toHaveClass(/cooling/);
  await page.screenshot({ path: testInfo.outputPath('fireball.png') });

  // The ultimate is not ready at the start (charge meter, OQ-04).
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(200);
  expect((await hook(page)).player.ability).not.toBe('eruption');
  expect(errors).toEqual([]);
});

test('touch: six combat buttons (MELEE, A1–A4, ULT; owner 12/11/2026); A1 casts the Fireball', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors);
  await page.touchscreen.tap(30, 30); // first touch reveals the touch controls
  await expect(page.locator('.melee-button')).toBeVisible();
  await expect(page.locator('.ability-button')).toHaveCount(5);
  for (const slot of ['a1', 'a2', 'a3', 'a4', 'ult']) {
    await expect(page.locator(`.ability-button[data-slot="${slot}"]`)).toBeVisible();
  }
  await expect(page.locator('.ability-bar')).toBeHidden(); // cooldowns are drawn on the buttons instead
  await page.locator('.ability-button[data-slot="a1"]').tap();
  await expect.poll(async () => (await hook(page)).dummy.hp, { timeout: 5000 }).toBeLessThan(1000);
  await page.screenshot({ path: testInfo.outputPath('touch-buttons.png') });
  expect(errors).toEqual([]);
});

test('ultimate aiming (desktop): I aims in a crouch, W moves the spot, I again launches the leap there', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  await page.keyboard.press('KeyI');
  await expect
    .poll(() => page.evaluate(() => (window as DebugWindow).__stickmanDebug!.aimSpot), { timeout: 5000 })
    .not.toBeNull();
  const y0 = (await hook(page)).player.y;
  // Hold W until the spot is well up the screen from the fighter (game time; no fixed wait is safe on a slow CI browser).
  await page.keyboard.down('KeyW');
  await expect
    .poll(async () => y0 - (await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.aimSpot))!.y, {
      timeout: 30_000,
    })
    .toBeGreaterThan(2);
  await page.keyboard.up('KeyW');
  const before = await hook(page);
  expect(before.player.ability).toBeNull(); // still aiming
  await page.screenshot({ path: testInfo.outputPath('ult-aiming.png') });
  await page.keyboard.press('KeyI');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] }).toBe('eruption');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull(); // headroom for a slow software-rendered browser
  expect((await hook(page)).player.y).toBeLessThan(before.player.y - 1); // landed up the screen, where aimed
  expect(errors).toEqual([]);
});

test('ultimate aiming (touch, owner 12/11/2026): tap ULT, the joystick moves the target, ✕ cancels, ULT again jumps', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  // A spot with clear floor straight up the screen (the 2.5D view, TD-045): no pillar in the leap's way.
  await open(page, errors, '17,10');
  await page.touchscreen.tap(30, 30);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  const ult = page.locator('.ability-button[data-slot="ult"]');
  const cancel = page.locator('.aim-cancel-button');
  const hint = page.locator('.aim-hint');
  await expect(cancel).toBeHidden();
  // Tap ULT: targeting, with the instructions and the ✕; ✕ cancels and the stick moves the fighter again.
  await ult.tap();
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('joystick');
  await expect(cancel).toBeVisible();
  await cancel.tap();
  await expect(hint).toBeHidden();
  await expect(cancel).toBeHidden();
  expect((await hook(page)).player.ability).toBeNull();
  // Tap ULT, push the joystick up for a moment (the target moves, not the fighter), tap ULT again.
  const start = (await hook(page)).player;
  await ult.tap();
  const size = page.viewportSize()!;
  const stick = { x: size.width * 0.15, y: size.height * 0.7 };
  const opts = { pointerType: 'touch', pointerId: 9, isPrimary: true, bubbles: true };
  const send = (type: string, x: number, y: number) =>
    page.evaluate(
      ([t, o, cx, cy]) =>
        window.dispatchEvent(
          new PointerEvent(t as string, { ...(o as object), clientX: cx as number, clientY: cy as number }),
        ),
      [type, opts, x, y] as const,
    );
  await send('pointerdown', stick.x, stick.y);
  for (let i = 1; i <= 5; i++) await send('pointermove', stick.x, stick.y - i * 12);
  await page.waitForTimeout(3500); // the aim moves in game time; a software-rendered browser runs slower than real time
  await send('pointerup', stick.x, stick.y - 60);
  const mid = (await hook(page)).player;
  expect(Math.hypot(mid.x - start.x, mid.y - start.y)).toBeLessThan(0.1);
  await ult.tap();
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] }).toBe('eruption');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull();
  // Pushed up → jumped up the screen: in the 2.5D view screen y follows x + y (TD-045).
  const end = (await hook(page)).player;
  expect(end.x + end.y).toBeLessThan(start.x + start.y - 1.5);
  expect(errors).toEqual([]);
});
