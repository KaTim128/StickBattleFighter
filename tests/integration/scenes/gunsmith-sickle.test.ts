import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { idleStyleFor, walkPose } from '../../../src/animation/greybox-motion';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { GUNSMITH_KIT } from '../../../src/data/abilities/gunsmith';
import { SICKLE_WIELDER_KIT } from '../../../src/data/abilities/sickle-wielder';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** A fighter in the real fight scene (1v1) against the training dummy on the open yard, unless told otherwise. */
async function setup(player: string, gap = 5, from = 13, extra: Partial<ArenaLayout> = {}, equipped: string[] = []) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, props: [], interiorWalls: [], ...extra, playerStart: { x: from, y: 13 }, dummyStart: { x: from + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player, opponent: 'training-dummy', loadouts: { player: { equipped } } },
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
  /** Cast a slot aimed at the dummy, as the mouse would. */
  const fire = (slot: 'a1' | 'a2' | 'a3' | 'a4' | 'ult', at?: { x: number; y: number }) => {
    const r = scene.abilities!.tryCast(me(), slot, at ?? { x: foe().x, y: foe().y });
    run(STEP);
    return r;
  };
  /** The sizes of every separate drop in the dummy's health over `s` seconds. */
  const hitsOver = (s: number): number[] => {
    const out: number[] = [];
    let last = foe().combatant.hp;
    for (let i = 0; i < s / STEP; i++) {
      run(STEP);
      const hp = foe().combatant.hp;
      if (hp < last) out.push(last - hp);
      last = hp;
    }
    return out;
  };
  return { intents, scene, scenes, run, me, foe, fire, hitsOver };
}

describe('Gunsmith', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Dual Barrage: eight separate shots from alternating hands, each a real hit', async () => {
    const { scenes, fire, hitsOver } = await setup('gunsmith');
    expect(fire('a1')).toBeNull();
    const hits = hitsOver(2);
    expect(hits.length).toBeGreaterThanOrEqual(7);
    expect(Math.max(...hits)).toBeLessThan(GUNSMITH_KIT.a1.payload.damage * 2);
    scenes.clear();
  }, 30_000);

  it('Explosive Rounds: the direct hit and then a burst that adds more damage', async () => {
    const { scenes, fire, hitsOver, foe } = await setup('gunsmith');
    fire('a2');
    const hits = hitsOver(2);
    const total = hits.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(GUNSMITH_KIT.a2.payload.damage * 1.6); // direct 34 plus an area burst of about 37
    expect(foe().combatant.stats.maxHp - foe().combatant.hp).toBeGreaterThan(60);
    scenes.clear();
  }, 30_000);

  it('Ricochet Shot: aimed at the far wall with the dummy behind him, the bullet bounces back and hits it', async () => {
    const { scenes, fire, run, me, foe } = await setup('gunsmith', 8, 20);
    scenes.clear();
    // Gunsmith near the east wall, the dummy west of him: the only way to hit it with a shot aimed east is off the wall.
    const t = await setup('gunsmith', -6, 25);
    expect(t.foe().x).toBeLessThan(t.me().x);
    const aim = { x: 29.5, y: 13 };
    expect(t.fire('a3', aim)).toBeNull();
    t.run(1.6);
    expect(t.foe().combatant.stats.maxHp - t.foe().combatant.hp).toBeGreaterThan(30);
    void fire; void run; void me; void foe;
    t.scenes.clear();
  }, 30_000);

  it('Tactical Roll: rolls five metres, cannot be hit for the first half second, and fires as it goes', async () => {
    const { scene, scenes, run, me, foe, fire, intents } = await setup('gunsmith', 5);
    intents.setMove('t', { x: 0, y: 1 }); // roll sideways, along the movement direction
    const y0 = me().y;
    expect(fire('a4', { x: me().x, y: me().y + 5 })).toBeNull();
    run(0.1);
    const hp = me().combatant.hp;
    (scene as unknown as { applyStrike: (a: unknown, t: unknown, s: unknown) => boolean }).applyStrike(foe(), me(), {
      damage: 80,
      heavy: false,
      knockbackMps: 1,
      dir: { x: -1, y: 0 },
      melee: true,
      impact: 'knuckle-light',
    });
    expect(me().combatant.hp).toBe(hp); // untouchable while rolling
    intents.setMove('t', { x: 0, y: 0 });
    run(0.8);
    expect(Math.abs(me().y - y0)).toBeGreaterThan(3.5);
    expect(foe().combatant.stats.maxHp - foe().combatant.hp).toBeGreaterThan(10); // the shots landed on the way
    scenes.clear();
  }, 30_000);

  it('Quickdraw Execution: a run of seven shots, the last far more powerful', async () => {
    const { scenes, fire, hitsOver } = await setup('gunsmith', 5, 13, {}, ['dualBarrage', 'explosiveRounds', 'ricochetShot', 'quickdrawExecution']);
    expect(fire('a4')).toBeNull();
    const hits = hitsOver(3);
    expect(hits.length).toBeGreaterThanOrEqual(6);
    const last = hits[hits.length - 1]!;
    expect(last).toBeGreaterThan(Math.min(...hits) * 3);
    scenes.clear();
  }, 30_000);

  it('Machine Gun Rampage: a long, sustained barrage of separate hits', async () => {
    const { scene, scenes, fire, hitsOver, me } = await setup('gunsmith');
    scene.playerFighter.caster!.fillMeter();
    expect(fire('ult')).toBeNull();
    const hits = hitsOver(9); // each landed shot also freezes the sim for a hit-stop, so it runs longer than its 3 s
    expect(hits.length).toBeGreaterThan(25);
    expect(me().caster!.cast).toBeNull(); // it ends by itself
    scenes.clear();
  }, 60_000);

  it('has exactly five standard abilities and a separate ultimate', () => {
    const k = GUNSMITH_KIT;
    expect([k.a1, k.a2, k.a3, k.a4, k.a5].every((a) => a !== undefined)).toBe(true);
    expect(k.ult.slot).toBe('ult');
    expect(new Set([k.a1.id, k.a2.id, k.a3.id, k.a4.id, k.a5!.id, k.ult.id]).size).toBe(6);
  });
});

