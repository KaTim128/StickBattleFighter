import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(player: string, at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
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
  return { intents, scene, scenes, run, runUntil };
}

/** The fourth ability on R for every fighter (owner, 12/11/2026). */
describe('fourth abilities (R)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('every fighter has one, bound to R by default and shown on the touch controls', async () => {
    const { DEFAULT_BINDINGS } = await import('../../../src/input/bindings');
    expect(DEFAULT_BINDINGS.ability4).toBe('KeyR');
    for (const id of ['inferno', 'rampage', 'necro']) {
      const { scene, scenes } = await setup(id, { x: 10, y: 10 }, { x: 20, y: 10 });
      expect(scene.playerFighter.caster!.def('a4').slot).toBe('a4');
      scenes.clear();
    }
  });

  it('Inferno Flame Detonation: gathers fire, then a short-range blast hurls a close enemy backwards', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('inferno', { x: 14, y: 13 }, { x: 15.4, y: 13 });
    intents.pressAbility('a4');
    run(STEP * 2);
    expect(scene.player.ability).toBe('flameDetonation');
    expect(scene.dummy.hp).toBe(1000); // still gathering
    runUntil(() => scene.dummy.hp < 1000, 1.5);
    expect(scene.dummy.hp).toBeLessThan(1000 - 50);
    run(0.8);
    expect(scene.dummy.x - 14).toBeGreaterThan(2.6); // flung well away from him
    scenes.clear();
  });

  it('Flame Detonation is short range: an enemy 4 m away is untouched', async () => {
    const { intents, scene, scenes, run } = await setup('inferno', { x: 14, y: 13 }, { x: 18, y: 13 });
    intents.pressAbility('a4');
    run(1.5);
    expect(scene.dummy.hp).toBe(1000);
    scenes.clear();
  });

  it('Braxon Grapple Slam: seizes the enemy in front, hoists it overhead, then slams it down', async () => {
    const { intents, scene, scenes, runUntil } = await setup('rampage', { x: 14, y: 13 }, { x: 15.1, y: 13 });
    intents.pressAbility('a4');
    runUntil(() => scene.dummyFighter.abilityLift > 0.6, 1.5);
    expect(scene.dummyFighter.abilityLift).toBeGreaterThan(0.6); // held up overhead
    expect(scene.dummy.state).toBe('stunned'); // helpless while held
    expect(scene.dummy.hp).toBe(1000); // not hurt until the slam
    runUntil(() => scene.dummy.hp < 1000, 1.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(140);
    expect(scene.dummyFighter.abilityLift).toBe(0); // back on the floor
    runUntil(() => scene.dummy.state === 'knockdown', 0.5);
    expect(scene.dummy.state).toBe('knockdown');
    scenes.clear();
  });

  it('Grapple Slam with nobody in reach grasps at the air', async () => {
    const { intents, scene, scenes, run } = await setup('rampage', { x: 14, y: 13 }, { x: 19, y: 13 });
    intents.pressAbility('a4');
    run(2);
    expect(scene.dummy.hp).toBe(1000);
    expect(scene.dummyFighter.abilityLift).toBe(0);
    scenes.clear();
  });

  it('Necro Grave Chains: chains catch the enemy at range and drag it to his feet', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('necro', { x: 10, y: 13 }, { x: 16.5, y: 13 });
    intents.pressAbility('a4');
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    runUntil(() => Math.hypot(scene.dummy.x - 10, scene.dummy.y - 13) < 2, 1.5);
    run(0.2);
    const d = Math.hypot(scene.dummy.x - 10, scene.dummy.y - 13);
    expect(d).toBeLessThan(2); // dragged in from 6.5 m
    expect(d).toBeGreaterThan(0.6); // to his feet, not into him
    scenes.clear();
  });
});

/** Owner, 12/11/2026: the fighting stance only while fighting; after 3 s calm, a relaxed stand. */
describe('relaxed idle in a fight', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('relaxes after 3 s without fighting, takes the guard at once on an attack, and walks without Shift', async () => {
    const { intents, scene, scenes, run } = await setup('inferno', { x: 10, y: 10 }, { x: 22, y: 18 });
    const w = () => scene.playerFighter.animator.weights;
    run(2.5);
    expect(w().relax).toBeLessThan(0.05); // still in the stance
    run(2);
    expect(w().relax).toBeGreaterThan(0.8);
    intents.pressMelee();
    run(0.3);
    expect(w().relax).toBeLessThan(0.1);
    // Walking (no Shift) never blends into the run; Shift does.
    run(0.6);
    intents.setMove('t', { x: 1, y: 0 });
    run(1);
    expect(w().walk).toBeGreaterThan(0.9);
    expect(w().run).toBeLessThan(0.05);
    intents.sprint = true;
    run(1);
    expect(w().run).toBeGreaterThan(0.9);
    intents.sprint = false;
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });
});

/** Owner, 12/11/2026: READY... FIGHT! before every fight; nothing moves until FIGHT. */
describe('fight intro lock', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('both fighters stay put and nothing fires until the announcer has said FIGHT, then combat is on', async () => {
    const { FIGHT_INTRO } = await import('../../../src/app/scenes/fight-arena-scene');
    const { intents, scene, scenes, run } = await setup('inferno', { x: 14, y: 13 }, { x: 15.3, y: 13 });
    scene.dummyAttacks = true;
    scene.startIntro();
    expect(scene.introState?.phase).toBe('lead-in');
    const x0 = scene.player.x;
    intents.setMove('t', { x: -1, y: 0 });
    intents.pressMelee();
    intents.pressAbility('a1');
    run(FIGHT_INTRO.readyAtS + 0.1);
    expect(scene.introState?.phase).toBe('ready');
    run(FIGHT_INTRO.fightAtS - FIGHT_INTRO.readyAtS);
    expect(scene.introState?.phase).toBe('fight');
    expect(Math.abs(scene.player.x - x0)).toBeLessThan(0.02); // never moved
    expect(scene.player.attack).toBeNull();
    expect(scene.player.ability).toBeNull();
    expect(scene.player.hp).toBe(1000); // the dummy did not attack either
    expect(scene.dummy.hp).toBe(1000);
    run(FIGHT_INTRO.combatAtS - FIGHT_INTRO.fightAtS + 0.05);
    expect(scene.introState).toBeNull();
    // The presses made during the intro were dropped, not saved up.
    expect(scene.player.attack).toBeNull();
    run(0.4);
    expect(scene.player.x).toBeLessThan(x0 - 0.3); // the held stick moves it now
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });
});
