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
  await open(page, errors, 'scene=training-yard&playerAt=10,10');
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

test('Inferno ultimate on the keyboard (owner, 12/11/2026): I aims with WASD and on-screen help; Esc cancels; I again jumps', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  await open(page, errors);
  await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.fillMeter());
  const hint = page.locator('.aim-hint');
  // K aims; the instructions name the keys; Escape cancels without opening the settings or casting.
  await page.keyboard.press('KeyI');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText(/W A S D to move the target · I to launch · Esc to cancel/);
  await page.keyboard.press('Escape');
  await expect(hint).toBeHidden();
  await expect(page.locator('.settings-panel')).toBeHidden();
  expect((await hook(page)).player.ability).toBeNull();
  // Again: W slides the spot up the screen (the fighter stays put), K launches the leap there.
  const start = await hook(page);
  await page.keyboard.press('KeyI');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3000); // the aim moves in game time; a software-rendered CI browser runs slower than real time
  await page.keyboard.up('KeyW');
  expect(
    Math.hypot((await hook(page)).player.x - start.player.x, (await hook(page)).player.y - start.player.y),
  ).toBeLessThan(0.1);
  await page.screenshot({ path: testInfo.outputPath('ult-keyboard-aim.png') });
  await page.keyboard.press('KeyI');
  await expect.poll(async () => (await hook(page)).player.ability, { timeout: 8000, intervals: [20] }).toBe('eruption');
  await expect(hint).toBeHidden();
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
  await page.evaluate(() => localStorage.removeItem('stickman-arena.settings.v3'));
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
  // I belongs to the ultimate alone: no other normal action may take it.
  await panel.locator('[data-action="ability4"]').click();
  await page.keyboard.press('KeyI');
  await expect(panel.locator('.settings-message')).toContainText('already assigned to Ultimate');
  // The Fire Beam keys have their own section and can be rebound too.
  await expect(panel.getByText('Fire Beam controls', { exact: false })).toBeVisible();
  await panel.locator('[data-action="beamLeft"]').click();
  await page.keyboard.press('KeyU');
  await expect(panel.locator('[data-action="beamLeft"]')).toHaveText('U');
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
