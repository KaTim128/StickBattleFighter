import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { THROWING } from '../../../src/data/combat/throwing';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** A plain room: an office chair just ahead of the player, a desk with a monitor further on, the dummy beyond. */
const ROOM: ArenaLayout = {
  ...OFFICE,
  id: 'throw-room',
  widthM: 14,
  heightM: 8,
  windows: [],
  floorZones: [],
  interiorWalls: [],
  doors: [],
  props: [
    { kind: 'office-chair', x: 4.2, y: 4 },
    { kind: 'desk', x: 4, y: 6.6 },
    { kind: 'computer', x: 4, y: 6.45, elevationM: 0.75, sortY: 7.01 },
  ],
  playerStart: { x: 3.4, y: 4 },
  dummyStart: { x: 8.5, y: 4 },
};

async function setup(arena: ArenaLayout = ROOM, player = 'base-stickman') {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(arena, new Container(), intents, () => ({ width: 1280, height: 720 }), false, {
    player,
  });
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
  const tap = () => {
    intents.interactPress();
    run(STEP * 2);
    intents.interactRelease();
    run(STEP * 2);
  };
  const chair = () => scene.propStates.find((p) => p.kind === 'office-chair')!;
  /** Grab it, then wait while it is heaved up overhead (heavier takes longer, owner 12/11/2026). */
  const pickUp = () => {
    tap();
    runUntil(() => !scene.player.lifting, 2);
  };
  return { intents, scene, scenes, run, runUntil, tap, pickUp, chair };
}

