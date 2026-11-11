import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';
import { ISO_C, iso } from '../../../src/rendering/projection';

const STEP = 1 / 60;
const R = GREYBOX_STICKMAN.body.footRadiusM;
const DOOR = OFFICE.doors![0]!;
const DOOR_Y = (DOOR.y0 + DOOR.y1) / 2;

async function setup() {
  const stage = new Container();
  const intents = new PlayerIntents();
  // Start in the open area between the cubicle block and the door (cubicles fill the centre since 11/11/2026).
  const scene = new FightArenaScene(
    { ...OFFICE, playerStart: { x: DOOR.x0 - 2.6, y: DOOR_Y } },
    stage,
    intents,
    () => ({
      width: 1280,
      height: 720,
    }),
    false,
    { player: 'base-stickman' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 8) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  /** Walk onto the door's row, then up to just short of the door, facing it (not pushing it open). */
  const walkToDoor = () => {
    intents.setMove('t', { x: 0, y: Math.sign(DOOR_Y - scene.player.y) });
    runUntil(() => Math.abs(scene.player.y - DOOR_Y) < 0.15);
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > DOOR.x0 - R - 0.3);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.3);
  };
  return { intents, scene, scenes, run, runUntil, walkToDoor };
}

describe('office door (owner request, 11/11/2026)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('starts shut and solid; walking into it swings it open, through into the boss room, and it shuts behind (REQ-ENV-13)', async () => {
    const { intents, scene, scenes, run, runUntil, walkToDoor } = await setup();
    scene.respawnDummy({ x: 3, y: 1.9 }); // out of the way
    walkToDoor();
    expect(scene.doorStates[0]).toEqual({ id: 'boss-door', broken: false, brokenBy: null, open: false });
    // Walk on into it: it swings open (not broken) and the player walks straight through.
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.doorStates[0]!.open, 1);
    expect(scene.doorStates[0]!.open).toBe(true);
    expect(scene.doorStates[0]!.broken).toBe(false);
    runUntil(() => scene.player.x > DOOR.x1 + 1.2, 3);
    expect(scene.player.x).toBeGreaterThan(DOOR.x1 + 1.2);
    // Stand clear: it swings shut and blocks again.
    intents.setMove('t', { x: 1, y: 0 });
    run(0.4);
    intents.setMove('t', { x: 0, y: 0 });
    runUntil(() => !scene.doorStates[0]!.open, 4);
    expect(scene.doorStates[0]!.open).toBe(false);
    // And it opens again from the other side.
    intents.setMove('t', { x: -1, y: 0 });
    runUntil(() => scene.doorStates[0]!.open, 4);
    expect(scene.doorStates[0]!.open).toBe(true);
    runUntil(() => scene.player.x < DOOR.x0 - 1, 3);
    expect(scene.player.x).toBeLessThan(DOOR.x0 - 1);
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });

  it('a brush along it, or a shove that is not into it, does not open it', async () => {
    const { intents, scene, scenes, run, walkToDoor } = await setup();
    scene.respawnDummy({ x: 3, y: 1.9 });
    walkToDoor();
    intents.setMove('t', { x: 0.25, y: 1 }); // mostly along the wall
    run(0.6);
    expect(scene.doorStates[0]!.open).toBe(false);
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });

  it('jab and hook do not break it; the heavy finisher smashes it and the way is clear', async () => {
    const { intents, scene, scenes, run, runUntil, walkToDoor } = await setup();
    scene.respawnDummy({ x: 3, y: 1.9 }); // out of the way: these tests hit the door directly
    walkToDoor();
    intents.setMove('t', { x: 0, y: 0 });
    run(0.3);
    intents.pressMelee();
    run(0.12);
    expect(scene.player.attack).toBe('jab');
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'hook');
    run(0.2);
    expect(scene.doorStates[0]!.broken).toBe(false); // jab and hook landed, door still shut
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'heavy');
    run(0.4);
    expect(scene.doorStates[0]).toEqual({ id: 'boss-door', broken: true, brokenBy: 'strike', open: false });
    // splinters do not block: walk straight through into the boss room
    intents.setMove('t', { x: 1, y: 0 });
    run(1.5);
    expect(scene.player.x).toBeGreaterThan(DOOR.x1 + 1);
    scenes.clear();
  });

  it('a flying kick smashes it', async () => {
    const { intents, scene, scenes, run, runUntil, walkToDoor } = await setup();
    scene.respawnDummy({ x: 3, y: 1.9 }); // out of the way: these tests hit the door directly
    walkToDoor();
    intents.setMove('t', { x: -1, y: 0 });
    run(0.15); // step back a little
    intents.setMove('t', { x: 1, y: 0 });
    intents.pressJump();
    run(0.1);
    expect(scene.player.airborne).toBe(true);
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'flyingKick', 1);
    run(0.35);
    expect(scene.doorStates[0]).toEqual({ id: 'boss-door', broken: true, brokenBy: 'kick', open: false });
    scenes.clear();
  });

  it('knocking the dummy into it with the heavy finisher smashes it (heavy knockback)', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    scene.respawnDummy({ x: DOOR.x0 - 1.4, y: DOOR_Y }); // between the player and the door
    // Line up with the dummy (between the player and the door, on the door's row).
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > scene.dummy.x - 1.1);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.2);
    // Full combo, staying close as the light hits nudge the dummy.
    intents.setMove('t', { x: 0.4, y: 0 });
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'jab');
    run(0.1);
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'hook');
    run(0.1);
    intents.pressMelee();
    runUntil(() => scene.player.attack === 'heavy');
    intents.setMove('t', { x: 0, y: 0 });
    runUntil(() => scene.doorStates[0]!.broken, 3);
    expect(scene.doorStates[0]!.brokenBy).toBe('knockback');
    expect(scene.player.hits).toBe(3);
    scenes.clear();
  });

  it('standing still and pressing three times lands all three strikes on the dummy', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    const dummyAt = { x: DOOR.x0 - 1.4, y: DOOR_Y };
    scene.respawnDummy(dummyAt);
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > scene.dummy.x - 1.15);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.3);
    for (const step of ['jab', 'hook', 'heavy']) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === step, 1.5);
      expect(scene.player.attack).toBe(step);
      run(0.15);
    }
    run(0.6);
    expect(scene.player.hits).toBe(3);
    expect(scene.dummy.speed + Math.abs(scene.dummy.x - dummyAt.x)).toBeGreaterThan(1); // the finisher sent it flying
    scenes.clear();
  });

  it('the camera glides with the player into the boss room (no hard cut)', async () => {
    const { intents, scene, scenes, run, runUntil, walkToDoor } = await setup();
    scene.respawnDummy({ x: 3, y: 1.9 }); // out of the way: these tests hit the door directly
    walkToDoor();
    intents.setMove('t', { x: -1, y: 0 });
    run(0.15);
    intents.setMove('t', { x: 1, y: 0 });
    intents.pressJump();
    run(0.1);
    intents.pressMelee();
    run(0.5);
    expect(scene.doorStates[0]!.broken).toBe(true);
    let prev = scene.cameraState!.x;
    let maxStep = 0;
    runUntil(() => scene.player.x > DOOR.x1 + 2, 4);
    intents.setMove('t', { x: 0, y: 0 }); // stop inside the boss room (not run on into the far wall)
    for (let i = 0; i < 60; i++) {
      run(STEP);
      maxStep = Math.max(maxStep, Math.abs(scene.cameraState!.x - prev));
      prev = scene.cameraState!.x;
    }
    expect(scene.player.x).toBeGreaterThan(DOOR.x1 + 1.5);
    // Looking into the boss room: the camera has followed right (to the arena edge clamp) and the player is well in view.
    const cam = scene.cameraState!;
    expect(cam.x).toBeGreaterThan(iso(OFFICE.playerStart.x, OFFICE.playerStart.y).x + 6 * ISO_C);
    expect(iso(scene.player.x, scene.player.y).x).toBeLessThan(cam.x + 640 / cam.scale - 1); // in view (2.5D, TD-045)
    expect(maxStep).toBeLessThan(0.3); // smooth: no jump between frames
    scenes.clear();
  });
});
