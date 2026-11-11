import { Container, Graphics } from 'pixi.js';
import { ENGINE_CHECK } from '../data/arenas/engine-check';
import { buildGreyboxArenaView, type GreyboxArenaView } from './greybox-arena-view';

/** Engine-check arena (GREYBOX): the shared greybox arena plus the sliding crate. */
export interface EngineCheckView extends GreyboxArenaView {
  readonly crate: Container;
}

export function buildEngineCheckView(): EngineCheckView {
  const arena = buildGreyboxArenaView(ENGINE_CHECK);
  const { crateHalfSizeM: c, colours } = ENGINE_CHECK;
  const crate = new Container();
  crate.label = 'greybox-crate';
  const shadow = new Graphics().rect(-c + 0.12, -c + 0.18, c * 2, c * 2).fill({ color: colours.shadow, alpha: 0.3 });
  const body = new Graphics()
    .rect(-c, -c, c * 2, c * 2)
    .fill(colours.crate)
    .stroke({ width: 0.06, color: colours.crateEdge })
    .moveTo(-c, -c)
    .lineTo(c, c)
    .moveTo(c, -c)
    .lineTo(-c, c)
    .stroke({ width: 0.05, color: colours.crateEdge });
  crate.addChild(shadow, body);
  crate.position.set(ENGINE_CHECK.crateStart.x, ENGINE_CHECK.crateStart.y);
  arena.actors.add(crate, c);
  return { ...arena, crate };
}
