import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import {
  COLOSSEUM,
  COLOSSEUM_KEEP_OUT_M,
  COLOSSEUM_PROP_CLEARANCE_M,
  COLOSSEUM_RADIUS_M,
} from '../../../src/data/arenas/colosseum';
import { footprint } from '../../../src/data/objects/props';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const C = COLOSSEUM.widthM / 2;
const RUINS = ['column-piece', 'column-stub', 'roman-column-fallen', 'broken-arch', 'stone-block'] as const;

async function setup(player: string, props = COLOSSEUM.props, opponent = 'training-dummy') {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...COLOSSEUM, props } as never,
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player, opponent },
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
  return { intents, scene, scenes, run };
}

/** The Colosseum is a closed, solid arena (owner, 25/11/2026): nobody walks onto or past its wall, whatever moves them. */
describe('the Colosseum boundary', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the ring of walls stands just in front of the wall base, and no ruin comes near it', () => {
    for (const w of COLOSSEUM.interiorWalls ?? []) {
      const d = Math.hypot((w.x0 + w.x1) / 2 - C, (w.y0 + w.y1) / 2 - C);
      expect(d).toBeGreaterThan(COLOSSEUM_RADIUS_M - COLOSSEUM_KEEP_OUT_M);
    }
    for (const p of COLOSSEUM.props) {
      const f = footprint(p);
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          expect(
            Math.hypot(p.x + (sx * f.w) / 2 - C, p.y + (sy * f.d) / 2 - C),
            `${p.kind} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          ).toBeLessThanOrEqual(COLOSSEUM_RADIUS_M - COLOSSEUM_PROP_CLEARANCE_M + 1e-6);
    }
  });

  it.each(['psion', 'rampage'])(
    '%s and the dummy cannot be driven through or over the wall, at any angle or knock speed',
    async (who) => {
      const { scene, scenes, run } = await setup(who);
      const limit = COLOSSEUM_RADIUS_M - COLOSSEUM_KEEP_OUT_M;
      for (const speed of [25, 80]) {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + 0.2;
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          for (const f of [scene.playerFighter, scene.dummyFighter]) {
            f.placeAt({ x: C + ux * 11, y: C + uy * 11 });
            f.body!.setLinvel({ x: ux * speed, y: uy * speed }, true);
            f.knockFlightS = 1;
            let maxR = 0;
            for (let i = 0; i < 80; i++) {
              run(1);
              maxR = Math.max(maxR, Math.hypot(f.x - C, f.y - C));
            }
            expect(maxR, `${f.name} at ${speed} m/s, angle ${k}`).toBeLessThan(limit);
          }
        }
      }
      scenes.clear();
    },
    120_000,
  );

  it('walking and jumping at the wall from any side stops short of it, over ruins and open floor alike', async () => {
    const { intents, scene, scenes, run } = await setup('psion');
    const limit = COLOSSEUM_RADIUS_M - COLOSSEUM_KEEP_OUT_M;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const f = scene.playerFighter;
      f.placeAt({ x: C + ux * 9, y: C + uy * 9 });
      let maxR = 0;
      for (let i = 0; i < 60 * 4; i++) {
        intents.setMove('t', { x: ux, y: uy });
        if (i % 30 === 0) intents.pressJump();
        run(1);
        maxR = Math.max(maxR, Math.hypot(f.x - C, f.y - C));
      }
      expect(maxR, `angle ${k}`).toBeLessThan(limit);
    }
    scenes.clear();
  }, 120_000);

  it('a fighter that somehow ends up beyond the circle (even inside the bounding box) is put back on the floor', async () => {
    const { scene, scenes, run } = await setup('shroud');
    const f = scene.playerFighter;
    f.placeAt({ x: 1.2, y: 1.2 }); // a corner of the square: outside the round wall
    run(6);
    expect(Math.hypot(f.curr.x - C, f.curr.y - C)).toBeLessThan(COLOSSEUM_RADIUS_M - COLOSSEUM_KEEP_OUT_M);
    scenes.clear();
  });
});

/** Pillars, columns, arch pieces and blocks can be carried (owner, 25/11/2026): by Titan, and lifted by Psion's Telekinetic Toss. */
describe('the Colosseum ruins can be lifted', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it.each(RUINS)(
    'Titan picks up and carries a %s',
    async (kind) => {
      const { intents, scene, scenes, run } = await setup('rampage', [{ kind, x: C - 1.6, y: C + 3 }] as never);
      const t = scene.playerFighter;
      t.placeAt({ x: C - 3.2, y: C + 3 });
      t.faceToward(1, 0);
      run(10);
      intents.interactPress();
      run(2);
      intents.interactRelease();
      for (let i = 0; i < 180 && scene.player.lifting; i++) run(1);
      expect(scene.player.carrying).toBe(kind);
      scenes.clear();
    },
    60_000,
  );

  it.each(RUINS)(
    'Psion raises a %s with Telekinetic Toss',
    async (kind) => {
      const { intents, scene, scenes, run } = await setup('psion', [{ kind, x: C - 1.6, y: C + 3 }] as never);
      scene.playerFighter.placeAt({ x: C - 4, y: C + 3 });
      run(12);
      intents.pressAbility('a2');
      let lifted = false;
      for (let i = 0; i < 150 && !lifted; i++) {
        run(1);
        const p = scene.props!.props.find((q) => q.placement.kind === kind)!;
        lifted = p.held !== null || p.flight !== null;
      }
      expect(scene.lastAbilityBlock).not.toBe('noObject');
      expect(lifted).toBe(true); // taken off the ground by his mind, then thrown
      scenes.clear();
    },
    60_000,
  );

  it('an ordinary fighter still cannot lift a heavy ruin', async () => {
    const { intents, scene, scenes, run } = await setup('shroud', [
      { kind: 'column-stub', x: C - 1.6, y: C + 3 },
    ] as never);
    scene.playerFighter.placeAt({ x: C - 3.2, y: C + 3 });
    scene.playerFighter.faceToward(1, 0);
    run(10);
    intents.interactPress();
    run(2);
    intents.interactRelease();
    run(60);
    expect(scene.player.carrying).toBeNull();
    scenes.clear();
  }, 60_000);
});
