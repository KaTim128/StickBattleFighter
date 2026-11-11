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
    speed: number;
    x: number;
    y: number;
  };
  physicsSteps: number;
  fillMeter(): void;
  camera: { x: number; y: number; scale: number } | null;
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

test('right click dodges and never opens the browser menu over the game', async ({ page }) => {
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
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: 'right' });
  for (let i = 0; i < 40 && !sawDodge; i++) {
    sawDodge = (await hook(page)).player.state === 'dodging';
    await page.waitForTimeout(10);
  }
  await page.mouse.up({ button: 'right' });
  expect(sawDodge).toBe(true);
  expect(errors).toEqual([]);
});

test('right click dodges in the direction of the held movement key', async ({ page }) => {
  const errors: string[] = [];
  await open(page, errors, 'scene=training-yard&playerAt=10,10');
  const p = await gamePoint(page);
  const before = await hook(page);
  const screenX = (s: { x: number; y: number }) => s.x - s.y; // iso: right on screen is +(x − y)
  await page.keyboard.down('KeyD');
  await page.mouse.click(p.x, p.y, { button: 'right' });
  // Game time, not wall time: a software-rendered CI browser runs slower than real time.
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000, intervals: [10] }).toBe('dodging');
  await expect.poll(async () => (await hook(page)).player.state, { timeout: 3000 }).not.toBe('dodging');
  await page.keyboard.up('KeyD');
  expect(screenX((await hook(page)).player)).toBeGreaterThan(screenX(before.player) + 1.5);
  // No key held: a back-step, away from where the fighter faces (it now faces right). Wait for the
  // weight-based dodge cooldown and for the fighter to stop first.
  await expect.poll(async () => (await hook(page)).player.dodgeReady, { timeout: 5000 }).toBe(1);
  await expect.poll(async () => (await hook(page)).player.speed, { timeout: 3000 }).toBeLessThan(0.05);
  const mid = await hook(page);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await expect
    .poll(async () => screenX((await hook(page)).player), { timeout: 3000 })
    .toBeLessThan(screenX(mid.player) - 1);
  expect(errors).toEqual([]);
});

test('Inferno ultimate: F, hover the mouse over the spot, left click jumps there', async ({ page }, testInfo) => {
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  const start = await hook(page);
  await page.keyboard.press('KeyF');
  // Hover well up the screen from the fighter.
  const size = page.viewportSize()!;
  await page.mouse.move(size.width * 0.5, size.height * 0.5);
  await page.mouse.move(size.width * 0.5, size.height * 0.22, { steps: 5 });
  await page.waitForTimeout(200);
  expect((await hook(page)).player.ability).toBeNull(); // still aiming
  await page.screenshot({ path: testInfo.outputPath('ult-mouse-aim.png') });
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] }).toBe('eruption');
  expect((await hook(page)).player.attack).toBeNull(); // the click launched; it did not punch
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 10_000 }).toBeNull();
  const end = await hook(page);
  expect(end.player.x + end.player.y).toBeLessThan(start.player.x + start.player.y - 1.5); // landed up the screen
  expect(errors).toEqual([]);
});

test('settings: Esc opens and pauses; volumes and keys save, clash with a clear message, and reset', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => localStorage.removeItem('stickman-arena.settings.v1'));
  await page.keyboard.press('Escape');
  const panel = page.locator('.settings-panel');
  await expect(panel).toBeVisible();
  const steps = (await hook(page)).physicsSteps;
  await page.waitForTimeout(300);
  expect((await hook(page)).physicsSteps).toBe(steps); // the fight is paused

  // Audio: separate sliders, applied and saved straight away.
  await panel.locator('[data-volume="musicVolume"]').fill('30');
  await panel.locator('[data-volume="sfxVolume"]').fill('65');
  await expect(panel.locator('[data-volume="musicVolume"] + output')).toHaveText('30%');

  // Controls: a key already in use is refused, naming its action.
  await panel.getByRole('tab', { name: 'Controls' }).click();
  await panel.locator('[data-action="ability1"]').click();
  await expect(panel.locator('[data-action="ability1"]')).toHaveText('Press a key…');
  await page.keyboard.press('KeyW');
  await expect(panel.locator('.settings-message')).toHaveText('W is already assigned to Move up. Choose another key.');
  await expect(panel.locator('[data-action="ability1"]')).toHaveText('Q');
  // The aimed-ultimate launch cannot take a movement or ability key either.
  await panel.locator('[data-action="ultimateLaunch"]').click();
  await page.keyboard.press('KeyE');
  await expect(panel.locator('.settings-message')).toContainText('already assigned to Ability 2');
  // A free key is accepted.
  await panel.locator('[data-action="jump"]').click();
  await page.keyboard.press('KeyC');
  await expect(panel.locator('[data-action="jump"]')).toHaveText('C');
  await page.screenshot({ path: testInfo.outputPath('settings-controls.png') });
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  // Saved: after a reload the settings come back and C jumps (Space no longer does).
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('#status')).toContainText('jump C');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  expect((await hook(page)).player.jumps).toBe(0);
  await page.keyboard.press('KeyC');
  await expect.poll(async () => (await hook(page)).player.jumps).toBe(1);
  // Land first: settings pause the fight, and a jump only starts from the floor.
  await expect.poll(async () => (await hook(page)).player.airborne).toBe(false);
  await page.locator('.settings-button').click();
  await expect(panel.locator('[data-volume="musicVolume"]')).toHaveValue('30');
  await expect(panel.locator('[data-volume="sfxVolume"]')).toHaveValue('65');

  // Reset to defaults.
  await panel.getByRole('tab', { name: 'Controls' }).click();
  await panel.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(panel.locator('[data-action="jump"]')).toHaveText('Space');
  await page.locator('.settings-close').click();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await hook(page)).player.jumps).toBe(2);
  expect(errors).toEqual([]);
});
