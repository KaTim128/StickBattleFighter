import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BackWallDepth, isBehindViewer } from '../../../src/rendering/wall-occlusion';
import { YSortLayer } from '../../../src/rendering/y-sort-layer';

/** The shared wall rules (owner, 20/11/2026): one behaviour for the house and every arena. */
describe('wall occlusion rules', () => {
  const at = { x: 10, y: 10 };
  it('a wall north of a person, or west of them, is behind them; one south or east is in front', () => {
    expect(isBehindViewer({ x0: 4, y0: 9, x1: 16, y1: 9.3 }, at)).toBe(true); // north, east-west
    expect(isBehindViewer({ x0: 9, y0: 4, x1: 9.3, y1: 16 }, at)).toBe(true); // west, north-south
    expect(isBehindViewer({ x0: 4, y0: 11, x1: 16, y1: 11.3 }, at)).toBe(false); // south
    expect(isBehindViewer({ x0: 11, y0: 4, x1: 11.3, y1: 16 }, at)).toBe(false); // east
  });

  it('holds a back wall behind the person in depth, even when its far end sorts in front, and lets go again', () => {
    const layer = new YSortLayer();
    const wall = new Container();
    wall.position.set(0, 50); // its sort key is far in front of the person's
    layer.add(wall, 0);
    const person = new Container();
    person.zIndex = 10;
    const depth = new BackWallDepth();
    const piece = { node: wall, rect: { x0: 4, y0: 9, x1: 16, y1: 9.3 } };
    depth.apply(layer, [piece], [{ ...at, z: person.zIndex }]);
    layer.update();
    expect(wall.zIndex).toBeLessThan(person.zIndex);
    // A person standing north of the wall: it is no longer behind them, so it sorts as it should.
    depth.apply(layer, [piece], [{ x: 10, y: 5, z: person.zIndex }]);
    layer.update();
    expect(wall.zIndex).toBe(50);
  });

  it('a wall in front of the person keeps its own depth', () => {
    const layer = new YSortLayer();
    const wall = new Container();
    wall.position.set(0, 50);
    layer.add(wall, 0);
    new BackWallDepth().apply(layer, [{ node: wall, rect: { x0: 4, y0: 11, x1: 16, y1: 11.3 } }], [{ ...at, z: 10 }]);
    layer.update();
    expect(wall.zIndex).toBe(50);
  });
});
