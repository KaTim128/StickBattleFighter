import { type Application, Container, Rectangle } from 'pixi.js';
import { idlePose, idleStyleFor } from '../animation/greybox-motion';
import type { Pose } from '../animation/skeleton';
import { solveSkeleton } from '../animation/skeleton';
import { stancePose } from '../animation/stance';
import type { FighterDef } from '../data/fighters/fighter-def';
import type { SelectStance } from '../data/presentation/select-stances';
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
  const body = def.effects.body ?? '';
  // Each fighter strikes its own pose (redesign, owner 13/11/2026): the brawler squares up with fists low and
  // ready, the mage holds the staff aside and raises a casting hand, the stalker lifts the knife
  // beside the mask, the mannequin keeps a textbook guard; Inferno keeps his approved fists-up pose.
  const poses: Record<string, Pick<Pose, 'armFront' | 'armBack'> & { lean?: number }> = {
    muscle: { armFront: { root: rad(-5), bend: rad(75) }, armBack: { root: rad(-45), bend: rad(65) }, lean: rad(8) },
    robe: { armFront: { root: rad(95), bend: rad(35) }, armBack: { root: rad(28), bend: rad(62) } },
    cloak: { armFront: { root: rad(112), bend: rad(62) }, armBack: { root: rad(-30), bend: rad(60) }, lean: rad(-8) },
    solid: { armFront: { root: rad(55), bend: rad(110) }, armBack: { root: rad(30), bend: rad(120) } },
  };
  const own = poses[body];
  return {
    ...base,
    lean: own?.lean ?? rad(4),
    head: rad(-6),
    armFront: own?.armFront ?? { root: rad(38), bend: rad(95) },
    armBack: own?.armBack ?? { root: rad(-25), bend: rad(110) },
  };
}

/** The fighter's own view, drawn as in the arena. */
function makeView(def: FighterDef): StickmanView {
  return new StickmanView(
    def.bones,
    def.look,
    def.effects.head === 'flame' && !def.capabilities.usesFireEffects ? 'round' : (def.effects.head ?? 'round'),
    (def.effects.body === 'flame' || def.effects.body === 'magma') && !def.capabilities.usesFireEffects
      ? 'solid'
      : (def.effects.body ?? 'solid'),
    1,
    def.effects.held ?? null,
  );
}

