import { type Application, Container, Rectangle } from 'pixi.js';
import { idlePose } from '../animation/greybox-motion';
import { solveSkeleton } from '../animation/skeleton';
import type { FighterDef } from '../data/fighters/fighter-def';
import { StickmanView } from './stickman-view';

/**
 * Fighter portraits (owner, 12/11/2026: "the image should actually represent the stickman's
 * face"): each portrait is the fighter itself, drawn by the same StickmanView the game uses
 * (head, shoulders and chest in its guard), rendered once to an image for the menu and the HUD.
 * Nothing is drawn by hand twice, so a portrait always matches the fighter in the arena.
 */
const PX_PER_M = 140;
/** The window is this many metres square, centred a little below the fighter's head. */
const FRAME_M = 0.95;

export async function renderPortrait(app: Application, def: FighterDef): Promise<string> {
  const view = new StickmanView(
    def.bones,
    def.look,
    def.effects.head === 'flame' && !def.capabilities.usesFireEffects ? 'round' : (def.effects.head ?? 'round'),
    def.effects.body === 'flame' && !def.capabilities.usesFireEffects ? 'solid' : (def.effects.body ?? 'solid'),
  );
  const pose = idlePose(0.2, def.bones);
  view.draw(pose, 1, 0);
  // Centre on this fighter's own head (heights and stances differ), with the shoulders below it.
  const head = solveSkeleton(pose, def.bones).head;
  const cx = head.x + 0.08;
  const cy = head.y + 0.2;
  const holder = new Container();
  holder.addChild(view.root);
  view.root.scale.set(PX_PER_M);
  try {
    return await app.renderer.extract.base64({
      target: holder,
      frame: new Rectangle(
        (cx - FRAME_M / 2) * PX_PER_M,
        (cy - FRAME_M / 2) * PX_PER_M,
        FRAME_M * PX_PER_M,
        FRAME_M * PX_PER_M,
      ),
      resolution: 1,
    });
  } finally {
    holder.destroy({ children: true });
  }
}
