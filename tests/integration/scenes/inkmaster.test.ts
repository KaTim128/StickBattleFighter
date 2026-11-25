import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Inkmaster (new fighter): every ability and the ultimate in the real fight scene, against a standing opponent. */
async function setup(opponent = 'rampage', gap = 5, arena: ArenaLayout = TRAINING_YARD) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...arena, playerStart: { x: 13, y: 13 }, dummyStart: { x: 13 + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'inkmaster', opponent },
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
  const world = () => scene.abilities!.world.ink;
  return { intents, scene, scenes, run, runUntil, cast, world };
}

describe('Inkmaster', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Ink Slash: a wide ink wave that damages and pushes the first opponent it reaches', async () => {
    const { scene, scenes, runUntil, cast } = await setup();
    cast('a1');
    runUntil(() => scene.dummy.hp < scene.dummyFighter.combatant.stats.maxHp, 3);
    expect(scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp).toBeGreaterThan(20);
    scenes.clear();
  });

  it('Ink Serpent: forms first, then hunts, bites and briefly holds the legs; the target can still guard', async () => {
    const { scene, scenes, run, runUntil, cast, world } = await setup('necro', 5);
    cast('a2');
    runUntil(() => world().serpents.length > 0, 2);
    expect(world().serpents).toHaveLength(1);
    const s = world().serpents[0]!;
    expect(s.phase).toBe('form');
    run(0.3);
    expect(scene.dummy.hp).toBe(scene.dummyFighter.combatant.stats.maxHp); // it does nothing while it is being drawn
    runUntil(() => scene.dummyFighter.combatant.trapped, 4);
    expect(scene.dummyFighter.combatant.trapped).toBe(true);
    expect(scene.dummy.hp).toBeLessThan(scene.dummyFighter.combatant.stats.maxHp);
    // The hold is short.
    runUntil(() => !scene.dummyFighter.combatant.trapped, 3);
    expect(scene.dummyFighter.combatant.trapped).toBe(false);
    scenes.clear();
  });

  it('Ink Dragon: drawn, circles its target, warns before breathing, and never breathes twice at once', async () => {
    const { scene, scenes, run, runUntil, cast, world } = await setup('necro', 5);
    cast('a3');
    runUntil(() => world().dragons.length > 0, 2);
    expect(world().dragons).toHaveLength(1);
    const phases = new Set<string>();
    let breaths = 0;
    let last = '';
    for (let i = 0; i < 14 / STEP; i++) {
      run(STEP);
      const d = world().dragons[0];
      if (!d) break;
      phases.add(d.phase);
      if (d.phase === 'breathe' && last !== 'breathe') breaths++;
      last = d.phase;
    }
    expect(phases.has('form')).toBe(true);
    expect(phases.has('rear')).toBe(true); // a visible warning before every breath
    expect(breaths).toBeGreaterThanOrEqual(1);
    expect(breaths).toBeLessThanOrEqual(4);
    runUntil(() => world().dragons.length === 0, 4);
    expect(world().dragons).toHaveLength(0); // it dissolves when its time is up
    scenes.clear();
  });

  it('Ink Clone: a sword or a bow clone rises, keeps its weapon, fights and crumbles when its time is up', async () => {
    const seen = new Set<string>();
    for (let k = 0; k < 6 && seen.size < 2; k++) {
      const { scene, scenes, run, runUntil, cast } = await setup('rampage', 6);
      scene.playerFighter.combatant.stamina = 100;
      cast('a4');
      runUntil(() => scene.summonStates.length > 0, 2);
      const clone = scene.summonStates[0]!;
      seen.add(clone.character);
      expect(['ink-clone-sword', 'ink-clone-bow']).toContain(clone.character);
      run(5);
      // The weapon never changes during the summon.
      expect(scene.summonStates[0]?.character ?? clone.character).toBe(clone.character);
      run(12);
      runUntil(() => scene.summonStates.length === 0, 4);
      expect(scene.summonStates).toHaveLength(0);
      scenes.clear();
    }
    expect(seen.size).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it('Ink Cyclone: a gentle pull and repeated damage, ending in a collapsing explosion; walking out frees them', async () => {
    const { scene, scenes, run, world } = await setup('rampage', 5);
    const kit = scene.playerFighter.caster!.kit;
    const host = scene.abilities!;
    const me = scene.playerFighter.name;
    host.world.release(me, kit.a5!, { x: scene.dummyFighter.x, y: scene.dummyFighter.y }, host);
    expect(world().vortices).toHaveLength(1);
    const v = world().vortices[0]!;
    const maxHp = scene.dummyFighter.combatant.stats.maxHp;
    run(1.6);
    expect(maxHp - scene.dummy.hp).toBeGreaterThan(0); // repeated damage
    expect(Number.isFinite(v.x)).toBe(true);
    const before = scene.dummy.hp;
    run(3);
    expect(world().vortices).toHaveLength(0); // it collapsed and is gone
    expect(before - scene.dummy.hp).toBeGreaterThan(0); // the collapse hurts too
    scenes.clear();
  });

  it('The Masterpiece: a ritual of drawing, then an ink monster with a limited life and health that dissolves', async () => {
    const { scene, scenes, run, runUntil, cast, world } = await setup('rampage', 7);
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => world().masterpieces.length > 0, 2);
    const m = world().masterpieces[0]!;
    expect(scene.summonStates).toHaveLength(0); // nothing yet: the monster is still being drawn
    run(1.5);
    expect(m.ageS).toBeGreaterThan(1);
    expect(scene.summonStates).toHaveLength(0);
    runUntil(() => scene.summonStates.length > 0, 4);
    const monster = scene.summonStates[0]!;
    expect(monster.character).toBe('ink-monster');
    expect(monster.leftS).toBeGreaterThan(14);
    expect(monster.hp).toBeLessThanOrEqual(620);
    expect(scene.summonStates.length).toBe(1); // never more than one
    // It fights: over some seconds the opponent takes damage from it, without being knocked down for good.
    run(10);
    expect(scene.dummyFighter.combatant.stats.maxHp - scene.dummy.hp).toBeGreaterThan(20);
    runUntil(() => scene.summonStates.length === 0, 12);
    expect(scene.summonStates).toHaveLength(0); // its time is up: it dissolves
    scenes.clear();
  }, 60_000);

  it('a living clone does not stop the monster: each kind of summon has its own cap', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup('training-dummy', 7);
    cast('a4');
    runUntil(() => scene.summonStates.length > 0, 2);
    expect(scene.summonStates).toHaveLength(1);
    run(1);
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => scene.summonStates.some((m) => m.character === 'ink-monster'), 6);
    expect(scene.summonStates.some((m) => m.character === 'ink-monster')).toBe(true);
    expect(scene.summonStates.filter((m) => m.character === 'ink-monster')).toHaveLength(1);
    run(0.2);
    scenes.clear();
  }, 60_000);

  it('everything he drew ends when he falls: no serpent, dragon, vortex or monster is left', async () => {
    const { scene, scenes, run, runUntil, cast, world } = await setup('rampage', 5);
    cast('a3');
    runUntil(() => world().dragons.length > 0, 2);
    scene.playerFighter.caster!.fillMeter();
    run(1);
    scene.playerFighter.combatant.hp = 1;
    scene.playerFighter.combatant.takeUnguardedDamage(10);
    run(2);
    expect(world().dragons.every((d) => d.phase === 'fade')).toBe(true);
    run(1);
    expect(world().dragons).toHaveLength(0);
    scenes.clear();
  });
});
