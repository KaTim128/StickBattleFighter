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
  doors: { id: string; broken: boolean; brokenBy: string | null }[];
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

test('office: walking into the door keeps it shut; the 1-2-3 combo smashes it; the camera follows into the boss room', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  test.setTimeout(60_000);
  const errors: string[] = [];
  await open(page, errors);

  // Walk right along the door's row, shoving the dummy all the way to the door, and keep pushing.
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await hook(page)).dummy.x, { timeout: 20_000 }).toBeGreaterThan(25);
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyD');
  let s = await hook(page);
  expect(s.doors[0]!.broken).toBe(false); // contact never opens it
  expect(s.player.x).toBeLessThan(26);

  // 1-2-3: jab → hook → heavy finisher.
  for (const step of ['jab', 'hook', 'heavy']) {
    await page.keyboard.press('KeyJ');
    await expect.poll(async () => (await hook(page)).player.attack, { timeout: 3000 }).toBe(step);
  }
  await expect.poll(async () => (await hook(page)).doors[0]!.broken, { timeout: 5000 }).toBe(true);
  s = await hook(page);
  expect(['strike', 'knockback']).toContain(s.doors[0]!.brokenBy);
  expect(s.player.hits).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: testInfo.outputPath('door-smashed.png') });

  // Walk through into the boss room; the camera glides after.
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await hook(page)).player.x, { timeout: 15_000 }).toBeGreaterThan(29);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await hook(page)).camera.x, { timeout: 5000 }).toBeGreaterThan(26);
  await page.screenshot({ path: testInfo.outputPath('boss-room.png') });
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

test('touch: the MELEE button appears and throws the jab', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch test');
  const errors: string[] = [];
  await open(page, errors);
  await page.touchscreen.tap(30, 30); // first touch reveals the touch controls
  await expect(page.locator('.melee-button')).toBeVisible();
  await page.locator('.melee-button').tap();
  await expect.poll(async () => (await hook(page)).player.attack, { timeout: 3000 }).toBe('jab');
  expect(errors).toEqual([]);
});
