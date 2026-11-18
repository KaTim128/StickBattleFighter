import { expect, type Page, test } from '@playwright/test';
import { HOUSE_SCALE as K } from '../../src/data/arenas/house';

/** Hide and Seek Nightmare (Phase 2, TD-095): the page loads, shows the countdown, and the dummy walks the house. */
type Debug = { phase: string; floor: number; x: number; y: number; prepLeftS: number; survivalLeftS: number };
type W = Window & {
  __hideSeekDebug?: Debug;
  __hideSeek?: { game: { player: { x: number; y: number; floor: number } } };
};
const dbg = (page: Page) => page.evaluate(() => (window as W).__hideSeekDebug!);

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => sessionStorage.setItem('stickman-arena.no-shell', '1'));
  await page.goto('/?mode=hide-seek&mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  return errors;
}

test('the house loads with the 20 second countdown, and no fighting controls', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('.hs-banner')).toContainText('HIDE');
  await expect(page.locator('.hs-clock')).toHaveText(/0:(20|19|18)/);
  expect((await dbg(page)).phase).toBe('prep');
  expect((await dbg(page)).floor).toBe(0);
  await expect(page.locator('.ability-bar')).toBeHidden();
  expect(errors).toEqual([]);
});

test('WASD walks, Space crouches (slower), and the countdown runs in game time', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors = await open(page);
  const start = await dbg(page);
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await dbg(page)).x - start.x, { timeout: 20_000 }).toBeGreaterThan(1.5);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Space');
  await expect(page.locator('.hs-status')).toHaveText('Crouching');
  await page.keyboard.press('Space');
  await expect(page.locator('.hs-status')).toHaveText('');
  const clock = (await dbg(page)).prepLeftS;
  expect(clock).toBeLessThan(20);
  expect(errors).toEqual([]);
});

test('the front end offers Hide and Seek Nightmare as a game mode', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    sessionStorage.setItem('stickman-arena.no-shell', '1');
    localStorage.setItem('stickman-arena.player-name.v1', 'Katim');
  });
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const front = page.locator('.front-end');
  await front.locator('[data-screen="title"] [data-nav="modes"]').click();
  const card = front.locator('[data-screen="modes"] [data-gm="hide-seek"]');
  await expect(card).toBeVisible();
  await Promise.all([page.waitForURL(/mode=hide-seek/), card.click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('.hs-clock')).toBeVisible();
});

test('room visibility: only the lit room shows at the start; upstairs is hidden until the stairs are climbed', async ({
  page,
}) => {
  const errors = await open(page);
  type Vis = { roomLight(id: string): number; floorOpacity(f: number): number };
  type Scene = { __hideSeek: { visibility: Vis; game: { player: { floor: number; x: number; y: number } } } };
  const vis = (id: string) => page.evaluate((r) => (window as unknown as Scene).__hideSeek.visibility.roomLight(r), id);
  const upstairs = () => page.evaluate(() => (window as unknown as Scene).__hideSeek.visibility.floorOpacity(1));
  await expect.poll(() => vis('living')).toBeGreaterThan(0.9);
  expect(await vis('bed1')).toBe(0);
  expect(await vis('toilet')).toBe(0);
  expect(await upstairs()).toBeLessThan(0.05);
  await page.evaluate(
    ({ x, y }) => {
      const g = (window as unknown as Scene).__hideSeek.game.player;
      g.floor = 1;
      g.x = x;
      g.y = y;
    },
    { x: 27 * K, y: 9.8 * K },
  );
  await expect.poll(upstairs, { timeout: 10_000 }).toBeGreaterThan(0.9);
  await expect.poll(() => vis('uphall'), { timeout: 10_000 }).toBeGreaterThan(0.9);
  await expect.poll(() => vis('living'), { timeout: 10_000 }).toBeLessThan(0.05); // fades out
  expect(errors).toEqual([]);
});

test('hiding and throwing: G gets into a hiding place and out, picks up a bottle and throws it', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors = await open(page);
  type P = { floor: number; x: number; y: number; hidingIn: string | null; carrying: string | null };
  type Scene = { __hideSeek: { game: { player: P; prompt(): string | null; props: { id: string; mode: string }[] } } };
  const player = () => page.evaluate(() => ({ ...(window as unknown as Scene).__hideSeek.game.player }));
  const put = (floor: number, x: number, y: number) =>
    page.evaluate(
      ([f, px, py]) => {
        const p = (window as unknown as Scene).__hideSeek.game.player;
        p.floor = f as number;
        p.x = px as number;
        p.y = py as number;
      },
      [floor, x, y],
    );
  // The sofa's hiding place (living room): stand beside it and hide.
  await put(0, 15 * K, 17.8 * K);
  await expect.poll(() => page.evaluate(() => (window as unknown as Scene).__hideSeek.game.prompt())).toContain('Hide');
  await expect(page.locator('.hs-prompt')).toContainText('Hide');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await player()).hidingIn).not.toBeNull();
  await expect(page.locator('.hs-status')).toHaveText('Hiding');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await player()).hidingIn).toBeNull();
  // The bottle on the side table.
  await put(0, 18.1 * K, 18.7 * K - 0.5);
  await expect(page.locator('.hs-prompt')).toContainText('Pick up the bottle');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await player()).carrying).toBe('t1');
  await expect(page.locator('.hs-prompt')).toContainText('Throw');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyG');
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as Scene).__hideSeek.game.props.find((p) => p.id === 't1')?.mode),
      { timeout: 15_000 },
    )
    .toBe('rest');
  expect((await player()).carrying).toBeNull();
  expect(errors).toEqual([]);
});

test('a full round: caught shows Game Over once, Restart begins again, surviving shows Victory, Menu leaves', async ({
  page,
}) => {
  const errors = await open(page);
  type G = {
    round: { phase: string; killsStarted: number; update(s: number): void; catchPlayer(): boolean };
    hunter: { mode: string; x: number; y: number };
    step(dt: number, input: unknown): void;
  };
  type Scene = { __hideSeek: { game: G } };
  const idle = { move: { x: 0, y: 0 }, run: false, crouchPress: false, interactPress: false, peek: false };
  const phase = () => page.evaluate(() => (window as unknown as Scene).__hideSeek.game.round.phase);
  // Skip the preparation, then the hunter catches the player.
  await page.evaluate((i) => {
    const g = (window as unknown as Scene).__hideSeek.game;
    g.round.update(20.1);
    g.round.catchPlayer();
    g.round.catchPlayer(); // a second catch must not restart the animation
    for (let k = 0; k < 120; k++) g.step(1 / 30, i);
  }, idle);
  await expect.poll(phase).toBe('gameover');
  expect(await page.evaluate(() => (window as unknown as Scene).__hideSeek.game.round.killsStarted)).toBe(1);
  await expect(page.locator('.hs-result-title')).toHaveText('GAME OVER');
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible();
  // Restart: the countdown begins again and the screen goes.
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect.poll(phase).toBe('prep');
  await expect(page.locator('.hs-result')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as Scene).__hideSeek.game.round.killsStarted)).toBe(0);
  // Survive the whole hunt: Victory.
  await page.evaluate(() => {
    const g = (window as unknown as Scene).__hideSeek.game;
    g.round.update(20.1);
    g.round.update(120.1);
  });
  await expect.poll(phase).toBe('victory');
  await expect(page.locator('.hs-result-title')).toHaveText('YOU SURVIVED');
  // Return to Menu leaves the mode.
  await page.getByRole('button', { name: 'Return to Menu' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('mode')).toBe(false);
  expect(errors).toEqual([]);
});
