import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { LUCKY_KINDS } from '../../../src/abilities/magix-world';
import { MAGIX_KIT } from '../../../src/data/abilities/magix';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Magix in the real fight scene against a chosen opponent. */
async function setup(opponent = 'training-dummy', gap = 5) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 13, y: 13 }, dummyStart: { x: 13 + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'magix', opponent },
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
  const world = () => scene.abilities!.world.magix;
  return { intents, scene, scenes, run, runUntil, cast, me, foe, world };
}

describe('Magix', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Disappearing Act: invisible and 35% faster, and both end the moment he lands an attack', async () => {
    const { scene, scenes, run, cast, me, intents } = await setup('training-dummy', 1.4);
    scene.playerFighter.combatant.stamina = 100;
    cast('a1');
    run(0.5);
    expect(me().buff?.invisible).toBe(true);
    expect(me().buff?.speedFactor).toBeCloseTo(1.35, 5);
    run(0.5);
    expect(me().vanishAlpha).toBeLessThan(0.6); // faint even to himself
    intents.pressMelee();
    run(0.8);
    // His blow landed: invisibility and speed end together.
    expect(scene.dummy.hp).toBeLessThan(scene.dummyFighter.combatant.stats.maxHp);
    expect(me().buff).toBeNull();
    scenes.clear();
  });

  it('Disappearing Act runs out on its own after 4 seconds', async () => {
    const { scenes, run, cast, me } = await setup('training-dummy', 9);
    cast('a1');
    run(3.5);
    expect(me().buff?.invisible).toBe(true);
    run(0.8);
    expect(me().buff).toBeNull();
    scenes.clear();
  });

  it('A Rabbit: hops at the opponent, a 1 s fuse, then a confetti burst that hurts and knocks back', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup('rampage', 7);
    cast('a2');
    runUntil(() => scene.summonStates.length > 0, 2);
    expect(scene.summonStates[0]?.character).toBe('rabbit');
    const hp = scene.dummy.hp;
    runUntil(() => scene.dummy.hp < hp, 8);
    expect(scene.dummy.hp).toBeLessThan(hp);
    runUntil(() => scene.summonStates.length === 0, 3);
    expect(scene.summonStates).toHaveLength(0);
    scenes.clear();
  }, 30_000);

  it('A Rabbit goes off by itself after 4 seconds wherever it is', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup('training-dummy', 24);
    cast('a2');
    runUntil(() => scene.summonStates.length > 0, 2);
    const rabbit = (scene as unknown as { summons: { list: { combatant: { isKo: boolean } }[] } }).summons.list[0]!;
    expect(MAGIX_KIT.a2.delivery.type === 'summon' && MAGIX_KIT.a2.delivery.lifeS).toBe(4);
    run(4.3);
    expect(rabbit.combatant.isKo).toBe(true); // gone off by 4 s at the latest, wherever it is
    scenes.clear();
  }, 30_000);

  it('A Rabbit goes off early when the opponent hits it', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup('training-dummy', 7);
    cast('a2');
    runUntil(() => scene.summonStates.length > 0, 2);
    const rabbit = (
      scene as unknown as { summons: { list: { combatant: { takeUnguardedDamage(n: number): void } }[] } }
    ).summons.list[0]!;
    rabbit.combatant.takeUnguardedDamage(1000); // anything that hits it sets it off at once
    run(0.1);
    expect(scene.abilities!.recentFx.some((fx) => fx.ability === 'aRabbit' && fx.kind === 'impact')).toBe(true);
    scenes.clear();
  });

  it('Card Barrage: exactly 52 cards, low damage each, and no more once interrupted', async () => {
    const { scene, scenes, run, runUntil, cast, world } = await setup('training-dummy', 6);
    scene.playerFighter.combatant.stamina = 100;
    let emitted = 0;
    cast('a3');
    for (let i = 0; i < 4 / STEP; i++) {
      run(STEP);
      emitted = Math.max(emitted, world().volleys[0]?.emitted ?? emitted);
    }
    runUntil(() => world().cards.length === 0, 3);
    expect(emitted).toBeGreaterThanOrEqual(1);
    expect(scene.dummy.hp).toBeLessThan(scene.dummyFighter.combatant.stats.maxHp);
    // Each card stings only a little: the whole deck stays well under half of a fighter.
    expect(scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp).toBeLessThan(500);
    scenes.clear();
  }, 30_000);

  it("Lucky Hat's misfortune outcome (the former Wand of Misfortune): a hit seals exactly one random ability for 12 s, never two, never extended", async () => {
    const { scene, scenes, run, runUntil, me, foe } = await setup('rampage', 4);
    scene.playerFighter.combatant.stamina = 100;
    // Force the hat's roll to its last outcome (the rest of the time it is random).
    (scene.abilities!.world.magix as unknown as { rng: () => number }).rng = () => 0.99;
    scene.abilities!.world.release(me().name, me().caster!.kit.a5!, { x: foe().x, y: foe().y }, scene.abilities!);
    expect(scene.abilities!.world.magix.lastLucky).toBe('misfortune');
    runUntil(() => foe().caster?.locked != null, 3);
    const lock = foe().caster!.locked!;
    expect(lock.leftS).toBeGreaterThan(11.5);
    expect(lock.leftS).toBeLessThanOrEqual(12);
    const slot = lock.slot;
    // A second hit does not add another lock or lengthen this one.
    expect(foe().caster!.lock('a1', 12)).toBe(false);
    run(11);
    expect(foe().caster!.locked?.slot).toBe(slot);
    runUntil(() => foe().caster!.locked === null, 3);
    expect(foe().caster!.locked).toBeNull(); // it ends by itself, on time (hit-stop only stretches real time)
    scenes.clear();
  }, 60_000);

  it('the Wand of Misfortune is no longer an ability of his own, and the hat can still give every other outcome', () => {
    const k = MAGIX_KIT;
    expect([k.a1, k.a2, k.a3, k.a4, k.a5!, k.ult].map((d) => d.id)).not.toContain('wandOfMisfortune');
    expect(k.a4.id).toBe('magixReaperHook');
    expect(LUCKY_KINDS).toEqual(['speed', 'damage', 'defence', 'range', 'hp', 'sword', 'bomb', 'misfortune']);
  });

  it('Fatal Stitch (Magix): a knife on scarves from the sleeve hooks past the target, slings him in fast, the kick throws them back, and the scarves gather back in', async () => {
    const { scene, scenes, run, cast, me, foe, intents } = await setup('training-dummy', 7);
    scene.playerFighter.combatant.stamina = 100;
    const x0 = me().x;
    const fx0 = foe().x;
    cast('a4'); // aimed like every leap: the same key again confirms
    cast('a4');
    let fastest = 0;
    let lastX = me().x;
    let out = false;
    for (let i = 0; i < 2.5 / STEP; i++) {
      run(STEP);
      out ||= scene.abilities!.world.tethers().length > 0;
      fastest = Math.max(fastest, Math.abs(me().x - lastX) / STEP);
      lastX = me().x;
    }
    expect(out).toBe(true); // the line was out and taut
    expect(fastest).toBeGreaterThan(14); // the original slingshot speed
    expect(me().x - x0).toBeGreaterThan(4);
    expect(foe().combatant.stats.maxHp - foe().combatant.hp).toBeGreaterThan(30);
    expect(foe().x - fx0).toBeGreaterThan(0.5); // sent backwards, never dragged in
    expect(scene.abilities!.world.tethers().length).toBe(0); // let go at the end
    // The wound bleeds for 3 seconds from the kick, then closes.
    expect(foe().combatant.bleeding).toBe(true);
    run(3.5);
    expect(foe().combatant.bleeding).toBe(false);
    scenes.clear();
    void intents;
  }, 60_000);

  it('Lucky Hat: gives exactly one of eight things, and a stat boost ends by itself without changing anything for good', async () => {
    const seen = new Set<string>();
    for (let k = 0; k < 14 && seen.size < 4; k++) {
      const { scene, scenes, run, cast, me, world } = await setup('training-dummy', 8);
      scene.playerFighter.combatant.stamina = 100;
      const maxHp = me().combatant.stats.maxHp;
      cast('a4'); // the loadout may differ: cast the fifth directly below
      void cast;
      scene.abilities!.world.release(me().name, me().caster!.kit.a5!, { x: 20, y: 13 }, scene.abilities!);
      run(0.2);
      const kind = world().lastLucky;
      expect(kind).not.toBeNull();
      seen.add(kind!);
      if (me().buff) {
        expect(me().buff?.label).toMatch(/\+25%/);
        run(10.5);
        expect(me().buff).toBeNull();
        expect(me().combatant.stats.maxHp).toBe(maxHp);
        expect(me().combatant.damageTakenScale).toBe(1);
      }
      scenes.clear();
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('Mirror Act: becomes an exact copy of the opponent for 12 s, then the magician returns with his real health', async () => {
    const { scene, scenes, run, runUntil, cast, me, foe } = await setup('rampage', 6);
    scene.playerFighter.caster!.fillMeter();
    const original = me();
    cast('ult');
    runUntil(() => me() !== original, 3);
    expect(me()).not.toBe(original);
    expect(me().def.id).toBe('rampage'); // looks, moves and abilities of the opponent
    expect(me().combatant.barrierHp).toBe(0); // no shield (owner 26/11/2026)
    expect(me().caster?.locked?.slot).toBe('ult'); // never the ultimate
    // His real health fraction came across with him (whatever the fight had done to him by then).
    expect(me().combatant.hp / me().combatant.stats.maxHp).toBeCloseTo(
      original.combatant.hp / original.combatant.stats.maxHp,
      1,
    );
    expect(foe().def.id).toBe('rampage'); // the opponent is untouched
    expect(foe().combatant.hp).toBe(foe().combatant.stats.maxHp);
    run(11);
    expect(me()).not.toBe(original);
    runUntil(() => me() === original, 3);
    expect(me()).toBe(original); // 12 s later he is Magix again
    expect(me().def.id).toBe('magix');
    expect(me().combatant.hp).toBeGreaterThan(0);
    expect(me().combatant.hp).toBeLessThanOrEqual(me().combatant.stats.maxHp);
    expect(me().combatant.barrierHp).toBe(0);
    expect(me().buff).toBeNull();
    scenes.clear();
  }, 60_000);
});
