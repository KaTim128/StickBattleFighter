import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup() {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 10, y: 13 }, dummyStart: { x: 11.2, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'rampage' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (n: number) => {
    for (let i = 0; i < n; i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(12);
  const grabbing = () => scene.abilities!.world.grabOutcome(scene.playerFighter.name)?.state === 'hold';
  intents.pressAbility('a4');
  for (let n = 0; n < 200 && !grabbing(); n++) run(1);
  return { scene, scenes, run, grabbing };
}

/** Master plan Phase 1 B9: no jitter in Titan's grab, and a push does not break it. */
describe("Titan's Grapple Slam (B9)", () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('holds the target smoothly: no back-and-forth, no big jumps, never touching his body', async () => {
    const { scene, scenes, run, grabbing } = await setup();
    const titan = scene.playerFighter;
    const held = scene.dummyFighter;
    const dist: number[] = [];
    while (grabbing() && dist.length < 120) {
      dist.push(Math.hypot(held.x - titan.x, held.y - titan.y));
      run(1);
    }
    expect(dist.length).toBeGreaterThan(15);
    const steps = dist.slice(1).map((v, i) => v - dist[i]!);
    const reversals = steps
      .slice(1)
      .filter((v, i) => Math.sign(v) !== Math.sign(steps[i]!) && Math.abs(v) > 0.002).length;
    expect(reversals).toBe(0); // it was 10 reversals and a 0.5 m jump in one frame
    expect(Math.max(...steps.map(Math.abs))).toBeLessThan(0.2);
    // Held a hair off his body, never pressed into it.
    expect(Math.min(...dist)).toBeGreaterThan(titan.def.body.footRadiusM + held.def.body.footRadiusM);
    scenes.clear();
  });

  it('a hard shove on Titan (like a dash) moves him but the target stays held, and the slam still lands', async () => {
    const { scene, scenes, run, grabbing } = await setup();
    const titan = scene.playerFighter;
    const held = scene.dummyFighter;
    run(8);
    const before = { x: titan.x, y: titan.y };
    const hp = held.combatant.hp;
    (scene as unknown as { applyStrike(a: FighterEntity, t: FighterEntity, s: object): boolean }).applyStrike(
      held,
      titan,
      {
        damage: 60,
        heavy: false,
        knockbackMps: 12,
        dir: { x: -1, y: 0 },
        melee: false,
        impact: 'fire',
        stunS: 0.4,
      },
    );
    let followed = true;
    for (let i = 0; i < 20 && grabbing(); i++) {
      run(1);
      if (grabbing() && Math.hypot(held.x - titan.x, held.y - titan.y) > 2) followed = false;
    }
    expect(Math.hypot(titan.x - before.x, titan.y - before.y)).toBeGreaterThan(0.8); // he was pushed
    expect(followed).toBe(true); // and still holds on to the target
    run(40);
    expect(held.combatant.hp).toBeLessThan(hp - 100); // the slam still happened
    scenes.clear();
  });
});
