import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import type { PropPlacement } from '../../../src/data/objects/props';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const K = INFERNO_KIT;

/** Training yard (dummy at 19, 13) with the player placed where a test needs it. */
async function setup(playerAt: { x: number; y: number }, arena: ArenaLayout = TRAINING_YARD) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene({ ...arena, playerStart: playerAt }, new Container(), intents, () => ({
    width: 1280,
    height: 720,
  }));
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
  run(0.1);
  scene.drainEvents();
  return { intents, scene, scenes, run, runUntil };
}

describe('Inferno abilities in the arena (Phase 6)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Fire Bolt: costs stamina, flies to the soft-locked dummy, damages and burns it, firing every hook', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 14, y: 13 });
    intents.pressAbility('a1');
    run(STEP);
    expect(scene.player.ability).toBe('fireBolt');
    expect(scene.player.stamina).toBeCloseTo(100 - K.a1.staminaCost, 0);
    runUntil(() => scene.dummy.hp < 1000, 1.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(K.a1.payload.damage);
    expect(scene.dummy.burning).toBe(true);
    run(K.a1.payload.burn!.durationS + 0.2);
    expect(scene.dummy.burning).toBe(false);
    expect(scene.drainEvents().some((e) => e.kind === 'burn')).toBe(true);
    expect(scene.abilities!.sfxLog).toEqual(
      expect.arrayContaining(['fire-charge', 'fireball-cast', 'fireball-impact']),
    );
    scenes.clear();
  });

  it('Fire Bolt is stopped by a pillar in the way (real hit detection, REQ-CMB-2)', async () => {
    // Facing right at a pillar (8, 6); the dummy is out of lock range, so the bolt flies straight ahead.
    const { intents, scene, scenes, run } = await setup({ x: 5, y: 6 });
    intents.pressAbility('a1');
    run(1);
    expect(scene.abilities!.world.projectiles).toHaveLength(0);
    expect(scene.dummy.hp).toBe(1000);
    const impact = scene.abilities!.recentFx.find((f) => f.kind === 'impact' && f.ability === 'fireBolt');
    expect(impact).toBeDefined();
    expect(impact!.x).toBeGreaterThan(7);
    expect(impact!.x).toBeLessThan(8);
    scenes.clear();
  });

  it('cooldown and stamina gate casting', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 5, y: 6 });
    intents.pressAbility('a1');
    run(0.6);
    intents.pressAbility('a1');
    run(STEP);
    expect(scene.lastAbilityBlock).toBe('cooldown');
    scene.playerFighter.combatant.stamina = 10;
    intents.pressAbility('a3');
    run(STEP);
    expect(scene.lastAbilityBlock).toBe('stamina');
    expect(scene.player.ability).toBeNull();
    scenes.clear();
  });

  it('Flame Dash: rushes about 4.5 m, hits the dummy in the way, and leaves a burning trail that fades', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 }); // 5 m from the dummy: within the dash's reach
    const x0 = scene.player.x;
    intents.pressAbility('a2');
    run(0.6);
    expect(scene.player.x - x0).toBeGreaterThan(3.5); // stopped at the dummy or after the full dash
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.abilities!.world.zones.length).toBeGreaterThan(3);
    run(K.a2.delivery.type === 'dash' ? K.a2.delivery.trail!.lifeS + 0.2 : 0);
    expect(scene.abilities!.world.zones).toHaveLength(0);
    scenes.clear();
  });

  it('Eruption: telegraphed first (no damage yet), then knocks down anyone inside the ring', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 17.6, y: 13 });
    intents.pressAbility('a3');
    run(K.a3.castS + 0.1);
    expect(scene.abilities!.world.telegraphs).toHaveLength(1);
    expect(scene.dummy.hp).toBe(1000); // still only a warning (REQ-ABL-6)
    run(0.6);
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(K.a3.payload.damage);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Eruption does not reach a dummy outside the ring', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 });
    intents.pressAbility('a3');
    run(1.2);
    expect(scene.dummy.hp).toBe(1000);
    scenes.clear();
  });

  it('the ultimate needs a full meter; Meteor Fist then leaps (untouchable), lands on the dummy and empties the meter', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 14, y: 13 });
    intents.pressAbility('ult');
    run(STEP);
    expect(scene.lastAbilityBlock).toBe('meter');
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult'); // aim (the soft lock puts the spot on the dummy)…
    run(STEP);
    intents.pressAbility('ult'); // …and launch
    run(STEP);
    expect(scene.player.ability).toBe('meteorFist');
    expect(scene.player.meter).toBe(0);
    runUntil(() => scene.playerFighter.abilityLift > 1, 1);
    expect(scene.playerFighter.abilityLift).toBeGreaterThan(1); // in the air
    expect(scene.abilities!.world.telegraphs).toHaveLength(1); // landing spot shown
    runUntil(() => scene.dummy.hp < 1000, 1.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(K.ult.payload.damage);
    expect(Math.hypot(scene.player.x - 19, scene.player.y - 13)).toBeLessThan(2.5);
    expect(scene.abilities!.sfxLog).toContain('meteor-impact');
    scenes.clear();
  });

  it('mouse aiming (owner, 11/11/2026): F aims, the spot follows the hovered cursor, left click launches without a punch', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 14, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(STEP);
    expect(scene.ultAim).not.toBeNull();
    // Hover over a spot up and to the left of the fighter (inside the leap's range).
    const want = { x: 12.5, y: 10.5 };
    intents.setPointer(scene.worldToScreen(want.x, want.y));
    run(STEP);
    const aim = scene.ultAim!;
    expect(Math.hypot(aim.to.x - want.x, aim.to.y - want.y)).toBeLessThan(0.05);
    // Keys still nudge it until the mouse moves again.
    intents.setMove('t', { x: 1, y: 0 });
    run(0.2);
    intents.setMove('t', { x: 0, y: 0 });
    expect(scene.ultAim!.to.x).toBeGreaterThan(want.x + 0.3);
    intents.setPointer(scene.worldToScreen(want.x, want.y));
    run(STEP);
    expect(scene.ultAim!.to.x).toBeCloseTo(want.x, 1);
    // Left click: the attack press and the launch arrive together; only the launch happens.
    intents.meleePress();
    intents.pressUltLaunch();
    run(STEP);
    intents.meleeRelease();
    expect(scene.ultAim).toBeNull();
    expect(scene.player.ability).toBe('meteorFist');
    expect(scene.player.attack).toBeNull();
    runUntil(() => scene.player.ability === null, 3);
    expect(Math.hypot(scene.player.x - want.x, scene.player.y - want.y)).toBeLessThan(0.8); // landed where hovered
    expect(scene.player.attack).toBeNull(); // the release after the click did not punch either
    scenes.clear();
  });

  it('a hovered spot beyond the leap is clamped to its range; a plain click with no aim is just an attack', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 });
    intents.meleePress();
    intents.pressUltLaunch();
    run(STEP);
    intents.meleeRelease();
    run(STEP);
    expect(scene.player.attack).toBe('jab');
    expect(scene.ultAim).toBeNull();
    run(0.8);
    scene.playerFighter.caster!.fillMeter();
    intents.setPointer(scene.worldToScreen(2, 2)); // far away
    intents.pressAbility('ult');
    run(STEP);
    const a = scene.ultAim!;
    expect(Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y)).toBeLessThanOrEqual(a.maxRangeM + 1e-6);
    expect(a.to.x).toBeLessThan(a.from.x); // toward the cursor
    scenes.clear();
  });

  it('sprint (hold Shift): runs about 45% faster, not while attacking', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 5, y: 5 });
    const speedAfter = (sprint: boolean) => {
      intents.sprint = sprint;
      intents.setMove('t', { x: 1, y: 0 });
      run(0.6);
      const v = scene.player.speed;
      intents.setMove('t', { x: 0, y: 0 });
      intents.sprint = false;
      run(0.6);
      return v;
    };
    const walk = speedAfter(false);
    const sprint = speedAfter(true);
    expect(sprint / walk).toBeGreaterThan(1.35);
    expect(sprint / walk).toBeLessThan(1.55);
    scenes.clear();
  });

  it('aiming the ultimate (owner): I enters aim mode in a jump-prep crouch; WASD moves the spot, not the fighter', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 14, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(STEP);
    const aim0 = scene.ultAim!;
    expect(aim0).not.toBeNull();
    expect(Math.hypot(aim0.to.x - 19, aim0.to.y - 13)).toBeLessThan(0.6); // starts on the soft-locked dummy
    expect(scene.player.meter).toBeGreaterThanOrEqual(100); // nothing spent yet
    const x0 = scene.player.x;
    intents.setMove('t', { x: 0, y: -1 });
    run(0.9); // well away from the dummy (outside the 3 m blast)
    intents.setMove('t', { x: 0, y: 0 });
    expect(Math.abs(scene.player.x - x0)).toBeLessThan(0.05); // the fighter stays put
    const aim1 = scene.ultAim!;
    expect(aim1.to.y).toBeLessThan(aim0.to.y - 2); // the spot moved up
    intents.pressAbility('ult'); // launch
    run(STEP);
    expect(scene.ultAim).toBeNull();
    expect(scene.player.ability).toBe('meteorFist');
    runUntil(() => scene.player.ability === null, 3);
    expect(Math.hypot(scene.player.x - aim1.to.x, scene.player.y - aim1.to.y)).toBeLessThan(0.8); // landed on the spot
    expect(scene.dummy.hp).toBe(1000); // away from the dummy: untouched
    scenes.clear();
  });

  it('the aimed spot never goes beyond the maximum jump range; a touch drag places it directly', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 10 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(STEP);
    intents.setMove('t', { x: -1, y: 0 });
    run(3);
    intents.setMove('t', { x: 0, y: 0 });
    const a = scene.ultAim!;
    expect(Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y)).toBeLessThanOrEqual(a.maxRangeM + 1e-6);
    intents.setUltDrag({ x: 0, y: 0.5 }); // drag down, half range
    run(STEP);
    const b = scene.ultAim!;
    expect(b.to.x).toBeCloseTo(b.from.x, 3);
    expect(b.to.y - b.from.y).toBeCloseTo(b.maxRangeM / 2, 1);
    scenes.clear();
  });

  it('getting hit while aiming calls the jump off and keeps the meter', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 17.95, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(STEP);
    expect(scene.ultAim).not.toBeNull();
    scene.dummyFighter.combo.press({ airborne: false, falling: false, forward: false });
    run(0.4);
    expect(scene.ultAim).toBeNull();
    expect(scene.player.meter).toBeGreaterThanOrEqual(100);
    scenes.clear();
  });

  it('melee and abilities charge the ultimate meter', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 });
    intents.pressAbility('a1');
    run(1);
    // 70 damage dealt at 0.25 per point, plus about 1 per second.
    expect(scene.player.meter).toBeGreaterThan(70 * K.charge.perDamageDealt);
    scenes.clear();
  });

  it('a hit during the wind-up interrupts the cast: no bolt is fired', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 17.95, y: 13 });
    scene.dummyFighter.combo.press({ airborne: false, falling: false, forward: false }); // the dummy jabs (wind-up 0.06 s)…
    intents.pressAbility('a1'); // …while the bolt winds up for 0.18 s
    run(0.5);
    expect(scene.player.ability).toBeNull();
    expect(scene.abilities!.sfxLog).not.toContain('fireball-cast');
    expect(scene.dummy.hp).toBe(1000);
    scenes.clear();
  });

  it('fire sets wooden furniture alight; it keeps losing durability while it burns', async () => {
    const desk: PropPlacement = { kind: 'desk', x: 8, y: 5 };
    const room: ArenaLayout = { ...TRAINING_YARD, props: [desk], dummyStart: { x: 25, y: 17 } };
    const { intents, scene, scenes, runUntil } = await setup({ x: 5, y: 5 }, room);
    intents.pressAbility('a1');
    runUntil(() => scene.propStates[0]!.burning, 1.5);
    const d = scene.propStates[0]!;
    expect(d.burning).toBe(true);
    expect(d.hp).toBeLessThan(320); // the bolt's 70 damage
    const afterBolt = scene.propStates[0]!.hp!;
    runUntil(() => !scene.propStates[0]!.burning, 6);
    expect(scene.propStates[0]!.hp!).toBeLessThan(afterBolt - 50); // about 14 per second for 5 s
    scenes.clear();
  });
});
