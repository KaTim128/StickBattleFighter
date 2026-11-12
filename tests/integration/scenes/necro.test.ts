import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';
import { iso } from '../../../src/rendering/projection';

const STEP = 1 / 60;
const K = NECRO_KIT;

async function setup(
  at: { x: number; y: number },
  dummyAt: { x: number; y: number },
  arena: ArenaLayout = TRAINING_YARD,
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...arena, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'necro' },
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
  scene.drainEvents();
  /** Face the dummy (soft lock picks it) and cast. */
  const cast = (slot: 'a1' | 'a2' | 'a3' | 'ult') => {
    intents.pressAbility(slot);
    run(STEP * 2);
  };
  return { intents, scene, scenes, run, runUntil, cast };
}

describe('Necro (owner, 12/11/2026): the death mage', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is a little slower than Inferno and swings a 3-hit staff combo ending in a knockdown', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.4, y: 13 });
    expect(scene.playerFighter.def.movement.maxSpeedMps).toBeLessThan(5 * 1.05);
    expect(Object.values(scene.playerFighter.def.moves).filter((m) => !m.aerial)).toHaveLength(3);
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1);
      if (scene.player.attack) seen.push(scene.player.attack);
      run(0.15);
    }
    expect(seen).toEqual(['staff-sweep', 'soul-thrust', 'grave-slam']);
    runUntil(() => scene.dummy.state === 'knockdown' || scene.dummy.state === 'gettingUp', 2);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Soul Drain: a projectile that hurts the target, gives Necro back half the damage and blinds it', async () => {
    const { scene, scenes, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.combatant.hp = 600;
    cast('a1');
    runUntil(() => scene.dummy.hp < 1000, 3);
    const dealt = 1000 - scene.dummy.hp;
    expect(dealt).toBeGreaterThan(0);
    expect(scene.player.hp).toBeGreaterThan(600);
    expect(scene.player.hp - 600).toBeCloseTo(K.a1.payload.damage * K.a1.payload.lifesteal!, 0);
    expect(scene.dummyFighter.combatant.blinded).toBe(true); // blinded for 3 s
    scenes.clear();
  });

  it('Death Eruption: bursts up under the target at range, hurting and trapping it in place', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    cast('a2');
    run(K.a2.castS);
    const t = scene.abilities!.world.telegraphs[0]!;
    expect(Math.hypot(t.x - 18, t.y - 13)).toBeLessThan(0.8); // under the dummy, not around Necro
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.dummy.state).toBe('stunned'); // trapped
    scenes.clear();
  });

  it('Soul Drain blinds for 3 s: a blinded fighter cannot find its target or attack, then sees again', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    cast('a1');
    runUntil(() => scene.dummyFighter.combatant.blinded, 3);
    scene.dummyAttacks = true;
    scene.playerFighter.placeAt({ x: 16.9, y: 13 }); // right in its jab's reach
    const hp = scene.player.hp;
    run(2.4);
    expect(scene.player.hp).toBe(hp); // it never swung at him while blind
    runUntil(() => !scene.dummyFighter.combatant.blinded, 2);
    expect(scene.dummyFighter.combatant.blinded).toBe(false);
    scenes.clear();
  });

  it('Teleport (desktop): R, then a left click on the spot: he reappears there, past furniture', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 10, y: 10 }, { x: 25, y: 18 });
    intents.pressAbility('a3');
    run(STEP * 2);
    expect(scene.pointAimState).not.toBeNull(); // aiming, nothing cast yet
    // Point the mouse at a spot 6 m away (screen position of that floor point).
    const w = scene.arenaView!.world;
    const to = { x: 16, y: 10 };
    const p = iso(to.x, to.y);
    intents.setPointer({ x: w.position.x + p.x * w.scale.x, y: w.position.y + p.y * w.scale.y });
    run(STEP * 2);
    intents.pressUltLaunch(); // left click (the aim-confirm binding)
    runUntil(() => Math.hypot(scene.player.x - to.x, scene.player.y - to.y) < 0.6, 2);
    expect(Math.hypot(scene.player.x - to.x, scene.player.y - to.y)).toBeLessThan(0.6);
    expect(scene.pointAimState).toBeNull();
    scenes.clear();
  });

  it('Teleport (touch): tap R, then tap the destination; never lands inside walls or furniture; R again cancels', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 4, y: 4 }, { x: 25, y: 13 }, OFFICE);
    const w = () => scene.arenaView!.world;
    const screenOf = (x: number, y: number) => {
      const p = iso(x, y);
      return { x: w().position.x + p.x * w().scale.x, y: w().position.y + p.y * w().scale.y };
    };
    // Press, then press again: called off, nothing cast.
    intents.pressAbility('a3');
    run(STEP * 2);
    intents.pressAbility('a3');
    run(STEP * 2);
    expect(scene.pointAimState).toBeNull();
    // Press, then tap a spot right on a desk: he lands next to it, never inside it.
    const desk = OFFICE.props!.find((p) => p.kind === 'desk' && Math.hypot(p.x - 4, p.y - 4) < 8)!;
    intents.pressAbility('a3');
    run(STEP * 2);
    intents.tap(screenOf(desk.x, desk.y));
    runUntil(() => Math.hypot(scene.player.x - 4, scene.player.y - 4) > 1, 2);
    run(0.3);
    expect(Math.hypot(scene.player.x - 4, scene.player.y - 4)).toBeGreaterThan(1);
    expect(scene.physics!.isFree({ x: scene.player.x, y: scene.player.y }, 0.25)).toBe(true);
    scenes.clear();
  });

  it('Ultimate Undead Army: four skeletons rise near the enemy and stay until they are destroyed', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 8, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => scene.summonStates.length > 0, 3);
    expect(scene.summonStates).toHaveLength(4);
    for (const s of scene.summonStates) {
      expect(Math.hypot(s.x - 18, s.y - 13)).toBeLessThan(3.6); // around the enemy, not Necro
      expect(s.team).toBe('player');
      expect(scene.physics!.isFree({ x: s.x, y: s.y }, 0.2)).toBe(true);
    }
    // No timer: well past any old lifetime they are all still there.
    scene.respawnDummy({ x: 28, y: 18 }); // out of the way, so they are not fighting
    run(16);
    expect(scene.summonStates.filter((s) => !s.ko)).toHaveLength(4);
    // Destroyed: one falls and crumbles away.
    const victim = scene.summonStates[0]!.name;
    const f = (
      scene as unknown as { summons: { list: { name: string; combatant: { expire(): void } }[] } }
    ).summons.list.find((m) => m.name === victim)!;
    f.combatant.expire();
    runUntil(() => scene.summonStates.length === 3, 3);
    expect(scene.summonStates).toHaveLength(3);
    scenes.clear();
  });
});
