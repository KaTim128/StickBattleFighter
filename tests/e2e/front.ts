import { expect, type Page } from '@playwright/test';

/**
 * Front end helpers (owner, 13/11/2026): the set-up and test tools moved to the Admin Panel, shown
 * only to the admin name. `asAdmin` registers that name before every page load.
 */
export async function asAdmin(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('stickman-arena.player-name.v1', 'addmen1280'));
}

/** From the title screen to the Admin Panel. */
export async function openAdminPanel(page: Page): Promise<void> {
  await expect(page.locator('.front-end [data-screen="title"]')).toBeVisible();
  await page.locator('[data-nav="admin"]').click();
  await expect(page.locator('.main-menu')).toBeVisible();
}
