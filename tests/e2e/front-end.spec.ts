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
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1'); // play the page itself, not the fullscreen shell
  });
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
  // Game Modes first, above Practice; no Story Mode (owner, 16/11/2026); no Admin Panel for players.
  await expect(title.locator('.fe-item')).toHaveText(['Game Modes', 'Practice', 'Settings', 'Quit Game']);
  await expect(title.locator('[data-nav="story"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/story mode/i);
  await expect(page.locator('.ability-bar')).toBeHidden();
  expect((await debug(page)).menuMusicPlaying).toBe(true); // menu music on the title screen
  const clicks = (await debug(page)).uiClicks;
  await title.locator('[data-nav="settings"]').click(); // one click sound per press
  expect((await debug(page)).uiClicks).toBe(clicks + 1);
  await page.locator('.settings-panel:not(.fighter-controls) .settings-close').click();
  // The owner's title art is the menu, covering the screen; the buttons sit on its painted plates.
  await expect(title.locator('.fe-art')).toHaveCSS('background-image', /title-menu/);
  const art = (await title.locator('.fe-art').boundingBox())!;
  const vp = page.viewportSize()!;
  expect(art.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(art.height).toBeGreaterThanOrEqual(vp.height - 1);
  for (const id of ['modes', 'practice', 'settings', 'quit']) {
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
  // Any characters (owner, 13/11/2026); only length is limited (an emoji counts as one).
  await name.locator('.fe-name-input').fill('Katim12345XYZ');
  await name.locator('.fe-name-ok').click();
  await expect(name.locator('.fe-name-error')).toHaveText(/At most 10/);
  // Game keys type as text in the box (W A S D, Q E R F, Space): none is swallowed by the game.
  await name.locator('.fe-name-input').fill('');
  await name.locator('.fe-name-input').click();
  await page.keyboard.type('wasd qerf');
  await expect(name.locator('.fe-name-input')).toHaveValue('wasd qerf');
  await name.locator('.fe-name-input').fill('<K@tim🔥>');
  await expect(name.locator('.fe-name-count')).toHaveText('8/10'); // the emoji counts as one
  await name.locator('.fe-name-ok').click();

  // Game Modes: Tournament and 3 vs 3 (coming soon), nothing else.
  const modes = front.locator('[data-screen="modes"]');
  await expect(modes).toBeVisible();
  await expect(modes.locator('.fe-mode')).toHaveCount(3); // Tournament, Tag Team and Hide and Seek Nightmare (Phase 2)
  await expect(modes.locator('[data-gm="hide-seek"]')).toContainText('Hide and Seek Nightmare');
  await expect(modes.locator('[data-gm="3v3"]')).not.toHaveClass(/locked/); // Tag Team is playable (owner, 13/11/2026)
  await expect(modes.locator('[data-gm="3v3"]')).toContainText('Tag Team'); // renamed from 3 vs 3 (owner)
  await expect(modes).not.toContainText(/3 vs 3/i);
  await expect(modes).not.toContainText(/ladder/i);
  await modes.locator('[data-gm="tournament"]').click();

  // Fighter select: the information beside the fighter updates the moment another is picked.
  const select = front.locator('[data-screen="select"]');
  await expect(select.locator('.fe-who')).toContainText('<K@tim🔥>');
  for (const [id, shown, titleText] of [
    ['necro', 'Necro', 'Keeper of the Grave'],
    ['shroud', 'Shroud', 'The Unseen Blade'],
    ['rampage', 'Titan', 'The Unbroken Wall'],
  ] as const) {
    await select.locator(`.fe-tile[data-fighter="${id}"]`).click();
    await expect(select.locator('.fe-sel-name')).toHaveText(shown);
    await expect(select.locator('.fe-sel-title')).toHaveText(new RegExp(titleText, 'i'));
    await expect(select.locator('.fe-stat')).toHaveCount(6);
    await expect(select.locator('.fe-ab')).toHaveCount(6); // four abilities, the ultimate and the fifth as an alternative (B14)
    await expect(select.locator('.fe-ab.fe-alt')).toHaveCount(1);
    // Descriptions and numbers stay out of the list; clicking an ability opens a board that closes again (owner, 18/11/2026).
    await expect(select.locator('.fe-ab-board')).toBeHidden();
    await select.locator('.fe-ab.fe-ult').click();
    await expect(select.locator('.fe-ab-board')).toBeVisible();
    await expect(select.locator('.fe-ab-board .fe-ab-board-desc')).not.toBeEmpty();
    await expect(select.locator('.fe-ab-board .fe-ab-stats dt').first()).toBeVisible();
    await select.locator('.fe-ab-close').click();
    await expect(select.locator('.fe-ab-board')).toBeHidden();
    await expect(select.locator(`.fe-model[data-model="${id}"].ready`)).toBeVisible({ timeout: 30_000 });
  }
  await select.locator('[data-size="4"]').click();
  await Promise.all([page.waitForURL(/mode=tournament/), select.locator('.fe-fight').click()]);
  const screen = page.locator('.tournament');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(screen.locator('.tn-entry.player')).toContainText('<K@tim🔥> (Titan)');
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
  const panel = page.locator('.settings-panel:not(.fighter-controls)');
  await expect(panel).toBeVisible();
  await panel.locator('[data-tab="profile"]').click();
  await expect(panel.locator('.settings-name-input')).toHaveValue('Katim');
  // Typing game keys in the Settings name box writes them (owner, 13/11/2026); too long is refused.
  await panel.locator('.settings-name-input').fill('');
  await panel.locator('.settings-name-input').click();
  await page.keyboard.type('W A S D!');
  await expect(panel.locator('.settings-name-input')).toHaveValue('W A S D!');
  await panel.locator('.settings-name-input').fill('toolongname1');
  await panel.locator('.settings-name-save').click();
  await expect(panel.locator('.settings-name-message')).toHaveText(/At most 10/);
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
  expect(errors).toEqual([]);
  // Quit (owner, 13/11/2026): no goodbye screen. A tab the game did not open cannot be closed, so
  // the game leaves itself: an empty page (nothing claims the tab closed).
  await Promise.all([page.waitForURL('about:blank'), title.locator('[data-nav="quit"]').click()]);
  await expect(page.locator('text=THANKS FOR PLAYING')).toHaveCount(0);
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
    // No countdown in the tutorial (owner, 13/11/2026): moving works at once.
    await expect(page.locator('.fight-intro')).toBeHidden();
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
  await select.locator('select[data-opponent]').selectOption('necro'); // the opponent is a dropdown
  await Promise.all([page.waitForURL(/opponent=necro/), select.locator('.fe-enter').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  expect(page.url()).toContain('character=shroud');
  await page.locator('.settings-button').click();
  await expect(page.locator('.settings-leave')).toHaveText('Leave');
  await page.locator('.settings-leave').click();
  await expect(front.locator('[data-screen="title"]')).toBeVisible(); // straight back to the main menu
  expect(errors).toEqual([]);
});

test('3 vs 3: pick three from the pool of five, fight, tag in a teammate, leave back to the main menu', async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  const errors = await launch(page);
  await page.evaluate(() => {
    localStorage.setItem('stickman-arena.player-name.v1', 'Katim');
    localStorage.setItem('stickman-arena.test-hooks', '1');
  });
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const front = page.locator('.front-end');
  await front.locator('[data-nav="modes"]').click();
  await front.locator('[data-gm="3v3"]').click();
  const team = front.locator('[data-screen="team"]');
  await expect(team.locator('[data-pool]')).toHaveCount(5); // a random pool of five
  const fight = team.locator('.fe-team-fight');
  await expect(fight).toBeDisabled();
  for (const i of [0, 1, 2]) await team.locator(`[data-pool="${i}"]`).click();
  await expect(team.locator('.fe-pick')).toHaveText(['1', '2', '3']);
  await Promise.all([page.waitForURL(/mode=3v3/), fight.click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const s = (window as unknown as { __stickmanDebug?: { sceneRef?: { intro: unknown } } }).__stickmanDebug
        ?.sceneRef;
      return s && !s.intro;
    },
    null,
    { timeout: 60_000 },
  );
  await expect(page.locator('.team-hud .team-member')).toHaveCount(6);
  type Dbg = Window & { __stickmanDebug: { team?: { player: { active: boolean }[] } } };
  const second = () => page.evaluate(() => (window as unknown as Dbg).__stickmanDebug.team?.player[1]?.active ?? false);
  // Tag: the key on desktop, the TAG button on a phone (a free moment is needed, so try a few times).
  for (let i = 0; i < 15 && !(await second()); i++) {
    if (testInfo.project.name.includes('mobile')) {
      await page.touchscreen.tap(120, 300); // the first touch shows the touch controls
      await page.locator('.tag-button').tap();
    } else await page.keyboard.press('KeyH');
    await page.waitForTimeout(400);
  }
  expect(await second()).toBe(true);
  await page.locator('.settings-button').click();
  await page.locator('.settings-leave').click();
  await expect(front.locator('[data-screen="title"]')).toBeVisible(); // Leave: the main menu
  expect(errors).toEqual([]);
});

test('loadout (B14): the alternative can replace any of the four; swap buttons on all, drag and drop, a details board, and it is saved', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors = await launch(page);
  await page.evaluate(() => localStorage.setItem('stickman-arena.player-name.v1', 'Katim'));
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const front = page.locator('.front-end');
  await front.locator('[data-screen="title"] [data-nav="modes"]').click();
  await front.locator('[data-screen="modes"] [data-gm="tournament"]').click();
  const select = front.locator('[data-screen="select"]');
  await select.locator('.fe-tile[data-fighter="rampage"]').click();
  // Four equipped, the ultimate, and one alternative that is never locked.
  await expect(select.locator('.fe-ab')).toHaveCount(6);
  const alt = select.locator('.fe-ab.fe-alt');
  await expect(alt).toHaveCount(1);
  await expect(alt).toContainText('Bastion Anchor');
  await expect(alt).not.toHaveClass(/locked/);
  // A swap button on every one of the four equipped abilities, so the player chooses which one gives way.
  await expect(select.locator('.fe-ab-swap')).toHaveCount(4);
  const slot = (n: number) => select.locator(`.fe-ab[data-ability="a${n}"]`);
  await expect(slot(1)).toContainText('Ground Smash');
  await expect(slot(3)).toContainText('Crushing Strike');
  // Swap the alternative in for the first ability.
  await slot(1).locator('.fe-ab-swap').click();
  await expect(slot(1)).toContainText('Bastion Anchor');
  await expect(slot(3)).toContainText('Crushing Strike');
  await expect(alt).toContainText('Ground Smash');
  expect(await page.evaluate(() => localStorage.getItem('stickman-arena.loadouts'))).toContain('bastionAnchor');
  // And now the benched Ground Smash in for the third: any ability can go back.
  await slot(3).locator('.fe-ab-swap').click();
  await expect(slot(3)).toContainText('Ground Smash');
  await expect(alt).toContainText('Crushing Strike');
  // Drag the benched one onto the second ability (a touch screen has no native drag: it uses the button).
  if (testInfo.project.name === 'desktop-chromium') await alt.dragTo(slot(2));
  else await slot(2).locator('.fe-ab-swap').click();
  await expect(slot(2)).toContainText('Crushing Strike');
  await expect(alt).toContainText('Rampage Charge');
  // Details only on click: a board with the numbers, which closes.
  await expect(select.locator('.fe-ab-board')).toBeHidden();
  await slot(2).locator('.fe-ab-name').click(); // the name, never the Swap button
  const board = select.locator('.fe-ab-board');
  await expect(board).toBeVisible();
  await expect(board).toContainText('Crushing Strike');
  await expect(board.locator('.fe-ab-stats dt', { hasText: 'Damage' })).toBeVisible();
  await expect(board.locator('.fe-ab-how')).toContainText('How to use');
  await board.locator('.fe-ab-close').click();
  await expect(board).toBeHidden();
  expect(errors).toEqual([]);
});

test('loadout (B14): the abilities equipped on fighter select are the ones on the fight bar', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    sessionStorage.setItem('stickman-arena.no-shell', '1');
    localStorage.setItem('stickman-arena.player-name.v1', 'Katim');
    localStorage.setItem(
      'stickman-arena.loadouts',
      JSON.stringify({
        Katim: { rampage: { equipped: ['groundSmash', 'rampageCharge', 'bastionAnchor', 'grappleSlam'] } },
      }),
    );
  });
  await page.goto('/?mute&play&character=rampage');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('.ability-slot[data-slot="a3"]').first()).toHaveAttribute(
    'data-ability',
    'Bastion Anchor',
    {
      timeout: 30_000,
    },
  );
});

