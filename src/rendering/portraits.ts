import { type Application, Container, Rectangle } from 'pixi.js';
import { idlePose } from '../animation/greybox-motion';
import type { Pose } from '../animation/skeleton';
import { solveSkeleton } from '../animation/skeleton';
import type { FighterDef } from '../data/fighters/fighter-def';
import { StickmanView } from './stickman-view';

/**
 * Fighter portraits (owner, 12/11/2026: "the image should actually represent the stickman's
 * face"): each portrait is the fighter itself, drawn by the same StickmanView the game uses
 * (head, shoulders and chest in its guard), rendered once to an image for the menu and the HUD.
 * Nothing is drawn by hand twice, so a portrait always matches the fighter in the arena.
 */
const PX_PER_M = 280;
/** The window is this many metres square, centred a little below the fighter's head. */
const FRAME_M = 0.95;

/** Where a fighter sits in the shared sheet, and the head-centred window to cut out. */
interface Slot {
  readonly view: StickmanView;
  readonly cx: number;
  readonly cy: number;
  /** How many metres the square window spans (premium portraits show more of the body). */
  readonly frameM: number;
}

const rad = (d: number): number => (d * Math.PI) / 180;

/**
 * The premium portrait pose: chest up and square, chin raised, fists clenched low in front of the
 * chest (never across the face), elbows out.
 */
function heroPose(def: FighterDef): Pose {
  const base = idlePose(0.2, def.bones);
  const staff = def.effects.held === 'staff';
  const heavy = def.effects.body === 'muscle';
  return {
    ...base,
    lean: rad(4),
    head: rad(-6),
    // A staff (held in the rear hand) stands out in front, clear of the face; a heavyweight's fists
    // sit low at the chest so the head shows.
    armFront: heavy ? { root: rad(-15), bend: rad(48) } : { root: rad(38), bend: rad(95) },
    armBack: staff
      ? { root: rad(64), bend: rad(10) }
      : heavy
        ? { root: rad(-55), bend: rad(55) }
        : { root: rad(-25), bend: rad(110) },
  };
}

function placeFighter(def: FighterDef): Slot {
  const view = new StickmanView(
    def.bones,
    def.look,
    def.effects.head === 'flame' && !def.capabilities.usesFireEffects ? 'round' : (def.effects.head ?? 'round'),
    (def.effects.body === 'flame' || def.effects.body === 'magma') && !def.capabilities.usesFireEffects
      ? 'solid'
      : (def.effects.body ?? 'solid'),
    1,
    def.effects.held ?? null,
  );
  const premium = PREMIUM[def.effects.body ?? ''] !== undefined;
  // Bigger rigs get a bigger window (the frame is set for a standard 0.5 m spine).
  const bodyK = def.bones.spine / 0.5;
  // Premium portraits: a relaxed, open stance so the face and chest are not hidden by the guard,
  // framed wider so the head, its crest and the shoulders all fit (head in the upper third).
  const pose = premium ? heroPose(def) : idlePose(0.2, def.bones);
  view.draw(pose, 1, 0);
  // Centre on this fighter's own head (heights and stances differ), with the shoulders below it.
  const head = solveSkeleton(pose, def.bones).head;
  return premium
    ? { view, cx: head.x + 0.02, cy: head.y + 0.24 * bodyK, frameM: 1.25 * bodyK }
    : { view, cx: head.x + 0.08, cy: head.y + 0.2, frameM: FRAME_M };
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
    const px = (PX_PER_M * FRAME_M) / slot.frameM; // pixels per metre for this window
    slot.view.root.scale.set(px);
    // Put this fighter's window at (i * cell, 0) in the sheet.
    slot.view.root.position.set(i * cell - (slot.cx - slot.frameM / 2) * px, -(slot.cy - slot.frameM / 2) * px);
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
      const ctx = out.getContext('2d');
      const premium = PREMIUM[defs[i]!.effects.body ?? ''];
      if (ctx && premium) premiumBackdrop(ctx, cell, premium);
      ctx?.drawImage(canvas, i * cell, 0, cell, cell, 0, 0, cell, cell);
      if (ctx && premium) premiumFinish(ctx, cell, premium);
      return out.toDataURL('image/png');
    });
  } finally {
    sheet.destroy({ children: true });
  }
}

