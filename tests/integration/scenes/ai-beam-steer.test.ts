import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

describe('AI beam steering', () => {
  it('in a spectated match the "player" side is AI-driven, so its beam tracks the enemy instead of waiting for input', async () => {
    await initPhysics();
    const scene = new FightArenaScene(OFFICE, new Container(), new PlayerIntents(), () => ({ width: 1280, height: 720 }), false, {
      player: 'reson',
      opponent: 'voltar',
      match: { spectate: true },
      difficulty: 'normal',
    });
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    for (let i = 0; i < 30; i++) scenes.update(1 / 60);
    const me = scene.playerFighter;
    const foe = scene.dummyFighter;
    const want = (scene as unknown as { beamSteer(f: unknown, fresh: boolean): { x: number; y: number } | null }).beamSteer(me, true);
    expect(want).not.toBeNull(); // before the fix a human-input branch returned null (no pointer, no keys)
    expect(Math.sign(want!.x)).toBe(Math.sign(foe.x - me.x) || Math.sign(want!.x));
    scenes.clear();
  }, 30_000);
});
