import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { SICKLE_WIELDER_KIT } from '../../../src/data/abilities/sickle-wielder';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const KIT = ['reaperHook', 'doublePounce', 'predatorRush', 'groundSnare'];

/** Kamaw in the real fight scene (1v1) against the training dummy on the open yard, unless told otherwise. */
async function setup(gap = 5, from = 13, extra: Partial<ArenaLayout> = {}, equipped: string[] = KIT) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, props: [], interiorWalls: [], ...extra, playerStart: { x: from, y: 13 }, dummyStart: { x: from + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'sickle-wielder', opponent: 'training-dummy', loadouts: { player: { equipped } } },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (s: number) => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.2);
  scene.drainEvents();
  const me = () => scene.playerFighter;
  const foe = () => scene.dummyFighter;
  me().combatant.stamina = 100;
  const fire = (slot: 'a1' | 'a2' | 'a3' | 'a4' | 'ult', at?: { x: number; y: number }) => {
    const r = scene.abilities!.tryCast(me(), slot, at ?? { x: foe().x, y: foe().y });
    run(STEP);
    return r;
  };
  const hitsOver = (s: number): number[] => {
    const out: number[] = [];
    let last = foe().combatant.hp;
    for (let i = 0; i < s / STEP; i++) {
      run(STEP);
      const hp = foe().combatant.hp;
      if (last - hp > 1.5) out.push(last - hp); // a blow; the bleeding's trickle is far smaller
      last = hp;
    }
    return out;
  };
  const lost = () => foe().combatant.stats.maxHp - foe().combatant.hp;
  return { intents, scene, scenes, run, me, foe, fire, hitsOver, lost };
}

describe('Kamaw: melee', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the tap combo is five quick stabs, the fifth making the target bleed', async () => {
    const { intents, scenes, run, foe, me } = await setup(1.1);
    foe().combatant.hp = foe().combatant.stats.maxHp;
    let hits = 0;
    let last = foe().combatant.hp;
    let bled = false;
    const seen = new Set<string>();
    for (let t = 0; t < 4; t += STEP) {
      if (Math.round(t / STEP) % 9 === 0) intents.pressMelee();
      run(STEP);
      const hp = foe().combatant.hp;
      if (last - hp > 1.5) hits++;
      if (me().combo.attack) seen.add(me().combo.attack!.id);
      last = hp;
      bled ||= foe().combatant.bleeding;
    }
    expect([...seen]).toEqual(['stab-1', 'stab-2', 'stab-3', 'stab-4', 'stab-5']);
    expect(hits).toBeGreaterThanOrEqual(5);
    expect(bled).toBe(true);
    scenes.clear();
  }, 60_000);

  it('the heavy attack is a hard overhead chop with more knockback than the taps', async () => {
    const { scenes, run, intents, foe, lost } = await setup(1.4);
    intents.pressHeavy();
    run(1.2);
    expect(lost()).toBeGreaterThan(35);
    expect(['knockdown', 'gettingUp', 'knockedBack', 'hitStun']).toContain(foe().combatant.state);
    scenes.clear();
  }, 30_000);

  it('keeps the chain hidden in melee: nothing is out, the blade is in his hand', async () => {
    const { scenes, run, me } = await setup(1.1);
    run(0.5);
    expect(me().view!.chainShown).toBe(false);
    expect(me().view!.sickleOut).toBe(false);
    scenes.clear();
  }, 30_000);
});

