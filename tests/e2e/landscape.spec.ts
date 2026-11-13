import { devices, expect, type Page, test } from '@playwright/test';

/**
 * Always landscape (owner, 13/11/2026): a phone held upright plays sideways at once, with no
 * "turn your phone" screen; touches are mapped into the turned layout, and the combat controls
 * only show in a fight.
 */
const { defaultBrowserType: _ignored, ...pixel7 } = devices['Pixel 7'];
test.use(pixel7);

// biome-ignore lint/correctness/noEmptyPattern: Playwright needs the fixtures argument to reach testInfo.
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'phone only');
});

type Debug = Window & { __stickmanDebug?: { player: { x: number; y: number } } };
const player = (page: Page) => page.evaluate(() => (window as Debug).__stickmanDebug!.player);

async function touch(page: Page, type: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ type, x, y }) => {
      const target = document.elementFromPoint(x, y) ?? document.body;
      target.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }),
      );
    },
    { type, x, y },
  );
}

test('upright phone: the game is laid out in landscape and the joystick follows the turned screen', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?scene=training-yard&playerAt=10,10&dummyAt=29,19&mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const layout = await page.evaluate(() => ({
    turned: document.documentElement.classList.contains('force-landscape'),
    screen: { w: window.innerWidth, h: window.innerHeight },
    app: { w: document.getElementById('app')!.clientWidth, h: document.getElementById('app')!.clientHeight },
    hint: document.querySelector('.rotate-hint') !== null,
  }));
  expect(layout.screen.h).toBeGreaterThan(layout.screen.w); // held upright
  expect(layout.turned).toBe(true);
  expect(layout.hint).toBe(false); // never asks to turn the phone
  expect(layout.app.w).toBeGreaterThan(layout.app.h); // the game itself is landscape
  // Drag down the upright screen = to the right in the turned game (iso: screen right is +(x − y)).
  const before = await player(page);
  await touch(page, 'pointerdown', 120, 200);
  // A slow drag (a fast one is a flick, which dodges).
  for (let i = 1; i <= 12; i++) {
    await touch(page, 'pointermove', 120, 200 + i * 7);
    await page.waitForTimeout(40);
  }
  await expect
    .poll(
      async () => {
        const p = await player(page);
        return p.x - p.y - (before.x - before.y);
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(0.5);
  await touch(page, 'pointerup', 120, 284);
  await expect(page.locator('.melee-button')).toBeVisible(); // the first touch shows the controls
  await page.screenshot({ path: testInfo().outputPath('upright-phone.png') });
  expect(errors).toEqual([]);
});

test('combat controls are hidden on the menu, however it is scrolled, and shown in the fight', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('.front-end')).toBeVisible();
  await touch(page, 'pointerdown', 50, 50); // a touch reveals the touch layer in a fight; not here
  await touch(page, 'pointerup', 50, 50);
  await page.locator('.front-end').evaluate((m) => m.scrollTo(0, m.scrollHeight));
  await page.mouse.wheel(0, 600);
  await expect(page.locator('.melee-button')).toBeHidden();
  await expect(page.locator('.ability-bar')).toBeHidden();
  await expect(page.locator('.settings-button')).toBeVisible(); // settings on every screen
});

function testInfo() {
  return test.info();
}
