import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HideSeekGame, NO_INPUT, PEEK_M } from '../../../src/modes/hide-seek/game';
import { MEMORY_LIGHT, type Viewer, Visibility } from '../../../src/modes/hide-seek/visibility';
import { HouseWorld } from '../../../src/modes/hide-seek/world';

const at = (floor: 0 | 1, x: number, y: number): Viewer => ({ floor, x, y, onStairs: null, stairT: 0 });
const setup = () => {
  const world = new HouseWorld(HOUSE_PLAN);
  return { world, vis: new Visibility(world) };
};

describe('room-based visibility (section C)', () => {
  it('the occupied room is lit; unexplored rooms behind walls and shut doors stay dark', () => {
    const { vis } = setup();
    vis.settle(at(0, 14, 16));
    expect(vis.occupiedRoom).toBe('living');
    expect(vis.roomLight('living')).toBeGreaterThan(0.9);
    // Behind walls and a shut door: black.
    for (const id of ['toilet', 'backyard', 'shed', 'frontyard']) expect(vis.roomLight(id), id).toBe(0);
    for (const id of ['bed1', 'bed2', 'storage', 'uphall', 'bath1']) expect(vis.roomLight(id), id).toBe(0);
    // Seen only through two open arches, the kitchen is just a sliver; the hall shows through the wide arch.
    expect(vis.roomLight('kitchen')).toBeLessThan(0.15);
    expect(vis.roomLight('hall')).toBeGreaterThan(0.05);
  });

  it('the upstairs floor is hidden while the player is downstairs', () => {
    const { vis } = setup();
    vis.settle(at(0, 14, 16));
    expect(vis.floorOpacity(0)).toBe(1);
    expect(vis.floorOpacity(1)).toBe(0);
    // And nothing upstairs shows: no furniture, no hiding place.
    for (const f of HOUSE_PLAN.furniture.filter((x) => x.floor === 1)) expect(vis.objectAlpha(f.id), f.id).toBe(0);
  });

  it('an open arch shows the room beyond, with its furniture; a wall does not', () => {
    const { vis } = setup();
    // Standing in the living room straight in front of the dining arch (x 14 to 17).
    vis.settle(at(0, 15.5, 16.5));
    expect(vis.roomLight('dining')).toBeGreaterThan(0.1);
    const table = HOUSE_PLAN.furniture.find((f) => f.kind === 'dining-table')!;
    expect(vis.objectAlpha(table.id)).toBeGreaterThan(0.1);
    // The toilet behind the wall at the same moment: nothing.
    const toilet = HOUSE_PLAN.furniture.find((f) => f.kind === 'toilet' && f.floor === 0)!;
    expect(vis.objectAlpha(toilet.id)).toBe(0);
  });

  it('a shut door hides the room behind it; opening the door reveals it', () => {
    const world = new HouseWorld(HOUSE_PLAN);
    const vis = new Visibility(world);
    const v = at(0, 21, 16);
    vis.settle(v);
    expect(vis.roomLight('kitchen')).toBe(0);
    world.setDoor('d-kitchen-living', true);
    vis.settle(v);
    expect(vis.roomLight('kitchen')).toBeGreaterThan(0.1);
    const island = HOUSE_PLAN.furniture.find((f) => f.kind === 'counter' && f.y0 > 11)!;
    expect(vis.objectAlpha(island.id)).toBeGreaterThan(0.1);
    world.setDoor('d-kitchen-living', false);
    vis.settle(v);
    // Shut again: only the room you are in shows (owner, 18/11/2026), so the kitchen goes dark.
    expect(vis.roomLight('kitchen')).toBeCloseTo(MEMORY_LIGHT, 1);
    expect(MEMORY_LIGHT).toBe(0);
  });

  it('a room you have left goes dark again: only the room you are in (and what an open doorway shows) is visible', () => {
    const { vis } = setup();
    vis.settle(at(0, 16, 12)); // inside the dining room
    expect(vis.occupiedRoom).toBe('dining');
    vis.settle(at(0, 28, 19)); // out in the hall, with walls between
    expect(vis.explored.has('dining')).toBe(true);
    expect(vis.roomLight('dining')).toBeLessThan(0.05);
    expect(vis.roomLight('toilet')).toBe(0); // never seen: black
    expect(vis.explored.has('toilet')).toBe(false);
  });

  it('on the stairs the other floor is revealed progressively; at the bottom it stays hidden', () => {
    const { world, vis } = setup();
    const s = HOUSE_PLAN.stairs[0]!;
    const onRamp = (y: number): Viewer => ({ floor: 0, x: 27.2, y, onStairs: s.id, stairT: world.rampT(s, 27.2, y) });
    vis.settle(onRamp(14.9));
    expect(vis.floorOpacity(1)).toBeLessThan(0.05);
    vis.settle(onRamp(12.6));
    const mid = vis.floorOpacity(1);
    vis.settle(onRamp(11));
    const high = vis.floorOpacity(1);
    expect(high).toBeGreaterThan(mid);
    expect(high).toBeGreaterThan(0.6);
    expect(vis.roomLight('uphall')).toBeGreaterThan(0.05); // the landing shows
    expect(vis.roomLight('bed1')).toBe(0); // bedrooms behind their doors do not
  });

  it('upstairs: the ground floor is hidden; closed bedroom doors hide the bedrooms', () => {
    const { vis } = setup();
    vis.settle(at(1, 27, 9.8));
    expect(vis.occupiedRoom).toBe('uphall');
    expect(vis.floorOpacity(0)).toBe(0);
    expect(vis.floorOpacity(1)).toBe(1);
    expect(vis.roomLight('living')).toBe(0);
    expect(vis.roomLight('bed2')).toBe(0);
  });

  it('peeking leans the view through a doorway without moving the body', () => {
    const world = new HouseWorld(HOUSE_PLAN);
    const vis = new Visibility(world);
    // Beside the dining arch, behind the wall to its left: the dining room is hidden.
    const behind = at(0, 13.2, 15.2);
    vis.settle(behind);
    const before = vis.roomGoalLight('dining');
    // Lean 0.9 m to the right: the arch opens up the room.
    vis.settle(at(0, 13.2 + PEEK_M, 15.2));
    expect(vis.roomGoalLight('dining')).toBeGreaterThan(before + 0.05);
  });

  it('the game leans the view by the peek input but leaves the body where it is, and never through a wall', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    g.player.x = 13.2;
    g.player.y = 15.2;
    for (let i = 0; i < 40; i++) g.step(1 / 60, { ...NO_INPUT, move: { x: 1, y: 0 }, peek: true });
    expect(g.player.x).toBe(13.2);
    expect(g.player.y).toBe(15.2);
    expect(g.viewer().x).toBeGreaterThan(13.2 + 0.5);
    // Leaning north into the wall (y=14) is cut short: the view origin keeps a clear line from the body.
    const h = new HideSeekGame(HOUSE_PLAN);
    h.player.x = 12.6;
    h.player.y = 14.7;
    for (let i = 0; i < 60; i++) h.step(1 / 60, { ...NO_INPUT, move: { x: 0, y: -1 }, peek: true });
    expect(h.viewer().y).toBeGreaterThan(14.125); // the wall's face: the view never leans into or through it
    // Letting go brings the view back.
    for (let i = 0; i < 80; i++) h.step(1 / 60, NO_INPUT);
    expect(h.viewer().y).toBeCloseTo(14.7, 1);
  });

  it('can tell whether a point is visible (for drawing the hunter): through an arch yes, through a wall no', () => {
    const { vis } = setup();
    const v = at(0, 15.5, 16.5);
    vis.settle(v);
    expect(vis.canSee(v, 0, { x: 15.5, y: 11.5 })).toBe(true);
    expect(vis.canSee(v, 0, { x: 11, y: 11 })).toBe(false);
    expect(vis.canSee(v, 1, { x: 15.5, y: 11.5 })).toBe(false); // another floor
  });

  it('is cheap enough to recompute ten times a second (a performance guard)', () => {
    const { vis } = setup();
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) vis.settle(at(0, 12 + (i % 10), 16));
    const perUpdateMs = (performance.now() - t0) / 100;
    expect(perUpdateMs).toBeLessThan(8);
  });
});
