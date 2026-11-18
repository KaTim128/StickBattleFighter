import { expect, type Page, test } from '@playwright/test';
import { HOUSE_SCALE as K } from '../../src/data/arenas/house';

/** Hide and Seek Nightmare (Phase 2, TD-095): the page loads, shows the countdown, and the dummy walks the house. */
type Debug = { phase: string; floor: number; x: number; y: number; prepLeftS: number; survivalLeftS: number };
type W = Window & {
  __hideSeekDebug?: Debug;
  __hideSeek?: { game: { player: { x: number; y: number; floor: number } } };
};
const dbg = (page: Page) => page.evaluate(() => (window as W).__hideSeekDebug!);

/** Where to stand to use a hiding place of `kind`: just outside the way into it. */
async function besideSpot(page: Page, kind: string, atX?: number): Promise<{ floor: number; x: number; y: number }> {
  return page.evaluate(
    ([k, ax]) => {
      const g = (
        window as unknown as {
          __hideSeek: {
            game: {
              spots: { floor: number; spec: { kind: string; at: { x: number; y: number }; opensToward: string } }[];
            };
          };
        }
      ).__hideSeek.game;
      const s = g.spots.find(
        (sp) => sp.spec.kind === k && (ax === undefined || (sp.floor === 0 && Math.abs(sp.spec.at.x - ax) < 0.01)),
      )!;
      const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[s.spec.opensToward] as number[];
      return { floor: s.floor, x: s.spec.at.x + d[0]! * 0.9, y: s.spec.at.y + d[1]! * 0.9 };
    },
    [kind, atX] as const,
  );
}

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
  await page.keyboard.down('KeyW'); // north along the hall: the player starts just inside the front door
  await expect.poll(async () => start.y - (await dbg(page)).y, { timeout: 20_000 }).toBeGreaterThan(1.5);
  await page.keyboard.up('KeyW');
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
  await expect.poll(() => vis('hall')).toBeGreaterThan(0.9); // the player starts in the entrance hall
  expect(await vis('bed1')).toBe(0);
  expect(await vis('frontyard')).toBe(0);
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
  const sofa = await besideSpot(page, 'under-sofa');
  await put(sofa.floor, sofa.x, sofa.y);
  await expect.poll(() => page.evaluate(() => (window as unknown as Scene).__hideSeek.game.prompt())).toContain('Hide');
  await expect(page.locator('.hs-prompt')).toContainText('Hide');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await player()).hidingIn).not.toBeNull();
  await expect(page.locator('.hs-status')).toHaveText('Hiding');
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await player()).hidingIn).toBeNull();
  // The bottle on the side table.
  const bottle = await page.evaluate(() => {
    const t = (
      window as unknown as { __hideSeek: { game: { props: { id: string; floor: number; x: number; y: number }[] } } }
    ).__hideSeek.game.props.find((o) => o.id === 't1')!;
    return { floor: t.floor, x: t.x, y: t.y };
  });
  await put(bottle.floor, bottle.x, bottle.y);
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

test('a floating HIDE bubble marks hiding places near the player, brighter when in reach, gone once hidden', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'keyboard test');
  const errors = await open(page);
  type Scene = {
    __hideSeek: {
      visibility: { settle(v: unknown): void };
      game: { viewer(): unknown; player: { floor: number; x: number; y: number; hidingIn: string | null } };
    };
  };
  const put = (floor: number, x: number, y: number) =>
    page.evaluate(
      ([f, px, py]) => {
        const s = (window as unknown as Scene).__hideSeek;
        const p = s.game.player;
        p.floor = f as number;
        p.x = px as number;
        p.y = py as number;
        s.visibility.settle(s.game.viewer()); // the lighting catches up at once: no waiting on a fade
      },
      [floor, x, y],
    );
  // Beside the living room sofa: its hiding place is in reach.
  const beside = await besideSpot(page, 'under-sofa');
  await put(beside.floor, beside.x, beside.y);
  await expect(page.locator('.hs-bubble.near .hs-bubble-body')).toHaveText('HIDE');
  const bubble = page.locator('.hs-bubble.near .hs-bubble-body');
  const box = await bubble.boundingBox();
  expect(box).not.toBeNull();
  // It floats on the screen, over the game, not in a corner.
  expect(box!.x).toBeGreaterThan(50);
  expect(box!.y).toBeGreaterThan(20);
  // Far from every hiding place (the front yard): no bubble at all.
  await put(0, 20 * K, 33 * K);
  await expect(page.locator('.hs-bubble')).toHaveCount(0);
  // Hide: the bubbles go.
  await put(beside.floor, beside.x, beside.y);
  await expect(page.locator('.hs-bubble.near')).toHaveCount(1);
  await page.keyboard.press('KeyG');
  await expect
    .poll(
      async () => (await page.evaluate(() => (window as unknown as Scene).__hideSeek.game.player.hidingIn)) !== null,
    )
    .toBe(true);
  await expect(page.locator('.hs-bubble')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the game starts inside the house by the front door, with the Settings gear at the top right and no way out', async ({
  page,
}) => {
  const errors = await open(page);
  type Scene = {
    __hideSeek: {
      game: {
        player: { floor: number; x: number; y: number };
        world: { roomAt(f: number, x: number, y: number): { id: string; outdoors?: boolean } | null };
        setDoor(id: string, open: boolean): void;
      };
    };
  };
  const room = await page.evaluate(() => {
    const g = (window as unknown as Scene).__hideSeek.game;
    return g.world.roomAt(g.player.floor, g.player.x, g.player.y)?.id;
  });
  expect(room).toBe('hall');
  // The gear sits at the top right, as in every other mode, and opens the same Settings panel.
  const gear = page.locator('.settings-button');
  await expect(gear).toBeVisible();
  const box = (await gear.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x + box.width).toBeGreaterThan(view.width - 60);
  expect(box.y).toBeLessThan(40);
  await gear.click();
  await expect(page.locator('.settings-panel')).toBeVisible();
  await page.locator('.settings-close').click();
  await expect(page.locator('.settings-panel')).toBeHidden();
  // No page scrolling and the canvas fills the window: no black borders or gaps.
  const fit = await page.evaluate(() => {
    const c = document.querySelector('canvas')!.getBoundingClientRect();
    const el = document.scrollingElement!;
    return {
      w: Math.abs(c.width - window.innerWidth),
      h: Math.abs(c.height - window.innerHeight),
      scrollX: el.scrollWidth - el.clientWidth,
      scrollY: el.scrollHeight - el.clientHeight,
    };
  });
  expect(fit.w).toBeLessThan(2);
  expect(fit.h).toBeLessThan(2);
  expect(fit.scrollX).toBeLessThanOrEqual(0);
  expect(fit.scrollY).toBeLessThanOrEqual(0);
  // The front door is locked: forcing it open does nothing.
  const doorOpen = await page.evaluate(() => {
    const g = (window as unknown as Scene).__hideSeek.game;
    g.setDoor('d-front', true);
    return (g as unknown as { world: { isOpen(id: string): boolean } }).world.isOpen('d-front');
  });
  expect(doorOpen).toBe(false);
  expect(errors).toEqual([]);
});