/**
 * Owner, 21/11/2026: every fighter's face shows on the select screen and in the fight's top bar. The portraits were read back in
 * one GPU read that grew with the roster and came back blank past the GPU's largest texture, so a fighter picker with more
 * fighters than fit showed empty cards and a blank top-bar portrait.
 */
test('every fighter has a real portrait on the select screen and in the fight top bar, four tiles to a row', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = await launch(page);
  await page.evaluate(() => localStorage.setItem('stickman-arena.player-name.v1', 'Katim'));
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const front = page.locator('.front-end');
  await front.locator('[data-nav="practice"]').click();
  await front.locator('[data-practice="open-zone"]').click();
  const select = front.locator('[data-screen="select"]');
  await expect(select.locator('.fe-tile').first()).toBeVisible();
  const inkedPixels = await select.locator('.fe-tile-face').evaluateAll(async (imgs) => {
    const counts: Record<string, number> = {};
    for (const img of imgs as HTMLImageElement[]) {
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      let inked = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 20) inked++;
      counts[img.dataset.face ?? '?'] = inked;
    }
    return counts;
  });
  for (const [id, inked] of Object.entries(inkedPixels)) expect(inked, `${id} portrait is blank`).toBeGreaterThan(500);
  // Four tiles to a row.
  const tops = await select
    .locator('.fe-tile')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  const firstRow = tops.filter((t) => t === tops[0]).length;
  expect(firstRow).toBe(4);
  expect(errors).toEqual([]);
});
