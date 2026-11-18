import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HIDDEN_PEEK_M, HideSeekGame, NO_INPUT } from '../../../src/modes/hide-seek/game';
import { exitPoint, exposure, hideSpots } from '../../../src/modes/hide-seek/hiding';
import { sightRate } from '../../../src/modes/hide-seek/perception';
import { THROW_RANGE_M } from '../../../src/modes/hide-seek/props';
import { VIEW_DISTANCE_M, Visibility } from '../../../src/modes/hide-seek/visibility';
import { HouseWorld } from '../../../src/modes/hide-seek/world';

const STEP = 1 / 60;
const press = (g: HideSeekGame) => g.step(STEP, { ...NO_INPUT, interactPress: true });
const idle = (g: HideSeekGame, seconds: number, extra: object = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) g.step(STEP, { ...NO_INPUT, ...extra });
};

describe('hiding places (sections B and F)', () => {
  const spots = hideSpots(HOUSE_PLAN);

  it('there are hiding places of every kind the brief lists, on both floors (all indoors)', () => {
    const kinds = new Set(spots.map((s) => s.spec.kind));
    for (const k of ['under-bed', 'wardrobe', 'cupboard', 'chest', 'curtain', 'shower-curtain'])
      expect(kinds.has(k as never), k).toBe(true);
    expect(spots.some((s) => s.floor === 1)).toBe(true);
    expect(spots.some((s) => s.floor === 0)).toBe(true);
    expect(spots.length).toBeGreaterThanOrEqual(18);
    // The game is played inside the house: no hiding place is in a yard.
    const w = new HouseWorld(HOUSE_PLAN);
    for (const sp of spots) expect(w.roomAt(sp.floor, sp.spec.at.x, sp.spec.at.y)?.outdoors, sp.id).not.toBe(true);
  });

  it('every hiding place can be entered and left, and the way out is a free spot', () => {
    for (const s of spots) {
      const g = new HideSeekGame(HOUSE_PLAN);
      const out = exitPoint(g.world, s);
      expect(g.world.fits(s.floor, out.x, out.y), `${s.id} exit`).toBe(true);
      // Stand where the exit is and hide.
      g.player.floor = s.floor;
      g.player.x = out.x;
      g.player.y = out.y;
      press(g);
      expect(g.player.hidingIn, `${s.id} entered`).toBe(s.id);
      expect(g.player.x).toBe(s.spec.at.x);
      expect(g.player.y).toBe(s.spec.at.y);
      press(g);
      expect(g.player.hidingIn, `${s.id} left`).toBeNull();
      expect(g.world.fits(g.player.floor, g.player.x, g.player.y), `${s.id} stepped out into a wall`).toBe(true);
    }
  });

  it('getting in and out makes a noise that depends on the place; hiding is never silent', () => {
    const noise: Record<string, number> = {};
    for (const s of spots) {
      const g = new HideSeekGame(HOUSE_PLAN);
      const out = exitPoint(g.world, s);
      g.player.floor = s.floor;
      g.player.x = out.x;
      g.player.y = out.y;
      g.takeEvents();
      press(g);
      const enter = g.takeEvents().find((e) => e.kind === 'hide-enter');
      expect(enter, s.id).toBeDefined();
      expect(enter!.loudness).toBeGreaterThan(0);
      expect(enter!.detail).toBe(s.spec.kind);
      noise[s.spec.kind] = enter!.loudness;
      press(g);
      expect(g.takeEvents().some((e) => e.kind === 'hide-exit' && e.loudness > 0)).toBe(true);
    }
    expect(noise.wardrobe).toBeGreaterThan(noise['shower-curtain']!);
    expect(noise['under-bed']).toBeGreaterThan(noise.curtain!);
    expect(new Set(Object.values(noise)).size).toBeGreaterThan(3); // different places, different noise
  });

  it('hidden: the body stays put, the view narrows, and only a small lean is allowed', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const wardrobe = spots.find((s) => s.spec.kind === 'wardrobe' && s.floor === 1)!;
    g.player.floor = 1;
    const out = exitPoint(g.world, wardrobe);
    g.player.x = out.x;
    g.player.y = out.y;
    press(g);
    const { x, y } = g.player;
    idle(g, 1, { move: { x: 1, y: 0 }, run: true });
    expect(g.player.x).toBe(x);
    expect(g.player.y).toBe(y);
    expect(g.player.posture).toBe('hidden');
    expect(g.viewer().viewM).toBe(wardrobe.spec.viewM);
    expect(wardrobe.spec.viewM).toBeLessThan(VIEW_DISTANCE_M / 4);
    idle(g, 1, { move: { x: 0, y: 1 }, peek: true });
    expect(Math.hypot(g.player.peekX, g.player.peekY)).toBeLessThanOrEqual(HIDDEN_PEEK_M + 1e-6);
  });

  it('the hidden player sees much less: a far room is not lit from inside a cupboard', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const cupboard = spots.find((s) => s.spec.kind === 'cupboard' && s.floor === 0 && s.id.startsWith('cupboard'))!;
    const out = exitPoint(g.world, cupboard);
    g.player.floor = 0;
    g.player.x = out.x;
    g.player.y = out.y;
    press(g);
    const vis = new Visibility(g.world);
    vis.settle(g.viewer());
    const open = { ...g.viewer(), viewM: undefined };
    const wide = new Visibility(g.world);
    wide.settle(open as never);
    const lit = (v: Visibility) => g.house.rooms.filter((r) => v.roomGoalLight(r.id) > 0.02).length;
    expect(lit(vis)).toBeLessThanOrEqual(lit(wide));
  });

  it('exposure: a hunter in front of the opening sees most, from the side less, from behind least; distance helps', () => {
    const bed = spots.find((s) => s.spec.kind === 'under-bed' && s.floor === 1 && s.spec.opensToward === 's')!;
    const at = bed.spec.at;
    const front = exposure(bed, { x: at.x, y: at.y + 2 });
    const side = exposure(bed, { x: at.x + 2, y: at.y });
    const behind = exposure(bed, { x: at.x, y: at.y - 2 });
    expect(front).toBeGreaterThan(side);
    expect(side).toBeGreaterThan(behind);
    expect(exposure(bed, { x: at.x, y: at.y + 7 })).toBeLessThan(front);
    // Better concealment, lower exposure.
    const wardrobe = spots.find((s) => s.spec.kind === 'wardrobe')!;
    const sofa = spots.find((s) => s.spec.kind === 'under-sofa')!;
    const dir = { x: 0, y: 0 };
    const f = (s: typeof wardrobe) => {
      const o = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[s.spec.opensToward]!;
      dir.x = s.spec.at.x + o[0]! * 2;
      dir.y = s.spec.at.y + o[1]! * 2;
      return exposure(s, dir);
    };
    expect(f(wardrobe)).toBeLessThan(1);
    expect(wardrobe.spec.concealment).toBeGreaterThan(sofa.spec.concealment - 1);
  });
});

