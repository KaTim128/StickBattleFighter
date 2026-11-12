import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { fallDamage } from '../../../src/physics/climbing';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
/** A desk (0.75 m) and a bookshelf (2 m) in an open corner of the yard. */
const ROOM: ArenaLayout = {
  ...TRAINING_YARD,
  props: [
    { kind: 'desk', x: 10, y: 3 },
    { kind: 'bookshelf', x: 20, y: 3 },
  ],
};

async function setup(player: string, at: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...ROOM, playerStart: at, dummyStart: { x: 26, y: 17 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  run(0.2);
  const p = scene.playerFighter;
  /** Jump while pushing toward x+ (the furniture). */
  const jumpRight = () => {
    intents.setMove('t', { x: 1, y: 0 });
    intents.pressJump();
  };
  /** Pull up: one Jump press, then a beat. */
  const pull = () => {
    intents.pressJump();
    run(0.12);
  };
  return { intents, scene, scenes, run, runUntil, p, jumpRight, pull };
}

const hp = (f: FighterEntity) => f.combatant.hp;

/** Owner, 12/11/2026: jump onto furniture, grab and climb what is too high, fall damage. */
describe('furniture climbing', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('jumps onto a desk and stands on it; walking off the edge drops to the floor unhurt', async () => {
    const { intents, scenes, run, runUntil, p, jumpRight } = await setup('inferno', { x: 8.6, y: 3 });
    jumpRight();
    runUntil(() => p.x > 9.7, 1.5); // over the desk: let go of the stick and come down on it
    intents.setMove('t', { x: 0, y: 0 });
    runUntil(() => !p.airborne, 1.5);
    run(0.3);
    expect(p.hop.heightM).toBeCloseTo(0.75, 2); // on the desk top
    expect(p.x).toBeGreaterThan(9.2);
    expect(p.x).toBeLessThan(10.8);
    const before = hp(p);
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => p.x > 11.2 && !p.airborne, 2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(p.hop.heightM).toBe(0); // back on the floor
    expect(hp(p)).toBe(before); // a short drop does not hurt
    scenes.clear();
  });

  it('a bookshelf is too high to jump onto: grabs the edge and climbs up with repeated Space presses', async () => {
    const { intents, scenes, run, runUntil, p, jumpRight, pull } = await setup('inferno', { x: 18.2, y: 3 });
    jumpRight();
    runUntil(() => p.climb !== null, 1.2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(p.climb).not.toBeNull();
    const hanging = p.hop.heightM;
    expect(hanging).toBeLessThan(2);
    // Not pressing: it hangs there (slipping back a little), never climbing by itself.
    run(0.5);
    expect(p.climb).not.toBeNull();
    let rising = 0;
    for (let i = 0; i < 12 && p.climb; i++) {
      const h = p.hop.heightM;
      pull();
      if (p.hop.heightM > h) rising++;
    }
    expect(rising).toBeGreaterThanOrEqual(4); // each heave lifts the body a little: no snap
    expect(p.climb).toBeNull();
    run(0.3);
    expect(p.hop.heightM).toBeCloseTo(2, 2); // standing on the top
    expect(p.x).toBeGreaterThan(19);
    expect(p.x).toBeLessThan(21);
    scenes.clear();
  });

  it('hit at about 70% of the climb: the climb is cancelled and the fighter falls back to the floor', async () => {
    const { intents, scene, scenes, runUntil, p, jumpRight, pull } = await setup('inferno', { x: 18.2, y: 3 });
    jumpRight();
    runUntil(() => p.climb !== null, 1.2);
    intents.setMove('t', { x: 0, y: 0 });
    for (let i = 0; i < 4; i++) pull();
    expect(p.climb!.progress).toBeGreaterThan(0.6);
    expect(p.climb!.progress).toBeLessThan(0.85);
    const before = hp(p);
    const dummy = scene.dummyFighter;
    dummy.placeAt({ x: 17.4, y: 3 });
    const r = (scene as unknown as { applyStrike(a: FighterEntity, t: FighterEntity, s: object): boolean }).applyStrike(
      dummy,
      p,
      {
        damage: 20,
        heavy: false,
        knockbackMps: 1,
        dir: { x: 1, y: 0 },
        melee: true,
        impact: 'knuckle-light',
      },
    );
    expect(r).toBe(true);
    runUntil(() => p.climb === null, 0.4); // after the blow's hit-stop
    expect(p.climb).toBeNull();
    expect(p.airborne).toBe(true); // falling, not snapped down
    runUntil(() => !p.airborne, 2);
    expect(p.hop.heightM).toBe(0);
    expect(before - hp(p)).toBeGreaterThanOrEqual(20); // the blow (a drop from this low is survivable unhurt)
    scenes.clear();
  });

  it('lets go when pushing away, and never ends up inside the piece', async () => {
    // A desk right next to a bookshelf: from the desk top, walking into the shelf is blocked.
    const { intents, scenes, runUntil, run, p, jumpRight } = await setup('inferno', { x: 16.6, y: 3 });
    p.placeAt({ x: 18.2, y: 3 });
    jumpRight();
    runUntil(() => p.climb !== null, 1.2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(p.climb).not.toBeNull();
    // Let go (push away): it drops back to the floor in front of the shelf.
    intents.setMove('t', { x: -1, y: 0 });
    run(STEP * 2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(p.climb).toBeNull();
    runUntil(() => !p.airborne, 2);
    // Jumping straight at the shelf from the floor never puts the body inside it.
    intents.setMove('t', { x: 1, y: 0 });
    run(0.6);
    intents.setMove('t', { x: 0, y: 0 });
    if (p.climb === null) expect(p.x).toBeLessThan(19 - p.def.body.footRadiusM + 0.05);
    scenes.clear();
  });

  it('fall damage grows with the drop and with body weight', () => {
    expect(fallDamage(1, 70)).toBe(0);
    expect(fallDamage(2.5, 70)).toBeGreaterThan(fallDamage(2, 70));
    expect(fallDamage(2.5, 140)).toBeGreaterThan(fallDamage(2.5, 70) * 1.5);
    expect(fallDamage(2.5, 60)).toBeLessThan(fallDamage(2.5, 70));
  });

  it('a heavier fighter takes more damage from the same fall off a bookshelf', async () => {
    const damageFor = async (id: string) => {
      const { intents, scenes, runUntil, run, p, jumpRight, pull } = await setup(id, { x: 18.2, y: 3 });
      jumpRight();
      runUntil(() => p.climb !== null, 1.2);
      intents.setMove('t', { x: 0, y: 0 });
      for (let i = 0; i < 14 && p.climb; i++) pull();
      run(0.3);
      expect(p.hop.heightM).toBeCloseTo(2, 2);
      const before = hp(p);
      intents.setMove('t', { x: 0, y: 1 }); // walk off the front edge
      runUntil(() => p.y > 3.6 && !p.airborne, 2);
      intents.setMove('t', { x: 0, y: 0 });
      const lost = before - hp(p);
      scenes.clear();
      return lost;
    };
    const light = await damageFor('inferno');
    const heavy = await damageFor('rampage');
    expect(light).toBeGreaterThan(0);
    expect(heavy).toBeGreaterThan(light);
  });
});
