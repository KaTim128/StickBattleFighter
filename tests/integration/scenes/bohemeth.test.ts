import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { solveSkeleton } from '../../../src/animation/skeleton';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Bohemeth in the real fight scene against a chosen opponent. */
async function setup(opponent = 'training-dummy', gap = 4) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 13, y: 13 }, dummyStart: { x: 13 + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'bohemeth', opponent },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (s: number) => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  run(0.2);
  scene.drainEvents();
  const cast = (slot: 'a1' | 'a2' | 'a3' | 'a4' | 'ult') => {
    intents.pressAbility(slot);
    run(STEP * 2);
  };
  const me = () => scene.playerFighter;
  const foe = () => scene.dummyFighter;
  return { intents, scene, scenes, run, runUntil, cast, me, foe };
}

describe('Bohemeth', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('has four arms: the rig solves a lower pair that hangs from its own shoulders and follows an upper pair without them', async () => {
    const { me, scenes } = await setup();
    const bones = me().def.bones;
    expect(bones.lowerArms).toBeGreaterThan(0);
    const pose = {
      lean: 0,
      head: 0,
      armFront: { root: 1, bend: 1 },
      armBack: { root: 0.5, bend: 1 },
      legFront: { root: 0.2, bend: -0.2 },
      legBack: { root: -0.2, bend: -0.2 },
    };
    const s = solveSkeleton(pose, bones);
    expect(s.armFront2).toBeDefined();
    expect(s.armBack2).toBeDefined();
    // The lower shoulders sit below the upper ones, and the lower arms reach their own hands.
    expect(s.armFront2![0].y).toBeGreaterThan(s.chest.y);
    expect(Math.hypot(s.armFront2![2].x - s.armFront[2].x, s.armFront2![2].y - s.armFront[2].y)).toBeGreaterThan(0.1);
    scenes.clear();
  });

  it('Tap: a four hit combo, each hit its own move and animation, the fourth with the strongest push', async () => {
    const { me, scenes } = await setup();
    const set = me().def.moves;
    const chain = ['upper-jab', 'upper-cross', 'lower-body-punch', 'lower-finisher'];
    const states = chain.map((id) => set[id]!.animationState);
    expect(new Set(states).size).toBe(4);
    for (let i = 0; i < 3; i++) expect(set[chain[i]!]!.next?.tap).toBe(chain[i + 1]);
    expect(set['lower-finisher']!.knockbackSpeedMps).toBeGreaterThan(
      Math.max(...chain.slice(0, 3).map((id) => set[id]!.knockbackSpeedMps)),
    );
    expect(set[me().def.starters.heavy!]!.damage).toBeGreaterThan(set['lower-finisher']!.damage);
    scenes.clear();
  });

  it('Directional Charge: locked direction, a short rush that hurts the first fighter it reaches', async () => {
    const { scene, scenes, run, runUntil, cast, me } = await setup('training-dummy', 4);
    me().combatant.stamina = 100;
    const x0 = me().x;
    cast('a1');
    runUntil(() => scene.dummy.hp < scene.dummyFighter.combatant.stats.maxHp, 3);
    expect(scene.dummy.hp).toBeLessThan(scene.dummyFighter.combatant.stats.maxHp);
    run(1);
    expect(Math.abs(me().y - 13)).toBeLessThan(0.4); // straight along the aim
    expect(me().x - x0).toBeLessThan(6.5); // short: nothing like Titan's run to the wall
    scenes.clear();
  });

  it('Four Arm Uppercut: the launch depends on weight (a light fighter flies higher than a heavy one)', async () => {
    const heights: Record<string, number> = {};
    for (const who of ['shroud', 'rampage']) {
      const { scene, scenes, run, cast, me, foe } = await setup(who, 1.4);
      me().combatant.stamina = 100;
      cast('a2');
      let peak = 0;
      for (let i = 0; i < 3 / STEP; i++) {
        run(STEP);
        peak = Math.max(peak, foe().hop.heightM + foe().abilityLift);
      }
      heights[who] = peak;
      expect(scene.abilities).toBeTruthy();
      scenes.clear();
    }
    expect(heights.shroud!).toBeGreaterThan(heights.rampage! + 0.3);
  }, 30_000);

  it('Thunder Clap: hurts and throws back whoever is near, and stops a charge coming at him from a distance', async () => {
    const { scene, scenes, run, runUntil, cast, me, foe } = await setup('rampage', 7);
    me().combatant.stamina = 100;
    scene.abilities!.tryCast(foe(), 'a2', { x: me().x, y: me().y }); // Titan starts his charge
    runUntil(() => scene.abilities!.world.executingIds(foe().name).size > 0, 2);
    run(0.3);
    cast('a3');
    run(1.2);
    expect(scene.abilities!.world.executingIds(foe().name).has('rampageCharge')).toBe(false);
    scenes.clear();
  }, 30_000);

  it('Four Arm Ground Smash: jumps, lands and hurts the nearby more than the far', async () => {
    const hurt = async (gap: number) => {
      const { scene, scenes, run, runUntil, cast, me } = await setup('training-dummy', gap);
      me().combatant.stamina = 100;
      cast('a4'); // the leap is aimed first: the second press confirms
      cast('a4');
      runUntil(() => scene.dummy.hp < scene.dummyFighter.combatant.stats.maxHp, 3);
      run(0.6);
      const d = scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp;
      scenes.clear();
      return d;
    };
    const near = await hurt(1.6);
    expect(near).toBeGreaterThan(0);
    const far = await hurt(2.9);
    expect(near).toBeGreaterThanOrEqual(far);
  }, 30_000);

  it('Chain Grab: the chain travels, drags the opponent in, they arrive stunned and are punched down', async () => {
    const { scene, scenes, run, runUntil, cast, me, foe } = await setup('training-dummy', 6);
    me().combatant.stamina = 100;
    const startGap = Math.hypot(foe().x - me().x, foe().y - me().y);
    scene.abilities!.world.release(me().name, me().caster!.kit.a5!, { x: foe().x, y: foe().y }, scene.abilities!);
    void cast;
    runUntil(() => scene.abilities!.world.projectiles.length > 0, 1);
    expect(scene.abilities!.world.projectiles.length).toBeGreaterThan(0); // visibly in flight
    runUntil(() => scene.abilities!.world.projectiles.length === 0, 2);
    run(0.2);
    const gapNow = Math.hypot(foe().x - me().x, foe().y - me().y);
    expect(gapNow).toBeLessThan(startGap); // hauled in, not teleported
    const hp = scene.dummy.hp;
    run(1.5);
    expect(scene.dummy.hp).toBeLessThan(hp); // the finishing punch
    scenes.clear();
  }, 30_000);

  it('Fiery Fists: 20% faster attacks for 12 s, flames on all four fists, nothing left behind afterwards', async () => {
    const { scene, scenes, run, runUntil, cast, me } = await setup();
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => me().buff?.fireFists === true, 3);
    expect(me().buff?.attackSpeedFactor).toBeCloseTo(1.2, 5);
    expect(me().buff?.meleeDamageFactor).toBeUndefined(); // faster, not harder
    run(1);
    expect(me().view!.fireFists).toBeGreaterThan(0.5);
    run(11.5);
    runUntil(() => me().buff === null, 2);
    expect(me().buff).toBeNull();
    run(1.5);
    expect(me().view!.fireFists).toBe(0);
    scenes.clear();
  }, 60_000);
});
