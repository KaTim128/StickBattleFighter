import { expect, test } from '@playwright/test';
import { asAdmin, openAdminPanel } from './front';

/** Main menu and Leave game (owner, 12/11/2026). Test browsers skip the menu, so this one pretends to be a person. */
test('admin panel: pick Titan and the training yard, play, then leave the game back to the title', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await asAdmin(page);
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await openAdminPanel(page);
  const menu = page.locator('.main-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-fighter]')).toHaveCount(4); // Inferno, Titan, Necro and Shroud (summons are never in the menu)
  await menu.locator('[data-fighter="rampage"]').click();
  await menu.locator('.mm-d-select').click(); // a card opens the details; Select picks the fighter
  await expect(menu.locator('[data-fighter="rampage"]')).toHaveClass(/selected/);
  await menu.locator('[data-arena="training-yard"]').click();
  await Promise.all([page.waitForURL(/character=rampage/), menu.locator('.mm-play').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('.main-menu')).toBeHidden(); // straight into the fight
  // Owner 13/11/2026: renamed from Braxon (formerly Rampage Buffer); the player's name beside it.
  await expect(page.locator('.th-left .th-name')).toHaveText('addmen1280 · Titan');
  await page.locator('.settings-button').click();
  await page.locator('.settings-leave').click();
  await expect(page.locator('.front-end [data-screen="title"]')).toBeVisible(); // Leave goes to the title screen
  await expect(page.locator('.settings-panel')).toBeHidden();
  expect(errors).toEqual([]);
});

/** Fighter details (owner, 12/11/2026): six stat bars filling left to right, clickable abilities, Select or Back. */
test('fighter details: stat bars fill, abilities explain themselves, Back keeps the choice, Select changes it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await asAdmin(page);
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await openAdminPanel(page);
  const menu = page.locator('.main-menu');
  const selectedBefore = await menu.locator('.mm-card.selected').getAttribute('data-fighter');
  await menu.locator('[data-fighter="necro"]').click();
  const details = menu.locator('.mm-details');
  await expect(details).toBeVisible();
  await expect(details.locator('h2')).toHaveText('Necro');
  await expect(details.locator('.mm-d-stat')).toHaveCount(6);
  for (const label of ['HP', 'Speed', 'Power', 'Stamina', 'Defence', 'Avoidance'])
    await expect(details.locator('.mm-d-stat span').filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  // The bars start empty and grow to their values.
  const hp = details.locator('.mm-d-stat[data-stat="hp"] .mm-d-fill');
  const target = Number(await hp.getAttribute('data-value'));
  expect(target).toBeGreaterThan(0);
  await expect.poll(async () => hp.evaluate((el) => el.style.width)).toBe(`${target}%`);
  // Six entries: the combo, four abilities and the ultimate; one opens at a time with the how-to for this device.
  await expect(details.locator('.mm-d-ab-btn')).toHaveCount(7); // combo, heavy attack, four abilities, ultimate
  const curse = details.locator('.mm-d-ab-btn[data-ability="a3"]');
  await curse.click();
  const info = details.locator('.mm-d-ab-info:visible');
  await expect(info).toHaveCount(1);
  await expect(info).toContainText('Target defence');
  await expect(info.locator('.mm-d-how')).toContainText(
    test.info().project.name.includes('mobile') ? /^How to use: Tap/ : /^How to use: Press/,
  );
  await details.locator('.mm-d-ab-btn[data-ability="a1"]').click();
  await expect(details.locator('.mm-d-ab-info:visible')).toContainText('Blind');
  // Back leaves the choice alone.
  await details.locator('.mm-d-back').click();
  await expect(details).toBeHidden();
  await expect(menu.locator('.mm-card.selected')).toHaveAttribute('data-fighter', selectedBefore ?? '');
  // Select changes it.
  await menu.locator('[data-fighter="necro"]').click();
  await menu.locator('.mm-d-select').click();
  await expect(details).toBeHidden();
  await expect(menu.locator('.mm-card.selected')).toHaveAttribute('data-fighter', 'necro');
  expect(errors).toEqual([]);
});

/** Opponent picker (owner, 13/11/2026): the training dummy by default, or any fighter played by the AI. */
test('opponent and difficulty pickers: dummy and Normal by default; picking Shroud on Hard starts that fight', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await asAdmin(page);
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await openAdminPanel(page);
  const menu = page.locator('.main-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-opponent="training-dummy"]')).toHaveClass(/selected/);
  await menu.locator('[data-opponent="shroud"]').click();
  await expect(menu.locator('[data-opponent="shroud"]')).toHaveClass(/selected/);
  await expect(menu.locator('[data-difficulty="normal"]')).toHaveClass(/selected/); // REQ-AI-4 default
  await menu.locator('[data-difficulty="hard"]').click();
  await Promise.all([page.waitForURL(/opponent=shroud.*difficulty=hard/), menu.locator('.mm-play').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('.th-right .th-name')).toHaveText('Shroud');
  expect(errors).toEqual([]);
});
