import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { formatTimer } from '../../../src/interface/top-hud';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Inferno in the training yard, a given spot from the dummy at (19, 13). */
async function setup(at = { x: 17.95, y: 13 }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene({ ...TRAINING_YARD, playerStart: at }, new Container(), intents, () => ({
    width: 1280,
    height: 720,
  }));
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
  run(0.2);
  scene.drainEvents();
  return { intents, scene, scenes, run, runUntil };
}

describe('Phase 8 presentation targets (PRS-4, 5, 6, 8, 10)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('PRS-4: chained hits call out "N HIT COMBO"; a swing at nobody near calls MISS', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    const kinds: { kind: string; amount: number }[] = [];
    const collect = () => kinds.push(...scene.drainEvents().map((e) => ({ kind: e.kind, amount: e.amount })));
    for (const step of ['jab', 'straight', 'hook']) {
      intents.pressMelee();
      runUntil(() => {
        collect();
        return scene.player.attack === step;
      }, 1.5);
      run(0.15);
      collect();
    }
    run(0.4);
    collect();
    const combos = kinds.filter((k) => k.kind === 'combo').map((k) => k.amount);
    expect(combos).toContain(2);
    expect(combos).toContain(3);
    scenes.clear();

    // A whiff with the dummy close by (but out of reach) is a MISS.
    const far = await setup({ x: 17.0, y: 13 });
    far.intents.pressMelee();
    far.run(0.5);
    expect(far.scene.drainEvents().some((e) => e.kind === 'miss')).toBe(true);
    far.scenes.clear();
  });

  it('PRS-10: the top HUD shows both fighters, the clock and the last action by name', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 });
    const hud0 = scene.topHud;
    expect(hud0.left.name).toBe('Inferno');
    expect(hud0.left.portrait).toBe('flame');
    expect(hud0.right.portrait).toBe('round');
    expect(hud0.left.hp).toBe(hud0.left.maxHp);
    intents.pressAbility('a1');
    run(1.5);
    const hud = scene.topHud;
    expect(hud.lastAction).toBe('Fireball');
    expect(hud.right.hp).toBeLessThan(hud.right.maxHp);
    expect(hud.right.status).toContain('burning'); // PRS-6 status chips
    expect(hud.timerS).toBeGreaterThan(1.5);
    expect(formatTimer(75.4)).toBe('01:15');
    scenes.clear();
  });

  it('PRS-8: the ultimate landing triggers the showcase once', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(STEP);
    intents.pressAbility('ult');
    runUntil(() => scene.player.ability === null && scene.drainShowcases() > 0, 4);
    expect(scene.player.ability).toBeNull();
    expect(scene.drainShowcases()).toBe(0); // drained
    scenes.clear();
  });

  it('PRS-5 / PRS-6: a block flares the shield; a parried attacker is shown stunned', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup();
    scene.dummyFighter.combatant.setGuard(true);
    intents.pressMelee();
    runUntil(() => scene.dummyFighter.shieldS > 0, 1);
    expect(scene.dummyFighter.shieldS).toBeGreaterThan(0);
    run(0.05);
    expect(scene.dummyFighter.view!.shieldFlare).toBeGreaterThan(0);
    scene.playerFighter.combatant.stun(1);
    run(0.1);
    expect(scene.playerFighter.view!.stunned).toBe(true);
    expect(scene.topHud.left.status).toContain('stunned');
    scenes.clear();
  });
});