describe('pick up, carry and throw (Phase 7, REQ-PHY-8..10)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('near a throwable object the utility action is "pick up"; pressing lifts it overhead and it follows the fighter', async () => {
    const { intents, scene, scenes, run, tap, chair } = await setup();
    run(0.1);
    expect(scene.player.utility).toBe('pickup');
    tap();
    expect(scene.player.carrying).toBe('office-chair');
    expect(scene.player.utility).toBe('throw');
    intents.setMove('t', { x: 0, y: 1 });
    run(0.5);
    intents.setMove('t', { x: 0, y: 0 });
    expect(Math.abs(chair().y - scene.player.y)).toBeLessThan(0.1); // carried along
    scenes.clear();
  });

  it('hands full: melee and abilities do nothing while carrying, and carrying a chair slows walking', async () => {
    const { intents, scene, scenes, run, tap } = await setup();
    run(0.1);
    tap();
    intents.pressMelee();
    run(0.2);
    expect(scene.player.attack).toBeNull();
    intents.setMove('t', { x: 0, y: -1 });
    run(1);
    const carrying = scene.player.speed;
    expect(carrying).toBeLessThan(5 * THROWING.carrySpeedFactor(12) + 0.05);
    intents.setMove('t', { x: 0, y: 0 });
    scenes.clear();
  });

  it('a short press throws it at the target: it flies, hits and hurts the dummy, then lands and is furniture again', async () => {
    const { scene, scenes, run, runUntil, tap, pickUp, chair } = await setup();
    run(0.1);
    pickUp();
    tap(); // throw
    expect(scene.player.carrying).toBeNull();
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    run(3);
    const c = chair();
    expect(c.x).toBeGreaterThan(5); // travelled toward the dummy
    expect(c.awake).toBe(false); // came to rest and was planted again
    scenes.clear();
  });

  it('holding the button while carrying puts the object down instead of throwing it', async () => {
    const { intents, scene, scenes, run, pickUp, chair } = await setup();
    run(0.1);
    pickUp();
    intents.interactPress();
    run(THROWING.dropHoldS + 0.1);
    expect(scene.player.carrying).toBeNull();
    intents.interactRelease();
    run(2);
    expect(scene.dummy.hp).toBe(1000);
    expect(Math.abs(chair().x - scene.player.x)).toBeLessThan(1.5); // set down nearby
    scenes.clear();
  });

  it('a monitor grabbed off a desk and thrown into a wall shatters (glass)', async () => {
    const { intents, scene, scenes, run, runUntil, tap } = await setup();
    scene.respawnDummy({ x: 1, y: 1 }); // out of the way
    // Walk down to the desk and grab the monitor from it.
    intents.setMove('t', { x: 0, y: 1 });
    runUntil(() => scene.player.y > 5.75, 3);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.2);
    expect(scene.player.utility).toBe('pickup');
    tap();
    expect(scene.player.carrying).toBe('computer');
    // Throw it hard to the right, into the far wall (the dummy is behind, so it goes where we face).
    intents.setMove('t', { x: 1, y: 0 });
    run(0.15);
    intents.interactPress();
    run(STEP * 2);
    intents.interactRelease();
    intents.setMove('t', { x: 0, y: 0 });
    run(3);
    expect(scene.propStates.find((p) => p.kind === 'computer')!.broken).toBe(true);
    scenes.clear();
  });

  it('heavier objects take longer to lift (owner, 12/11/2026): rooted while heaving it up, no throw until it is overhead', async () => {
    expect(THROWING.liftTimeFor(0.3)).toBe(0); // a mug comes up at once
    expect(THROWING.liftTimeFor(12)).toBeLessThan(THROWING.liftTimeFor(40));
    expect(THROWING.liftTimeFor(40)).toBeLessThan(THROWING.liftTimeFor(60));
    const { intents, scene, scenes, run, tap } = await setup();
    run(0.1);
    tap();
    expect(scene.player.carrying).toBe('office-chair');
    expect(scene.player.lifting).toBe(true);
    const x0 = scene.player.x;
    intents.setMove('t', { x: 0, y: 1 });
    run(0.1);
    expect(Math.abs(scene.player.x - x0) + Math.abs(scene.player.y - 4)).toBeLessThan(0.02); // rooted
    tap(); // a press while lifting does not throw
    expect(scene.player.carrying).toBe('office-chair');
    intents.setMove('t', { x: 0, y: 0 });
    let liftedAfterS = 0.17 + STEP * 2; // time already spent lifting above: the taps and the 0.1 s rooted check
    while (scene.player.lifting && liftedAfterS < 2) {
      run(STEP);
      liftedAfterS += STEP;
    }
    expect(scene.player.lifting).toBe(false);
    expect(liftedAfterS).toBeGreaterThan(THROWING.liftTimeFor(12) - 0.1);
    scenes.clear();
  });

  it('the touch utility button still jumps when there is nothing to grab', async () => {
    const { intents, scene, scenes, run } = await setup({ ...ROOM, props: [] });
    run(0.1);
    expect(scene.player.utility).toBe('jump');
    intents.interactPress(true);
    run(0.15);
    intents.interactRelease();
    expect(scene.player.airborne).toBe(true);
    scenes.clear();
  });

  it('each fighter lifts up to its own limit (Stats Profile objects.maxLiftKg, Phase 7 slice 2)', async () => {
    const { scene, scenes, run } = await setup();
    run(0.1);
    expect(scene.player.utility).toBe('pickup'); // a 12 kg chair: fine for the default 15 kg limit
    Object.assign(scene.playerFighter.def.objects, { maxLiftKg: 5 });
    expect(scene.player.utility).toBe('jump'); // too heavy now
    scenes.clear();
  });

  it('while carrying, the aim indicator points at the target and lands within the throw range', async () => {
    const { scene, scenes, run, tap } = await setup();
    run(0.1);
    tap();
    const aim = scene.throwAim!;
    expect(aim).not.toBeNull();
    const toDummy = Math.atan2(scene.dummy.y - aim.from.y, scene.dummy.x - aim.from.x);
    const toLanding = Math.atan2(aim.to.y - aim.from.y, aim.to.x - aim.from.x);
    expect(Math.abs(toDummy - toLanding)).toBeLessThan(0.05);
    const reach = Math.hypot(aim.to.x - aim.from.x, aim.to.y - aim.from.y);
    expect(reach).toBeGreaterThan(3);
    expect(reach).toBeLessThan(12);
    scenes.clear();
  });

  it("Inferno's throws catch fire: the chair hits the dummy and sets it alight", async () => {
    const { scene, scenes, run, runUntil, tap, pickUp } = await setup(ROOM, 'inferno');
    run(0.1);
    pickUp();
    tap();
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.dummy.burning).toBe(true);
    scenes.clear();
  });

  it('a fire extinguisher bursts into foam when it breaks', async () => {
    const { scene, scenes, run, tap, pickUp, runUntil } = await setup({
      ...ROOM,
      props: [{ kind: 'fire-extinguisher', x: 4.0, y: 4 }],
      dummyStart: { x: 1, y: 1 },
    });
    run(0.1);
    pickUp(); // pick it up
    expect(scene.player.carrying).toBe('fire-extinguisher');
    scene.drainSounds();
    tap(); // throw it into the far wall (it is metal: it may need more than one landing)
    const broke = () => scene.propStates.find((p) => p.kind === 'fire-extinguisher')!.broken;
    runUntil(broke, 3);
    // Not every throw breaks steel; hit it until it does.
    for (let i = 0; i < 12 && !broke(); i++) {
      scene.props!.hitWhere(() => true, { blow: 'kick', damage: 60, strength: 200, direction: { x: 1, y: 0 } });
      run(0.05);
    }
    expect(broke()).toBe(true);
    run(0.1);
    expect(scene.drainSounds()).toContain('foam-burst');
    scenes.clear();
  });
});
