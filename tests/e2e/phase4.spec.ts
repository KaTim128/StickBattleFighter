import { expect, type Page, test } from '@playwright/test';

interface Hook {
  scene: string | null;
  player: {
    x: number;
    y: number;
    attack: string | null;
    comboStep: number;
    hits: number;
    heightM: number;
    airborne: boolean;
  };
  dummy: { x: number; y: number };
  doors: { id: string; broken: boolean; brokenBy: string | null; open: boolean }[];
  camera: { x: number };
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[], query = '') {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  expect((await hook(page)).scene).toBe('office');
}

test('office: walking into the door swings it open into the boss room; the 1-2-3 combo smashes it instead', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  test.setTimeout(60_000);
  const errors: string[] = [];
  // Start in the open area before the boss door (the cubicles fill the centre since 11/11/2026).
  // Lined up so walking down-right on screen (D+S, the 2.5D view) reaches the door at x ≈ 26.2.
  await open(page, errors, '?playerAt=23,4.95&dummyAt=3,1.9&character=base-stickman'); // shared rules on the Base Stickman
  await page.screenshot({ path: testInfo.outputPath('door-shut.png') });

  // Walk into the door: it swings open (REQ-ENV-13) and the player walks through.
  const cam0 = (await hook(page)).camera.x;
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await expect.poll(async () => (await hook(page)).doors[0]!.open, { timeout: 15_000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('door-open.png') });
  await expect.poll(async () => (await hook(page)).player.x, { timeout: 15_000 }).toBeGreaterThan(27); // through the door
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  let s = await hook(page);
  expect(s.doors[0]!.broken).toBe(false);
  await expect.poll(async () => (await hook(page)).camera.x, { timeout: 5000 }).toBeGreaterThan(cam0 + 1); // followed
  // Clear of the doorway, it swings shut again.
  await expect.poll(async () => (await hook(page)).doors[0]!.open, { timeout: 5000 }).toBe(false);

  // Breaking it still works: stand just short of the door (not pushing it) and land the 1-2-3.
  // The door is at x ≈ 26.2 (the apex of the curved wall).
  await open(page, errors, '?playerAt=25.3,6&dummyAt=3,1.9&character=base-stickman');
  // Face the door with a short step (too short to push it open): hold D until the player has
  // actually moved, so a loaded browser cannot drop the tap and leave them facing away.
  const startX = (await hook(page)).player.x;
  await page.keyboard.down('KeyD');
  await expect
    .poll(async () => (await hook(page)).player.x, { timeout: 3000, intervals: [10] })
    .toBeGreaterThan(startX + 0.03);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);
  // Keep pressing through the 1-2-3 until the door gives (a loaded browser can poll too slowly
  // to see the short finisher frame, so wait on the outcome rather than the animation state).
  for (let i = 0; i < 60 && !(await hook(page)).doors[0]!.broken; i++) {
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(110);
  }
  s = await hook(page);
  expect(s.doors[0]!.broken).toBe(true);
  expect(['strike', 'knockback']).toContain(s.doors[0]!.brokenBy);
  await page.screenshot({ path: testInfo.outputPath('door-smashed.png') });
  expect(errors).toEqual([]);
});

test('higher jump: the fighter rises about a metre off the floor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors: string[] = [];
  await open(page, errors);
  let peak = 0;
  await page.keyboard.press('Space');
  for (let i = 0; i < 60; i++) {
    peak = Math.max(peak, (await hook(page)).player.heightM);
    await page.waitForTimeout(15);
  }
  expect(peak).toBeGreaterThan(0.8);
  expect(errors).toEqual([]);
});

test('touch: the MELEE button appears, throws the jab, and never highlights its label', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors);
  await page.touchscreen.tap(30, 30); // first touch reveals the touch controls
  await expect(page.locator('.melee-button')).toBeVisible();
  await page.locator('.melee-button').tap();
  await expect.poll(async () => (await hook(page)).player.attack, { timeout: 3000 }).toBe('jab');
  // Holding MELEE (block) must not select or highlight its label (owner, 11/11/2026).
  const style = await page.locator('.melee-button').evaluate((b) => {
    const cs = getComputedStyle(b);
    return { select: cs.userSelect || cs.webkitUserSelect, tap: cs.getPropertyValue('-webkit-tap-highlight-color') };
  });
  expect(style.select).toBe('none');
  expect(style.tap).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  const blocked = await page.locator('.melee-button').evaluate((b) => {
    const e = new Event('contextmenu', { bubbles: true, cancelable: true });
    b.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(blocked).toBe(true); // long-press menu suppressed
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  expect(errors).toEqual([]);
});
