/** A node with a known box: a Container holding nothing has empty bounds, so give it a measurable child. */
import { Container, Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { OCCLUDED_ALPHA, OcclusionFader } from '../../../src/rendering/occlusion-fader';

function box(x: number, y: number, w: number, h: number, z: number): Container {
  const c = new Container();
  c.addChild(new Graphics().rect(0, 0, w, h).fill(0xffffff));
  c.position.set(x, y);
  c.zIndex = z;
  return c;
}

describe('occlusion fader', () => {
  it('fades a thing in front of the viewer that overlaps it, and brings it back', () => {
    const fader = new OcclusionFader();
    const wall = box(0, 0, 4, 4, 10);
    const person = box(1, 1, 1, 2, 5);
    fader.add(wall);
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBeCloseTo(OCCLUDED_ALPHA, 2);
    person.position.set(50, 50);
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBe(1);
  });

  it('never fades something behind the viewer', () => {
    const fader = new OcclusionFader();
    const wall = box(0, 0, 4, 4, 1);
    const person = box(1, 1, 1, 2, 5);
    fader.add(wall);
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBe(1);
  });

  it('the house setting fades further, and just before the person is covered', () => {
    const fader = new OcclusionFader({ occludedAlpha: 0.14, grow: 0.5 });
    const wall = box(2, 0, 4, 4, 10);
    const person = box(1, 1, 0.8, 2, 5); // ends 0.2 m short of the wall on screen
    fader.add(wall);
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBeCloseTo(0.14, 2);
    const plain = new OcclusionFader();
    const wall2 = box(2, 0, 4, 4, 10);
    plain.add(wall2);
    for (let i = 0; i < 30; i++) plain.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall2.alpha).toBe(1);
  });
});

describe('forced fading', () => {
  it('makes the chosen nodes see-through even with nothing behind them, and restores them', () => {
    const fader = new OcclusionFader({ occludedAlpha: 0.14 });
    const wall = box(0, 0, 4, 4, 10);
    const person = box(50, 50, 1, 2, 5);
    fader.add(wall);
    fader.setForced(new Set([wall]));
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBeCloseTo(0.14, 2);
    fader.setForced(new Set());
    for (let i = 0; i < 30; i++) fader.update([{ node: person, depth: () => person.zIndex }], 0.05);
    expect(wall.alpha).toBe(1);
  });
});
