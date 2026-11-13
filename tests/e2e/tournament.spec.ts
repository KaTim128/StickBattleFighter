import { expect, type Page, test } from '@playwright/test';

/** End the current tournament match at once in the player's favour (the test-hooks flag exposes the scene). */
async function knockOutOpponent(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const d = (window as unknown as { __stickmanDebug?: { sceneRef?: { dummyFighter?: unknown } } }).__stickmanDebug;
      return Boolean(d?.sceneRef?.dummyFighter);
    },
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __stickmanDebug: { sceneRef: { dummyFighter: { combatant: { hp: number; takeFall(d: number): void } } } };
      }
    ).__stickmanDebug.sceneRef;
    s.dummyFighter.combatant.hp = 1;
    s.dummyFighter.combatant.takeFall(5);
  });
}

/** Tournament mode (owner, 13/11/2026): from the menu to the champion screen. */
test('tournament: 4 fighters, semi final, skip the other battle, win the final, champion screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const menu = page.locator('.main-menu');
  await expect(menu).toBeVisible();
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('stickman-arena.test-hooks', '1');
  });
  await menu.locator('[data-mode="tournament"]').click();
  await expect(menu.locator('[data-opponent]').first()).toBeHidden(); // a tournament draws its own opponents
  await menu.locator('[data-size="4"]').click();
  await Promise.all([page.waitForURL(/mode=tournament/), menu.locator('.mm-play').click()]);
  const screen = page.locator('.tournament');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-stage')).toHaveText(/Semi Finals/i);
  await expect(screen.locator('.tn-entry.player')).toHaveCount(1);
  await expect(screen.locator('.tn-match')).toHaveCount(3); // 2 semi finals + the final
  // Semi final: fight and win.
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await expect(page.locator('.tn-banner')).toHaveText(/Semi Finals/i);
  await knockOutOpponent(page);
  await expect(screen).toBeVisible({ timeout: 60_000 });
  // The other semi final: skip it; the final follows.
  await expect(screen.locator('.tn-watch')).toHaveCount(1);
  await screen.locator('.tn-skip-btn').click();
  await expect(screen.locator('.tn-stage')).toHaveText(/Final/i);
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await knockOutOpponent(page);
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-title')).toHaveText('TOURNAMENT CHAMPION');
  await expect(screen.locator('.tn-champion-name')).toHaveText(/\(You\)/);
  await expect(screen.locator('.tn-placement')).toHaveText(/Champion/);
  await screen.locator('.tn-leave').click();
  await expect(menu).toBeVisible();
  expect(errors).toEqual([]);
});

test('tournament: watching an AI battle plays it as a real fight, with Skip battle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('stickman-arena.test-hooks', '1');
  });
  const menu = page.locator('.main-menu');
  await menu.locator('[data-mode="tournament"]').click();
  await menu.locator('[data-size="8"]').click();
  await Promise.all([page.waitForURL(/mode=tournament/), menu.locator('.mm-play').click()]);
  const screen = page.locator('.tournament');
  await expect(screen.locator('.tn-stage')).toHaveText(/Quarter Finals/i, { timeout: 60_000 });
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await knockOutOpponent(page);
  await expect(screen.locator('.tn-watch')).toHaveCount(3, { timeout: 60_000 });
  await expect(screen.locator('.tn-note').first()).toHaveText(/3 of 3/);
  await Promise.all([page.waitForURL(/watch/), screen.locator('.tn-watch-btn').first().click()]);
  await expect(page.locator('.tn-banner')).toHaveText(/Watching/i);
  await expect(page.locator('.tn-skip-battle')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.locator('.tn-skip-battle').click();
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-watch')).toHaveCount(2);
  await expect(screen.locator('.tn-note').first()).toHaveText(/3 of 3/); // a skipped battle uses no watch
  expect(errors).toEqual([]);
});
