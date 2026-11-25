import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { COLOSSEUM } from '../../../src/data/arenas/colosseum';
import { footprint } from '../../../src/data/objects/props';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** The drawn node of the arena's first prop (the scene keeps its view private). */
function propAlpha(scene: FightArenaScene): number {
  return (scene as unknown as { view: { props: Map<number, { alpha: number }> } }).view.props.get(0)!.alpha;
}

/** Props stay opaque and solid; they fade only while they hide a fighter standing behind them, and collision never changes. */
describe('prop depth fading and collision', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  async function setup(startOffset: { x: number; y: number }) {
    // One column in the open middle of the Colosseum (the ruins around the rim sit close to the wall and leave no room to stand behind them).
    const prop = {
      ...COLOSSEUM.props.find((p) => p.kind === 'column-stub')!,
      x: COLOSSEUM.widthM / 2,
      y: COLOSSEUM.heightM / 2,
    };
    const intents = new PlayerIntents();
    const arena = {
      ...COLOSSEUM,
      props: [prop],
      playerStart: { x: prop.x + startOffset.x, y: prop.y + startOffset.y },
      dummyStart: { x: prop.x + 30, y: prop.y + 30 },
    } as never;
    const scene = new FightArenaScene(arena, new Container(), intents, () => ({ width: 1280, height: 720 }), false, {
      player: 'rampage',
    });
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const run = (s: number) => {
      for (let i = 0; i < Math.round(s / STEP); i++) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
    };
    return { prop, scene, scenes, run, intents };
  }

  it('is opaque with nobody near, fades when a fighter stands right behind it, and returns to opaque when they move away', async () => {
    const far = await setup({ x: -8, y: 3 });
    far.run(0.6);
    expect(propAlpha(far.scene)).toBe(1);
    far.scenes.clear();
    // Behind the prop (the camera looks in from the south-east, so smaller x + y is behind it) and overlapping it on screen.
    const behind = await setup({ x: -1.6, y: -1.6 });
    behind.run(0.8);
    expect(propAlpha(behind.scene)).toBeLessThan(0.9);
    // Walk away: it fades back in.
    behind.intents.setMove('t', { x: -1, y: 1 });
    behind.run(2.5);
    behind.intents.setMove('t', { x: 0, y: 0 });
    behind.run(0.8);
    expect(propAlpha(behind.scene)).toBe(1);
    behind.scenes.clear();
  }, 120_000);

  it('keeps blocking while it is see-through', async () => {
    const t = await setup({ x: -3, y: -3 });
    const f = footprint(t.prop);
    t.intents.setMove('t', { x: 1, y: 1 }); // walks into it from directly behind, along the camera line
    let faded = false;
    for (let i = 0; i < 60 * 5; i++) {
      t.run(STEP);
      if (propAlpha(t.scene) < 0.9) faded = true;
    }
    expect(faded).toBe(true);
    const p = t.scene.playerFighter;
    expect(p.x + p.y).toBeLessThan(t.prop.x + t.prop.y); // still on the near side: never got through it
    expect(f.w).toBeGreaterThan(0);
    t.scenes.clear();
  }, 120_000);
});
