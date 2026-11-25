import { expect, type Page, test } from '@playwright/test';

/**
 * Background music across screens (owner, 25/11/2026): each screen plays only its own track, tracks give way with a fade, nothing
 * overlaps beyond a short crossfade, and music never carries over between screens. The page keeps a log of which tracks were audible
 * (sampled every 50 ms) so overlap is measured, not guessed.
 */
type Debug = { musicTracks: string[]; musicWanted: string | null };
type W = Window & { __stickmanDebug?: Debug; __musicLog?: string[][] };

async function launch(page: Page, url: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1');
    localStorage.setItem('stickman-arena.player-name.v1', 'Katim');
    (window as W).__musicLog = [];
    setInterval(() => (window as W).__musicLog?.push([...((window as W).__stickmanDebug?.musicTracks ?? [])]), 50);
  });
  await page.goto(url);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.mouse.click(5, 5); // audio starts on the first input
  return errors;
}

const tracks = (page: Page) => page.evaluate(() => [...((window as W).__stickmanDebug?.musicTracks ?? [])]);
const settled = async (page: Page, want: string[]) => {
  await expect.poll(() => tracks(page), { timeout: 20_000 }).toEqual(want);
  await page.waitForTimeout(1500); // longer than every fade: it must still be only this
  expect(await tracks(page)).toEqual(want);
};
/** The longest run of samples with more than one track audible (milliseconds), and the largest number at once. */
const overlap = (page: Page) =>
  page.evaluate(() => {
    const log = (window as W).__musicLog ?? [];
    let run = 0;
    let worst = 0;
    let most = 0;
    for (const t of log) {
      most = Math.max(most, t.length);
      run = t.length > 1 ? run + 1 : 0;
      worst = Math.max(worst, run);
    }
    return { overlapMs: worst * 50, most };
  });

test('menus: title, settings, Game Modes and fighter select all play the menu track alone; rapid screen changes stay clean', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one audio check is enough');
  test.setTimeout(120_000);
  const errors = await launch(page, '/?mute&music=japanese-boss');
  const front = page.locator('.front-end');
  await settled(page, ['menu']);
  await front.locator('[data-screen="title"] [data-nav="settings"]').click();
  await settled(page, ['menu']);
  await page.locator('.settings-panel:not(.fighter-controls) .settings-close').click();
  await front.locator('[data-nav="modes"]').click();
  await front.locator('[data-screen="modes"] [data-gm="tournament"]').click();
  await expect(front.locator('[data-screen="select"]')).toBeVisible();
  await settled(page, ['menu']);
  // Flip between screens as fast as a person can click: still the one track.
  const quick = { timeout: 1500 };
  for (let i = 0; i < 6; i++) {
    await front
      .locator('[data-screen="select"] .fe-back')
      .first()
      .click(quick)
      .catch(() => {});
    await front
      .locator('[data-nav="modes"]')
      .click(quick)
      .catch(() => {});
    await front
      .locator('[data-screen="modes"] [data-gm="tournament"]')
      .click(quick)
      .catch(() => {});
  }
  await settled(page, ['menu']);
  expect((await overlap(page)).most).toBe(1);
  expect(errors).toEqual([]);
});

test('a fight plays only its battle track after FIGHT!, and the menu track only returns when the fight is over or left', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one audio check is enough');
  test.setTimeout(120_000);
  const errors = await launch(page, '/?play&intro&mute&music=japanese-boss');
  // The countdown is silent; then only the battle track (the menu track is never audible in the fight).
  await expect.poll(() => tracks(page), { timeout: 60_000 }).toEqual(['battle']);
  await page.waitForTimeout(1500);
  expect(await tracks(page)).toEqual(['battle']);
  // Opening the settings over the fight does not start the menu track.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  expect(await tracks(page)).toEqual(['battle']);
  expect((await overlap(page)).most).toBe(1);
  expect(errors).toEqual([]);
});

test('going from a fight back to the title (a new page) starts with only the menu track, nothing carried over', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one audio check is enough');
  test.setTimeout(120_000);
  const errors = await launch(page, '/?play&intro&mute&music=japanese-boss');
  await expect.poll(() => tracks(page), { timeout: 60_000 }).toEqual(['battle']);
  await page.goto('/?home&mute&music=japanese-boss');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.mouse.click(5, 5);
  await settled(page, ['menu']);
  // And on to the tournament screen: the menu track, alone.
  await page.goto('/?mode=tournament&mute&music=japanese-boss');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.mouse.click(5, 5);
  await expect(page.locator('.tournament, .front-end').first()).toBeVisible({ timeout: 60_000 });
  expect(await tracks(page)).not.toContain('battle');
  expect(errors).toEqual([]);
});
