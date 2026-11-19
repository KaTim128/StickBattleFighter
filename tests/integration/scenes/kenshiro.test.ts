import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup() {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 15, y: 13 }, dummyStart: { x: 16.2, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'kenshiro' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.2);
  return { intents, scene, scenes, run };
}

/** The scene's one hit path, reached the way an opponent's blow would reach it. */
type Strikes = {
  fighters: {
    name: string;
    body?: { setTranslation(p: { x: number; y: number }, w: boolean): void };
    combatant: { hp: number; stunnedS?: number; masteryStacks: number; state: string };
  }[];
  applyStrike(a: unknown, t: unknown, s: object): boolean;
};
const blow = { damage: 40, heavy: false, knockbackMps: 2, dir: { x: -1, y: 0 }, melee: true, impact: 'knuckle-heavy' };

describe('Kenshiro in the arena (spec section 4)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a Perfect Parry deflects an attack from the front, answers it with a counter and builds mastery', async () => {
    const { intents, scene, scenes, run } = await setup();
    const s = scene as unknown as Strikes;
    const me = (scene as unknown as { playerFighter: Strikes['fighters'][number] }).playerFighter;
    const foe = s.fighters.find((f) => f !== me)!;
    intents.pressAbility('a2');
    run(0.25);
    const hpBefore = me.combatant.hp;
    const foeBefore = foe.combatant.hp;
    // The dummy swings at him from his front (he faces +x, the dummy stands at +x).
    expect(s.applyStrike(foe, me, blow)).toBe(true);
    expect(me.combatant.hp).toBe(hpBefore); // nothing got through
    expect(foe.combatant.hp).toBeLessThan(foeBefore); // the counter landed
    expect(me.combatant.masteryStacks).toBe(3);
    // The stance is spent: the next blow lands.
    run(1.2);
    expect(s.applyStrike(foe, me, blow)).toBe(true);
    expect(me.combatant.hp).toBeLessThan(hpBefore);
    scenes.clear();
  });

  it('without the stance a blow lands as normal, and a parry that is not up in time is just a wasted stance', async () => {
    const { intents, scene, scenes, run } = await setup();
    const s = scene as unknown as Strikes;
    const me = (scene as unknown as { playerFighter: Strikes['fighters'][number] }).playerFighter;
    const foe = s.fighters.find((f) => f !== me)!;
    const hp = me.combatant.hp;
    s.applyStrike(foe, me, blow);
    expect(me.combatant.hp).toBeLessThan(hp);
    expect(me.combatant.masteryStacks).toBe(0);
    run(2);
    intents.pressAbility('a2');
    run(1.5); // the stance has come and gone with nobody swinging
    const hp2 = me.combatant.hp;
    s.applyStrike(foe, me, blow);
    expect(me.combatant.hp).toBeLessThan(hp2);
    expect(me.combatant.masteryStacks).toBe(0);
    scenes.clear();
  });
});
