import { expect, test } from '@playwright/test';

/** Main menu and Leave game (owner, 12/11/2026). Test browsers skip the menu, so this one pretends to be a person. */
test('main menu: pick Rampage and the Colosseum, play, then leave the game back to the menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  const menu = page.locator('.main-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-fighter]')).toHaveCount(2); // Inferno and Rampage
  await menu.locator('[data-fighter="rampage"]').click();
  await menu.locator('[data-arena="training-yard"]').click();
  await Promise.all([page.waitForURL(/character=rampage/), menu.locator('.mm-play').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('.main-menu')).toBeHidden(); // straight into the fight
  await expect(page.locator('.th-left .th-name')).toHaveText('Rampage');
  await page.locator('.settings-button').click();
  await page.locator('.settings-leave').click();
  await expect(page.locator('.main-menu')).toBeVisible();
  await expect(page.locator('.settings-panel')).toBeHidden();
  expect(errors).toEqual([]);
});
