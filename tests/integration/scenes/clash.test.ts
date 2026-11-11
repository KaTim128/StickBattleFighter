import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { CLASH } from '../../../src/data/combat/clash';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Player right beside the dummy (19, 13), facing it. */
async function setup() {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 17.95, y: 13 } },
    new Container(),
    intents,
    () => ({
      width: 1280,
      height: 720,
    }),
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      each?.();
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.2);
  return { intents, scene, scenes, run };
}

describe('Punch Clash in the arena (owner, 11/11/2026)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a sustained exchange of punches and blocks (the dummy punching back) triggers a clash', async () => {
    const { intents, scene, scenes, run } = await setup();
    scene.dummyAttacks = true;
    let started = false;
    let t = 0;
    run(15, () => {
      t += STEP;
      if (started || scene.clashes.active) {
        started = true;
        return;
      }
      // Like a player: stay close, throw a jab or two, then guard against the reply.
      const gap = scene.dummy.x - scene.player.x;
      intents.setMove('t', { x: gap > 1.15 ? 1 : 0, y: Math.sign(scene.dummy.y - scene.player.y) * 0.5 });
      const phase = t % 1.6;
      if (phase < STEP * 1.5 || Math.abs(phase - 0.3) < STEP / 2) intents.pressMelee();
      if (Math.abs(phase - 0.55) < STEP / 2) intents.meleePress(); // hold to block…
      if (Math.abs(phase - 1.5) < STEP / 2) intents.meleeRelease(); // …then let go
    });
    expect(started).toBe(true);
    scenes.clear();
  });

  it('mashing fast wins: the camera closes in, the finisher breaks the guard, then the camera returns', async () => {
    const { intents, scene, scenes, run } = await setup();
    const normal = scene.cameraState!.shortSideM;
    scene.startClash();
    expect(scene.clashHud.state?.phase).toBe('intro');
    let closest = Infinity;
    let i = 0;
    run(CLASH.introS + CLASH.mashS + 0.1, () => {
      if (i++ % 3 === 0) intents.pressMelee(); // about 20 presses a second
      closest = Math.min(closest, scene.cameraState!.shortSideM);
    });
    const result = scene.clashes.lastResult!;
    expect(result.winner).toBe('a');
    expect(result.powerA).toBeGreaterThan(result.powerB);
    expect(closest).toBeLessThan(CLASH.cameraEndShortSideM + 0.5); // zoomed right in
    expect(scene.clashHud.banner?.text).toBe('CLASH WON!');
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(CLASH.finishDamage.min);
    expect(scene.player.hp).toBe(1000);
    run(1);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    expect(scene.dummy.x - scene.player.x).toBeGreaterThan(2); // knocked well back
    run(2.5);
    expect(scene.cameraState!.shortSideM).toBeGreaterThan(normal - 1); // back to normal framing
    scenes.clear();
  });

  it('not mashing loses: the dummy breaks through instead', async () => {
    const { scene, scenes, run } = await setup();
    scene.startClash();
    run(CLASH.introS + CLASH.mashS + 0.4);
    expect(scene.clashes.lastResult?.winner).toBe('b');
    expect(scene.player.hp).toBeLessThan(1000);
    expect(scene.clashHud.banner?.text).toBe('CLASH LOST!');
    scenes.clear();
  });

  it('scores within 5% end in a stalemate: both are thrown back, no finisher damage', async () => {
    const { scene, scenes, run } = await setup();
    scene.startClash();
    run(CLASH.introS + CLASH.mashS - 0.05);
    const c = scene.clashes.clash!;
    c.powerA = 40;
    c.powerB = 41;
    const gap0 = scene.dummy.x - scene.player.x;
    run(0.4);
    expect(scene.clashes.lastResult?.winner).toBeNull();
    expect(scene.clashHud.banner?.text).toBe('STALEMATE!');
    expect(scene.dummy.hp).toBe(1000);
    expect(scene.player.hp).toBe(1000);
    expect(scene.dummy.x - scene.player.x).toBeGreaterThan(gap0 + 0.8);
    scenes.clear();
  });

  it('the exchange fires sounds and sparks on every beat, louder as it builds; no new clash during the cooldown', async () => {
    const { scene, scenes, run } = await setup();
    scene.startClash();
    scene.drainSounds();
    run(CLASH.introS + 1);
    const early = scene.drainSoundCues();
    expect(early.length).toBeGreaterThanOrEqual(3);
    run(CLASH.mashS - 1 - 0.3);
    const late = scene.drainSoundCues();
    const avg = (xs: { gain: number }[]) => xs.reduce((s, x) => s + x.gain, 0) / xs.length;
    expect(avg(late)).toBeGreaterThan(avg(early));
    run(0.6);
    expect(scene.clashes.active).toBe(false);
    expect(scene.clashes.trigger.ready(1e9, 1)).toBe(false); // contacts were cleared
    scenes.clear();
  });
});
