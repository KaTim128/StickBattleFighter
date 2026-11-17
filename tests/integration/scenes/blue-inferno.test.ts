import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { finalMaxSpeedMps } from '../../../src/characters/final-stats';
import { SceneManager } from '../../../src/core/scene';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const ULT = INFERNO_KIT.ult;

async function setup() {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 10, y: 13 }, dummyStart: { x: 30, y: 13 } },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'inferno' },
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

/** TD-080 (owner, 17/11/2026): the dark-skinned, blue-flamed transformation is Inferno's ultimate. */
describe('Blue Inferno', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is the ultimate; Eruption is a normal ability in the kit, nerfed, and no longer takes the ultimate slot', () => {
    expect(ULT.slot).toBe('ult');
    expect(ULT.name).toBe('Blue Inferno');
    expect(ULT.delivery.type).toBe('buff');
    const eruption = INFERNO_KIT.a5!;
    expect(eruption.id).toBe('eruption');
    expect(eruption.slot).not.toBe('ult');
    expect(eruption.payload.damage).toBe(150); // was 300
    expect(eruption.cooldownS).toBe(14);
  });

  it('needs a full meter, then lasts 10 s: dark skin and blue flames ease in, then everything returns', async () => {
    const { intents, scene, scenes, run } = await setup();
    const f = scene.playerFighter;
    intents.pressAbility('ult');
    run(0.2);
    expect(f.buff).toBeNull(); // no meter, no transformation
    f.caster!.fillMeter();
    intents.pressAbility('ult');
    run(ULT.castS + 0.3);
    expect(f.buff?.blueFlames).toBe(true);
    expect(f.caster!.meter).toBe(0); // it spent the meter
    expect(f.view!.blueFire).toBeGreaterThan(0.5); // the look follows
    run(9);
    expect(f.buff).not.toBeNull(); // 10 s window
    run(1.5);
    expect(f.buff).toBeNull();
    run(1);
    expect(f.view!.blueFire).toBe(0); // original look restored
    expect(f.combatant.damageTakenScale).toBe(1);
    scenes.clear();
  });

  it('+70% ability damage and melee, cooldowns 30% sooner, +15% speed, and no defence bonus', async () => {
    const { intents, scene, scenes, run } = await setup();
    const f = scene.playerFighter;
    f.caster!.fillMeter();
    intents.pressAbility('ult');
    run(ULT.castS + ULT.recoveryS + 0.2); // cast and recovery done: free to act
    const b = f.buff!;
    expect(b.abilityDamageFactor).toBe(1.7);
    expect(b.meleeDamageFactor).toBe(1.7);
    expect(b.cooldownFactor).toBe(0.7);
    expect(b.damageTakenFactor).toBe(1); // glass cannon: he takes normal damage
    expect(finalMaxSpeedMps(f.def, false, b, f.combatant.status)).toBeCloseTo(f.def.movement.maxSpeedMps * 1.15, 5);
    // A new ability cooldown starts 30% shorter while it lasts.
    intents.pressAbility('a1');
    run(STEP * 3);
    expect(f.caster!.cooldown('a1')).toBeCloseTo(INFERNO_KIT.a1.cooldownS * 0.7, 1);
    scenes.clear();
  });

  it('an ability thrown during it hits 70% harder (Fireball 70 becomes 119)', async () => {
    const { intents, scene, scenes, run } = await setup();
    const f = scene.playerFighter;
    scene.respawnDummy({ x: 14, y: 13 });
    f.caster!.fillMeter();
    intents.pressAbility('ult');
    run(ULT.castS + ULT.recoveryS + 0.2);
    const hp = scene.dummy.hp;
    scene.dummyFighter.combatant.damageTakenScale = 1;
    intents.pressAbility('a1');
    for (let i = 0; i < 90 && scene.dummy.hp === hp; i++) run(STEP);
    const dealt = hp - scene.dummy.hp;
    expect(dealt).toBeGreaterThanOrEqual(Math.round(INFERNO_KIT.a1.payload.damage * 1.7) - 2);
    scenes.clear();
  });
});
