import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(props: { kind: string; x: number; y: number }[]) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, props, playerStart: { x: 10, y: 13 }, dummyStart: { x: 16, y: 13 } } as never,
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'psion' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (s: number) => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.3);
  return { intents, scene, scenes, run };
}

describe('Psion Telekinetic Toss (PS1)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Toss with nothing in reach is refused and spends nothing', async () => {
    const { intents, scene, scenes, run } = await setup([]);
    const stamina = scene.playerFighter.combatant.stamina;
    intents.pressAbility('a2');
    run(0.3);
    expect(scene.lastAbilityBlock).toBe('noObject');
    expect(scene.playerFighter.combatant.stamina).toBeGreaterThanOrEqual(stamina - 0.001);
    expect(scene.playerFighter.caster!.cooldown('a2')).toBe(0);
    expect(scene.drainEvents().some((e) => e.kind === 'noObject')).toBe(true);
    scenes.clear();
  });

  it('Toss leaves a chair where it is, raises it straight up on its own spot, then throws it into the foe (damage only on the collision)', async () => {
    const { intents, scene, scenes, run } = await setup([{ kind: 'office-chair', x: 12, y: 13.4 }]);
    const chair = scene.props!.states.find((p) => p.kind === 'office-chair')!;
    const x0 = chair.x;
    const y0 = chair.y;
    run(0.5);
    const idle = scene.props!.states.find((p) => p.kind === 'office-chair')!;
    expect([idle.x, idle.y]).toEqual([x0, y0]); // stays put until he controls it
    intents.pressAbility('a2');
    run(0.55);
    expect(scene.playerFighter.carrying).toBeNull(); // no hand lift: he carries nothing
    const rising = scene.props!.states.find((p) => p.kind === 'office-chair')!;
    expect(Math.hypot(rising.x - x0, rising.y - y0)).toBeLessThan(0.05); // straight up from its own spot
    expect(scene.dummy.hp).toBe(1000); // rising does no damage
    run(3);
    expect(scene.dummy.hp).toBeLessThan(1000);
    scenes.clear();
  });

  it('the heavier the object, the slower it rises before it is thrown (a chair is quick, a stone block takes about twice as long)', async () => {
    const timeToThrow = async (kind: string): Promise<number> => {
      const { intents, scene, scenes, run } = await setup([{ kind, x: 12, y: 13.4 }]);
      intents.pressAbility('a2');
      let steps = 0;
      for (; steps < 60 * 6; steps++) {
        run(STEP);
        const p = scene.props!.props.find((q) => q.placement.kind === kind)!;
        if (p.flight !== null) break;
      }
      scenes.clear();
      return steps * STEP;
    };
    const chair = await timeToThrow('office-chair');
    const block = await timeToThrow('stone-block');
    expect(chair).toBeLessThan(1.1);
    expect(block).toBeGreaterThan(chair + 0.5);
    expect(block).toBeLessThan(3); // but never slow to the point of uselessness
  }, 60_000);
});
