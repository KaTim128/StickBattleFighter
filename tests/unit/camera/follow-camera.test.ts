import { describe, expect, it } from 'vitest';
import { cameraScale, clampCamera, FollowCamera } from '../../../src/camera/follow-camera';

const BOUNDS = { minX: 0, minY: 0, maxX: 30, maxY: 20 };

describe('FollowCamera (REQ-CAM-1/3)', () => {
  it('shows the same number of metres across the short side on any screen', () => {
    expect(cameraScale(1280, 720, 10)).toBe(72);
    expect(cameraScale(412, 915, 10)).toBeCloseTo(41.2, 6);
  });

  it('stays inside the arena near edges and centres when the arena is smaller than the view', () => {
    expect(clampCamera(1, 1, 5, 3, BOUNDS)).toEqual({ x: 5, y: 3 });
    expect(clampCamera(29, 19, 5, 3, BOUNDS)).toEqual({ x: 25, y: 17 });
    expect(clampCamera(3, 3, 20, 3, BOUNDS)).toEqual({ x: 15, y: 3 });
  });

  it('eases towards a moving target rather than jumping', () => {
    const cam = new FollowCamera({ x: 10, y: 10 }, BOUNDS);
    cam.update({ x: 14, y: 10 }, 1 / 60, 1280, 720);
    expect(cam.x).toBeGreaterThan(10);
    expect(cam.x).toBeLessThan(11);
    for (let i = 0; i < 180; i++) cam.update({ x: 14, y: 10 }, 1 / 60, 1280, 720);
    expect(cam.x).toBeCloseTo(14, 2);
  });
});
