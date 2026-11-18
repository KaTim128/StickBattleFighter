import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HideSeekGame, NO_INPUT } from '../../../src/modes/hide-seek/game';
import { exitPoint } from '../../../src/modes/hide-seek/hiding';

const STEP = 1 / 60;
const press = (g: HideSeekGame) => g.step(STEP, { ...NO_INPUT, interactPress: true });

/** Owner, 20/11/2026: items on the floor never stop the player entering, using or leaving a hiding place. */
describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real house', HOUSE],
])('hiding places and floor items in %s', (_name, house) => {
  /** The player beside a place, with every loose item piled round the doorway of it. */
  const setup = (spotIndex: number) => {
    const g = new HideSeekGame(house);
    const spot = g.spots[spotIndex]!;
    const out = exitPoint(g.world, spot);
    g.player.floor = spot.floor;
    g.player.x = out.x;
    g.player.y = out.y;
    for (const o of g.props) {
      o.mode = 'rest';
      o.floor = spot.floor;
      o.x = out.x + (o.id.length % 3) * 0.05;
      o.y = out.y + 0.05;
    }
    return { g, spot, out };
  };

  it('a pile of items at the door of every place does not stop the player hiding, or leaving again', () => {
    const g0 = new HideSeekGame(house);
    for (let i = 0; i < g0.spots.length; i++) {
      const { g, spot, out } = setup(i);
      expect(g.prompt(), spot.id).toContain('Hide');
      press(g);
      expect(g.player.hidingIn, `${spot.id}: hid`).toBe(spot.id);
      expect(g.player.carrying, `${spot.id}: picked nothing up`).toBeNull();
      press(g);
      expect(g.player.hidingIn, `${spot.id}: left`).toBeNull();
      expect(g.world.fits(spot.floor, g.player.x, g.player.y), `${spot.id}: out on free floor`).toBe(true);
      expect(Math.hypot(g.player.x - out.x, g.player.y - out.y)).toBeLessThan(2.5);
    }
  });

  it('carrying something, the player still hides, and the item is set down at the way out', () => {
    const g0 = new HideSeekGame(house);
    for (let i = 0; i < g0.spots.length; i++) {
      const { g, spot } = setup(i);
      const held = g.props[0]!;
      held.mode = 'carried';
      g.player.carrying = held.id;
      press(g);
      expect(g.player.hidingIn, `${spot.id}: hid while carrying`).toBe(spot.id);
      expect(g.player.carrying).toBeNull();
      expect(held.mode).toBe('rest');
      expect(g.world.fits(held.floor, held.x, held.y, 0.05), `${spot.id}: item on free floor`).toBe(true);
    }
  });

  it('away from every hiding place, the same press still picks an item up, and then throws it', () => {
    const g = new HideSeekGame(house);
    const free = HOUSE.playerStart;
    const o = g.props[0]!;
    // Somewhere no place is within reach.
    g.player.floor = free.floor;
    g.player.x = free.x;
    g.player.y = free.y;
    o.mode = 'rest';
    o.floor = free.floor;
    o.x = free.x + 0.3;
    o.y = free.y;
    expect(g.prompt()).toContain('Pick up');
    press(g);
    expect(g.player.carrying).toBe(o.id);
    expect(g.prompt()).toBe('Throw');
    press(g);
    expect(g.player.carrying).toBeNull();
  });
});
