import { expect, type Page, test } from '@playwright/test';

/**
 * The player's journey (owner, 13/11/2026: "Main Menu, Player Identification and Interface
 * Redesign"; "Stickman Selection Screen and Unique 2.5D Fighter Stances"), on desktop and phone:
 * title screen → name → Game Modes → fighter select → tournament, plus Settings, Quit and the
 * admin name. Test browsers normally skip the menu, so these pretend to be a person.
 */
type Debug = Window & { __stickmanDebug?: { uiClicks: number; menuMusicPlaying: boolean } };
const debug = (page: Page) => page.evaluate(() => (window as Debug).__stickmanDebug!);

async function launch(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  return errors;
}

test('title → name → Game Modes → fighter select → tournament, with the name shown as the player', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await launch(page);
  await page.evaluate(() => localStorage.removeItem('stickman-arena.player-name.v1'));
  const front = page.locator('.front-end');
  const title = front.locator('[data-screen="title"]');
  await expect(title).toBeVisible();
  // Only Story Mode, Game Modes, Settings and Quit Game; no Start, no Admin Panel for players.
  await expect(title.locator('.fe-item')).toHaveText([/Story Mode/, 'Game Modes', 'Practice', 'Settings', 'Quit Game']);
  await expect(title.locator('.fe-item-story')).toHaveClass(/locked/);
  await expect(page.locator('.ability-bar')).toBeHidden();
  expect((await debug(page)).menuMusicPlaying).toBe(true); // menu music on the title screen
  const clicks = (await debug(page)).uiClicks;
  await title.locator('.fe-item-story').click({ force: true }); // locked (aria-disabled) but still explains itself
  await expect(front.locator('.fe-toast')).toHaveText(/locked/i);
  expect((await debug(page)).uiClicks).toBe(clicks + 1); // one click sound per press
  // The owner's title art is the menu, covering the screen; the buttons sit on its painted plates.
  await expect(title.locator('.fe-art')).toHaveCSS('background-image', /title-menu/);
  const art = (await title.locator('.fe-art').boundingBox())!;
  const vp = page.viewportSize()!;
  expect(art.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(art.height).toBeGreaterThanOrEqual(vp.height - 1);
  for (const id of ['story', 'modes', 'settings', 'quit']) {
    const b = (await title.locator(`[data-nav="${id}"]`).boundingBox())!;
    expect(b.y, id).toBeGreaterThanOrEqual(0); // never cropped off the screen
    expect(b.y + b.height, id).toBeLessThanOrEqual(vp.height);
  }

  // Game Modes asks for a name first; it is validated.
  await title.locator('[data-nav="modes"]').click();
  const name = front.locator('[data-screen="name"]');
  await expect(name).toBeVisible();
  await name.locator('.fe-name-ok').click();
  await expect(name.locator('.fe-name-error')).toHaveText('Enter a name.');
  await name.locator('.fe-name-input').fill('<b>bad');
  await name.locator('.fe-name-ok').click();
  await expect(name.locator('.fe-name-error')).toHaveText(/letters, numbers/);
  await name.locator('.fe-name-input').fill('Katim12345XYZ'); // the box stops at 10
  await expect(name.locator('.fe-name-input')).toHaveValue('Katim12345');
  await name.locator('.fe-name-input').fill('Katim');
  await name.locator('.fe-name-ok').click();

  // Game Modes: Tournament and 3 vs 3 (coming soon), nothing else.
  const modes = front.locator('[data-screen="modes"]');
  await expect(modes).toBeVisible();
  await expect(modes.locator('.fe-mode')).toHaveCount(2);
  await expect(modes.locator('[data-gm="3v3"]')).toHaveClass(/locked/);
  await expect(modes).not.toContainText(/ladder/i);
  await modes.locator('[data-gm="tournament"]').click();

  // Fighter select: the information beside the fighter updates the moment another is picked.
  const select = front.locator('[data-screen="select"]');
  await expect(select.locator('.fe-who')).toContainText('Katim');
  for (const [id, shown, titleText] of [
    ['necro', 'Necro', 'Keeper of the Grave'],
    ['shroud', 'Shroud', 'The Unseen Blade'],
    ['rampage', 'Titan', 'The Unbroken Wall'],
  ] as const) {
    await select.locator(`.fe-tile[data-fighter="${id}"]`).click();
    await expect(select.locator('.fe-sel-name')).toHaveText(shown);
    await expect(select.locator('.fe-sel-title')).toHaveText(new RegExp(titleText, 'i'));
    await expect(select.locator('.fe-stat')).toHaveCount(6);
    await expect(select.locator('.fe-ab')).toHaveCount(5); // four abilities and the ultimate
    await expect(select.locator('.fe-ab.fe-ult .fe-ab-desc')).not.toBeEmpty();
    await expect(select.locator(`.fe-model[data-model="${id}"].ready`)).toBeVisible({ timeout: 30_000 });
  }
  await select.locator('[data-size="4"]').click();
  await Promise.all([page.waitForURL(/mode=tournament/), select.locator('.fe-fight').click()]);
  const screen = page.locator('.tournament');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-entry.player')).toContainText('Katim (Titan)');
  // One landscape screen: the draw never scrolls, and the page cannot be zoomed (owner, 13/11/2026).
  const fits = await screen.evaluate(
    (el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1,
  );
  expect(fits).toBe(true);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /user-scalable=no/);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Settings from the title, change the name there; Quit says goodbye; the admin name opens the Admin Panel', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = await launch(page);
  await page.evaluate(() => localStorage.setItem('stickman-arena.player-name.v1', 'Katim'));
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const title = page.locator('.front-end [data-screen="title"]');
  await expect(title.locator('.fe-player')).toContainText('Katim');
  await expect(title.locator('[data-nav="admin"]')).toHaveCount(0);
  // Settings from the menu, and the gear on top, are the same panel.
  await title.locator('[data-nav="settings"]').click();
  const panel = page.locator('.settings-panel');
  await expect(panel).toBeVisible();
  await panel.locator('[data-tab="profile"]').click();
  await expect(panel.locator('.settings-name-input')).toHaveValue('Katim');
  await panel.locator('.settings-name-input').fill('toolongname1');
  await expect(panel.locator('.settings-name-input')).toHaveValue('toolongnam'); // 10 at most
  await panel.locator('.settings-name-input').fill('addmen1280');
  await panel.locator('.settings-name-save').click();
  await expect(panel.locator('.settings-name-message')).toHaveText('Saved: addmen1280');
  await panel.locator('.settings-close').click();
  // The admin name shows the Admin Panel, with the fighter tools.
  await title.locator('[data-nav="admin"]').click();
  const admin = page.locator('.main-menu');
  await expect(admin).toBeVisible();
  await admin.locator('[data-fighter="necro"]').click();
  await expect(page.locator('.mm-d-config')).toBeVisible();
  await page.locator('.mm-d-back').click();
  await admin.locator('.mm-back').click();
  // Any other name: no Admin Panel.
  await title.locator('[data-nav="settings"]').click();
  await panel.locator('[data-tab="profile"]').click();
  await panel.locator('.settings-name-input').fill('Addmen1280');
  await panel.locator('.settings-name-save').click();
  await panel.locator('.settings-close').click();
  await expect(title.locator('[data-nav="admin"]')).toHaveCount(0);
  // Quit: a page cannot close a tab it did not open, so it says goodbye.
  await title.locator('[data-nav="quit"]').click();
  await expect(page.locator('.front-end [data-screen="quit"]')).toContainText('THANKS FOR PLAYING');
  expect(errors).toEqual([]);
});