describe('throwable distractions (section E)', () => {
  /** The player standing by the bottle on the living-room side table. */
  const nearBottle = () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    g.player.x = 18.1;
    g.player.y = 17.8;
    return g;
  };

  it('picks an object up, carries it, and throws it the way the player was heading', () => {
    const g = nearBottle();
    expect(g.prompt()).toBe('Pick up the bottle');
    press(g);
    expect(g.player.carrying).toBe('t1');
    expect(g.prompt()).toBe('Throw');
    idle(g, 0.3, { move: { x: 1, y: 0 } }); // head east
    press(g);
    expect(g.player.carrying).toBeNull();
    const flying = g.props.find((p) => p.id === 't1')!;
    expect(flying.mode).toBe('flying');
    expect(flying.vx).toBeGreaterThan(5);
    expect(Math.abs(flying.vy)).toBeLessThan(0.5);
  });

  it('the landing makes a noise at the spot it lands, loud for glass and soft for a toy', () => {
    const g = nearBottle();
    press(g);
    idle(g, 0.2, { move: { x: 1, y: 0 } });
    g.takeEvents();
    press(g);
    idle(g, 3);
    const impact = g.takeEvents().find((e) => e.kind === 'impact')!;
    expect(impact).toBeDefined();
    expect(impact.detail).toBe('bottle');
    expect(impact.loudness).toBeGreaterThan(0.8);
    // It flew into the hall (through the wide arch) and stopped within its range.
    expect(g.world.roomAt(0, impact.at.x, impact.at.y)?.id).toBe('hall');
    expect(impact.at.x - 18.1).toBeLessThanOrEqual(THROW_RANGE_M + 1.5);
    expect(g.props.find((p) => p.id === 't1')!.mode).toBe('rest');
    // A toy is quieter.
    const toy = new HideSeekGame(HOUSE_PLAN);
    toy.player.x = 16;
    toy.player.y = 17.9;
    toy.props.find((p) => p.id === 't3')!.x = 16;
    toy.props.find((p) => p.id === 't3')!.y = 18.0;
    press(toy);
    idle(toy, 0.2, { move: { x: -1, y: 0 } });
    toy.takeEvents();
    press(toy);
    idle(toy, 3);
    const soft = toy.takeEvents().find((e) => e.kind === 'impact')!;
    expect(soft.detail).toBe('toy');
    expect(soft.loudness).toBeLessThan(impact.loudness);
  });

  it('a thrown object stops at a wall, never through it', () => {
    const g = nearBottle();
    press(g);
    idle(g, 0.2, { move: { x: 0, y: -1 } }); // north, toward the bookshelf and the wall at y=14
    press(g);
    idle(g, 2);
    const o = g.props.find((p) => p.id === 't1')!;
    expect(o.mode).toBe('rest');
    expect(o.y).toBeGreaterThan(14.85); // short of the bookshelf
    expect(g.world.roomAt(0, o.x, o.y)?.id).toBe('living');
  });

  it('a carried object goes with the player, and a restart puts every object back', () => {
    const g = nearBottle();
    press(g);
    idle(g, 1, { move: { x: -1, y: 0 } });
    const o = g.props.find((p) => p.id === 't1')!;
    expect(o.x).toBeCloseTo(g.player.x, 5);
    g.restart();
    expect(g.player.carrying).toBeNull();
    const back = g.props.find((p) => p.id === 't1')!;
    expect(back.mode).toBe('rest');
    expect(back.x).toBe(18.1);
  });

  it('while carrying, interact throws instead of opening a door or hiding', () => {
    const g = nearBottle();
    press(g);
    g.player.x = 21;
    g.player.y = 14.9; // next to the kitchen door
    expect(g.prompt()).toBe('Throw');
    press(g);
    expect(g.world.isOpen('d-kitchen-living')).toBe(false);
  });
});

