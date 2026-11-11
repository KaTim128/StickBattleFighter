import { expect, type Page, test } from '@playwright/test';

interface Player {
  x: number;
  y: number;
  speed: number;
  heightM: number;
  airborne: boolean;
  facing: 1 | -1;
  jumps: number;
}
type DebugWindow = Window & {
  __stickmanDebug?: { scene: string | null; player: Player | null; camera: { x: number; y: number } | null };
};
const player = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!.player!);
const camera = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!.camera!);
/** Where a world point lands on screen in the 2.5D view (TD-045): x across, y down. */
const C = Math.SQRT1_2;
const screenX = (p: { x: number; y: number }) => (p.x - p.y) * C;
const screenY = (p: { x: number; y: number }) => (p.x + p.y) * C * 0.5;

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/?scene=training-yard');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  expect(await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.scene)).toBe('training-yard');
}

test('keyboard moves the stickman front/back/left/right, it jumps, and the camera follows', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  await expect(page.locator('.touch-controls')).toBeHidden(); // REQ-CTL-2

  const start = await player(page);
  const cam0 = await camera(page);
  // Keys move along the screen in the 2.5D view: D walks right on screen.
  await page.keyboard.down('KeyD');
  await expect.poll(async () => screenX(await player(page))).toBeGreaterThan(screenX(start) + 2);
  expect((await player(page)).facing).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('walking.png') });
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await player(page)).speed).toBeLessThan(0.05);
  expect((await camera(page)).x).toBeGreaterThan(cam0.x + 1);

  const mid = await player(page);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => screenY(await player(page))).toBeLessThan(screenY(mid) - 1);
  await page.keyboard.up('KeyW');

  await page.keyboard.press('Space');
  await expect.poll(async () => (await player(page)).jumps).toBe(1);
  await expect.poll(async () => (await player(page)).airborne).toBe(false);

  // Holding left for long enough reaches the wall but never passes it.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(4500);
  await page.keyboard.up('ArrowLeft');
  const end = await player(page);
  expect(end.x).toBeGreaterThan(0.25); // inside the west wall…
  expect(end.y).toBeLessThan(20 - 0.25); // …and the south wall
  expect(errors).toEqual([]);
});

test('touch: the joystick moves the stickman and the utility button jumps', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors);
  const cdp = await context.newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });

  const viewport = page.viewportSize()!;
  const sx = viewport.width * 0.2;
  const sy = viewport.height * 0.7;
  const start = await player(page);
  await touch('touchStart', sx, sy);
  await expect(page.locator('.touch-controls')).toBeVisible();
  await expect(page.locator('.joystick')).toBeVisible();
  for (let i = 1; i <= 6; i++) await touch('touchMove', sx + i * 12, sy); // drag right past the rim
  await expect.poll(async () => (await player(page)).x).toBeGreaterThan(start.x + 2);
  await page.screenshot({ path: testInfo.outputPath('touch-walking.png') });
  await touch('touchEnd', sx + 72, sy);
  await expect.poll(async () => (await player(page)).speed).toBeLessThan(0.05);
  await expect(page.locator('.joystick')).toBeHidden();

  await page.locator('.util-button').tap();
  await expect.poll(async () => (await player(page)).jumps).toBe(1);
  expect(errors).toEqual([]);
});
