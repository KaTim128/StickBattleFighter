import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const ROSTER = ['inferno', 'rampage', 'necro', 'shroud'];

/**
 * The longest stretch (game seconds) in which `f` neither moved nor started an attack or ability,
 * while it was free to act and its opponent still standing. A Punch Clash (both planted, mashing)
 * is not idleness.
 */
function trackIdle(scene: FightArenaScene, f: () => FighterEntity, foe: () => FighterEntity) {
  let last = { x: f().x, y: f().y };
  let idle = 0;
  let worst = 0;
  let lastSim = (scene as unknown as { simTimeS: number }).simTimeS;
  return () => {
    // Hit-stop freezes the whole game for a few frames on every landed blow; frozen frames are not game seconds.
    const sim = (scene as unknown as { simTimeS: number }).simTimeS;
    if (sim === lastSim) return worst;
    lastSim = sim;
    const me = f();
    const them = foe();
    const moved = Math.hypot(me.x - last.x, me.y - last.y) > 0.01;
    last = { x: me.x, y: me.y };
    const acting = me.combo.attack !== null || me.caster?.cast != null || me.combatant.state !== 'free';
    const clash = (scene as unknown as { clashes: { clash: unknown } }).clashes.clash !== null;
    if (moved || acting || clash || them.combatant.isKo || me.combatant.isKo || scene.matchResult) idle = 0;
    else idle += STEP;
    worst = Math.max(worst, idle);
    return worst;
  };
}

/**
 * Owner, 13/11/2026: AI fighters never stop fighting while their opponent stands: not when blinded,
 * not in the dark, not when hesitating, not when pushed against furniture (every pairing, 90 s).
 */
describe('AI stays engaged', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  for (const a of ROSTER)
    for (const b of ROSTER) {
      if (a > b) continue;
      it(`${a} vs ${b}: neither side idles more than 1.5 s in a long watched fight`, async () => {
        const scene = new FightArenaScene(
          OFFICE,
          new Container(),
          new PlayerIntents(),
          () => ({ width: 1280, height: 720 }),
          false,
          { player: a, opponent: b, match: { spectate: true }, difficulty: 'normal' },
        );
        const scenes = new SceneManager();
        await scenes.switchTo(() => scene);
        const idleA = trackIdle(
          scene,
          () => scene.playerFighter,
          () => scene.dummyFighter,
        );
        const idleB = trackIdle(
          scene,
          () => scene.dummyFighter,
          () => scene.playerFighter,
        );
        let worstA = 0;
        let worstB = 0;
        for (let i = 0; i < 90 / STEP && !scene.matchResult; i++) {
          scenes.update(STEP);
          worstA = idleA();
          worstB = idleB();
        }
        expect(worstA).toBeLessThan(1.5);
        expect(worstB).toBeLessThan(1.5);
        scenes.clear();
      }, 120_000);
    }
});
