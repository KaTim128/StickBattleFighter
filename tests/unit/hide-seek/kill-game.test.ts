import { describe, expect, it } from 'vitest';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HideSeekGame, NO_INPUT } from '../../../src/modes/hide-seek/game';
import { exitPoint } from '../../../src/modes/hide-seek/hiding';

const DT = 1 / 60;

/** A game in the hunt with the player hiding in the upstairs wardrobe and Shroud right outside it. */
function hiddenAndFound() {
  const g = new HideSeekGame(HOUSE_PLAN);
  g.round.update(21);
  const spot = g.spots.find((s) => s.spec.kind === 'wardrobe' && s.floor === 0)!;
  g.player.floor = spot.floor;
  (g as unknown as { enterHiding(s: typeof spot): void }).enterHiding(spot);
  const out = exitPoint(g.world, spot);
  Object.assign(g.hunter, { floor: spot.floor, x: out.x, y: out.y + 0.6 });
  return { g, spot };
}

describe('the game runs the execution when the hunter finds a hiding player (owner, 19/11/2026)', () => {
  it('pulls the player out of the hiding place before killing them, with no jumps, and Game Over only at the end', () => {
    const { g, spot } = hiddenAndFound();
    (g as unknown as { beginKill(): void }).beginKill();
    expect(g.round.phase).toBe('killing');
    expect(g.kill?.hidden).toBe(true);
    const seq = g.kill!;
    // The round's killing phase lasts exactly as long as the execution.
    expect(g.round.killProgress).toBe(0);
    let prev = { x: g.player.x, y: g.player.y };
    let leftTheSpot = -1;
    let diedBeforeOut = false;
    const events: string[] = [];
    const player = g.player;
    for (let t = 0; t < seq.durationS + 0.2; t += DT) {
      g.step(DT, NO_INPUT);
      expect(Math.hypot(player.x - prev.x, player.y - prev.y), `player moved too far at ${t.toFixed(2)}`).toBeLessThan(
        0.1,
      );
      prev = { x: player.x, y: player.y };
      for (const e of g.takeKillEvents()) events.push(e.kind === 'stab' ? 'stab' : e.kind);
      if (player.hidingIn === null && leftTheSpot < 0) leftTheSpot = t;
      const frame = g.killFrame!;
      if (frame.stage === 'stab' && player.hidingIn !== null) diedBeforeOut = true;
      expect(g.round.phase === 'gameover' && t < seq.durationS - 0.1, 'game over too early').toBe(false);
    }
    expect(diedBeforeOut).toBe(false);
    expect(leftTheSpot).toBeGreaterThan(0.3); // not at the instant of the catch: he opens it first
    expect(events.filter((e) => e === 'stab')).toHaveLength(4);
    expect(events.indexOf('open')).toBeLessThan(events.indexOf('seize'));
    expect(events.indexOf('drag')).toBeLessThan(events.indexOf('stab'));
    expect(g.round.phase).toBe('gameover');
    // Dead on the floor out in the room, not inside the wardrobe.
    expect(Math.hypot(player.x - spot.spec.at.x, player.y - spot.spec.at.y)).toBeGreaterThan(0.6);
    expect(g.round.killsStarted).toBe(1);
  });

  it('the hunter is driven by the sequence, not the AI: he stays on his mark and the round cannot restart it', () => {
    const { g } = hiddenAndFound();
    (g as unknown as { beginKill(): void }).beginKill();
    const kill = g.kill;
    for (let t = 0; t < 1; t += DT) g.step(DT, NO_INPUT);
    expect(g.kill).toBe(kill);
    expect(g.round.catchPlayer()).toBe(false);
    expect(g.round.killsStarted).toBe(1);
  });

  it('a restart clears the execution completely', () => {
    const { g } = hiddenAndFound();
    (g as unknown as { beginKill(): void }).beginKill();
    for (let t = 0; t < 0.5; t += DT) g.step(DT, NO_INPUT);
    g.restart();
    expect(g.kill).toBeNull();
    expect(g.killFrame).toBeNull();
    expect(g.takeKillEvents()).toEqual([]);
    expect(g.round.phase).toBe('prep');
  });

  it('caught in the open there is no opening or dragging, and the player is on the floor at the end', () => {
    const g = new HideSeekGame(HOUSE_PLAN);
    g.round.update(21);
    Object.assign(g.player, { floor: 0, x: 22.8, y: 17.6 });
    Object.assign(g.hunter, { floor: 0, x: 20.6, y: 17.6 });
    (g as unknown as { beginKill(): void }).beginKill();
    expect(g.kill?.hidden).toBe(false);
    for (let t = 0; t < g.kill!.durationS + 0.2; t += DT) g.step(DT, NO_INPUT);
    expect(g.round.phase).toBe('gameover');
    expect(g.killFrame!.player.lie).toBe(1);
  });
});
