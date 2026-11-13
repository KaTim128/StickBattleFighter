import { expect, test } from '@playwright/test';

/**
 * Fullscreen survives every page change (owner, 13/11/2026). Each fight or mode is its own page and
 * a browser drops fullscreen when the page in fullscreen unloads, so the game runs in a frame inside
 * a shell that holds fullscreen. Automated browsers get the shell only with `?shell`.
 */
test('fullscreen stays on when the game moves to another mode (the shell)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?shell');
  const game = page.frameLocator('#game-frame');
  await expect(game.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await game.locator('.settings-button').click();
  await game.locator('.settings-fullscreen').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  // A new page inside the frame, as when Practice or a fight starts.
  const inner = page.frames().find((f) => f !== page.mainFrame())!;
  await inner.evaluate(() => {
    window.location.search = '?character=shroud&scene=training-yard&play';
  });
  // The address follows the game once the new page has loaded (a reload returns here).
  await expect.poll(() => page.url(), { timeout: 60_000 }).toContain('character=shroud');
  await expect(game.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true); // still fullscreen
  expect(errors).toEqual([]);
});
