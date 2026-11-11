import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { BUILT_IN_LIBRARY, withEntries } from '../../../src/characters/library';
import type { CharacterDefinition, CharacterLibrary } from '../../../src/characters/schema';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** A variant of Inferno with some capabilities changed (made the intended way: duplicate the definition). */
function libWith(id: string, caps: Partial<CharacterDefinition['capabilities']>): CharacterLibrary {
  const inferno = BUILT_IN_LIBRARY.characters.inferno!;
  return withEntries(BUILT_IN_LIBRARY, {
    characters: [{ ...inferno, id, displayName: id, capabilities: { ...inferno.capabilities, ...caps } }],
  });
}

/** The player beside the dummy (19, 13), facing it. */
async function setup(player = 'inferno', library: CharacterLibrary = BUILT_IN_LIBRARY, at = { x: 17.95, y: 13 }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    {
      player,
      library,
    },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      each?.();
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  run(0.2);
  return { intents, scene, scenes, run, runUntil };
}

describe('Inferno in the arena: behaviour entirely from its configuration (TD-039)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('plays as Inferno with its taekwondo moveset; flames burn around the fists while punching', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    expect(scene.playerFighter.def.displayName).toBe('Inferno');
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'jab', 0.5);
    run(0.05);
    expect(scene.limbFlameStrength).toBeGreaterThan(0.2); // fist flames during the punch
    run(0.5);
    scenes.clear();
  });

  it('a firm forward tap starts the kick string; the fire roundhouse ends the punch string and burns', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    intents.setMove('t', { x: 1, y: 0 });
    intents.pressMelee();
    run(STEP);
    intents.setMove('t', { x: 0, y: 0 });
    expect(scene.player.attack).toBe('front-kick');
    run(0.8);
    for (const step of ['jab', 'straight', 'roundhouse']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      expect(scene.player.attack).toBe(step);
      run(0.12);
    }
    runUntil(() => scene.dummy.burning, 1);
    expect(scene.dummy.burning).toBe(true); // the roundhouse's burn status from data
    scenes.clear();
  });

  it('the downward fire kick (a tap while falling) hits from the air and bounces the target off the floor', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup('inferno', BUILT_IN_LIBRARY, { x: 18.2, y: 13 });
    intents.pressJump();
    runUntil(() => scene.playerFighter.hop.verticalSpeedMps < 0, 1);
    intents.pressMelee();
    run(STEP);
    expect(scene.player.attack).toBe('meteor-kick');
    let bounced = false;
    run(0.6, () => {
      if (scene.dummyFighter.hop.heightM > 0.05) bounced = true;
    });
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(bounced).toBe(true);
    scenes.clear();
  });

  it('Punch Clash disabled: a sustained exchange never becomes a clash', async () => {
    const { intents, scene, scenes, run } = await setup('no-clash', libWith('no-clash', { canUsePunchClash: false }));
    scene.dummyAttacks = true;
    let started = false;
    let t = 0;
    run(10, () => {
      t += STEP;
      if (scene.clashes.active) started = true;
      const phase = t % 1.6;
      if (phase < STEP * 1.5 || Math.abs(phase - 0.3) < STEP / 2) intents.pressMelee();
      if (Math.abs(phase - 0.55) < STEP / 2) intents.meleePress();
      if (Math.abs(phase - 1.5) < STEP / 2) intents.meleeRelease();
      const gap = scene.dummy.x - scene.player.x;
      intents.setMove('t', { x: gap > 1.15 ? 0.6 : 0, y: 0 });
    });
    expect(started).toBe(false);
    scenes.clear();
  });

  it('jump, block and disintegration can each be switched off', async () => {
    const lib = libWith('grounded', { canJump: false, canBlock: false, canDisintegrate: false });
    const { intents, scene, scenes, run } = await setup('grounded', lib);
    intents.pressJump();
    run(0.3);
    expect(scene.playerFighter.hop.heightM).toBe(0); // no jump
    intents.meleePress();
    run(0.4);
    expect(scene.player.state).not.toBe('guarding'); // no block
    intents.meleeRelease();
    run(0.5);
    scene.playerFighter.combatant.hp = 1;
    scene.dummyFighter.combo.press({ airborne: false, falling: false, forward: false });
    run(2.4);
    expect(scene.player.state).toBe('ko');
    expect(scene.playerFighter.view!.root.alpha).toBe(1); // no dust dissolve: the body stays
    scenes.clear();
  });

  it('a heavy blow into a wall bounces the target off it (canWallBounce)', async () => {
    // Beside the yard's right wall (x 30): the finisher sends the dummy into it.
    const { intents, scene, scenes, run, runUntil } = await setup('base-stickman', BUILT_IN_LIBRARY, {
      x: 26.6,
      y: 10,
    });
    scene.respawnDummy({ x: 27.6, y: 10 });
    run(0.3);
    for (const step of ['jab', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      run(0.12);
    }
    runUntil(() => scene.wallHits > 0, 2);
    expect(scene.wallHits).toBeGreaterThan(0);
    run(0.1);
    expect(scene.dummyFighter.body!.linvel().x).toBeLessThan(0.5); // rebounded or stopped, not still flying into it
    scenes.clear();
  });
});
