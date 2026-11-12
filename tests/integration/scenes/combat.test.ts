import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { DEFENCE } from '../../../src/combat/combatant';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const A = GREYBOX_STICKMAN.attacks;

async function setup() {
  const stage = new Container();
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(TRAINING_YARD, stage, intents, () => ({ width: 1280, height: 720 }), false, {
    player: 'base-stickman',
  }); // shared rules, tested on the Base Stickman
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 6) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  /** Walk to just left of the dummy, level with it, facing it. */
  const lineUp = () => {
    const d = scene.dummy;
    intents.setMove('t', { x: 0, y: Math.sign(d.y - scene.player.y) });
    runUntil(() => Math.abs(scene.player.y - d.y) < 0.12);
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > d.x - 1.05);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.4);
    scene.drainEvents();
  };
  return { intents, scene, scenes, run, runUntil, lineUp };
}

describe('Phase 5 combat in the arena', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the combo (three punches then a kick) damages the dummy; the kick finisher knocks it down', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    for (const step of ['jab', 'cross', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      run(0.12);
    }
    runUntil(() => scene.dummy.state === 'knockdown', 1);
    expect(scene.dummy.state).toBe('knockdown');
    const base = A.jab!.damage + A.cross!.damage + A.hook!.damage + A.heavy!.damage;
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(base);
    expect(1000 - scene.dummy.hp).toBeLessThanOrEqual(Math.round(base * 1.5));
    const kinds = scene.drainEvents().map((e) => e.kind);
    expect(kinds.filter((k) => k === 'hit' || k === 'crit')).toHaveLength(4);
    scenes.clear();
  });

  it('after a knockdown the dummy falls, lies, then gets up (animated) before it can act again', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    for (const step of ['jab', 'cross', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      run(0.12);
    }
    runUntil(() => scene.dummy.state === 'knockdown', 1);
    runUntil(() => scene.dummy.state !== 'knockdown', 2);
    expect(scene.dummy.state).toBe('gettingUp');
    expect(scene.dummyFighter.combatant.canAct).toBe(false);
    runUntil(() => scene.dummy.state === 'free', DEFENCE.getUpS + 0.2);
    expect(scene.dummy.state).toBe('free');
    scenes.clear();
  });

  it('the flying kick knocks down but no longer sends the target flying across the room (owner, 11/11/2026)', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.setMove('t', { x: -1, y: 0 }); // a little run-up room
    run(0.15);
    const x0 = scene.dummy.x;
    intents.setMove('t', { x: 1, y: 0 }); // jump in and kick
    intents.pressJump();
    run(0.1);
    intents.pressMelee();
    run(0.1);
    intents.setMove('t', { x: 0, y: 0 });
    runUntil(() => scene.dummy.state === 'knockdown', 1);
    expect(scene.dummy.state).toBe('knockdown');
    runUntil(() => scene.dummy.speed < 0.05, 3);
    expect(scene.dummy.x - x0).toBeGreaterThan(0.5);
    expect(scene.dummy.x - x0).toBeLessThan(3.5); // was about 10 m
    scenes.clear();
  });

  it('a landed punch flashes the target white, sounds, throws sparks, recoils the puncher and freezes briefly', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    scene.drainSounds();
    const x0 = scene.player.x;
    intents.pressMelee();
    runUntil(() => scene.dummy.hp < 1000, 1);
    expect(scene.dummyFighter.flashS).toBeGreaterThan(0); // white flash for a few frames
    // A bare-knuckle contact sound: one of the Audio Profile's light-punch variations.
    expect(scene.drainSounds().some((id) => scene.playerFighter.def.audio.lightPunch.includes(id))).toBe(true);
    const vx = scene.playerFighter.body!.linvel().x;
    expect(vx).toBeLessThan(0); // the puncher bounces back off the contact
    // Hit-stop: the next step does not move anything.
    const dx = scene.dummy.x;
    run(STEP);
    expect(scene.dummy.x).toBe(dx);
    run(0.3);
    expect(scene.dummyFighter.flashS).toBe(0);
    expect(Math.abs(scene.player.x - x0)).toBeLessThan(0.5);
    scenes.clear();
  });

  it('the finisher (a kick) sounds heavier, and a blocked punch sounds like a block with no flash', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    scene.drainSounds();
    for (const step of ['jab', 'cross', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      run(0.12);
    }
    run(0.3);
    expect(scene.drainSounds()).toContain('kick-heavy');
    scenes.clear();

    const b = await setup();
    b.lineUp();
    b.scene.dummyFighter.combatant.setGuard(true);
    b.scene.dummyFighter.combatant.update(0.5); // guard held long enough not to be a parry
    b.scene.drainSounds();
    b.intents.pressMelee();
    b.runUntil(() => b.scene.dummy.hp < 1000, 1);
    expect(b.scene.drainSounds()).toContain('block');
    expect(b.scene.dummyFighter.flashS).toBe(0);
    b.scenes.clear();
  });

  it('at zero health the dummy faints, then dissolves into dust and fades away before getting up again', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    scene.dummyFighter.combatant.hp = 30;
    intents.pressMelee();
    runUntil(() => scene.dummy.state === 'ko', 1);
    expect(scene.dummy.state).toBe('ko');
    expect(scene.drainSounds()).toContain('ko');
    const view = scene.dummyFighter.view!;
    run(0.8);
    expect(view.root.alpha).toBe(1); // fainted, lying still
    run(1.0);
    expect(view.root.alpha).toBeLessThan(0.9); // dissolving
    expect(view.root.alpha).toBeGreaterThan(0);
    expect(scene.drainSounds()).toContain('dust');
    run(0.95); // (the KO's longer hit-stop holds the clock for 0.18 s)
    expect(view.root.alpha).toBeLessThan(0.05); // gone
    runUntil(() => scene.dummy.state !== 'ko', 1);
    expect(scene.dummy.hp).toBe(1000);
    expect(view.root.alpha).toBe(1);
    scenes.clear();
  });

  it('KO at 0 health, then the dummy gets back up at full health where it started', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    // Start the dummy at 200 health so one full combo (240+ damage) is enough; retry if a hit misses.
    for (let round = 0; round < 3 && scene.dummy.state !== 'ko'; round++) {
      scene.respawnDummy({ x: 19, y: 13 });
      scene.dummyFighter.combatant.hp = 200;
      lineUp();
      intents.pressMelee();
      runUntil(() => scene.player.attack === 'jab', 1);
      run(0.1);
      intents.pressMelee();
      runUntil(() => scene.player.attack === 'cross', 1);
      run(0.1);
      intents.pressMelee();
      runUntil(() => scene.player.attack === 'hook', 1);
      run(0.1);
      intents.pressMelee();
      runUntil(() => scene.dummy.state === 'ko' || scene.player.attack === null, 2);
      run(0.3);
    }
    expect(scene.dummy.state).toBe('ko');
    expect(scene.dummy.hp).toBe(0);
    expect(scene.drainEvents().some((e) => e.kind === 'ko')).toBe(true);
    run(DEFENCE.koRespawnS + 0.2);
    expect(scene.dummy.state).not.toBe('ko');
    expect(scene.dummy.hp).toBe(1000);
    expect(scene.dummy.x).toBeCloseTo(TRAINING_YARD.dummyStart.x, 1);
    scenes.clear();
  });

  it('Button 1: a tap attacks; holding raises the guard instead and never throws a jab', async () => {
    const { intents, scene, scenes, run } = await setup();
    intents.pressMelee();
    run(STEP * 2);
    expect(scene.player.attack).toBe('jab');
    run(0.6);
    intents.meleePress();
    run(DEFENCE.blockHoldS + 0.05);
    expect(scene.player.state).toBe('guarding');
    expect(scene.player.attack).toBeNull();
    intents.meleeRelease();
    run(STEP * 2);
    expect(scene.player.state).toBe('free');
    expect(scene.player.attack).toBeNull(); // releasing a hold does not attack
    scenes.clear();
  });

  it('blocking a dummy jab takes only chip damage', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.meleePress();
    run(0.5); // guard up well past the parry window
    scene.dummyAttacks = true;
    runUntil(() => scene.drainEvents().length > 0 || scene.player.hp < 1000, 2);
    expect(scene.player.hp).toBe(1000 - Math.round(A.jab!.damage * DEFENCE.chipFraction));
    expect(scene.player.state).toBe('guarding');
    intents.meleeRelease();
    scenes.clear();
  });

  it('raising the guard just before the hit parries: no damage and the dummy is stunned', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.meleePress();
    run(DEFENCE.blockHoldS + STEP); // guard just raised
    scene.dummyAttacks = true; // the dummy jabs at once
    const events: string[] = [];
    runUntil(() => {
      events.push(...scene.drainEvents().map((e) => e.kind));
      return events.length > 0;
    }, 1);
    expect(events).toEqual(['parried']);
    expect(scene.player.hp).toBe(1000);
    expect(scene.dummy.state).toBe('stunned');
    intents.meleeRelease();
    scenes.clear();
  });

  it('dodge always steps straight back from the facing, ignoring movement input, with the same distance every time (owner, 12/11/2026)', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    scene.respawnDummy({ x: 29, y: 19 }); // out of sight range, so the fighter faces the way it moves
    intents.setMove('t', { x: 1, y: 0 }); // face +x
    run(0.3);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.6);
    const f = scene.playerFighter;
    const aim = { ...f.aim };
    const dodge = (move: { x: number; y: number }) => {
      runUntil(() => scene.player.dodgeReady === 1, 3);
      const from = { x: scene.player.x, y: scene.player.y };
      intents.setMove('t', move);
      intents.pressDodge();
      run(STEP * 2);
      expect(scene.player.state).toBe('dodging');
      intents.setMove('t', { x: 0, y: 0 }); // let go: only the dodge moves the body
      runUntil(() => scene.player.state !== 'dodging', 1);
      expect(f.aim.x).toBeCloseTo(aim.x, 6); // facing unchanged
      expect(f.aim.y).toBeCloseTo(aim.y, 6);
      run(0.3);
      return { dx: scene.player.x - from.x, dy: scene.player.y - from.y };
    };
    const sideways = dodge({ x: 0, y: 1 }); // holding "down" does not steer it
    const forward = dodge({ x: 1, y: 0 }); // holding "toward" does not reverse it
    const still = dodge({ x: 0, y: 0 });
    for (const d of [sideways, forward, still]) {
      expect(d.dx).toBeLessThan(-1.8); // backwards, away from the facing (+x)
      expect(Math.abs(d.dy)).toBeLessThan(0.15);
    }
    expect(Math.abs(sideways.dx - still.dx)).toBeLessThan(0.15); // consistent distance
    expect(Math.abs(forward.dx - still.dx)).toBeLessThan(0.15);
    scenes.clear();
  });

  it('dodging through a jab: invulnerable during the dash', async () => {
    const { intents, scene, scenes, runUntil, lineUp } = await setup();
    lineUp();
    scene.dummyAttacks = true;
    // Turned away from the dummy, so the back-step (dodges always go backwards) carries the player
    // straight into its jab.
    scene.playerFighter.faceToward(-1, 0);
    intents.pressDodge();
    const events: string[] = [];
    runUntil(() => {
      events.push(...scene.drainEvents().map((e) => e.kind));
      return events.length > 0;
    }, 1);
    expect(events).toEqual(['dodged']);
    expect(scene.player.hp).toBe(1000);
    expect(scene.player.stamina).toBeLessThan(100);
    scenes.clear();
  });

  it('hit-stop: everything freezes for a few frames on impact', async () => {
    const { intents, scene, scenes, run, runUntil, lineUp } = await setup();
    lineUp();
    intents.pressMelee();
    runUntil(() => scene.dummy.state === 'stunned', 1);
    const frozen = { p: scene.player.x, d: scene.dummy.x };
    run(STEP * 2); // within the 0.05 s light hit-stop
    expect(scene.dummy.x).toBe(frozen.d);
    expect(scene.player.x).toBe(frozen.p);
    run(0.2);
    expect(scene.dummy.x).not.toBe(frozen.d); // then the knockback plays out
    scenes.clear();
  });
});
