import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { COYOTE_S } from '../../../src/physics/movement';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(character: string) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 5, y: 13 }, dummyStart: { x: 30, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: character },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.3);
  /** The state right after walking off a 0.75 m top: the feet are over open floor, the body still up. */
  const stepOff = () => {
    scene.playerFighter.hop = { heightM: 0.75, verticalSpeedMps: 0 };
  };
  return { intents, scene, scenes, run, stepOff };
}

/** Master plan Phase 1 B11: a jump still registers just after leaving a ledge; no double jumps. */
describe('coyote time in the arena', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a jump pressed shortly after stepping off an edge still jumps', async () => {
    const { intents, scene, scenes, run, stepOff } = await setup('inferno');
    const f = scene.playerFighter;
    const before = f.jumps;
    stepOff();
    run(STEP * 3); // a few frames into the fall
    intents.pressJump();
    run(STEP * 2);
    expect(f.jumps).toBe(before + 1);
    expect(f.hop.verticalSpeedMps).toBeGreaterThan(0); // rising again
    scenes.clear();
  });

  it(`a jump pressed more than ${COYOTE_S} s after stepping off does not`, async () => {
    const { intents, scene, scenes, run, stepOff } = await setup('inferno');
    const f = scene.playerFighter;
    const before = f.jumps;
    stepOff();
    run(COYOTE_S + 0.08);
    expect(f.airborne).toBe(true); // still falling
    intents.pressJump();
    run(STEP * 2);
    expect(f.jumps).toBe(before);
    expect(f.hop.verticalSpeedMps).toBeLessThan(0);
    scenes.clear();
  });

  it('mashing jump never gives a second jump: one press, one jump, until it lands', async () => {
    const { intents, scene, scenes, run } = await setup('rampage'); // no double jump capability
    const f = scene.playerFighter;
    const before = f.jumps;
    for (let i = 0; i < 90; i++) {
      intents.pressJump();
      run(STEP);
      if (i > 5 && !f.airborne) break;
    }
    // It may jump again after landing (that is a new jump), but never while still in the air: count the
    // jumps against the airborne spells.
    let airSpells = 0;
    let was = false;
    const f2 = f;
    f2.jumps = before;
    for (let i = 0; i < 120; i++) {
      intents.pressJump();
      run(STEP);
      if (f.airborne && !was) airSpells++;
      was = f.airborne;
    }
    expect(f.jumps - before).toBeLessThanOrEqual(airSpells);
    scenes.clear();
  });
});

describe('running jump keeps momentum (B11)', () => {
  it('a sprinting jump holds sprint speed in the air', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      { ...TRAINING_YARD, playerStart: { x: 4, y: 13 }, dummyStart: { x: 40, y: 13 } },
      new Container(),
      intents,
      () => ({ width: 1280, height: 720 }),
      false,
      { player: 'inferno' },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const f = scene.playerFighter;
    const step = () => {
      scenes.update(1 / 60);
      scenes.render(1, 1 / 60);
    };
    const speed = () => {
      const v = f.body!.linvel();
      return Math.hypot(v.x, v.y);
    };
    for (let i = 0; i < 20; i++) step();
    intents.setMove('t', { x: 1, y: 0 });
    intents.sprint = true;
    for (let i = 0; i < 40; i++) step();
    const run = speed();
    intents.pressJump();
    step();
    for (let i = 0; i < 12; i++) step();
    expect(f.airborne).toBe(true);
    expect(speed()).toBeGreaterThan(run * 0.95);
    scenes.clear();
  });
});
