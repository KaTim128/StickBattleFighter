import { expect, type Page, test } from '@playwright/test';
import { asAdmin, openAdminPanel } from './front';

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
test('tournament: 4 fighters, Top 4, skip the other battle, win the Top 2, champion screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1'); // play the page itself, not the fullscreen shell
  });
  await asAdmin(page);
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await openAdminPanel(page);
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
  await expect(screen.locator('.tn-stage')).toHaveText(/Top 4/i);
  await expect(screen.locator('.tn-entry.player')).toHaveCount(1);
  await expect(screen.locator('.tn-match')).toHaveCount(4); // Top 4 (two), Top 2 and the Champion slot
  // Semi final: fight and win.
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await expect(page.locator('.tn-banner')).toHaveText(/Top 4/i);
  await knockOutOpponent(page);
  await expect(screen).toBeVisible({ timeout: 60_000 });
  // The other semi final: skip it with the one Skip button under the draw; the final follows.
  await expect(screen.locator('.tn-latest')).toHaveText(/Top 4: addmen1280 \(Inferno\) beat/);
  await expect(screen.locator('.tn-match.watchable')).toHaveCount(1);
  await expect(screen.locator('.tn-skip-all')).toHaveCount(1);
  await screen.locator('.tn-skip-all').click();
  await expect(screen.locator('.tn-stage')).toHaveText(/^Top 2$/i);
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await knockOutOpponent(page);
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-title')).toHaveText('TOURNAMENT CHAMPION');
  await expect(screen.locator('.tn-champion-name')).toHaveText('addmen1280 (Inferno)'); // the player's name
  await expect(screen.locator('.tn-placement')).toHaveText(/Champion/);
  await screen.locator('.tn-leave').click();
  await expect(page.locator('.front-end [data-screen="modes"]')).toBeVisible(); // back to Game Modes
  expect(errors).toEqual([]);
});

/** Start a tournament of `size` from the menu and win the player's first match. */
async function startAndWinFirst(page: Page, size: number): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1'); // play the page itself, not the fullscreen shell
  });
  await asAdmin(page);
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('stickman-arena.test-hooks', '1');
  });
  await openAdminPanel(page);
  const menu = page.locator('.main-menu');
  await menu.locator('[data-mode="tournament"]').click();
  await menu.locator(`[data-size="${size}"]`).click();
  await Promise.all([page.waitForURL(/mode=tournament/), menu.locator('.mm-play').click()]);
  const screen = page.locator('.tournament');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.ability-bar')).toBeHidden(); // no combat controls on the draw
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await expect(page.locator('.ability-bar')).toBeVisible(); // a fight: the controls are back
  await knockOutOpponent(page);
  await expect(screen).toBeVisible({ timeout: 60_000 });
}

/**
 * Settings → Leave in the middle of a tournament fight: the fight is settled and recorded, and
 * Leave goes straight to the main menu (owner, 13/11/2026). Then the draw is opened to check it.
 */
async function leaveFight(page: Page): Promise<void> {
  await page.locator('.settings-button').click();
  await Promise.all([page.waitForURL(/home/), page.locator('.settings-leave').click()]);
  const front = page.locator('.front-end');
  await expect(front.locator('[data-screen="title"]')).toBeVisible({ timeout: 60_000 });
  await page.goto('/?mode=tournament&mute&play'); // the draw (Resume, or the finished result)
  await expect(page.locator('.tournament')).toBeVisible({ timeout: 60_000 });
}

test('tournament: any number of AI battles can be watched (no limit), each one tapped in the draw', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startAndWinFirst(page, 16);
  const screen = page.locator('.tournament');
  await expect(screen.locator('.tn-stage')).toHaveText(/Top 16/i);
  await expect(screen.locator('.tn-match.watchable')).toHaveCount(7);
  // Watch four battles (more than the old limit of three), leaving each from Settings.
  for (let left = 7; left > 3; left--) {
    await Promise.all([page.waitForURL(/watch/), screen.locator('.tn-match.watchable').first().click()]);
    await expect(page.locator('.tn-banner')).toHaveText(/Watching/i);
    await expect(page.locator('.tn-skip-battle')).toHaveCount(0); // no per-battle buttons
    await expect(page.locator('.ability-bar')).toBeHidden(); // spectating: no combat controls
    await leaveFight(page);
    await expect(screen.locator('.tn-match.watchable')).toHaveCount(left - 1, { timeout: 60_000 });
    await expect(screen.locator('.tn-stage')).toHaveText(/Top 16/i); // still this stage
  }
  await screen.locator('.tn-skip-all').click();
  await expect(screen.locator('.tn-stage')).toHaveText(/Top 8/i);
  await expect(screen.locator('.tn-fight')).toBeVisible();
  expect(errors).toEqual([]);
});

test('tournament: leaving your own fight settles it and the bracket moves on', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startAndWinFirst(page, 4);
  const screen = page.locator('.tournament');
  await screen.locator('.tn-skip-all').click();
  await expect(screen.locator('.tn-stage')).toHaveText(/^Top 2$/i);
  await Promise.all([page.waitForURL(/match=/), screen.locator('.tn-fight').click()]);
  await page.waitForFunction(
    () => Boolean((window as unknown as { __stickmanDebug?: { sceneRef?: unknown } }).__stickmanDebug?.sceneRef),
    null,
    { timeout: 60_000 },
  );
  // Both at full health: the side that stayed wins when you leave.
  await leaveFight(page);
  await expect(screen.locator('.tn-title')).toHaveText('TOURNAMENT CHAMPION', { timeout: 60_000 });
  await expect(screen.locator('.tn-placement')).toHaveText(/Runner-up/);
  expect(errors).toEqual([]);
});
