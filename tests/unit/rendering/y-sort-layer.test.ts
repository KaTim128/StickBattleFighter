import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { YSortLayer } from '../../../src/rendering/y-sort-layer';

describe('YSortLayer (REQ-VIS-9)', () => {
  it('draws objects lower on the screen in front, using their feet not their centres', () => {
    const layer = new YSortLayer();
    const tallPillar = new Container(); // origin at its feet
    const crate = new Container(); // origin at its centre, feet 0.5 m below
    tallPillar.y = 5.2;
    crate.y = 4.9;
    layer.add(tallPillar, 0);
    layer.add(crate, 0.5);
    layer.update();
    layer.container.sortChildren();
    // Crate feet at 5.4 are below the pillar's feet at 5.2, so the crate draws last (in front).
    expect(layer.container.children.at(-1)).toBe(crate);

    crate.y = 4.5; // feet now at 5.0: behind the pillar
    layer.update();
    layer.container.sortChildren();
    expect(layer.container.children.at(-1)).toBe(tallPillar);
    layer.destroy();
  });
});
