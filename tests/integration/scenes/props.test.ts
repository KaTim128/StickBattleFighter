import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import type { PropPlacement } from '../../../src/data/objects/props';
import { MATERIAL_TOUGHNESS } from '../../../src/data/objects/props';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** A small room: the player at (5, 5) facing right, with one test prop set in front; the dummy far away. */
function room(props: PropPlacement[]): ArenaLayout {
  return {
    ...TRAINING_YARD,
    id: 'prop-room',
    widthM: 16,
    heightM: 11,
    props,
    playerStart: { x: 5, y: 5 },
    dummyStart: { x: 14, y: 9.5 },
  };
}

async function setup(props: PropPlacement[]) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    room(props),
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
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
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  const prop = (kind: string) => scene.propStates.find((p) => p.kind === kind)!;
  /** Press once per strike, like a player, through the 1-2-3 combo. */
  const combo = (strikes = 3) => {
    const order = ['jab', 'hook', 'heavy'];
    for (let i = 0; i < strikes; i++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack === order[i], 1.5);
      run(0.12);
    }
    run(0.8);
  };
  /** Step up to the (possibly shoved) prop again. */
  const approach = () => {
    intents.setMove('t', { x: 1, y: 0 });
    run(0.5);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.2);
  };
  run(0.2);
  return { intents, scene, scenes, run, runUntil, prop, combo, approach };
}

