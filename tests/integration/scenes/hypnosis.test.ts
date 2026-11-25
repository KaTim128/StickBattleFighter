import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Psion's Hypnosis (owner, 25/11/2026) in the real scene: the spiral, the copy, the control hand-over and the hand-back. */
async function setup(opponent = 'rampage', gap = 5) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 10, y: 13 }, dummyStart: { x: 10 + gap, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'psion', opponent },
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

describe('Psion Hypnosis', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the spiral hypnotises the opponent: a weaker copy of them rises and the player controls it, Psion out of the fight', async () => {
    const { intents, scene, scenes, run } = await setup();
    const psion = scene.playerFighter;
    const original = scene.dummyFighter;
    const psionHp = psion.combatant.hp;
    intents.pressAbility('a1');
    for (let i = 0; i < 240 && !scene.hypnosisHud; i++) run(STEP);
    expect(scene.hypnosisHud).not.toBeNull();
    const copy = scene.playerFighter;
    expect(copy).not.toBe(psion);
    expect(copy.hypnoCopy).toBe(true);
    // It looks like and fights like the original, but with a share of its health and damage.
    expect(copy.def.id).toBe(original.def.id);
    expect(copy.combatant.stats.maxHp).toBeLessThan(original.combatant.stats.maxHp * 0.5);
    expect(copy.def.stats.power).toBeLessThanOrEqual(original.def.stats.power * 0.6);
    // Psion is out of the arena: nothing can hit him.
    expect(scene.summonStates.length).toBe(0);
    expect(psion.body).toBeNull();
    expect(psion.combatant.hp).toBe(psionHp);
    // The original is entranced while the copy forms, and the copy cannot be hit yet.
    expect(original.hypnoS).toBeGreaterThan(0);
    expect(copy.combatant.invulnerable).toBe(true);
    expect(scene.hypnosisHud?.phase).toBe('form');
    // No ultimate for the copy; the rest of its abilities are its own.
    expect(scene.abilities!.tryCast(copy, 'ult')).toBe('unavailable');
    // A second copy cannot be made while this one stands.
    expect(
      scene.abilities!.hypnotise(psion.name, original.name, {
        durationS: 9,
        hpFactor: 0.4,
        powerFactor: 0.5,
        holdS: 1,
      }),
    ).toBe(false);
    scenes.clear();
  });

  it('after the copy has formed the player really drives it, and when the time is up Psion steps back in with his health intact', async () => {
    const { intents, scene, scenes, run } = await setup();
    const psion = scene.playerFighter;
    const psionHp = psion.combatant.hp;
    intents.pressAbility('a1');
    for (let i = 0; i < 240 && !scene.hypnosisHud; i++) run(STEP);
    run(1.6); // the copy has stepped out
    expect(scene.hypnosisHud?.phase).toBe('live');
    const copy = scene.playerFighter;
    const x0 = copy.x;
    intents.setMove('t', { x: -1, y: 0 });
    run(0.6);
    intents.setMove('t', { x: 0, y: 0 });
    expect(Math.abs(copy.x - x0)).toBeGreaterThan(0.4); // it answers the player's controls
    // The trance runs out: the original is free, the copy is gone, Psion is back.
    for (let i = 0; i < 60 * 14 && scene.hypnosisHud; i++) run(STEP);
    expect(scene.hypnosisHud).toBeNull();
    expect(scene.playerFighter).toBe(psion);
    expect(scene.playerFighter.def.id).toBe('psion');
    expect(psion.combatant.hp).toBe(psionHp);
    expect(scene.dummyFighter.hypnoS).toBe(0);
    scenes.clear();
  }, 60_000);

  it('the copy falling ends the trance (not the match) and gives Psion back; the original falling ends it too', async () => {
    const { intents, scene, scenes, run } = await setup('training-dummy', 4);
    const psion = scene.playerFighter;
    const castAt = { x: psion.x, y: psion.y };
    intents.pressAbility('a1');
    for (let i = 0; i < 240 && !scene.hypnosisHud; i++) run(STEP);
    run(1.4);
    scene.playerFighter.combatant.hp = 1;
    scene.playerFighter.combatant.takeUnguardedDamage(50);
    run(0.3);
    expect(scene.hypnosisHud).toBeNull();
    expect(scene.playerFighter).toBe(psion);
    // The original snaps out of it, and Psion is back exactly where he cast it from (not where the copy fell).
    expect(scene.dummyFighter.hypnoS).toBe(0);
    expect(Math.hypot(psion.x - castAt.x, psion.y - castAt.y)).toBeLessThan(0.3);
    expect(psion.combatant.isKo).toBe(false);
    scenes.clear();
  }, 60_000);
});