function placeFighter(def: FighterDef): Slot {
  const view = makeView(def);
  const premium = lookFor(def.effects.body) !== undefined;
  const bodyK = def.bones.spine / 0.5; // bigger rigs get a bigger window
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
  const pitch = cell * 3; // gaps between windows keep a neighbour's staff or arm out of a portrait
  const sheet = new Container();
  const slots = defs.map((def, i) => {
    const slot = placeFighter(def);
    const px = (PX_PER_M * FRAME_M) / slot.frameM; // pixels per metre for this window
    slot.view.root.scale.set(px);
    // Put this fighter's window at (i * cell, 0) in the sheet.
    slot.view.root.position.set(i * pitch - (slot.cx - slot.frameM / 2) * px, -(slot.cy - slot.frameM / 2) * px);
    sheet.addChild(slot.view.root);
    return slot;
  });
  try {
    const canvas = app.renderer.extract.canvas({
      target: sheet,
      frame: new Rectangle(0, 0, pitch * defs.length, cell),
      resolution: 1,
    }) as HTMLCanvasElement;
    return slots.map((_, i) => {
      const out = document.createElement('canvas');
      out.width = cell;
      out.height = cell;
      const ctx = out.getContext('2d');
      const premium = lookFor(defs[i]!.effects.body);
      if (ctx && premium) premiumBackdrop(ctx, cell, premium);
      ctx?.drawImage(canvas, i * pitch, 0, cell, cell, 0, 0, cell, cell);
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
 * frame. Keyed by body style: every redesigned fighter has one (Inferno: `magma`).
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
  muscle: { deep: '#05080d', mid: '#16263c', glow: '#3aa8ff', spark: '#cfeaff', frame: '#7fd4ff' },
  robe: { deep: '#030205', mid: '#180a24', glow: '#4f1d85', spark: '#a8e08a', frame: '#7b3fc4' },
  cloak: { deep: '#040304', mid: '#2a0608', glow: '#c0141e', spark: '#ff8a8a', frame: '#e5242e' },
  solid: { deep: '#0b0d12', mid: '#2b3240', glow: '#ffb000', spark: '#fff0b0', frame: '#ffc83a' },
};

/** The premium portrait look for a body style (every redesigned fighter, owner 13/11/2026). */
function lookFor(body: string | undefined): PremiumLook | undefined {
  return body ? PREMIUM[body] : undefined;
}

/** '#rrggbb' at an alpha, as a CSS colour. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Behind the fighter: a dark arena glowing with fire from below and behind, smoke and embers. */
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

/** The select screen's window, metres: tall enough for the giant and a planted staff, feet on a floor line. */
const SELECT_WINDOW = { heightM: 2.75, widthM: 2.1, floorM: 0.14 } as const;

/** A fighter's idle animation as a strip of frames (the title screen and fighter select). */
export interface IdleStrip {
  /** PNG of `frames` frames side by side, each `cellW` × `cellH` px. */
  readonly url: string;
  readonly frames: number;
  readonly cellW: number;
  readonly cellH: number;
  /** Seconds the strip spans: play it forwards then backwards (ping-pong) and it loops seamlessly. */
  readonly spanS: number;
}

/**
 * The fighters' idle animations, full body, drawn by the game's own rig and view (owner,
 * 13/11/2026: the title screen shows "the existing Stickman fighters, animated with idle/breathing
 * poses"). Each fighter's idle has its own rhythm, so the strip covers one half-cycle of it (from
 * the lowest to the highest point of the head, measured from the rig); played back and forth it
 * loops with no jump. One GPU read-back per fighter.
 */
export async function renderIdleStrips(
  app: Application,
  defs: readonly FighterDef[],
  /** The fighter's select stance, if it has one (owner, 13/11/2026); otherwise its idle is used. */
  stanceFor: (def: FighterDef) => SelectStance | undefined = () => undefined,
  frames = 10,
  cellH = 300,
): Promise<IdleStrip[]> {
  const out: IdleStrip[] = [];
  for (const def of defs) {
    const stance = stanceFor(def);
    let poseAt: (k: number) => Pose;
    let spanS: number;
    if (stance) {
      // One breath in, played back and forth.
      poseAt = (k) => stancePose(stance, def.bones, k);
      spanS = 1.7;
    } else {
      const clip = def.animation.clips.Idle[0];
      const style = idleStyleFor(clip?.kind === 'procedural' ? clip.id : undefined);
      const headY = (t: number) => solveSkeleton(idlePose(t, def.bones, style), def.bones).head.y;
      // The half-cycle: the head's lowest point in the first 3 s, then its next highest point.
      const step = 1 / 60;
      let t0 = 0;
      for (let t = 0; t < 3; t += step) if (headY(t) > headY(t0)) t0 = t;
      let t1 = t0 + step;
      while (t1 < t0 + 3 && headY(t1 + step) <= headY(t1)) t1 += step;
      spanS = Math.max(0.4, t1 - t0);
      poseAt = (k) => idlePose(t0 + spanS * k, def.bones, style);
    }
    // Every fighter in the same window at the same scale (so sizes compare), the giant larger by
    // its stance's `scale`, all facing the same diagonal: towards the screen's left, turned towards
    // the camera by the stance's `turn` (owner, 13/11/2026).
    const k = stance?.scale ?? 1;
    const px = (cellH / SELECT_WINDOW.heightM) * k;
    const cellW = Math.round((SELECT_WINDOW.widthM * cellH) / SELECT_WINDOW.heightM);
    const floorY = cellH - SELECT_WINDOW.floorM * (cellH / SELECT_WINDOW.heightM);
    const pitch = cellW * 2; // a gap so a staff or knife never reaches into the next frame
    const sheet = new Container();
    for (let i = 0; i < frames; i++) {
      const view = makeView(def);
      view.turn = stance?.turn ?? 0;
      view.draw(poseAt(i / (frames - 1)), -1, 0);
      view.root.scale.set(px);
      view.root.position.set(i * pitch + cellW / 2, floorY);
      sheet.addChild(view.root);
    }
    try {
      const canvas = app.renderer.extract.canvas({
        target: sheet,
        frame: new Rectangle(0, 0, pitch * frames, cellH),
        resolution: 1,
      }) as HTMLCanvasElement;
      const strip = document.createElement('canvas');
      strip.width = cellW * frames;
      strip.height = cellH;
      const ctx = strip.getContext('2d');
      for (let i = 0; i < frames; i++) ctx?.drawImage(canvas, i * pitch, 0, cellW, cellH, i * cellW, 0, cellW, cellH);
      out.push({ url: strip.toDataURL('image/png'), frames, cellW, cellH, spanS });
    } finally {
      sheet.destroy({ children: true });
    }
  }
  return out;
}
