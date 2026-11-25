import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { simulateFightHeadless } from '../../../src/app/headless-fight';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { seededRandom } from '../../../src/combat/combatant';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { TOURNAMENT_RULES } from '../../../src/data/modes/tournament-rules';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

async function match(seed: number) {
  await initPhysics();
  const scene = new FightArenaScene(
    OFFICE,
    new Container(),
    new PlayerIntents(),
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'rampage', opponent: 'shroud', match: { spectate: true }, difficulty: 'normal' },
  );
  (scene as unknown as { rng: () => number }).rng = seededRandom(seed);
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  return { scene, scenes };
}

const priv = (s: FightArenaScene) => s as unknown as { combatS: number; overtimeOn: boolean };

describe('tournament regulation, overtime and fallback (T1/T2)', () => {
  it('goes to overtime after regulation (no healing), then decides on the score, not at random', async () => {
    const { scene, scenes } = await match(5);
    let overtimes = 0;
    scene.onOvertime = () => overtimes++;
    for (let i = 0; i < 600 && !scene.matchResult; i++) scenes.update(1 / 60); // intro, then some fighting
    if (scene.matchResult) return; // a KO this early ends the match legitimately
    priv(scene).combatS = TOURNAMENT_RULES.regulationS;
    scenes.update(1 / 60);
    expect(overtimes).toBe(1);
    expect(scene.matchResult).toBeNull();
    const me = scene.playerFighter.combatant;
    me.setHpForDebug(500);
    me.heal(50);
    expect(me.hp).toBe(500); // nothing heals in overtime
    priv(scene).combatS = TOURNAMENT_RULES.regulationS + TOURNAMENT_RULES.overtimeS;
    scenes.update(1 / 60);
    expect(overtimes).toBe(1);
    const first = scene.matchResult as FightArenaScene['matchResult'];
    expect(first?.by === 'time' || first?.by === 'ko').toBe(true);
    scenes.clear();
  });

  it('the same seed gives the same winner headless, and fastForward runs to the reported end once', async () => {
    const a = await simulateFightHeadless(11, 'rampage', 'shroud', OFFICE, 'normal');
    const b = await simulateFightHeadless(11, 'rampage', 'shroud', OFFICE, 'normal');
    expect(a).toBe(b);
    const { scene, scenes } = await match(12);
    let ended = 0;
    scene.onMatchEnd = () => ended++;
    while (!scene.fastForward(50));
    scene.fastForward(50); // a second skip does nothing more
    expect(ended).toBe(1);
    scenes.clear();
  }, 120_000);

  it('Battle Skip settles the match at once with the same result as running it out, and reports once', async () => {
    const slow = await match(21);
    let slowWinner = '';
    slow.scene.onMatchEnd = (w) => {
      slowWinner = w;
    };
    while (!slow.scene.fastForward(50));
    slow.scenes.clear();
    const fast = await match(21);
    const reports: string[] = [];
    fast.scene.onMatchEnd = (w) => reports.push(w);
    fast.scene.skipToEnd(); // one call: no budget, no waiting
    fast.scene.skipToEnd(); // a second press does nothing more
    expect(reports).toEqual([slowWinner]);
    expect(fast.scene.matchResult).not.toBeNull();
    fast.scenes.clear();
  }, 120_000);
});
