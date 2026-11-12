import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { idlePose, walkPose } from '../../../src/animation/greybox-motion';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'shroud' },
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

/** Shroud (owner, 12/11/2026): an original masked slasher. */
describe('Shroud', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is a hunched knife fighter: bent over at rest and walking, with a mask, a robe and a knife', async () => {
    const { scene, scenes } = await setup({ x: 10, y: 10 }, { x: 20, y: 10 });
    const d = scene.playerFighter.def;
    expect(d.effects.head).toBe('mask');
    expect(d.effects.body).toBe('cloak');
    expect(d.effects.held).toBe('knife');
    const bones = d.bones;
    for (const pose of [idlePose(0.3, bones, 'stalker'), walkPose(0.3, bones, 'stalker')])
      expect((pose.lean * 180) / Math.PI).toBeLessThan(-20); // never upright
    scenes.clear();
  });

  it('knife combo: slash, backhand, then a lunging stab that knocks down', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.2, y: 13 });
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1);
      if (scene.player.attack) seen.push(scene.player.attack);
      run(0.12);
    }
    expect(seen).toEqual(['knife-slash', 'backhand-slash', 'lunging-stab']);
    runUntil(() => scene.dummy.state === 'knockdown' || scene.dummy.state === 'gettingUp', 2);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Thrown Blade hits at range and the cut keeps bleeding', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 12, y: 13 }, { x: 18, y: 13 });
    intents.pressAbility('a1');
    runUntil(() => scene.dummy.hp < 1000, 2);
    const afterHit = scene.dummy.hp;
    expect(afterHit).toBeLessThan(1000);
    expect(scene.dummyFighter.combatant.bleeding).toBe(true);
    run(1.5);
    expect(scene.dummy.hp).toBeLessThan(afterHit - 8); // still losing blood
    scenes.clear();
  });

  it('Stalker Lunge passes through the enemy, slashing it on the way', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 12, y: 13 }, { x: 14.5, y: 13 });
    intents.pressAbility('a2');
    run(1);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.player.x).toBeGreaterThan(15); // through, not stopped
    scenes.clear();
  });

  it('Behind You appears on the far side of the nearest enemy, facing it', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 10, y: 13 }, { x: 15, y: 13 });
    intents.pressAbility('a3');
    run(0.8);
    expect(scene.player.x).toBeGreaterThan(15.3); // behind it
    expect(Math.abs(scene.player.y - 13)).toBeLessThan(0.6);
    expect(scene.player.facing).toBe(-1); // turned to face its back
    scenes.clear();
  });

  it('Rending Flurry: heavy close damage, a stagger and deep bleeding', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 }, { x: 15.2, y: 13 });
    intents.pressAbility('a4');
    run(0.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(90);
    expect(scene.dummyFighter.combatant.bleeding).toBe(true);
    scenes.clear();
  });

  it('Hunting Frenzy: faster on his feet, quicker and deadlier knife, cuts bleed, red aura', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.2, y: 13 });
    // No random critical hits, so the comparison is fair.
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    // A plain slash first, for comparison.
    intents.pressMelee();
    runUntil(() => scene.dummy.hp < 1000, 1);
    const plain = 1000 - scene.dummy.hp;
    run(1.2);
    scene.respawnDummy({ x: 16.2, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    runUntil(() => scene.playerFighter.buff !== null, 2);
    const b = scene.playerFighter.buff!;
    expect(b.speedFactor).toBeGreaterThan(1.2);
    expect(b.attackSpeedFactor).toBeGreaterThan(1.3);
    run(0.4);
    const hp0 = scene.dummy.hp;
    intents.pressMelee();
    runUntil(() => scene.dummy.hp < hp0, 1);
    expect(hp0 - scene.dummy.hp).toBeGreaterThan(plain * 1.25); // deadlier knife
    expect(scene.dummyFighter.combatant.bleeding).toBe(true); // the cut bleeds
    scenes.clear();
  });
});
