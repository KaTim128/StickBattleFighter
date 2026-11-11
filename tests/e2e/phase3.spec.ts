import { expect, type Page, test } from '@playwright/test';

interface Cam {
  x: number;
  y: number;
  scale: number;
  shortSideM: number;
  framed: number;
  trauma: number;
  shakeOffset: number;
}
interface P {
  x: number;
  y: number;
}
type DebugWindow = Window & { __stickmanDebug?: { camera: Cam | null; player: P | null; dummy: P | null } };
const state = (page: Page) =>
  page.evaluate(() => {
    const d = (window as DebugWindow).__stickmanDebug!;
    return { cam: d.camera!, player: d.player!, dummy: d.dummy! };
  });

/** Screen position (CSS px) of a world point under the current camera. */
function toScreen(cam: Cam, p: P, view: { width: number; height: number }) {
  return { x: view.width / 2 + (p.x - cam.x) * cam.scale, y: view.height / 2 + (p.y - cam.y) * cam.scale };
}

test('camera zooms out to keep the player and the dummy on screen, within limits', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect.poll(async () => (await state(page)).cam.framed).toBe(1);
  const before = (await state(page)).cam.shortSideM;

  // Walk up-left, away from the dummy (clear of pillars), until about 8 m of height separates them.
  // Hold by distance, not time: slow software rendering in CI runs fewer steps per second.
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyA');
  await expect
    .poll(
      async () => {
        const s = await state(page);
        return s.dummy.y - s.player.y;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(8);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await state(page)).cam.shortSideM, { timeout: 5000 }).toBeGreaterThan(before + 1);
  await page.waitForTimeout(800);

  const view = page.viewportSize()!;
  const s = await state(page);
  expect(s.cam.shortSideM).toBeLessThanOrEqual(17.01);
  for (const p of [s.player, { x: s.dummy.x, y: s.dummy.y - 1.6 }, s.dummy]) {
    const sp = toScreen(s.cam, p, view);
    expect(sp.x).toBeGreaterThan(0);
    expect(sp.x).toBeLessThan(view.width);
    expect(sp.y).toBeGreaterThan(0);
    expect(sp.y).toBeLessThan(view.height);
  }
  await page.screenshot({ path: testInfo.outputPath('framing.png') });
  expect(errors).toEqual([]);
});

test('debug impact key shakes the camera, which then settles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  await page.goto('/?debug');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await state(page)).cam.trauma).toBeGreaterThan(0);
  await expect.poll(async () => (await state(page)).cam.trauma, { timeout: 5000 }).toBe(0);
  expect((await state(page)).cam.shakeOffset).toBe(0);
});

test('without the debug overlay, the impact key does nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  expect((await state(page)).cam.trauma).toBe(0);
});
