import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { DEFENCE } from '../../../src/combat/combatant';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const A = GREYBOX_STICKMAN.attacks;

async function setup() {
  const stage = new Container();
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(TRAINING_YARD, stage, intents, () => ({ width: 1280, height: 720 }));
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 6) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  /** Walk to just left of the dummy, level with it, facing it. */
  const lineUp = () => {
    const d = scene.dummy;
    intents.setMove('t', { x: 0, y: Math.sign(d.y - scene.player.y) });
    runUntil(() => Math.abs(scene.player.y - d.y) < 0.12);
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > d.x - 1.05);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.4);
    scene.drainEvents();
  };
  return { intents, scene, scenes, run, runUntil, lineUp };
}

describe('Phase 5 combat in the arena', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the 1-2-3 combo damages the dummy; the finisher knocks it down', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    for (const step of ['jab', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      run(0.12);
    }
    runUntil(() => scene.dummy.state === 'knockdown', 1);
    expect(scene.dummy.state).toBe('knockdown');
    const base = A.jab.damage + A.hook.damage + A.heavy.damage;
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(base);
    expect(1000 - scene.dummy.hp).toBeLessThanOrEqual(Math.round(base * 1.5));
    const kinds = scene.drainEvents().map((e) => e.kind);
    expect(kinds.filter((k) => k === 'hit' || k === 'crit')).toHaveLength(3);
    scenes.clear();
  });

  it('KO at 0 health, then the dummy gets back up at full health where it started', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    // Start the dummy at 200 health so one full combo (240+ damage) is enough; retry if a hit misses.
    for (let round = 0; round < 3 && scene.dummy.state !== 'ko'; round++) {
      scene.respawnDummy({ x: 19, y: 13 });
      scene.dummyFighter.combatant.hp = 200;
      lineUp();
      intents.pressMelee();
      runUntil(() => scene.player.attack === 'jab', 1);
      run(0.1);
      intents.pressMelee();
      runUntil(() => scene.player.attack === 'hook', 1);
      run(0.1);
      intents.pressMelee();
      runUntil(() => scene.dummy.state === 'ko' || scene.player.attack === null, 2);
      run(0.3);
    }
    expect(scene.dummy.state).toBe('ko');
    expect(scene.dummy.hp).toBe(0);
    expect(scene.drainEvents().some((e) => e.kind === 'ko')).toBe(true);
    run(DEFENCE.koRespawnS + 0.2);
    expect(scene.dummy.state).not.toBe('ko');
    expect(scene.dummy.hp).toBe(1000);
    expect(scene.dummy.x).toBeCloseTo(TRAINING_YARD.dummyStart.x, 1);
    scenes.clear();
  });

  it('Button 1: a tap attacks; holding raises the guard instead and never throws a jab', async () => {
    const { intents, scene, scenes, run } = await setup();
    intents.pressMelee();
    run(STEP * 2);
    expect(scene.player.attack).toBe('jab');
    run(0.6);
    intents.meleePress();
    run(DEFENCE.blockHoldS + 0.05);
    expect(scene.player.state).toBe('guarding');
    expect(scene.player.attack).toBeNull();
    intents.meleeRelease();
    run(STEP * 2);
    expect(scene.player.state).toBe('free');
    expect(scene.player.attack).toBeNull(); // releasing a hold does not attack
    scenes.clear();
  });

  it('blocking a dummy jab takes only chip damage', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.meleePress();
    run(0.5); // guard up well past the parry window
    scene.dummyAttacks = true;
    runUntil(() => scene.drainEvents().length > 0 || scene.player.hp < 1000, 2);
    expect(scene.player.hp).toBe(1000 - Math.round(A.jab.damage * DEFENCE.chipFraction));
    expect(scene.player.state).toBe('guarding');
    intents.meleeRelease();
    scenes.clear();
  });

  it('raising the guard just before the hit parries: no damage and the dummy is stunned', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.meleePress();
    run(DEFENCE.blockHoldS + STEP); // guard just raised
    scene.dummyAttacks = true; // the dummy jabs at once
    const events: string[] = [];
    runUntil(() => {
      events.push(...scene.drainEvents().map((e) => e.kind));
      return events.length > 0;
    }, 1);
    expect(events).toEqual(['parried']);
    expect(scene.player.hp).toBe(1000);
    expect(scene.dummy.state).toBe('stunned');
    intents.meleeRelease();
    scenes.clear();
  });

  it('dodging through a jab: invulnerable during the dash', async () => {
    const { intents, scene, scenes, runUntil, lineUp } = await setup();
    lineUp();
    scene.dummyAttacks = true;
    intents.setMove('t', { x: 1, y: 0 }); // dash straight into the jab
    intents.pressDodge();
    const events: string[] = [];
    runUntil(() => {
      events.push(...scene.drainEvents().map((e) => e.kind));
      return events.length > 0;
    }, 1);
    expect(events).toEqual(['dodged']);
    expect(scene.player.hp).toBe(1000);
    expect(scene.player.stamina).toBeLessThan(100);
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });

  it('hit-stop: everything freezes for a few frames on impact', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.pressMelee();
    runUntil(() => scene.dummy.state === 'stunned', 1);
    const frozen = { p: scene.player.x, d: scene.dummy.x };
    run(STEP * 2); // within the 0.05 s light hit-stop
    expect(scene.dummy.x).toBe(frozen.d);
    expect(scene.player.x).toBe(frozen.p);
    run(0.2);
    expect(scene.dummy.x).not.toBe(frozen.d); // then the knockback plays out
    scenes.clear();
  });
});
