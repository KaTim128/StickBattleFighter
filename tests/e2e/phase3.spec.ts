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

/** A world point (z metres up) in the 2.5D view's units (TD-045); the camera works in these. */
const C = Math.SQRT1_2;
const iso = (p: P, z = 0) => ({ x: (p.x - p.y) * C, y: (p.x + p.y) * C * 0.5 - z });

/** Screen position (CSS px) of a view-space point under the current camera. */
function toScreen(cam: Cam, p: P, view: { width: number; height: number }) {
  return { x: view.width / 2 + (p.x - cam.x) * cam.scale, y: view.height / 2 + (p.y - cam.y) * cam.scale };
}

test('camera zooms out to keep the player and the dummy on screen, within limits', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?scene=training-yard');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect.poll(async () => (await state(page)).cam.framed).toBe(1);
  const before = (await state(page)).cam.shortSideM;

  // Walk straight up the screen, away from the dummy (clear of pillars), until the on-screen height
  // between them needs a clear zoom-out: 8.6 view units + 2 × 1.8 padding > 11 (closest zoom) + 1.
  // Hold by distance, not time: slow software rendering in CI runs fewer steps per second.
  // (The camera works in the 2.5D view's units, TD-045.)
  await page.keyboard.down('KeyW');
  const deadline = Date.now() + 15_000;
  for (;;) {
    const s = await state(page);
    if (iso(s.dummy).y - iso(s.player).y > 8.6 || Date.now() > deadline) break;
  }
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await state(page)).cam.shortSideM, { timeout: 5000 }).toBeGreaterThan(before + 1);
  await page.waitForTimeout(800);

  const view = page.viewportSize()!;
  const s = await state(page);
  expect(s.cam.shortSideM).toBeLessThanOrEqual(17.01);
  // Both fighters must be on screen; fighters more than 16 view units apart are deliberately not framed.
  const gap = iso(s.dummy).y - iso(s.player).y;
  const distance = Math.hypot(iso(s.dummy).x - iso(s.player).x, gap);
  expect(gap, JSON.stringify(s)).toBeGreaterThan(8.6);
  expect(distance, JSON.stringify(s)).toBeLessThan(16); // the scenario this test is about
  expect(s.cam.framed).toBe(1);
  const mustShow = [iso(s.player), iso(s.dummy, 1.6), iso(s.dummy)];
  for (const p of mustShow) {
    const sp = toScreen(s.cam, p, view);
    const where = `point ${JSON.stringify(p)} → screen ${JSON.stringify(sp)}; state ${JSON.stringify(s)}`;
    expect(sp.x, where).toBeGreaterThan(0);
    expect(sp.x, where).toBeLessThan(view.width);
    expect(sp.y, where).toBeGreaterThan(0);
    expect(sp.y, where).toBeLessThan(view.height);
  }
  await page.screenshot({ path: testInfo.outputPath('framing.png') });
  expect(errors).toEqual([]);
});

test('debug impact key shakes the camera, which then settles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  await page.goto('/?scene=training-yard&debug');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await state(page)).cam.trauma).toBeGreaterThan(0);
  await expect.poll(async () => (await state(page)).cam.trauma, { timeout: 5000 }).toBe(0);
  expect((await state(page)).cam.shakeOffset).toBe(0);
});

test('without the debug overlay, the impact key does nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  await page.goto('/?scene=training-yard');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  expect((await state(page)).cam.trauma).toBe(0);
});
