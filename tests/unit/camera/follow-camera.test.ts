import { describe, expect, it } from 'vitest';
import { CameraShake } from '../../../src/camera/camera-shake';
import { cameraScale, clampCamera, FollowCamera } from '../../../src/camera/follow-camera';
import { DEFAULT_FRAMING, frameTargets, visibleSize } from '../../../src/camera/framing';

const BOUNDS = { minX: -50, minY: -50, maxX: 80, maxY: 80 };
const W = 1280;
const H = 720;

describe('camera basics', () => {
  it('shows the same number of metres across the short side on any screen', () => {
    expect(cameraScale(1280, 720, 10)).toBe(72);
    expect(cameraScale(412, 915, 10)).toBeCloseTo(41.2, 6);
  });

  it('stays inside the arena near edges and centres when the arena is smaller than the view', () => {
    const b = { minX: 0, minY: 0, maxX: 30, maxY: 20 };
    expect(clampCamera(1, 1, 5, 3, b)).toEqual({ x: 5, y: 3 });
    expect(clampCamera(29, 19, 5, 3, b)).toEqual({ x: 25, y: 17 });
    expect(clampCamera(3, 3, 20, 3, b)).toEqual({ x: 15, y: 3 });
  });
});

describe('frameTargets (REQ-CAM-2)', () => {
  it('alone: centres on the player at the closest zoom', () => {
    const f = frameTargets({ x: 10, y: 10 }, [], W, H);
    expect(f).toEqual({ x: 10, y: 10, shortSideM: DEFAULT_FRAMING.minShortSideM, framed: 0 });
  });

  it('zooms out to fit a nearby opponent, aiming between them', () => {
    // 10 m apart top-to-bottom does not fit the closest zoom on a wide screen.
    const f = frameTargets({ x: 10, y: 10 }, [{ x: 14, y: 20 }], W, H);
    expect(f.framed).toBe(1);
    expect(f.shortSideM).toBeGreaterThan(DEFAULT_FRAMING.minShortSideM);
    const { w, h } = visibleSize(f.shortSideM, W, H);
    for (const p of [
      { x: 10, y: 10 },
      { x: 14, y: 20 },
    ]) {
      expect(Math.abs(p.x - f.x)).toBeLessThanOrEqual(w / 2);
      expect(Math.abs(p.y - f.y)).toBeLessThanOrEqual(h / 2);
    }
  });

  it('never zooms out past the limit, and keeps the player on screen when the opponent cannot fit', () => {
    const player = { x: 10, y: 10 };
    const f = frameTargets(player, [{ x: 25, y: 10 + 15 }], 412, 915); // tall phone, far opponent within range
    expect(f.shortSideM).toBeLessThanOrEqual(DEFAULT_FRAMING.maxShortSideM);
    const { w, h } = visibleSize(f.shortSideM, 412, 915);
    expect(Math.abs(player.x - f.x)).toBeLessThanOrEqual(w / 2 - DEFAULT_FRAMING.playerMarginM + 1e-9);
    expect(Math.abs(player.y - f.y)).toBeLessThanOrEqual(h / 2 - DEFAULT_FRAMING.playerMarginM + 1e-9);
  });

  it('ignores fighters too far away to frame', () => {
    const f = frameTargets({ x: 0, y: 0 }, [{ x: 40, y: 0 }], W, H);
    expect(f.framed).toBe(0);
    expect(f.x).toBe(0);
  });
});

describe('FollowCamera', () => {
  it('eases towards a moving target rather than jumping', () => {
    const cam = new FollowCamera({ x: 10, y: 10 }, BOUNDS);
    cam.update({ x: 14, y: 10 }, [], 1 / 60, W, H);
    expect(cam.x).toBeGreaterThan(10);
    expect(cam.x).toBeLessThan(11);
    for (let i = 0; i < 180; i++) cam.update({ x: 14, y: 10 }, [], 1 / 60, W, H);
    expect(cam.x).toBeCloseTo(14, 2);
  });

  it('stays smooth when a fighter is suddenly knocked far away (no snapping)', () => {
    const cam = new FollowCamera({ x: 10, y: 10 }, BOUNDS);
    for (let i = 0; i < 120; i++) cam.update({ x: 10, y: 10 }, [{ x: 13, y: 10 }], 1 / 60, W, H);
    let prev = { x: cam.x, zoom: cam.shortSideM };
    for (let i = 0; i < 120; i++) {
      cam.update({ x: 10, y: 10 }, [{ x: 12, y: 22 }], 1 / 60, W, H); // knocked 12 m down the screen
      expect(Math.abs(cam.x - prev.x)).toBeLessThanOrEqual(0.25 + 1e-9); // ≤ 15 m/s cap
      expect(Math.abs(cam.shortSideM - prev.zoom)).toBeLessThan(0.15);
      prev = { x: cam.x, zoom: cam.shortSideM };
    }
    expect(cam.shortSideM).toBeGreaterThan(DEFAULT_FRAMING.minShortSideM + 1);
  });
});

describe('CameraShake (REQ-CAM-4)', () => {
  it('shakes after an impact and settles back to perfectly still', () => {
    const shake = new CameraShake();
    shake.addTrauma(0.8);
    shake.punch(0.06);
    let maxOffset = 0;
    let s = shake.update(1 / 60);
    expect(s.zoom).toBeGreaterThan(1.04);
    for (let i = 0; i < 30; i++) {
      s = shake.update(1 / 60);
      maxOffset = Math.max(maxOffset, Math.hypot(s.offsetX, s.offsetY));
    }
    expect(maxOffset).toBeGreaterThan(0.05);
    for (let i = 0; i < 120; i++) s = shake.update(1 / 60);
    expect(s).toEqual({ offsetX: 0, offsetY: 0, zoom: 1 });
  });

  it('light hits shake much less than heavy ones (strength grows with trauma squared)', () => {
    const peak = (amount: number): number => {
      const shake = new CameraShake();
      shake.addTrauma(amount);
      let m = 0;
      for (let i = 0; i < 20; i++) {
        const s = shake.update(1 / 60);
        m = Math.max(m, Math.hypot(s.offsetX, s.offsetY));
      }
      return m;
    };
    expect(peak(0.2)).toBeLessThan(peak(0.8) * 0.2);
  });

  it('moves smoothly between frames (no random jumps)', () => {
    const shake = new CameraShake();
    shake.addTrauma(1);
    let prev = shake.update(1 / 120);
    for (let i = 0; i < 60; i++) {
      const s = shake.update(1 / 120);
      expect(Math.hypot(s.offsetX - prev.offsetX, s.offsetY - prev.offsetY)).toBeLessThan(0.2);
      prev = s;
    }
  });

  it('caps trauma at 1', () => {
    const shake = new CameraShake();
    shake.addTrauma(0.7);
    shake.addTrauma(0.7);
    expect(shake.trauma).toBe(1);
  });
});
