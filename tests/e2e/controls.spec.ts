import { expect, type Page, test } from '@playwright/test';
import { gamePoint } from './combo';

/** Desktop controls, settings and the mouse (owner request, 11/11/2026; REQ-CTL-15..17). */
interface Hook {
  player: {
    state: string;
    ability: string | null;
    attack: string | null;
    jumps: number;
    airborne: boolean;
    dodgeReady: number;
    facing: 1 | -1;
    speed: number;
    x: number;
    y: number;
  };
  physicsSteps: number;
  fillMeter(): void;
  camera: { x: number; y: number; scale: number } | null;
  aimSpot: { x: number; y: number } | null;
}
type DebugWindow = Window & { __stickmanDebug?: Hook };
const hook = (page: Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

async function open(page: Page, errors: string[], query = 'scene=training-yard&playerAt=14,13') {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/?${query}`);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

// biome-ignore lint/correctness/noEmptyPattern: Playwright needs the fixtures argument to reach testInfo.
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop keyboard and mouse');
});

test('L dodges (owner, 12/11/2026); the browser menu never opens over the game', async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors);
  const p = await gamePoint(page);
  // The context menu event is cancelled anywhere in the game area.
  const prevented = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y)!;
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 });
    target.dispatchEvent(e);
    return e.defaultPrevented;
  }, p);
  expect(prevented).toBe(true);
  let sawDodge = false;
  await page.keyboard.down('KeyL');
  for (let i = 0; i < 40 && !sawDodge; i++) {
    sawDodge = (await hook(page)).player.state === 'dodging';
    await page.waitForTimeout(10);
  }
  await page.keyboard.up('KeyL');
  expect(sawDodge).toBe(true);
  expect(errors).toEqual([]);
});

test('the dodge (L) always goes straight back from the facing, even with a movement key held (owner, 12/11/2026)', async ({
  page,
}) => {
  const errors: string[] = [];
  // The dummy out of lock-on range (REQ-CTL-22), so the walk alone sets the facing.
  await open(page, errors, 'scene=training-yard&playerAt=10,10&dummyAt=29,19');
  const screenX = (s: { x: number; y: number }) => s.x - s.y; // iso: right on screen is +(x − y)
  // Walk right a moment so the fighter faces right, then stop.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await hook(page)).player.speed, { timeout: 3000 }).toBeLessThan(0.05);
  const before = await hook(page);
  // Hold "right" (toward the facing) and dodge: it still steps back, to the left, still facing right.
  await page.keyboard.down('KeyD');
  await page.keyboard.press('KeyL');
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000, intervals: [10] }).toBe('dodging');
  expect((await hook(page)).player.facing).toBe(before.player.facing);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000 }).not.toBe('dodging');
  expect(screenX((await hook(page)).player)).toBeLessThan(screenX(before.player) - 1);
  expect(errors).toEqual([]);
});

test('Eruption on the keyboard (owner, 12/11/2026; Inferno fifth ability on R since 17/11/2026): R aims with WASD and on-screen help; Esc cancels; R again jumps', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  // Clear floor straight up the screen (a pillar stands just up-screen of the default start, which
  // rightly cuts the leap short), and the dummy out of lock-on range (REQ-CTL-22).
  await page.addInitScript(() =>
    localStorage.setItem(
      'stickman-arena.loadouts',
      JSON.stringify({ '(guest)': { inferno: { equipped: ['fireball', 'flameDash', 'fireBeam', 'eruption'] } } }),
    ),
  );
  await open(page, errors, 'scene=training-yard&playerAt=17,10&dummyAt=29,21');
  const hint = page.locator('.aim-hint');
  // K aims; the instructions name the keys; Escape cancels without opening the settings or casting.
  await page.keyboard.press('KeyR');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText(/W A S D to move the target · R to confirm · Esc to cancel/);
  await page.keyboard.press('Escape');
  await expect(hint).toBeHidden();
  await expect(page.locator('.settings-panel:not(.fighter-controls)')).toBeHidden();
  expect((await hook(page)).player.ability).toBeNull();
  // Again: W slides the spot up the screen (the fighter stays put), K launches the leap there.
  const start = await hook(page);
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await hook(page)).aimSpot, { timeout: 5000 }).not.toBeNull();
  // Hold W until the spot is well up the screen from the fighter (the aim moves in game time, and
  // a software-rendered CI browser runs far slower than real time, so no fixed wait is safe).
  await page.keyboard.down('KeyW');
  await expect
    .poll(
      async () => {
        const s = (await hook(page)).aimSpot!;
        return start.player.x + start.player.y - (s.x + s.y);
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(3);
  await page.keyboard.up('KeyW');
  expect(
    Math.hypot((await hook(page)).player.x - start.player.x, (await hook(page)).player.y - start.player.y),
  ).toBeLessThan(0.1);
  await page.screenshot({ path: testInfo.outputPath('ult-keyboard-aim.png') });
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] }).toBe('eruption');
  await expect(hint).toBeHidden();
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull();
  const end = await hook(page);
  expect(end.player.x + end.player.y).toBeLessThan(start.player.x + start.player.y - 1.5); // landed up the screen
  expect(errors).toEqual([]);
});

test('settings: Esc opens and pauses; volumes save across a reload (key layouts live in Fighter Controls)', async ({
  page,
}) => {
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => localStorage.removeItem('stickman-arena.settings.v3'));
  await page.keyboard.press('Escape');
  const panel = page.locator('.settings-panel:not(.fighter-controls)');
  await expect(panel).toBeVisible();
  const steps = (await hook(page)).physicsSteps;
  await page.waitForTimeout(300);
  expect((await hook(page)).physicsSteps).toBe(steps); // the fight is paused

  // Audio: separate sliders, applied and saved straight away.
  await panel.locator('[data-volume="musicVolume"]').fill('30');
  await panel.locator('[data-volume="sfxVolume"]').fill('65');
  await expect(panel.locator('[data-volume="musicVolume"] + output')).toHaveText('30%');
  // General Settings no longer holds key layouts (owner, master plan 16/11/2026): no Controls tab.
  await expect(panel.getByRole('tab', { name: 'Controls' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.locator('.settings-button').click();
  await expect(panel.locator('[data-volume="musicVolume"]')).toHaveValue('30');
  await expect(panel.locator('[data-volume="sfxVolume"]')).toHaveValue('65');
  await panel.locator('.settings-close').click();
  expect(errors).toEqual([]);
});
