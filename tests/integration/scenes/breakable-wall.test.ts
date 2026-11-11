import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const WALLS = OFFICE.interiorWalls!;
/** A section of the curved wall well away from the door, and its neighbour. */
const SECTION = 9;
const NEIGHBOUR = 10;

function centreOf(i: number): { x: number; y: number } {
  const r = WALLS[i]!;
  return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
}

/** Unit normal of a section pointing into the main office (the side with smaller x). */
function officeSide(i: number): { x: number; y: number } {
  const a = WALLS[i]!.angleRad ?? 0;
  const n = { x: Math.cos(a), y: Math.sin(a) };
  return n.x < 0 ? n : { x: -n.x, y: -n.y };
}

async function setup() {
  const c = centreOf(SECTION);
  const n = officeSide(SECTION);
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...OFFICE, playerStart: { x: c.x + n.x * 0.75, y: c.y + n.y * 0.75 }, dummyStart: { x: 3, y: 1.9 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'base-stickman' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 3) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  const section = (i: number) => scene.walls!.states.find((s) => s.index === i)!;
  /** Face the wall and land a full 1-2-3. */
  const combo = () => {
    scene.playerFighter.faceToward(-n.x, -n.y);
    for (const id of ['jab', 'cross', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === id, 1.5);
      run(0.12);
    }
    run(0.7);
  };
  return { intents, scene, scenes, run, section, combo, n };
}

describe('breakable curved wall (owner, 11/11/2026)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is very durable: punching one spot chips it, and only after many combos does that one section give way', async () => {
    const { scene, scenes, run, section, combo } = await setup();
    run(0.2);
    combo();
    const after1 = section(SECTION).left;
    expect(after1).toBeLessThan(1); // chipped…
    expect(after1).toBeGreaterThan(0.75); // …only a little
    let combos = 1;
    while (!section(SECTION).broken && combos < 20) {
      combo();
      combos++;
    }
    expect(section(SECTION).broken).toBe(true);
    expect(combos).toBeGreaterThanOrEqual(5);
    // Only the section that was hit broke; the rest of the wall stands.
    expect(scene.walls!.states.filter((s) => s.broken).map((s) => s.index)).toEqual([SECTION]);
    scenes.clear();
  });

  it('one broken section is a hole too small to walk through; two side by side make a gap', async () => {
    const { intents, scene, scenes, run, section, n } = await setup();
    run(0.2);
    scene.walls!.hitWhere((r) => r === WALLS[SECTION], { damage: 1e6, direction: { x: -n.x, y: -n.y } });
    expect(section(SECTION).broken).toBe(true);
    const c = centreOf(SECTION);
    const beyond = (p: { x: number; y: number }) => (p.x - c.x) * -n.x + (p.y - c.y) * -n.y; // > 0: past the wall
    intents.setMove('t', { x: -n.x, y: -n.y });
    run(2);
    expect(beyond(scene.player)).toBeLessThan(0); // still on the office side
    scene.walls!.hitWhere((r) => r === WALLS[NEIGHBOUR], { damage: 1e6, direction: { x: -n.x, y: -n.y } });
    // Step back, line up with the middle of the two holes, and walk through.
    const mid = { x: (c.x + centreOf(NEIGHBOUR).x) / 2, y: (c.y + centreOf(NEIGHBOUR).y) / 2 };
    intents.setMove('t', { x: 0, y: 0 });
    scene.playerFighter.placeAt({ x: mid.x + n.x * 0.8, y: mid.y + n.y * 0.8 });
    intents.setMove('t', { x: -n.x, y: -n.y });
    run(2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(beyond(scene.player)).toBeGreaterThan(0.4); // into the boss room
    scenes.clear();
  });
});