describe('Sickle Wielder', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('crawls: its idle and walk lean far forward and low, never upright', () => {
    expect(idleStyleFor('proc.idle.crawler')).toBe('crawler');
    const bones = { spine: 0.55, neck: 0.08, headRadius: 0.145, upperArm: 0.3, foreArm: 0.28, thigh: 0.44, shin: 0.44 };
    for (const p of [0, 0.25, 0.5, 0.75]) expect(walkPose(p, bones, 'crawler').lean).toBeLessThan(-0.6);
  });

  it('Understrike: slides in and slashes upward through the dummy, lifting it with a heavy hit', async () => {
    const { scenes, fire, hitsOver, foe } = await setup('sickle-wielder', 3);
    fire('a1');
    const hits = hitsOver(1.5);
    expect(hits.length).toBeGreaterThan(0);
    expect(Math.max(...hits)).toBeGreaterThan(40);
    expect(['knockdown', 'gettingUp']).toContain(foe().combatant.state);
    scenes.clear();
  }, 30_000);

  it('Reaper Sweep: a wide low sweep that hurts and knocks the target off its feet', async () => {
    const { scenes, run, fire, foe } = await setup('sickle-wielder', 1.8);
    fire('a2');
    run(0.8);
    expect(foe().combatant.stats.maxHp - foe().combatant.hp).toBeGreaterThan(30);
    expect(['knockdown', 'gettingUp']).toContain(foe().combatant.state);
    scenes.clear();
  }, 30_000);

  it('Hook and Drag: hooks the target for damage, drags it back across the ground, and hurts it again on arrival', async () => {
    const { scenes, fire, hitsOver, me, foe } = await setup('sickle-wielder', 5);
    const gap0 = foe().x - me().x;
    fire('a3');
    const hits = hitsOver(4);
    expect(hits.length).toBeGreaterThanOrEqual(2); // the hook, then the arrival
    expect(foe().x - me().x).toBeLessThan(gap0 - 2); // dragged towards him
    scenes.clear();
  }, 30_000);

  it('Shadow Crawl: crawls five metres fast and strikes whoever it reaches', async () => {
    const { scenes, fire, hitsOver, me } = await setup('sickle-wielder', 5);
    const x0 = me().x;
    fire('a4');
    const hits = hitsOver(1);
    expect(me().x - x0).toBeGreaterThan(3);
    expect(hits.length).toBeGreaterThan(0);
    scenes.clear();
  }, 30_000);

  it('Gravehook Launch: the sickle embeds, the tether pulls him up and over, and the slice lands for heavy area damage', async () => {
    const { scenes, run, fire, me, foe } = await setup('sickle-wielder', 7, 13, {}, ['understrike', 'reaperSweep', 'hookAndDrag', 'gravehookLaunch']);
    const x0 = me().x;
    expect(fire('a4')).toBeNull();
    let peak = 0;
    for (let i = 0; i < 3 / STEP; i++) {
      run(STEP);
      peak = Math.max(peak, me().abilityLift);
    }
    expect(peak).toBeGreaterThan(1); // launched into the air
    expect(me().x - x0).toBeGreaterThan(3);
    expect(foe().combatant.stats.maxHp - foe().combatant.hp).toBeGreaterThan(50);
    scenes.clear();
  }, 60_000);

  it('Gravehook Launch fails gracefully: a wall where the sickle would bite means nothing moves and nothing teleports', async () => {
    const wall = { x0: 15, y0: 8, x1: 15.6, y1: 18 };
    const { scenes, run, fire, me } = await setup('sickle-wielder', 7, 13, { interiorWalls: [wall] }, ['understrike', 'reaperSweep', 'hookAndDrag', 'gravehookLaunch']);
    const x0 = me().x;
    fire('a4');
    run(2);
    expect(Math.abs(me().x - x0)).toBeLessThan(0.3);
    expect(me().abilityLift).toBe(0);
    scenes.clear();
  }, 30_000);

  it('Grave Reaper: eight rapid low slashes and a rising finisher, each a separate hit', async () => {
    const { scene, scenes, fire, hitsOver } = await setup('sickle-wielder', 4);
    scene.playerFighter.caster!.fillMeter();
    fire('ult');
    const hits = hitsOver(3.5);
    expect(hits.length).toBeGreaterThanOrEqual(8);
    expect(hits[hits.length - 1]!).toBeGreaterThan(hits[0]! * 3);
    scenes.clear();
  }, 60_000);

  it('has exactly five standard abilities and a separate ultimate', () => {
    const k = SICKLE_WIELDER_KIT;
    expect(new Set([k.a1.id, k.a2.id, k.a3.id, k.a4.id, k.a5!.id, k.ult.id]).size).toBe(6);
    expect(k.ult.slot).toBe('ult');
  });
});
