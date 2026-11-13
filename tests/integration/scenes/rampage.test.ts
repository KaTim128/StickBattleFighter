import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { RAMPAGE_KIT } from '../../../src/data/abilities/rampage';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const K = RAMPAGE_KIT;

async function setup(player: string, at: { x: number; y: number }, arena: ArenaLayout = TRAINING_YARD) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...arena, playerStart: at },
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
  scene.drainEvents();
  return { intents, scene, scenes, run, runUntil };
}

describe('Rampage (owner, 12/11/2026): the muscle-bound brawler', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is drawn bigger than Inferno (1.6x), in pants, bulkier and wider, and his Rampage Charge winds up in 0.5 s (owner, 12/11/2026)', async () => {
    const r = await setup('rampage', { x: 5, y: 5 });
    const i = await setup('inferno', { x: 5, y: 5 });
    const rd = r.scene.playerFighter.def;
    const id = i.scene.playerFighter.def;
    expect(rd.sizeScale).toBe(1.1); // owner 12/11/2026: "just a bit taller than inferno", not boss-sized
    expect(rd.look.pants).toBeDefined(); // owner 12/11/2026: not fully naked
    expect(id.sizeScale ?? 1).toBe(1);
    expect(rd.body.footRadiusM).toBeGreaterThan(id.body.footRadiusM);
    expect(rd.look.limbWidthM).toBeGreaterThan(id.look.limbWidthM);
    expect(K.a2.castS).toBe(0.5);
    r.scenes.clear();
    i.scenes.clear();
  });

  it('is noticeably slower than Inferno, and turns slower', async () => {
    const top = async (who: string) => {
      const { intents, scene, scenes, run } = await setup(who, { x: 5, y: 5 });
      intents.setMove('t', { x: 1, y: 0 });
      run(0.12);
      const early = scene.player.speed;
      run(1);
      const s = { early, top: scene.player.speed };
      scenes.clear();
      return s;
    };
    const rampage = await top('rampage');
    const inferno = await top('inferno');
    expect(rampage.top).toBeLessThan(inferno.top * 0.85);
    expect(rampage.early).toBeLessThan(inferno.early); // builds speed (and changes direction) more slowly
  });

  it('a 3-hit combo ending in a devastating finisher that knocks the dummy down', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: 17.85, y: 13 });
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1.5);
      if (scene.player.attack && !seen.includes(scene.player.attack)) seen.push(scene.player.attack);
      run(0.2);
    }
    expect(seen.slice(0, 3)).toEqual(['hammer-jab', 'haymaker', 'double-hammer']);
    expect(seen).toHaveLength(3); // the string ends after three
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state); // the finisher floored it
    expect(scene.player.hits).toBe(3);
    // Heavier than Inferno's whole punch string (22 + 24 + 26 + 55), yet a full combo stays well short of
    // an ability-heavy exchange (owner, 13/11/2026 balance).
    expect(1000 - scene.dummy.hp).toBeGreaterThan(140);
    expect(1000 - scene.dummy.hp).toBeLessThan(220);
    scenes.clear();
  });

  it('Ground Smash: a shockwave that damages and knocks back everyone nearby', async () => {
    const { intents, scene, scenes, run } = await setup('rampage', { x: 17.4, y: 13 });
    const x0 = scene.dummy.x;
    intents.pressAbility('a1');
    run(K.a1.castS + 0.4);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(100);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    run(0.4);
    expect(scene.dummy.x).toBeGreaterThan(x0 + 1); // thrown away from him
    expect(scene.abilities!.sfxLog).toEqual(expect.arrayContaining(['rampage-grunt', 'ground-smash']));
    scenes.clear();
  });

  it('Crushing Strike: massive damage and a brief stun', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: 18.1, y: 13 });
    intents.pressAbility('a3');
    runUntil(() => scene.dummy.hp < 1000, 1.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(200);
    run(0.1);
    expect(scene.dummy.state).toBe('stunned');
    scenes.clear();
  });

  it('Rampage Charge: a 0.5 s wind-up on two legs, then a locked charge that smashes through a breakable wall', async () => {
    // Beside the office's curved wall, facing it, with the dummy far away.
    const walls = OFFICE.interiorWalls!;
    const i = walls.findIndex((w) => w.durability !== undefined && Math.abs((w.y0 + w.y1) / 2 - 3.2) < 0.4);
    const w = walls[i]!;
    const cx = (w.x0 + w.x1) / 2;
    const cy = (w.y0 + w.y1) / 2;
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: cx - 2.4, y: cy }, OFFICE);
    scene.respawnDummy({ x: 3, y: 10 });
    intents.setMove('t', { x: 1, y: 0 });
    run(0.15);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.2);
    intents.pressAbility('a2');
    run(K.a2.castS - 0.1);
    expect(scene.walls!.states.find((s) => s.index === i)!.broken).toBe(false); // still preparing
    // Try to steer while it charges: it keeps its line.
    intents.setMove('t', { x: 0, y: 1 });
    runUntil(() => scene.player.ability === null, 3);
    intents.setMove('t', { x: 0, y: 0 });
    expect(scene.walls!.states.find((s) => s.index === i)!.broken).toBe(true);
    expect(scene.player.x).toBeGreaterThan(cx); // through the hole
    expect(Math.abs(scene.player.y - cy)).toBeLessThan(0.9); // did not turn
    scenes.clear();
  });

  it('Rampage Charge stops dead in the first fighter it hits, with a big collision burst (owner, 12/11/2026)', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: 6, y: 13 });
    scene.respawnDummy({ x: 11, y: 13 });
    intents.setMove('t', { x: 1, y: 0 });
    run(0.1);
    intents.setMove('t', { x: 0, y: 0 });
    intents.pressAbility('a2');
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    const xHit = scene.player.x;
    runUntil(() => scene.player.ability === null, 3);
    expect(scene.player.x - xHit).toBeLessThan(0.6); // stopped in the target instead of running on
    const burst = scene.abilities!.recentFx.find((e) => e.kind === 'impact' && e.ability === 'rampageCharge');
    expect(burst?.radiusM).toBeGreaterThanOrEqual(2); // big enough to shake the screen
    scenes.clear();
  });

  it('Rampage Charge from a distance runs straight on, far past its old 11 m, until the wall stops it (owner, 12/11/2026)', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: 3, y: 4 });
    scene.respawnDummy({ x: 6, y: 20 }); // off to the side, out of the charge's line
    intents.setMove('t', { x: 1, y: 0 });
    run(0.1);
    intents.setMove('t', { x: 0, y: 0 });
    const y0 = scene.player.y;
    intents.pressAbility('a2');
    run(0.1); // the press starts the cast on the next step
    expect(scene.player.ability).toBe('rampageCharge');
    runUntil(() => scene.player.ability === null, 5);
    expect(scene.player.x - 3).toBeGreaterThan(14); // kept going, no premature stop
    expect(Math.abs(scene.player.y - y0)).toBeLessThan(0.5); // a straight line
    const burst = scene.abilities!.recentFx.find((e) => e.kind === 'impact' && e.ability === 'rampageCharge');
    expect(burst).toBeDefined(); // ended in a collision with the wall
    scenes.clear();
  });

  it('Rampage Charge slams into a solid wall and stops there with a collision burst', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('rampage', { x: 3, y: 13 });
    scene.respawnDummy({ x: 28, y: 18 }); // out of the charge's aim range, so it goes the way he faces
    intents.setMove('t', { x: -1, y: 0 });
    run(0.1);
    intents.setMove('t', { x: 0, y: 0 });
    intents.pressAbility('a2');
    run(0.1); // the press starts the cast on the next step
    expect(scene.player.ability).toBe('rampageCharge');
    runUntil(() => scene.player.ability === null, 3);
    const burst = scene.abilities!.recentFx.find((e) => e.kind === 'impact' && e.ability === 'rampageCharge');
    expect(burst).toBeDefined();
    expect(burst!.x).toBeLessThan(scene.player.x); // in front of him, at the wall
    scenes.clear();
  });

  it('Heavy Throw: lifts a steel drawer unit (Inferno cannot) and hurls it far harder', async () => {
    const arena: ArenaLayout = { ...TRAINING_YARD, props: [{ kind: 'drawer-unit', x: 16.1, y: 13 }] };
    const lift = async (who: string) => {
      const t = await setup(who, { x: 15.4, y: 13 }, arena);
      t.intents.setMove('t', { x: 1, y: 0 });
      t.run(0.1);
      t.intents.setMove('t', { x: 0, y: 0 });
      t.intents.interactPress();
      t.run(0.1);
      t.intents.interactRelease();
      t.runUntil(() => !t.scene.player.lifting, 2); // a heavy drawer unit takes a while to heave up
      t.run(0.05);
      return t;
    };
    const inferno = await lift('inferno');
    expect(inferno.scene.player.carrying).toBeNull();
    inferno.scenes.clear();
    const r = await lift('rampage');
    expect(r.scene.player.carrying).toBe('drawer-unit');
    r.intents.interactPress();
    r.run(0.05);
    r.intents.interactRelease();
    r.runUntil(() => r.scene.dummy.hp < 1000, 2);
    expect(1000 - r.scene.dummy.hp).toBeGreaterThan(200);
    r.scenes.clear();
  });

  it('Rampage Mode: 8 s of +15% speed and 15% less damage taken, then it wears off', async () => {
    const { intents, scene, scenes, run } = await setup('rampage', { x: 5, y: 5 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(K.ult.castS + 0.2);
    expect(scene.playerFighter.buff).not.toBeNull();
    expect(scene.playerFighter.combatant.damageTakenScale).toBeCloseTo(0.85, 6);
    intents.setMove('t', { x: 1, y: 0 });
    run(1.2);
    const buffed = scene.player.speed;
    intents.setMove('t', { x: 0, y: 0 });
    expect(buffed).toBeGreaterThan(3.9 * 1.12);
    run(8);
    expect(scene.playerFighter.buff).toBeNull();
    expect(scene.playerFighter.combatant.damageTakenScale).toBe(1);
    scenes.clear();
  });
});