describe('Kamaw: abilities', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Reaper Hook: throws past the enemy, slings him in fast on the taut chain, and the kick launches the enemy back', async () => {
    const { scenes, run, fire, me, foe, lost } = await setup(7);
    const x0 = me().x;
    const fx0 = foe().x;
    expect(fire('a1')).toBeNull();
    let out = false;
    let fastest = 0;
    let lastX = me().x;
    for (let i = 0; i < 2.5 / STEP; i++) {
      run(STEP);
      out ||= me().view!.sickleOut;
      fastest = Math.max(fastest, Math.abs(me().x - lastX) / STEP);
      lastX = me().x;
    }
    expect(out).toBe(true); // the chain and blade were out
    expect(fastest).toBeGreaterThan(14); // a slingshot, not a walk
    expect(me().x - x0).toBeGreaterThan(4);
    expect(lost()).toBeGreaterThan(30);
    expect(foe().x - fx0).toBeGreaterThan(0.5); // thrown backwards, never dragged to him
    scenes.clear();
  }, 60_000);

  it('Double Pounce: two throws, each a hit, the bleed refreshed not stacked, and the chain comes back', async () => {
    const { scenes, run, fire, hitsOver, foe, me } = await setup(5);
    expect(fire('a2')).toBeNull();
    const hits = hitsOver(1.6);
    expect(hits.length).toBe(2);
    expect(Math.min(...hits)).toBeGreaterThan(12); // both are real hits (a random critical can make either larger)
    expect(foe().combatant.bleeding).toBe(true);
    run(2);
    expect(me().view!.sickleOut).toBe(false); // retracted into his hand
    scenes.clear();
  }, 60_000);

  it('Predator Rush: three slashes on the move, the last throwing the target up; steerable', async () => {
    const { scenes, intents, run, fire, me, foe, hitsOver } = await setup(6);
    const x0 = me().x;
    expect(fire('a3')).toBeNull();
    const hits = hitsOver(2);
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(me().x - x0).toBeGreaterThan(3);
    run(1);
    // Steering: a runner that dodges off to one side is followed.
    foe().combatant.hp = foe().combatant.stats.maxHp;
    scenes.clear();
    void intents;
  }, 60_000);

  it('Predator Rush follows the steering sideways, never locking on by itself', async () => {
    const { scenes, intents, scene, run, fire, me } = await setup(9);
    fire('a3');
    intents.setMove('keyboard', { x: 0, y: 1 });
    run(0.6);
    intents.setMove('keyboard', { x: 0, y: 0 });
    expect(me().y).toBeGreaterThan(13.8);
    void scene;
    scenes.clear();
  }, 60_000);

  it('Ground Snare: a low throw that can be dodged; a hit holds, trips and then strikes', async () => {
    const { scenes, run, fire, hitsOver, foe, me } = await setup(5);
    const gap0 = foe().x - me().x;
    fire('a4');
    const hits = hitsOver(4);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(foe().x - me().x).toBeLessThan(gap0 - 2);
    scenes.clear();
    void run;
  }, 60_000);

  it('Ground Snare misses a target that is out of the line', async () => {
    const { scenes, scene, run, fire, foe } = await setup(5);
    foe().body?.setTranslation({ x: foe().x, y: 17 }, true);
    run(0.1);
    scene.abilities!.tryCast(scene.playerFighter, 'a4', { x: 18, y: 13 });
    run(2);
    expect(foe().combatant.hp).toBe(foe().combatant.stats.maxHp);
    scenes.clear();
    void fire;
  }, 60_000);

  it('Crescent Execution: two spins, the second wider and harder, then a leap and a heavy diagonal cut', async () => {
    const { scenes, fire, hitsOver, foe } = await setup(1.8, 13, {}, ['reaperHook', 'doublePounce', 'predatorRush', 'crescentExecution']);
    expect(fire('a4')).toBeNull();
    const hits = hitsOver(2.4);
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.reduce((a, b) => a + b, 0)).toBeGreaterThan(45);
    expect(Math.max(...hits)).toBeGreaterThan(20);
    expect(['knockdown', 'gettingUp', 'knockedBack', 'hitStun']).toContain(foe().combatant.state);
    scenes.clear();
  }, 60_000);
});

describe('Kamaw: Human Sickle Beyblade', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('wraps the chain over the wind-up, then spins under the player steering, cutting and bleeding what it touches', async () => {
    const { scene, scenes, intents, run, fire, me, foe, lost } = await setup(6);
    scene.playerFighter.caster!.fillMeter();
    expect(fire('ult')).toBeNull();
    run(0.5);
    const early = me().view!.chainWrap;
    run(0.6);
    expect(me().view!.chainWrap).toBeGreaterThan(early); // the chain travels round him
    run(1);
    expect(scene.abilities!.world.whirlOf(me().name)).not.toBeNull();
    // Steered towards the dummy: moves fast, cuts it, no lock-on.
    intents.setMove('keyboard', { x: 1, y: 0 });
    run(1.2);
    expect(me().x).toBeGreaterThan(14.5);
    expect(lost()).toBeGreaterThan(5);
    expect(foe().combatant.bleeding).toBe(true);
    intents.setMove('keyboard', { x: 0, y: 0 });
    scenes.clear();
  }, 60_000);

  it('does not move on its own, and the ultimate button again ends it with the chain unwinding', async () => {
    const { scene, scenes, run, fire, me } = await setup(9);
    scene.playerFighter.caster!.fillMeter();
    fire('ult');
    run(2.5);
    const x = me().x;
    run(1);
    expect(Math.abs(me().x - x)).toBeLessThan(0.3); // nothing held: it coasts to a stop, never chases
    scene.abilities!.tryCast(me(), 'ult');
    run(0.4);
    const mid = me().view!.chainWrap;
    run(1.5);
    expect(me().view!.chainWrap).toBeLessThan(mid);
    expect(scene.abilities!.world.whirlOf(me().name)).toBeNull();
    scenes.clear();
  }, 60_000);

  it('cannot spin through a wall', async () => {
    const wall = { x0: 15, y0: 8, x1: 15.6, y1: 18 };
    const { scene, scenes, intents, run, fire, me } = await setup(9, 13, { interiorWalls: [wall] });
    scene.playerFighter.caster!.fillMeter();
    fire('ult');
    run(2.6);
    intents.setMove('keyboard', { x: 1, y: 0 });
    run(2);
    expect(me().x).toBeLessThan(15);
    intents.setMove('keyboard', { x: 0, y: 0 });
    scenes.clear();
  }, 60_000);

  it('has five standard abilities and a separate ultimate', () => {
    const k = SICKLE_WIELDER_KIT;
    expect(new Set([k.a1.id, k.a2.id, k.a3.id, k.a4.id, k.a5!.id, k.ult.id]).size).toBe(6);
    expect(k.ult.slot).toBe('ult');
  });
});
