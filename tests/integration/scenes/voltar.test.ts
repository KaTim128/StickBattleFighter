import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { VOLTAR_KIT } from '../../../src/data/abilities/voltar';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const INFERNO_BEAM = { rangeM: 6.5, damage: 18 }; // Fire Beam, from src/data/abilities/inferno.ts

/** Voltar in the real fight scene against a chosen opponent, on the open training yard (no props) unless told otherwise. */
async function setup(opponent = 'training-dummy', gap = 3, extra: Partial<ArenaLayout> = {}, equipped: string[] = []) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, props: [], interiorWalls: [], ...extra, playerStart: { x: 13, y: 13 }, dummyStart: { x: 13 + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'voltar', opponent, loadouts: { player: { equipped } } },
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
  const lost = () => foe().combatant.stats.maxHp - scene.dummy.hp;
  return { intents, scene, scenes, run, runUntil, cast, me, foe, lost };
}

describe('Voltar', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Flashstep: streaks through the opponent, reappears behind them and punches', async () => {
    const { scenes, run, cast, me, foe, lost } = await setup('training-dummy', 4);
    me().combatant.stamina = 100;
    expect(me().x).toBeLessThan(foe().x);
    cast('a1');
    run(0.5);
    expect(me().x).toBeGreaterThan(foe().x); // on the far side now
    expect(lost()).toBeGreaterThan(20);
    scenes.clear();
  }, 30_000);

  it('Flashstep: passes through opponents but never through a wall (it stops short and no punch lands)', async () => {
    const wall = { x0: 14.4, y0: 8, x1: 14.9, y1: 18 };
    const { scenes, run, cast, me, foe, lost } = await setup('training-dummy', 4, { interiorWalls: [wall] });
    me().combatant.stamina = 100;
    cast('a1');
    run(0.6);
    expect(me().x).toBeLessThan(wall.x0); // the wall stopped him
    expect(foe().x).toBeGreaterThan(wall.x1);
    expect(lost()).toBe(0);
    scenes.clear();
  }, 30_000);

  it('Arc Lash: zaps, carries him through the target, and stuns it for exactly 3 seconds', async () => {
    const { scenes, run, runUntil, cast, me, foe, lost } = await setup('training-dummy', 4);
    me().combatant.stamina = 100;
    cast('a2');
    runUntil(() => foe().combatant.state === 'stunned', 2);
    expect(foe().combatant.state).toBe('stunned');
    expect(me().x).toBeGreaterThan(foe().x); // through them, out the other side
    expect(lost()).toBeGreaterThan(20);
    let stunnedS = 0;
    for (let i = 0; i < 5 / STEP && foe().combatant.state === 'stunned'; i++) {
      run(STEP);
      stunnedS += STEP;
    }
    expect(stunnedS).toBeGreaterThan(2.8);
    expect(stunnedS).toBeLessThan(3.1);
    scenes.clear();
  }, 30_000);

  it('Voltage Rush: five separate hits from different sides, the last a launching kick', async () => {
    const { scenes, run, cast, me, foe } = await setup('training-dummy', 2);
    me().combatant.stamina = 100;
    const hits: number[] = [];
    let last = foe().combatant.hp;
    const xs = new Set<number>();
    cast('a3');
    for (let i = 0; i < 2.5 / STEP; i++) {
      run(STEP);
      const hp = foe().combatant.hp;
      if (hp < last) hits.push(last - hp);
      last = hp;
      xs.add(Math.round((me().x - foe().x) * 2));
    }
    expect(hits.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...hits)).toBeGreaterThan(Math.min(...hits) * 1.8); // the finishing kick is much harder
    expect(xs.size).toBeGreaterThan(2); // he moved round them
    scenes.clear();
  }, 30_000);

  it('Static Break: a blow during the dodge is avoided and answered from behind', async () => {
    const { scene, scenes, run, cast, me, foe, lost } = await setup('training-dummy', 1.2);
    me().combatant.stamina = 100;
    cast('a4');
    run(0.1);
    const hp = me().combatant.hp;
    (scene as unknown as { applyStrike: (a: unknown, t: unknown, s: unknown) => boolean }).applyStrike(foe(), me(), {
      damage: 60,
      heavy: false,
      knockbackMps: 2,
      dir: { x: -1, y: 0 },
      melee: true,
      impact: 'knuckle-light',
    });
    run(0.2);
    expect(me().combatant.hp).toBe(hp); // untouched
    expect(foe().combatant.hp).toBeLessThan(foe().combatant.stats.maxHp); // the counter
    void lost;
    scenes.clear();
  }, 30_000);

  it('Static Break is reactive: with no blow it just dodges and the stance lapses', async () => {
    const { scene, scenes, run, cast, me } = await setup('training-dummy', 3);
    me().combatant.stamina = 100;
    cast('a4');
    run(1);
    expect(scene.abilities!.world.parryOf(me().name)).toBeUndefined();
    scenes.clear();
  }, 30_000);

  it('Thunder Circuit: charges for 2.4 s, then discharges a lightning bolt longer than Fire Beam that stuns only while it touches', async () => {
    const d = VOLTAR_KIT.a5!.delivery;
    if (d.type !== 'beam') throw new Error('beam');
    expect(VOLTAR_KIT.a5!.castS).toBe(2.4);
    expect(VOLTAR_KIT.a5!.look?.beamStyle).toBe('lightning');
    expect(d.rangeM).toBeGreaterThan(INFERNO_BEAM.rangeM);
    expect(d.rangeM).toBeLessThan(INFERNO_BEAM.rangeM + 3); // a modest advantage
    expect(VOLTAR_KIT.a5!.payload.damage).toBe(INFERNO_BEAM.damage);
    const { scene, scenes, run, runUntil, cast, me, foe, lost } = await setup('training-dummy', 2, {}, ['flashstep', 'arcLash', 'thunderCircuit', 'staticBreak']);
    me().combatant.stamina = 100;
    cast('a3');
    run(2.2);
    expect(lost()).toBe(0); // still gathering
    expect(me().caster!.cast?.phase).toBe('windup');
    run(0.4);
    runUntil(() => lost() > 0, 1);
    expect(lost()).toBeGreaterThan(0);
    expect(foe().combatant.state).toBe('stunned'); // held in the bolt
    // Walk out of the beam's line: the stun ends soon after contact does.
    scene.abilities!.world.cancel(me().name, scene.abilities!);
    me().caster!.interrupt(true);
    run(1);
    expect(foe().combatant.state).not.toBe('stunned');
    scenes.clear();
  }, 60_000);

  it('Overdrive: a modest, temporary boost; it ends cleanly and never touches the base stats', async () => {
    const { scene, scenes, run, runUntil, cast, me } = await setup();
    const base = me().def.movement.maxSpeedMps;
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => me().buff?.electrified === true, 3);
    const b = me().buff!;
    expect(b.speedFactor).toBeLessThanOrEqual(1.15);
    expect(b.meleeDamageFactor).toBeLessThanOrEqual(1.1);
    expect(b.damageTakenFactor).toBe(1); // never harder to hurt
    expect(b.flashChain).toBe(2); // chained dashes are limited
    expect(me().def.movement.maxSpeedMps).toBe(base);
    run(8.5);
    runUntil(() => me().buff === null, 2);
    expect(me().buff).toBeNull();
    run(1);
    expect(me().view!.volt).toBe(0);
    scenes.clear();
  }, 60_000);

  it('Overdrive chains Flashstep a limited number of extra times', async () => {
    const { scene, scenes, run, runUntil, cast, me, foe } = await setup('training-dummy', 4);
    me().combatant.stamina = 100;
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => me().buff?.electrified === true, 3);
    run(1.2);
    me().combatant.stamina = 100;
    let crossings = 0;
    let side = Math.sign(me().x - foe().x);
    cast('a1');
    for (let i = 0; i < 2 / STEP; i++) {
      run(STEP);
      const s = Math.sign(me().x - foe().x);
      if (s !== 0 && s !== side) {
        crossings++;
        side = s;
      }
    }
    expect(crossings).toBe(3); // the flash and two more, never more
    scenes.clear();
  }, 60_000);

  it('Lightning Execution: the ultimate button again during Overdrive ends it with the finisher', async () => {
    const { scene, scenes, run, runUntil, cast, me, foe, lost } = await setup('training-dummy', 4);
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => me().buff?.electrified === true, 3);
    run(1.2);
    cast('ult');
    expect(me().buff).toBeNull(); // Overdrive is spent
    run(2.5);
    expect(lost()).toBeGreaterThan(40);
    expect(Math.hypot(foe().x - 17, foe().y - 13)).toBeGreaterThan(0.5); // thrown by the blast
    scenes.clear();
  }, 60_000);
});
