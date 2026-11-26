import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { solveSkeleton } from '../../../src/animation/skeleton';
import { spinTurns } from '../../../src/abilities/ability-world';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BOHEMETH_KIT } from '../../../src/data/abilities/bohemeth';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Bohemeth in the real fight scene against a chosen opponent. */
async function setup(opponent = 'training-dummy', gap = 4, from = 13, extra: Partial<ArenaLayout> = {}, player = 'bohemeth') {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, ...extra, playerStart: { x: from, y: 13 }, dummyStart: { x: from + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player, opponent },
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

  it('Spin Cycle (opponent): clap-dazes, takes a leg, swings round (lighter fighters more times) and flings them along the aim', async () => {
    // Lighter bodies are spun more times than heavier ones.
    const d = BOHEMETH_KIT.a1.delivery;
    if (d.type !== 'spin') throw new Error('Spin Cycle must be a spin delivery');
    expect(spinTurns(d, 60)).toBeGreaterThan(spinTurns(d, 140));
    expect(spinTurns(d, 1)).toBe(d.turns.max);
    expect(spinTurns(d, 1000)).toBe(d.turns.min);
    const { scene, scenes, run, runUntil, cast, me, foe } = await setup('training-dummy', 1.3);
    me().combatant.stamina = 100;
    const x0 = foe().x;
    const maxHp = foe().combatant.stats.maxHp;
    cast('a1');
    runUntil(() => scene.abilities!.world.spinOf(me().name)?.phase === 'spin', 3);
    const spin = scene.abilities!.world.spinOf(me().name)!;
    expect(spin.variant).toBe('opponent');
    expect(spin.turns).toBe(spinTurns(d, foe().def.body.massKg));
    expect(maxHp - scene.dummy.hp).toBeGreaterThan(0); // the head clap already hurt, and only slightly
    expect(maxHp - scene.dummy.hp).toBeLessThan(d.clap.damage * 2);
    let lifted = 0;
    runUntil(() => {
      lifted = Math.max(lifted, foe().abilityLift);
      return scene.abilities!.world.spinOf(me().name) === null;
    }, 6);
    expect(lifted).toBeGreaterThan(0.3); // swung off the floor
    run(1.8);
    expect(foe().x - x0).toBeGreaterThan(d.launch.maxDistM * 0.6); // let go along his aim, far
    expect(maxHp - scene.dummy.hp).toBeGreaterThan(d.clap.damage + d.launch.baseDamage + d.launch.damagePerM * 3);
    scenes.clear();
  }, 60_000);

  it('Spin Cycle (opponent): hitting a wall or furniture mid-flight adds collision damage and stops the flight short', async () => {
    const hurtAt = async (from: number) => {
      const t = await setup('training-dummy', 1.3, from);
      t.me().combatant.stamina = 100;
      const x0 = t.foe().x;
      t.cast('a1');
      t.runUntil(() => t.scene.abilities!.world.spinOf(t.me().name) !== null, 2);
      t.runUntil(() => t.scene.abilities!.world.spinOf(t.me().name) === null, 6);
      t.run(2);
      const out = { dist: t.foe().x - x0, dmg: t.foe().combatant.stats.maxHp - t.scene.dummy.hp };
      t.scenes.clear();
      return out;
    };
    const free = await hurtAt(13);
    const wall = await hurtAt(25.8);
    expect(wall.dist).toBeLessThan(free.dist - 1.5);
    expect(wall.dmg).toBeGreaterThan(free.dmg * 0.8); // a short flight, yet nearly as much damage: the collision adds
    const d = BOHEMETH_KIT.a1.delivery;
    if (d.type !== 'spin') throw new Error('spin');
    expect(wall.dmg).toBeGreaterThan(d.clap.damage + d.launch.baseDamage + d.launch.collisionDamage * 0.9);
  }, 90_000);

  it('Spin Cycle (object): holding a thing, he swings it round and throws it level (not overhead) at the opponent', async () => {
    const arena: Partial<ArenaLayout> = { props: [{ kind: 'cabinet', x: 13.9, y: 13 }] };
    const { scene, scenes, run, runUntil, intents, me } = await setup('training-dummy', 6, 13, arena);
    me().combatant.stamina = 100;
    intents.interactPress();
    run(STEP * 2);
    intents.interactRelease();
    runUntil(() => !scene.player.lifting && scene.player.carrying !== null, 3);
    expect(scene.player.carrying).toBe('cabinet');
    intents.pressAbility('a1'); // hands full, but this ability is made for it
    run(STEP * 2);
    runUntil(() => scene.abilities!.world.spinOf(me().name)?.variant === 'object', 2);
    expect(scene.abilities!.world.spinOf(me().name)?.variant).toBe('object');
    expect(me().spinHold).toBe(true);
    runUntil(() => scene.player.carrying === null, 5);
    expect(scene.player.carrying).toBeNull(); // thrown
    expect(me().spinHold).toBe(false);
    const hp0 = scene.dummy.hp;
    run(0.7); // a level, fast throw covers the 6 m inside this; an overhead lob would not have landed yet
    expect(scene.dummy.hp).toBeLessThan(hp0); // it flew level and struck the dummy 6 m away
    scenes.clear();
  }, 60_000);

  it('Uppercut Combo: the launch depends on weight (a light fighter flies higher than a heavy one)', async () => {
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

  it('Ground Smash: jumps, lands and hurts the nearby more than the far', async () => {
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

  it('Uppercut Combo: an uppercut launches them, then the other hand punches them back down (two separate hits)', async () => {
    const { scene, scenes, run, cast, me, foe } = await setup('shroud', 1.4);
    me().combatant.stamina = 100;
    const d = BOHEMETH_KIT.a2.delivery;
    if (d.type !== 'grab' || !d.uppercut?.followUp) throw new Error('Uppercut Combo must have a follow-up punch');
    const hp: number[] = [];
    let last = scene.dummy.hp;
    cast('a2');
    let peak = 0;
    let peakAt = 0;
    let landedAt = -1;
    for (let i = 0; i < 3 / STEP; i++) {
      run(STEP);
      const h = foe().hop.heightM + foe().abilityLift;
      if (h > peak) {
        peak = h;
        peakAt = i * STEP;
      }
      if (scene.dummy.hp < last) {
        hp.push(last - scene.dummy.hp);
        last = scene.dummy.hp;
      }
      if (peak > 0.5 && h < 0.05 && landedAt < 0) landedAt = i * STEP;
    }
    expect(hp.length).toBeGreaterThanOrEqual(3); // the uppercut, the follow-up punch, and the fall
    expect(hp.some((x) => x >= d.uppercut!.followUp!.payload.damage * 0.5)).toBe(true);
    // The punch sends them down before they reach the top of an uncut rise (0.7 s up + 0.4 s down is the plain launch).
    expect(landedAt - peakAt).toBeLessThan(0.45);
    scenes.clear();
  }, 30_000);

  it('Thunder Clap: the shockwave reaches 7.5 m (wider than Vexoris’s ultimate fog) and throws back everyone inside it', async () => {
    const clap = BOHEMETH_KIT.a3.delivery;
    if (clap.type !== 'nova') throw new Error('nova');
    expect(clap.radiusM).toBeGreaterThanOrEqual(7.5);
    const vexKit = ABILITY_KITS['vexoris-kit'];
    const fog = vexKit?.ult.delivery;
    if (fog?.type !== 'cloud') throw new Error('Vexoris ultimate is a cloud');
    const vexUlt = fog.radiusM;
    expect(clap.radiusM).toBeGreaterThan(vexUlt + 1.5);
    const pushed = async (gap: number) => {
      const { scene, scenes, run, cast, me, foe } = await setup('training-dummy', gap);
      me().combatant.stamina = 100;
      const x0 = foe().x;
      cast('a3');
      run(1.2);
      const out = { moved: foe().x - x0, hurt: scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp };
      scenes.clear();
      return out;
    };
    const far = await pushed(7);
    expect(far.hurt).toBeGreaterThan(0);
    expect(far.moved).toBeGreaterThan(0.3);
    const out = await pushed(8.6);
    expect(out.hurt).toBe(0);
  }, 30_000);

  it('Ground Smash: a long normal leap (9 m) that lands on a small radius, and a much longer, harder, fiery one in the ultimate (+15%)', async () => {
    const d = BOHEMETH_KIT.a4.delivery;
    if (d.type !== 'leap' || !d.empowered) throw new Error('Ground Smash must be a leap with an empowered form');
    expect(d.maxRangeM).toBeGreaterThan(5);
    expect(d.maxRangeM).toBeLessThan(12);
    expect(d.radiusM).toBeLessThan(3);
    expect(d.empowered.maxRangeM).toBeGreaterThan(d.maxRangeM * 2.5);
    expect(d.empowered.damageFactor).toBeCloseTo(1.15, 5);
    const smash = async (gap: number, ult: boolean) => {
      const { scene, scenes, run, runUntil, cast, me, foe } = await setup('training-dummy', gap, 3, { props: [], interiorWalls: [] });
      me().combatant.stamina = 100;
      if (ult) {
        scene.playerFighter.caster!.fillMeter();
        cast('ult');
        runUntil(() => me().buff?.empowersLeap === true, 3);
        run(1.2); // the ultimate's own recovery finishes before the next ability
      }
      const x0 = me().x;
      scene.abilities!.tryCast(me(), 'a4', { x: foe().x, y: foe().y }); // aimed at the dummy, as the mouse would
      runUntil(() => scene.dummy.hp < scene.dummyFighter.combatant.stats.maxHp, 4);
      run(0.4);
      const out = { travelled: me().x - x0, dmg: scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp, foeX: foe().x };
      scenes.clear();
      return out;
    };
    const near = await smash(1.8, false);
    const nearUlt = await smash(1.8, true);
    expect(nearUlt.dmg / near.dmg).toBeGreaterThan(1.1); // +15% (the dummy's own defence cancels out of the ratio)
    expect(nearUlt.dmg / near.dmg).toBeLessThan(1.2);
    // Aimed far: the normal leap falls short of a distant target, the ultimate's covers most of the arena.
    const farNormal = await smash(22, false);
    expect(farNormal.dmg).toBe(0);
    const farUlt = await smash(22, true);
    expect(farUlt.dmg).toBeGreaterThan(0);
  }, 120_000);

  it('Fiery Fists: 5% bigger, heavier knockback, a Ground Smash that crosses the arena, and it all ends cleanly', async () => {
    const { scene, scenes, run, runUntil, cast, me } = await setup();
    expect(me().growth).toBe(1);
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => me().buff?.fireFists === true, 3);
    run(1.5);
    expect(me().growth).toBeCloseTo(1.05, 2);
    expect(me().buff?.knockbackFactor).toBeGreaterThan(1.3);
    expect(me().buff?.empowersLeap).toBe(true);
    run(12);
    runUntil(() => me().buff === null, 3);
    run(1.5);
    expect(me().growth).toBe(1); // size and stats go back
    expect(me().buff).toBeNull();
    scenes.clear();
  }, 60_000);

  it('object handling: slower to heave things up than Titan normally, quicker and stronger than Titan in the ultimate', async () => {
    const arena: Partial<ArenaLayout> = { props: [{ kind: 'cabinet', x: 13.9, y: 13 }] };
    const heave = async (who: string, ult = false) => {
      const t = await setup('training-dummy', 6, 13, arena, who);
      if (ult) {
        t.scene.playerFighter.caster!.fillMeter();
        t.cast('ult');
        t.runUntil(() => t.me().buff !== null, 3);
      }
      t.intents.interactPress();
      t.run(STEP * 2);
      t.intents.interactRelease();
      t.run(STEP * 3);
      const total = t.me().liftTotalS;
      const maxLift = t.me().buff?.objects?.maxLiftKg ?? t.me().def.objects.maxLiftKg;
      t.scenes.clear();
      return { total, maxLift };
    };
    const titan = await heave('rampage');
    const normal = await heave('bohemeth');
    const ult = await heave('bohemeth', true);
    expect(normal.total).toBeGreaterThan(titan.total);
    expect(normal.total).toBeLessThan(titan.total * 1.5); // small but noticeable, not clumsy
    expect(ult.total).toBeLessThan(titan.total);
    expect(ult.maxLift).toBeGreaterThan(titan.maxLift);
    expect(normal.maxLift).toBe(titan.maxLift); // the strength only comes with the ultimate
  }, 60_000);

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

  it('moves like a mobile powerhouse: quick on foot, a high long jump, and a heavy landing that shoves nearby opponents', async () => {
    const { intents, scene, scenes, run, me, foe } = await setup('training-dummy', 2.2);
    expect(me().def.movement.maxSpeedMps).toBeGreaterThan(4.5);
    expect(me().def.movement.jumpSpeedMps ** 2 / (2 * me().def.movement.hopGravityMps2)).toBeGreaterThan(1.4); // jump height, metres
    expect(me().def.landingImpact?.radiusM).toBeGreaterThan(3);
    const x0 = foe().x;
    // A running jump toward the dummy: it covers real ground and the landing shoves it away.
    intents.setMove('t', { x: 1, y: 0 });
    intents.sprint = true;
    run(0.3);
    intents.pressJump();
    let peak = 0;
    for (let i = 0; i < 2 / STEP; i++) {
      run(STEP);
      peak = Math.max(peak, me().hop.heightM);
    }
    intents.setMove('t', { x: 0, y: 0 });
    intents.sprint = false;
    expect(peak).toBeGreaterThan(1.2);
    expect(me().x - 13).toBeGreaterThan(3); // far further than a normal hop
    expect(foe().x - x0 + 0.01).toBeGreaterThan(0); // pushed along, never pulled in
    expect(scene.abilities).toBeTruthy();
    scenes.clear();
  }, 30_000);
});