describe('hiding blinds the player; peeking shows a little but gives them away (owner, 18/11/2026)', () => {
  const setup = () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const spot = g.spots.find((s) => s.spec.kind === 'wardrobe' && s.floor === 1)!;
    const out = exitPoint(g.world, spot);
    g.player.floor = spot.floor;
    g.player.x = out.x;
    g.player.y = out.y;
    g.step(STEP, { ...NO_INPUT, interactPress: true });
    expect(g.player.hidingIn).toBe(spot.id);
    const vis = new Visibility(g.world);
    return { g, spot, vis };
  };

  it('while hidden and not peeking the player sees nothing: no room, no furniture, no hunter', () => {
    const { g, vis } = setup();
    const v = g.viewer();
    expect(v.hiddenView).toBe('blind');
    vis.settle(v);
    for (const r of g.house.rooms) expect(vis.roomLight(r.id), r.id).toBe(0);
    for (const f of g.house.furniture.filter((x) => x.floor === 1)) expect(vis.objectAlpha(f.id), f.id).toBe(0);
    // A hunter standing right in front of the opening is not seen.
    expect(vis.canSee(v, g.player.floor, { x: g.player.x, y: g.player.y + 1 })).toBe(false);
  });

  it('peeking shows only a small dim area round the hiding place, not the whole room', () => {
    const { g, spot, vis } = setup();
    g.step(STEP, { ...NO_INPUT, peek: true });
    const v = g.viewer();
    expect(v.hiddenView).toBe('peek');
    vis.settle(v);
    const room = g.world.roomAt(spot.floor, spot.spec.at.x, spot.spec.at.y)!;
    expect(vis.roomLight(room.id)).toBeGreaterThan(0.1);
    expect(vis.roomLight(room.id)).toBeLessThan(0.6); // dim, not the lit room
    // Something close is seen; something across the room is not; other rooms are black.
    const near = { x: v.x + spot.spec.viewM * 0.5, y: v.y };
    const far = { x: v.x + 9, y: v.y };
    expect(vis.canSee(v, v.floor, far)).toBe(false);
    expect(vis.canSee(v, v.floor, near) || vis.canSee(v, v.floor, { x: v.x, y: v.y + 0.5 })).toBe(true);
    for (const r of g.house.rooms.filter((r) => r.id !== room.id)) expect(vis.roomLight(r.id), r.id).toBe(0);
  });

  it('leaving the hiding place gives the normal view back', () => {
    const { g } = setup();
    g.step(STEP, { ...NO_INPUT, interactPress: true });
    expect(g.player.hidingIn).toBeNull();
    expect(g.viewer().hiddenView).toBeUndefined();
  });

  it('Shroud notices a peeking player several times faster than a still, hidden one', () => {
    const { g, spot } = setup();
    const eyes = {
      floor: spot.floor,
      x: spot.spec.at.x,
      y: spot.spec.at.y + 2.2,
      facing: -Math.PI / 2,
      gait: 'walk' as const,
    };
    const body = (peeking: boolean) => ({
      floor: spot.floor,
      x: spot.spec.at.x,
      y: spot.spec.at.y,
      crouching: false,
      hiding: spot,
      peeking,
    });
    const still = sightRate(g.world, eyes, body(false));
    const peeking = sightRate(g.world, eyes, body(true));
    expect(still).toBeGreaterThan(0);
    expect(peeking).toBeGreaterThanOrEqual(still * 2.5);
  });

  it('peeking while NOT hiding still does not change what Shroud notices (the old rule stands)', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    const eyes = { floor: 0 as const, x: 14, y: 17.5, facing: -Math.PI / 2, gait: 'walk' as const };
    const a = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: false, hiding: null, peeking: false });
    const b = sightRate(g.world, eyes, { floor: 0, x: 14, y: 15, crouching: false, hiding: null, peeking: true });
    expect(b).toBe(a);
  });
});
