import { expect, type Page, test } from '@playwright/test';

/**
 * Fighter Controls (owner, master plan 16/11/2026, Phase 1 A3): each fighter has its own keys,
 * saved for the player's profile; General Settings holds only global settings; Esc opens Settings.
 */
async function launch(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1'); // play the page itself, not the fullscreen shell
    localStorage.setItem('stickman-arena.player-name.v1', 'Katim');
  });
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  return errors;
}

const key = (page: Page, action: string) => page.locator(`.fighter-controls .settings-key[data-action="${action}"]`);

test('Fighter Controls: rebind, refuse a clash, hold, per-fighter independence, saved across reloads, reset', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard rebinding');
  test.setTimeout(120_000);
  const errors = await launch(page);
  const front = page.locator('.front-end');
  await front.locator('[data-nav="practice"]').click();
  await front.locator('.fe-keys').click(); // from the Practice screen
  const panel = page.locator('.fighter-controls');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.fc-title')).toContainText('Controls');
  await expect(key(page, 'ability1')).toHaveText('Q');
  // Fire Beam keys belong to the fighter that has a beam (Inferno, the default pick).
  await expect(key(page, 'beamLeft')).toHaveCount(1);

  // Rebind Ability 1 to Z.
  await key(page, 'ability1').click();
  await expect(key(page, 'ability1')).toHaveText('Press a key…');
  await page.keyboard.press('KeyZ');
  await expect(key(page, 'ability1')).toHaveText('Z');
  // A clash is refused and says which action has the key; nothing changes.
  await key(page, 'ability2').click();
  await page.keyboard.press('KeyZ');
  await expect(panel.locator('.settings-message')).toContainText(/already assigned to Ability 1/);
  await expect(key(page, 'ability2')).toHaveText('E');
  // Esc while waiting cancels the rebinding.
  await key(page, 'ability2').click();
  await page.keyboard.press('Escape');
  await expect(panel.locator('.settings-message')).toHaveText('Cancelled.');
  await expect(panel).toBeVisible();
  // Ability 4 becomes a Hold: its key reads "R (Hold)" and it has a hold time.
  await panel.locator('.settings-bind[data-action="ability4"] .fc-mode').click();
  await expect(key(page, 'ability4')).toHaveText('R (Hold)');
  await expect(panel.locator('.settings-bind[data-action="ability4"] .fc-seconds')).toHaveValue('1');
  await panel.locator('.fc-done').click();
  await expect(panel).toBeHidden();

  // Saved: still there after a reload.
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await front.locator('[data-nav="practice"]').click();
  await front.locator('.fe-keys').click();
  await expect(key(page, 'ability1')).toHaveText('Z');
  await expect(key(page, 'ability4')).toHaveText('R (Hold)');
  await panel.locator('.fc-done').click();

  // Titan's controls are untouched (opened from Fighter Selection).
  await front.locator('[data-practice="open-zone"]').click();
  await front.locator('[data-screen="select"] .fe-tile[data-fighter="rampage"]').click();
  await front.locator('[data-screen="select"] .fe-keys').click();
  await expect(panel.locator('.fc-title')).toContainText('Titan');
  await expect(key(page, 'ability1')).toHaveText('Q');
  await expect(key(page, 'ability4')).toHaveText('R');
  await expect(key(page, 'beamLeft')).toHaveCount(0); // Titan has no beam
  await panel.locator('.fc-done').click();

  // Reset puts Inferno back to the defaults, and only Inferno.
  await front.locator('[data-screen="select"] .fe-tile[data-fighter="inferno"]').click();
  await front.locator('[data-screen="select"] .fe-keys').click();
  await expect(key(page, 'ability1')).toHaveText('Z');
  await panel.locator('.fc-reset').click();
  await expect(key(page, 'ability1')).toHaveText('Q');
  await expect(key(page, 'ability4')).toHaveText('R');
  expect(errors).toEqual([]);
});

test('General Settings: Esc opens it; only global settings; no Fullscreen, Fire Beam or touch size', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard');
  test.setTimeout(120_000);
  const errors = await launch(page);
  await page.keyboard.press('Escape');
  const settings = page.locator('.settings-panel:not(.fighter-controls)');
  await expect(settings).toBeVisible();
  await expect(settings.locator('[data-tab]')).toHaveText(['Audio', 'Profile']); // no Controls tab
  await expect(settings.locator('.settings-fullscreen')).toHaveCount(0);
  await expect(settings.locator('[data-touch-scale]')).toHaveCount(0);
  await expect(settings).not.toContainText(/fire beam/i);
  await expect(settings.locator('[data-volume]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
  expect(errors).toEqual([]);
});

test('in a fight: Esc opens Settings and "Change Fighter Keybinds" opens the fighter being played', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('stickman-arena.player-name.v1', 'Katim'));
  await page.goto('/?character=shroud&scene=training-yard&play&mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.keyboard.press('Escape');
  const settings = page.locator('.settings-panel:not(.fighter-controls)');
  await expect(settings).toBeVisible();
  await settings.locator('.settings-fighter-keys').click();
  await expect(page.locator('.fighter-controls .fc-title')).toContainText('Shroud');
  await expect(key(page, 'beamLeft')).toHaveCount(0);
  expect(errors).toEqual([]);
});
