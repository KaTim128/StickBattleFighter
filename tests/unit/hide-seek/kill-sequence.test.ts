import { describe, expect, it } from 'vitest';
import { HOUSE } from '../../../src/data/arenas/house';
import { exitPoint, hideSpots } from '../../../src/modes/hide-seek/hiding';
import { KillSequence, STAGE_S } from '../../../src/modes/hide-seek/kill-sequence';
import { HouseWorld } from '../../../src/modes/hide-seek/world';

const world = new HouseWorld(HOUSE);
const spots = hideSpots(HOUSE);
const around = (t: number, step = 1 / 60): number[] =>
  Array.from({ length: Math.ceil(t / step) + 1 }, (_, i) => Math.min(t, i * step));

describe('the execution when Shroud finds a hiding player (owner, 19/11/2026)', () => {
  it.each(spots.map((s) => [s.id, s] as const))(
    '%s: he opens it, drags the player out by the neck, holds them up and stabs them',
    (_id, spot) => {
      const out = exitPoint(world, spot);
      const seq = new KillSequence({
        world,
        floor: spot.floor,
        hunter: { x: out.x + 0.4, y: out.y },
        player: spot.spec.at,
        spot,
      });
      const stages = around(seq.durationS).map((t) => seq.frame(t).stage);
      const order = stages.filter((s, i) => i === 0 || s !== stages[i - 1]);
      expect(order).toEqual(['close', 'open', 'seize', 'drag', 'hold', 'raise', 'stab', 'final', 'finish']);
      // The player starts inside the place, ends on the floor out in the room, between Shroud and the place.
      const first = seq.frame(0);
      const last = seq.frame(seq.durationS);
      expect(first.player.x).toBeCloseTo(spot.spec.at.x, 6);
      expect(first.player.y).toBeCloseTo(spot.spec.at.y, 6);
      expect(first.player.revealed).toBe(false);
      expect(last.player.lie).toBe(1);
      expect(Math.hypot(last.player.x - spot.spec.at.x, last.player.y - spot.spec.at.y)).toBeGreaterThan(0.6);
      const gap = Math.hypot(last.hunter.x - last.player.x, last.hunter.y - last.player.y);
      expect(gap).toBeGreaterThan(0.4);
      expect(gap).toBeLessThan(1.4);
      // Nobody is pulled through a wall: both end on free floor.
      expect(world.fits(spot.floor, last.hunter.x, last.hunter.y, 0.2), 'hunter end').toBe(true);
      expect(world.fits(spot.floor, last.player.x, last.player.y, 0.2), 'player end').toBe(true);
    },
  );

  it('is smooth: nothing jumps between frames (no teleport), and the player is revealed from the seizing on', () => {
    for (const spot of spots) {
      const out = exitPoint(world, spot);
      const seq = new KillSequence({
        world,
        floor: spot.floor,
        hunter: { x: out.x + 0.4, y: out.y },
        player: spot.spec.at,
        spot,
      });
      let prev = seq.frame(0);
      let revealed = false;
      for (const t of around(seq.durationS).slice(1)) {
        const f = seq.frame(t);
        expect(
          Math.hypot(f.hunter.x - prev.hunter.x, f.hunter.y - prev.hunter.y),
          `${spot.id} hunter at ${t}`,
        ).toBeLessThan(0.09);
        expect(
          Math.hypot(f.player.x - prev.player.x, f.player.y - prev.player.y),
          `${spot.id} player at ${t}`,
        ).toBeLessThan(0.09);
        // The body hangs, jerks and crumples smoothly: no jump in how it lies or how high it is held.
        expect(Math.abs(f.player.lie - prev.player.lie), `${spot.id} lie at ${t}`).toBeLessThan(0.06);
        expect(Math.abs(f.player.lift - prev.player.lift)).toBeLessThan(0.03); // the drop when he lets go
        if (f.stage === 'seize') revealed = true;
        if (revealed) expect(f.player.revealed).toBe(true);
        prev = f;
      }
    }
  });

  it('opens the place before he reaches in: the door or lid is fully open by the seizing, and stays open', () => {
    const door = spots.find((s) => s.spec.kind === 'wardrobe')!;
    const out = exitPoint(world, door);
    const seq = new KillSequence({ world, floor: door.floor, hunter: out, player: door.spec.at, spot: door });
    const open = around(seq.durationS)
      .map((t) => seq.frame(t))
      .filter((f) => f.spot);
    expect(open[0]!.spot!.id).toBe(door.id);
    expect(open[0]!.spot!.amount).toBeLessThan(0.2);
    const seize = open.find((f) => f.stage === 'seize')!;
    expect(seize.spot!.amount).toBe(1);
    for (let i = 1; i < open.length; i++)
      expect(open[i]!.spot!.amount).toBeGreaterThanOrEqual(open[i - 1]!.spot!.amount - 1e-9);
  });

  it('four blows: three stabs and a heavier last, each reported once, in order, with the camera and flash reacting', () => {
    const spot = spots[0]!;
    const out = exitPoint(world, spot);
    const seq = new KillSequence({ world, floor: spot.floor, hunter: out, player: spot.spec.at, spot });
    expect(seq.hitTimes).toHaveLength(4);
    const seen: string[] = [];
    let prev = -1;
    for (const t of around(seq.durationS, 1 / 30)) {
      for (const e of seq.eventsBetween(prev, t))
        seen.push(e.kind === 'stab' ? `stab${e.index}${e.final ? 'F' : ''}` : e.kind);
      prev = t;
    }
    expect(seen).toEqual([
      'close',
      'open',
      'seize',
      'drag',
      'hold',
      'raise',
      'stab0',
      'stab1',
      'stab2',
      'stab3F',
      'finish',
    ]);
    for (const at of seq.hitTimes) {
      expect(seq.frame(at + 0.01).flash).toBeGreaterThan(0.3);
      expect(seq.frame(at + 0.01).shake).toBeGreaterThan(0.3);
    }
    expect(seq.frame(0).zoom).toBeCloseTo(1, 1);
    expect(seq.frame(seq.durationS).zoom).toBeGreaterThan(1.9);
    expect(seq.frame(0).bars).toBe(0);
    expect(seq.frame(1).bars).toBe(1);
  });

  it('the screen fades to black only at the very end, and slow-motion bites on the last blow', () => {
    const spot = spots[0]!;
    const out = exitPoint(world, spot);
    const seq = new KillSequence({ world, floor: spot.floor, hunter: out, player: spot.spec.at, spot });
    expect(seq.frame(seq.durationS * 0.8).fade).toBe(0);
    expect(seq.frame(seq.durationS).fade).toBeGreaterThan(0.95);
    const last = seq.hitTimes[3]!;
    expect(seq.frame(last).timeScale).toBeLessThan(0.3);
    expect(seq.frame(0).timeScale).toBeGreaterThan(0.8);
  });

  it('caught in the open: he closes in and seizes, with no opening and no drag, and kills in the same way', () => {
    const player = { x: 38, y: 21 };
    const seq = new KillSequence({ world, floor: 0, hunter: { x: 34.5, y: 21 }, player, spot: null });
    const order = around(seq.durationS)
      .map((t) => seq.frame(t).stage)
      .filter((s, i, a) => i === 0 || s !== a[i - 1]);
    expect(order).toEqual(['close', 'seize', 'hold', 'raise', 'stab', 'final', 'finish']);
    expect(seq.frame(0).player.revealed).toBe(true);
    expect(seq.frame(0).spot).toBeNull();
    expect(seq.frame(seq.durationS).player.lie).toBe(1);
    // It is shorter than the kill from a hiding place, which has the opening and the drag as well.
    const spot = spots[0]!;
    const hidden = new KillSequence({
      world,
      floor: spot.floor,
      hunter: exitPoint(world, spot),
      player: spot.spec.at,
      spot,
    });
    expect(hidden.durationS - seq.durationS).toBeCloseTo(STAGE_S.open + STAGE_S.drag, 6);
  });

  it('he grabs the player by the neck and stabs them in the stomach while holding them up, and they crumple only after the last blow', () => {
    for (const spot of spots) {
      const out = exitPoint(world, spot);
      const seq = new KillSequence({ world, floor: spot.floor, hunter: out, player: spot.spec.at, spot });
      const hit = seq.hitTimes;
      // From the grab to the last blow his one arm is up at the neck (above the knife arm), and the victim is held.
      const grab = seq.frame(STAGE_S.close + STAGE_S.open + STAGE_S.seize - 0.01);
      expect(grab.hunter.pose.armBack.root, `${spot.id} neck arm at the grab`).toBeGreaterThan((95 * Math.PI) / 180);
      for (const at of hit) {
        const f = seq.frame(at);
        expect(f.hunter.pose.armBack.root, 'neck arm during the blow').toBeGreaterThan((100 * Math.PI) / 180);
        expect(f.hunter.pose.armFront.root, 'knife arm out low at the stomach').toBeLessThan((95 * Math.PI) / 180);
        expect(f.hunter.pose.armFront.root).toBeGreaterThan((70 * Math.PI) / 180);
        expect(f.player.lift, 'held off the floor').toBeGreaterThan(0.15);
        expect(f.player.lie, 'upright, not on the floor').toBeLessThan(0.35);
      }
      // After the last blow he lets go and the body falls.
      const end = seq.frame(seq.durationS);
      expect(end.player.lie).toBe(1);
      expect(end.player.lift).toBe(0);
      expect(seq.frame(hit[3]! + 0.02).player.lie).toBeLessThan(0.4);
    }
  });
});