test('Practice: the tutorial teaches step by step; the Open Zone tries any fighter and Leave comes back', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors = await launch(page);
  await page.evaluate(() => localStorage.setItem('stickman-arena.player-name.v1', 'Katim'));
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const front = page.locator('.front-end');
  await front.locator('[data-nav="practice"]').click();
  const practice = front.locator('[data-screen="practice"]');
  await expect(practice.locator('[data-practice]')).toHaveCount(2);
  // The tutorial: step 1 is moving; walking finishes it.
  await Promise.all([page.waitForURL(/tutorial/), practice.locator('[data-practice="tutorial"]').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const card = page.locator('.tutorial-card');
  await expect(card.locator('.tut-count')).toHaveText('STEP 1 / 8');
  await expect(card.locator('.tut-title')).toHaveText('Move');
  if (testInfo.project.name.includes('mobile')) {
    await expect(card.locator('.tut-text')).toContainText('joystick');
  } else {
    await expect(card.locator('.tut-text')).toContainText('WASD');
    await page.waitForTimeout(3500); // READY... FIGHT!
    await page.keyboard.down('KeyD');
    await expect(card.locator('.tut-title')).toHaveText('Punch', { timeout: 30_000 });
    await page.keyboard.up('KeyD');
  }
  await card.locator('.tut-skip').click();
  await expect(card.locator('.tut-count')).toHaveText('COMPLETE');
  // Open Zone from the finish card: pick a fighter and an AI opponent, then ENTER.
  await card.locator('.tut-open').click();
  const select = front.locator('[data-screen="select"]');
  await expect(select.locator('.fe-h')).toHaveText('OPEN ZONE');
  await select.locator('.fe-tile[data-fighter="shroud"]').click();
  await select.locator('[data-opponent="necro"]').click();
  await Promise.all([page.waitForURL(/opponent=necro/), select.locator('.fe-enter').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  expect(page.url()).toContain('character=shroud');
  await page.locator('.settings-button').click();
  await page.locator('.settings-leave').click();
  await expect(front.locator('[data-screen="practice"]')).toBeVisible(); // back to Practice
  expect(errors).toEqual([]);
});
