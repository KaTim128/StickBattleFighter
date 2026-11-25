import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { angleDelta } from '../../../src/ai/beam-tracker';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(
  at: { x: number; y: number },
  dummyAt: { x: number; y: number },
  cast: Record<string, unknown> = { player: 'inferno' },
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    cast,
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
  const beams = () => scene.abilities!.world.beams;
  /** A plain punch landing on `target` from `attacker`, through the real hit rules. */
  const hit = (attacker: FighterEntity, target: FighterEntity) =>
    (scene as unknown as { applyStrike(a: FighterEntity, t: FighterEntity, s: object): boolean }).applyStrike(
      attacker,
      target,
      {
        damage: 20,
        heavy: false,
        knockbackMps: 1,
        dir: { x: -1, y: 0 },
        melee: true,
        impact: 'knuckle-light',
      },
    );
  return { intents, scene, scenes, run, runUntil, beams, hit };
}

/** Master plan Phase 1 B4: Inferno's Fire Beam is a second longer, and a hit on Inferno puts it out at once. */
describe('Fire Beam (B4)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('pours for 2.4 s with Inferno rooted, then frees him a moment later', async () => {
    const { intents, scene, scenes, run, runUntil, beams } = await setup({ x: 10, y: 13 }, { x: 14, y: 13 });
    intents.pressAbility('a3');
    runUntil(() => beams().length > 0, 2.5);
    expect(beams()).toHaveLength(1);
    // Measure the beam's own age: hit-stop pauses the simulation while its ticks land.
    let age = 0;
    let rootedLate = true;
    runUntil(() => {
      if (beams().length === 0) return true;
      age = beams()[0]!.ageS;
      if (age > 2 && scene.playerFighter.caster!.cast === null) rootedLate = false;
      return false;
    }, 8);
    expect(age).toBeGreaterThan(2.25); // a second longer than the old 1.4 s beam
    expect(age).toBeLessThanOrEqual(2.4);
    expect(rootedLate).toBe(true); // still casting right up to its end: he cannot walk off
    run(0.8);
    expect(scene.playerFighter.caster!.cast).toBeNull(); // free again a moment later
    expect(scene.dummy.hp).toBeLessThan(1000 - 220); // it really hurt (B3 rebalance: Fire Beam damage -12 %): a long beam on a standing target
    scenes.clear();
  });

  it('stops the instant Inferno is hit: no beam, no more beam ticks, no cast left', async () => {
    const { intents, scene, scenes, run, runUntil, beams, hit } = await setup({ x: 10, y: 13 }, { x: 14, y: 13 });
    intents.pressAbility('a3');
    runUntil(() => beams().length > 0, 2.5);
    run(0.6);
    expect(scene.dummy.hp).toBeLessThan(1000); // burning the dummy
    const ticksBefore = scene.abilities!.recentFx.filter((e) => e.ability === 'fireBeam' && e.kind === 'impact').length;
    expect(hit(scene.dummyFighter, scene.playerFighter)).toBe(true);
    run(STEP * 2);
    expect(beams()).toHaveLength(0); // hitbox and ticks gone with it
    expect(scene.playerFighter.caster!.cast).toBeNull();
    const hpAfter = scene.dummy.hp;
    run(1.2);
    const ticksAfter = scene.abilities!.recentFx.filter((e) => e.ability === 'fireBeam' && e.kind === 'impact').length;
    expect(ticksAfter).toBe(ticksBefore); // not one more beam impact
    // Only the burn the beam already lit is left (10 a second): never another beam tick (at least 20 each).
    expect(hpAfter - scene.dummy.hp).toBeLessThanOrEqual(15);
    scenes.clear();
  });

  it('also stops when Inferno is stunned or knocked down by anything, not only by a blow', async () => {
    const { intents, scene, scenes, run, runUntil, beams } = await setup({ x: 10, y: 13 }, { x: 14, y: 13 });
    intents.pressAbility('a3');
    runUntil(() => beams().length > 0, 2.5);
    run(0.4);
    scene.playerFighter.combatant.stun(0.8);
    run(STEP * 2);
    expect(beams()).toHaveLength(0);
    expect(scene.playerFighter.caster!.cast).toBeNull();
    scenes.clear();
  });

  it('is still interrupted during its charge, as before', async () => {
    const { intents, scene, scenes, run, beams, hit } = await setup({ x: 10, y: 13 }, { x: 14, y: 13 });
    intents.pressAbility('a3');
    run(0.4); // charging
    expect(scene.playerFighter.caster!.cast?.phase).toBe('windup');
    hit(scene.dummyFighter, scene.playerFighter);
    run(STEP * 2);
    expect(scene.playerFighter.caster!.cast).toBeNull();
    run(1.5);
    expect(beams()).toHaveLength(0); // it never fired
    scenes.clear();
  });
});

describe('AI aims the beam imperfectly (B4)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('an Easy AI whose target sidesteps during the charge fires where it last read it and misses', async () => {
    const { scene, scenes, run, runUntil, beams } = await setup(
      { x: 10, y: 13 },
      { x: 14, y: 13 },
      { player: 'rampage', opponent: 'inferno', difficulty: 'easy' },
    );
    const ai = scene.dummyFighter;
    const target = scene.playerFighter;
    // The AI decides to beam the player straight ahead of it (to its left, along -x)...
    const first = Math.atan2(target.y - ai.y, target.x - ai.x);
    expect(scene.abilities!.tryCast(ai, 'a3', { x: target.x, y: target.y })).toBeNull();
    ai.aiBeam.start(first);
    // ...and the player immediately runs to the side, a quarter turn round it.
    target.placeAt({ x: 14, y: 9 });
    runUntil(() => beams().length > 0, 2.5);
    expect(beams()).toHaveLength(1);
    const fired = Math.atan2(beams()[0]!.dir.y, beams()[0]!.dir.x);
    const truth = Math.atan2(target.y - ai.y, target.x - ai.x);
    expect(Math.abs(angleDelta(fired, truth))).toBeGreaterThan(1); // nowhere near the player
    const hp = target.combatant.hp;
    run(0.5);
    expect(target.combatant.hp).toBe(hp); // the beam did not find them
    scenes.clear();
  });
});