describe('furniture moves or breaks depending on durability (owner, 11/11/2026)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a jab shoves a chair without breaking it; it then settles and is planted again', async () => {
    const { scenes, run, prop, combo } = await setup([{ kind: 'office-chair', x: 6.1, y: 5 }]);
    const before = prop('office-chair');
    combo(1);
    const after = prop('office-chair');
    expect(after.broken).toBe(false);
    expect(after.hp).toBe(60 - 40);
    expect(after.x).toBeGreaterThan(before.x + 0.05); // pushed away from the player
    run(3);
    expect(prop('office-chair').awake).toBe(false); // settled and planted again
    scenes.clear();
  });

  it('jab then hook breaks the chair (60 durability) into pieces, clearing the way', async () => {
    const { intents, scene, scenes, run, runUntil, prop, combo } = await setup([
      { kind: 'office-chair', x: 6.1, y: 5 },
    ]);
    combo(2);
    expect(prop('office-chair').broken).toBe(true);
    expect(scene.props!.debris.pieces.length).toBeGreaterThanOrEqual(3);
    // Nothing solid left: the player can walk through where it stood.
    intents.setMove('t', { x: 1, y: 0 });
    runUntil(() => scene.player.x > 6.8, 2);
    expect(scene.player.x).toBeGreaterThan(6.8);
    run(0.1);
    scenes.clear();
  });

  it('office tables are tough (owner): one full combo does not break one, a second does; the keyboard on it falls', async () => {
    const { scene, scenes, run, prop, combo, approach } = await setup([
      { kind: 'desk', x: 6.6, y: 5 },
      { kind: 'keyboard', x: 7.0, y: 5.1, elevationM: 0.75, sortY: 5.4 }, // out of the fists' reach
    ]);
    combo(3); // 240 damage
    expect(prop('desk').broken).toBe(false);
    scene.drainSounds();
    approach();
    combo(3);
    expect(prop('desk').broken).toBe(true);
    expect(scene.drainSounds()).toContain('break-wood');
    const kb = scene.props!.props.find((p) => p.placement.kind === 'keyboard')!;
    expect(kb.looseFall).not.toBeNull();
    run(1);
    expect(kb.looseFall!.heightM).toBe(0); // on the floor
    scenes.clear();
  });

  it('a punch shatters the monitor on a desk into glass shards (owner: computers are breakable)', async () => {
    const { scene, scenes, prop, combo } = await setup([
      { kind: 'desk', x: 6.6, y: 5 },
      { kind: 'computer', x: 6.0, y: 4.85, elevationM: 0.75, sortY: 5.4 }, // near the desk's edge, in reach
    ]);
    scene.drainSounds();
    combo(1);
    expect(prop('computer').broken).toBe(true);
    expect(prop('desk').broken).toBe(false);
    expect(scene.props!.debris.pieces.some((p) => p.shape === 'shard')).toBe(true);
    expect(scene.drainSounds()).toContain('break-glass');
    scenes.clear();
  });

  it('a desk item that survives a blow is knocked off the desk', async () => {
    const { scene, scenes, run } = await setup([
      { kind: 'desk', x: 6.6, y: 5 },
      { kind: 'mouse', x: 6.6, y: 5, elevationM: 0.75, sortY: 5.4 },
    ]);
    scene.props!.hitWhere(() => true, { blow: 'strike', damage: 1, strength: 150, direction: { x: 1, y: 0 } });
    const mouse = scene.props!.props.find((p) => p.placement.kind === 'mouse')!;
    expect(mouse.broken).toBe(false);
    expect(mouse.looseFall).not.toBeNull();
    run(1);
    expect(mouse.looseFall!.heightM).toBe(0);
    scenes.clear();
  });

  it('desk items ride along when the desk is shoved', async () => {
    const { scenes, prop, combo } = await setup([
      { kind: 'desk', x: 6.6, y: 5 },
      { kind: 'computer', x: 6.6, y: 4.85, elevationM: 0.75, sortY: 5.4 },
    ]);
    const desk0 = prop('desk');
    const mon0 = prop('computer');
    combo(1);
    const desk1 = prop('desk');
    const mon1 = prop('computer');
    expect(desk1.x - desk0.x).toBeGreaterThan(0.02);
    expect(mon1.x - mon0.x).toBeCloseTo(desk1.x - desk0.x, 2);
    scenes.clear();
  });

  it('a steel drawer pedestal is hard to break (metal takes 45% of each blow), rings when hit and breaks with sparks (owner)', async () => {
    const { intents, scene, scenes, run, runUntil, prop, combo } = await setup([{ kind: 'drawer-unit', x: 6.0, y: 5 }]);
    scene.drainSounds();
    combo(3); // 240 of damage, of which steel takes 45%
    const d = prop('drawer-unit');
    expect(d.broken).toBe(false);
    expect(d.hp).toBeCloseTo(260 - 240 * MATERIAL_TOUGHNESS.metal, 6);
    expect(scene.drainSounds()).toContain('hit-metal');
    // It takes more full 1-2-3 combos than wood would (a 260-point wooden prop goes in two).
    let more = 0;
    while (!prop('drawer-unit').broken && more < 8) {
      // Walk up to wherever the shoved drawer is now, then go again.
      runUntil(() => {
        const t = prop('drawer-unit');
        const dx = t.x - scene.player.x;
        const dy = t.y - scene.player.y;
        const d = Math.hypot(dx, dy);
        intents.setMove('t', d > 0.75 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 });
        return d <= 0.75;
      }, 3);
      intents.setMove('t', { x: 0, y: 0 });
      run(0.1);
      combo(3);
      more++;
    }
    expect(prop('drawer-unit').broken).toBe(true);
    expect(1 + more).toBeGreaterThanOrEqual(3);
    expect(scene.drainSounds()).toContain('break-metal');
    run(0.2);
    scenes.clear();
  });

  it('a steel filing cabinet is very tough (450, metal) but still moves under heavy blows', async () => {
    const { scenes, prop, combo } = await setup([{ kind: 'cabinet', x: 6.2, y: 5 }]);
    const x0 = prop('cabinet').x;
    combo(3);
    const c = prop('cabinet');
    expect(c.broken).toBe(false);
    expect(c.hp).toBeCloseTo(450 - 240 * MATERIAL_TOUGHNESS.metal, 6);
    expect(c.x).toBeGreaterThan(x0 + 0.05);
    scenes.clear();
  });

  it('walking into a desk does not shove it (furniture is planted until struck)', async () => {
    const { intents, scenes, run, prop } = await setup([{ kind: 'desk', x: 6.6, y: 5 }]);
    const x0 = prop('desk').x;
    intents.setMove('t', { x: 1, y: 0 });
    run(1.5);
    expect(prop('desk').x).toBeCloseTo(x0, 5);
    expect(prop('desk').awake).toBe(false);
    scenes.clear();
  });
});
