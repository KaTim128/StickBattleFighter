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

/** Where a fighter sits in the shared sheet, and the head-centred window to cut out. */
interface Slot {
  readonly view: StickmanView;
  readonly cx: number;
  readonly cy: number;
}

function placeFighter(def: FighterDef): Slot {
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
  return { view, cx: head.x + 0.08, cy: head.y + 0.2 };
}

/**
 * Render several portraits with ONE read-back from the GPU (each read-back stalls the frame, which
 * matters on slow phones and in CI): the fighters stand side by side in one sheet, which is cut into
 * squares on a 2D canvas.
 */
export async function renderPortraits(app: Application, defs: readonly FighterDef[]): Promise<string[]> {
  if (defs.length === 0) return [];
  const cell = Math.round(FRAME_M * PX_PER_M);
  const sheet = new Container();
  const slots = defs.map((def, i) => {
    const slot = placeFighter(def);
    slot.view.root.scale.set(PX_PER_M);
    // Put this fighter's window at (i * cell, 0) in the sheet.
    slot.view.root.position.set(i * cell - (slot.cx - FRAME_M / 2) * PX_PER_M, -(slot.cy - FRAME_M / 2) * PX_PER_M);
    sheet.addChild(slot.view.root);
    return slot;
  });
  try {
    const canvas = app.renderer.extract.canvas({
      target: sheet,
      frame: new Rectangle(0, 0, cell * defs.length, cell),
      resolution: 1,
    }) as HTMLCanvasElement;
    return slots.map((_, i) => {
      const out = document.createElement('canvas');
      out.width = cell;
      out.height = cell;
      out.getContext('2d')?.drawImage(canvas, i * cell, 0, cell, cell, 0, 0, cell, cell);
      return out.toDataURL('image/png');
    });
  } finally {
    sheet.destroy({ children: true });
  }
}

export async function renderPortrait(app: Application, def: FighterDef): Promise<string> {
  return (await renderPortraits(app, [def]))[0]!;
}