/**
 * Premium portraits (owner, 13/11/2026: the visual-redesign prototype): the in-game model lit
 * against an atmospheric backdrop in the fighter's element, with a rim of light, a vignette and a
 * frame. Keyed by body style (each skin its own element colours).
 */
interface PremiumLook {
  readonly deep: string;
  readonly mid: string;
  readonly glow: string;
  readonly spark: string;
  readonly frame: string;
}
const PREMIUM: Readonly<Record<string, PremiumLook>> = {
  magma: { deep: '#120403', mid: '#5a1306', glow: '#ff6a1a', spark: '#ffc24a', frame: '#ffb347' },
  muscle: { deep: '#07090d', mid: '#1f2a3c', glow: '#7f9cc4', spark: '#d6e2f4', frame: '#c9d4e6' },
  robe: { deep: '#07030c', mid: '#2a0f45', glow: '#9a5cff', spark: '#e2ccff', frame: '#c9a6ff' },
  cloak: { deep: '#040304', mid: '#2a0608', glow: '#c0141e', spark: '#ff8a8a', frame: '#e5242e' },
  solid: { deep: '#0b0d12', mid: '#2b3240', glow: '#9fb0c8', spark: '#ffffff', frame: '#dfe5ee' },
};

/** '#rrggbb' at an alpha, as a CSS colour. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Behind the fighter: a dark arena glowing in its element's colour from below and behind, with sparks. */
function premiumBackdrop(ctx: CanvasRenderingContext2D, size: number, look: PremiumLook): void {
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, look.deep);
  bg.addColorStop(0.65, look.mid);
  bg.addColorStop(1, look.glow);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  // A burst of light behind the head and shoulders.
  const halo = ctx.createRadialGradient(size * 0.5, size * 0.3, size * 0.12, size * 0.5, size * 0.35, size * 0.7);
  halo.addColorStop(0, 'rgba(20, 4, 2, 0.55)');
  halo.addColorStop(0.45, rgba(look.glow, 0.12));
  halo.addColorStop(0.8, rgba(look.glow, 0.38));
  halo.addColorStop(1, rgba(look.glow, 0.15));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  // Light rays fanning up from behind him.
  ctx.save();
  ctx.translate(size * 0.5, size * 0.55);
  for (let i = 0; i < 9; i++) {
    ctx.rotate((Math.PI * 2) / 9);
    ctx.fillStyle = rgba(look.spark, 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.06, -size);
    ctx.lineTo(size * 0.06, -size);
    ctx.fill();
  }
  ctx.restore();
  // Embers drifting up (fixed pattern so the portrait is the same every time).
  for (let i = 0; i < 26; i++) {
    const x = ((i * 73) % 100) / 100;
    const y = ((i * 37 + 11) % 100) / 100;
    const r = size * (0.004 + ((i * 13) % 5) * 0.002);
    ctx.fillStyle = i % 3 ? look.spark : look.glow;
    ctx.globalAlpha = 0.35 + ((i * 7) % 5) * 0.12;
    ctx.beginPath();
    ctx.arc(x * size, y * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Over the fighter: a vignette, warm light from below, and a bevelled frame in the element's colour. */
function premiumFinish(ctx: CanvasRenderingContext2D, size: number, look: PremiumLook): void {
  const v = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.3, size * 0.5, size * 0.5, size * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);
  const under = ctx.createLinearGradient(0, size * 0.7, 0, size);
  under.addColorStop(0, rgba(look.glow, 0));
  under.addColorStop(1, rgba(look.glow, 0.35));
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = under;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);
  ctx.globalCompositeOperation = 'source-over';
  const b = Math.max(2, size * 0.022);
  ctx.lineWidth = b;
  ctx.strokeStyle = '#1a0a04';
  ctx.strokeRect(b / 2, b / 2, size - b, size - b);
  ctx.lineWidth = b * 0.5;
  ctx.strokeStyle = look.frame;
  ctx.strokeRect(b * 1.1, b * 1.1, size - b * 2.2, size - b * 2.2);
}

export async function renderPortrait(app: Application, def: FighterDef): Promise<string> {
  return (await renderPortraits(app, [def]))[0]!;
}
