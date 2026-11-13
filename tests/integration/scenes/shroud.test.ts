import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { idlePose, walkPose } from '../../../src/animation/greybox-motion';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'shroud' },
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
  run(0.2);
  return { intents, scene, scenes, run, runUntil };
}

/** Shroud (owner, 12/11/2026): an original masked slasher. */
describe('Shroud', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is a hunched knife fighter: bent over at rest and walking, with a mask, a robe and a knife', async () => {
    const { scene, scenes } = await setup({ x: 10, y: 10 }, { x: 20, y: 10 });
    const d = scene.playerFighter.def;
    expect(d.effects.head).toBe('mask');
    expect(d.effects.body).toBe('cloak');
    expect(d.effects.held).toBe('knife');
    const bones = d.bones;
    for (const pose of [idlePose(0.3, bones, 'stalker'), walkPose(0.3, bones, 'stalker')])
      expect((pose.lean * 180) / Math.PI).toBeLessThan(-20); // never upright
    scenes.clear();
  });

  it('knife combo: slash, backhand, then a lunging stab that knocks down', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.2, y: 13 });
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1);
      if (scene.player.attack) seen.push(scene.player.attack);
      run(0.12);
    }
    expect(seen).toEqual(['knife-slash', 'backhand-slash', 'lunging-stab']);
    runUntil(() => scene.dummy.state === 'knockdown' || scene.dummy.state === 'gettingUp', 2);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Bloodfade (owner, 13/11/2026): darts in, one bloody stab that bleeds and staggers, then springs well away', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 12, y: 13 }, { x: 15, y: 13 });
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    scene.drainEvents();
    intents.pressAbility('a1');
    runUntil(() => scene.dummy.hp < 1000, 1);
    const hp = scene.dummy.hp;
    expect(1000 - hp).toBeGreaterThanOrEqual(60); // a powerful stab
    expect(1000 - hp).toBeLessThan(90);
    expect(scene.dummyFighter.combatant.bleeding).toBe(true);
    expect(scene.dummy.state).toBe('stunned'); // a clear flinch
    const struckAt = scene.player.x;
    expect(struckAt).toBeGreaterThan(13); // he closed the gap to stab
    const fx = scene.abilities!.recentFx.filter((e) => e.kind === 'impact' && e.ability === 'bloodfade');
    expect(fx).toHaveLength(1);
    expect(fx[0]!.stab).toBe(1);
    expect(fx[0]!.sfx).toBe('blade-pierce');
    run(0.8);
    expect(struckAt - scene.player.x).toBeGreaterThan(3.5); // sprang straight back
    expect(scene.player.facing).toBe(1); // still facing his prey while retreating
    expect(scene.physics!.isFree({ x: scene.player.x, y: scene.player.y }, 0.25)).toBe(true);
    // Bleeding (10/s for 3 s) takes about 30 more, never more.
    run(3.5);
    expect(hp - scene.dummy.hp).toBeGreaterThan(20);
    expect(hp - scene.dummy.hp).toBeLessThanOrEqual(32);
    expect(scene.playerFighter.caster!.cooldown('a1')).toBeGreaterThan(3);
    scenes.clear();
  });

  it('Stalker Lunge (owner, 13/11/2026): lunges in and lands three separate stabs, each with its own blood and sound', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 12, y: 13 }, { x: 16.5, y: 13 });
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    scene.drainEvents();
    intents.pressAbility('a2');
    run(1.2);
    const stabs = scene.abilities!.recentFx.filter((e) => e.kind === 'impact' && e.ability === 'stalkerLunge');
    expect(stabs.map((e) => e.stab)).toEqual([1, 2, 3]);
    expect(new Set(stabs.map((e) => e.sfx)).size).toBe(3);
    const direct = 1000 - scene.dummy.hp;
    expect(direct).toBeGreaterThanOrEqual(70); // three real hits
    expect(direct).toBeLessThan(100);
    expect(scene.dummyFighter.combatant.bleeding).toBe(true);
    expect(scene.player.x).toBeGreaterThan(14.5); // lunged in to reach it
    scenes.clear();
  });

  it('balance (owner, 13/11/2026): Stalker Lunge bleeding is refreshed, never stacked, and Bloodfade on top keeps the stronger wound only', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 13, y: 13 }, { x: 15, y: 13 });
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    intents.pressAbility('a2');
    run(1.2);
    const after = scene.dummy.hp;
    // Three stabs at 9/s each would be 27/s if stacked: over one second it must stay near 9.
    run(1);
    expect(after - scene.dummy.hp).toBeLessThanOrEqual(11);
    // Both abilities back to back: total well below a knockout, nothing runs away.
    scene.playerFighter.caster!.reset();
    scene.playerFighter.placeAt({ x: 13, y: 13 });
    scene.respawnDummy({ x: 15, y: 13 });
    run(0.3);
    intents.pressAbility('a1');
    run(1.2);
    intents.pressAbility('a2');
    run(5);
    expect(1000 - scene.dummy.hp).toBeLessThan(260);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(150);
    scenes.clear();
  });

  it('Behind You appears on the far side of the nearest enemy, facing it', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 10, y: 13 }, { x: 15, y: 13 });
    intents.pressAbility('a3');
    run(0.8);
    expect(scene.player.x).toBeGreaterThan(15.3); // behind it
    expect(Math.abs(scene.player.y - 13)).toBeLessThan(0.6);
    expect(scene.player.facing).toBe(-1); // turned to face its back
    scenes.clear();
  });

  it('Rending Flurry: heavy close damage, a stagger and deep bleeding', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 }, { x: 15.2, y: 13 });
    intents.pressAbility('a4');
    run(0.5);
    expect(1000 - scene.dummy.hp).toBeGreaterThan(90);
    expect(scene.dummyFighter.combatant.bleeding).toBe(true);
    scenes.clear();
  });

  it('Hunting Frenzy: faster on his feet, quicker knife only 10% deadlier (owner), cuts bleed', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.2, y: 13 });
    // No random critical hits, so the comparison is fair.
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    // A plain slash first, for comparison.
    intents.pressMelee();
    runUntil(() => scene.dummy.hp < 1000, 1);
    const plain = 1000 - scene.dummy.hp;
    run(1.2);
    scene.respawnDummy({ x: 16.2, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    runUntil(() => scene.playerFighter.buff !== null, 2);
    const b = scene.playerFighter.buff!;
    expect(b.speedFactor).toBeGreaterThan(1.2);
    expect(b.attackSpeedFactor).toBeGreaterThan(1.3);
    expect(b.meleeDamageFactor).toBeCloseTo(1.1, 6);
    run(0.4);
    const hp0 = scene.dummy.hp;
    intents.pressMelee();
    runUntil(() => scene.dummy.hp < hp0, 1);
    expect(hp0 - scene.dummy.hp).toBeGreaterThan(plain); // a little deadlier
    expect(hp0 - scene.dummy.hp).toBeLessThanOrEqual(Math.ceil(plain * 1.1) + 1); // but only 10%
    expect(scene.dummyFighter.combatant.bleeding).toBe(true); // the cut bleeds
    scenes.clear();
  });

  it('Hunting Frenzy puts the lights out (owner): a bulb bursts, the enemy sees only 1.6 m round itself, Shroud sees all', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 12, y: 13 }, { x: 15, y: 13 });
    scene.dummyAttacks = true;
    scene.playerFighter.caster!.fillMeter();
    scene.drainEvents();
    intents.pressAbility('ult');
    runUntil(() => scene.playerFighter.buff !== null, 2);
    const fx = scene.abilities!.recentFx.map((e) => e.sfx);
    expect(fx).toContain('bulb-burst');
    const foe = scene.dummyFighter.combatant;
    expect(foe.darkLeftS).toBeGreaterThan(7.5); // for the frenzy's 8 s
    expect(foe.sightM).toBeCloseTo(1.6, 6);
    expect(scene.player.sightM).toBe(Number.POSITIVE_INFINITY); // night vision: he sees everything
    expect(scene.player.nightVisionS).toBeGreaterThan(7.5);
    // 3 m away in the dark: it cannot find him, so it never turns to face him.
    scene.dummyFighter.faceToward(1, 0); // looking away from him (he is on its left)
    run(0.5);
    expect(scene.dummyFighter.facing).toBe(1);
    // Inside its little circle it sees him again.
    scene.playerFighter.placeAt({ x: 13.9, y: 13 });
    run(0.3);
    expect(scene.dummyFighter.facing).toBe(-1);
    // When the frenzy ends the lights come back.
    run(8.5);
    expect(foe.darkLeftS).toBe(0);
    expect(foe.sightM).toBe(Number.POSITIVE_INFINITY);
    scenes.clear();
  });
});
