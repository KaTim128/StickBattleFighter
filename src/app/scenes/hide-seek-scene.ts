import { type Container, Graphics, type Renderer } from 'pixi.js';
import { loadCharacter } from '../../characters/load';
import type { GameScene } from '../../core/scene';
import { HOUSE, HOUSE_CAST } from '../../data/arenas/house';
import type { PlayerIntents } from '../../input/intents';
import { HideSeekGame, type PlayerInput } from '../../modes/hide-seek/game';
import { hideCues } from '../../modes/hide-seek/hiding';
import type { Rect } from '../../modes/hide-seek/house-types';
import { visionPolygon } from '../../modes/hide-seek/perception';
import { Visibility } from '../../modes/hide-seek/visibility';
import type { Point } from '../../modes/hide-seek/world';
import { FLOOR_HEIGHT_M } from '../../modes/hide-seek/world';
import { ActorView } from '../../rendering/actor-view';
import { isLongPiece, personOrder } from '../../rendering/depth-sort';
import { bakerFor, buildHouseView, type HouseView, isFrontWallOf } from '../../rendering/house-view';
import { iso } from '../../rendering/projection';
import type { Viewport } from './arena-scene';

/**
 * The Hide and Seek scene (Phase 2, TD-095): draws the house and the people from the pure
 * `HideSeekGame` state and feeds it the player's input. It owns no rules; everything that decides
 * what happens lives in `src/modes/hide-seek/`.
 */
/** How many metres of the short side of the screen the camera shows. */
const VIEW_SHORT_SIDE_M = 14;
const CAMERA_RATE = 5;

export class HideSeekScene implements GameScene {
  readonly name = 'hide-seek';
  world: Container | null = null;
  readonly game: HideSeekGame;
  private view: HouseView | null = null;
  private player: ActorView | null = null;
  private hunterView: ActorView | null = null;
  /** The hunter's vision cone, drawn on the ground of his floor: the very area his sight test uses. */
  private cone: Graphics | null = null;
  private hunterFloor: 0 | 1 = 0;
  /** The player's figure's opacity, eased: it fades as they crawl under cover. */
  private playerAlpha = 1;
  /** Heights of the hiding places (for the bubble anchors), by furniture id. */
  private readonly spotTops = new Map<string, number>();
  /** The room whose front walls are currently see-through. */
  private fadedRoom: string | null | undefined;
  private lastHunter = { x: 0, y: 0 };
  private cam = { x: 0, y: 0 };
  /** Room visibility and lighting (section C); drives which things are drawn and how bright. */
  readonly visibility: Visibility;
  private lit: {
    node: Container;
    floor: 0 | 1;
    kind: string;
    id: string;
    room: string | null;
    probes: readonly [Point, Point] | null;
    centre: Point;
    /** A long piece of furniture, whose draw order against the player needs the footprint, not one corner. */
    long: Rect | null;
  }[] = [];
  private doorStates = new Map<string, boolean>();
  /** The last floor the player's figure was added to. */
  private playerFloor: 0 | 1 = 0;
  /** The throwable objects' pictures, by id, and the floor each sits on. */
  private readonly propViews = new Map<string, { g: Graphics; floor: 0 | 1 }>();

  constructor(
    private readonly parent: Container,
    private readonly intents: PlayerIntents,
    private readonly viewport: Viewport,
    game: HideSeekGame = new HideSeekGame(HOUSE),
    private readonly renderer?: Renderer,
  ) {
    this.game = game;
    this.visibility = new Visibility(game.world);
  }

  async load(): Promise<void> {
    const house = this.game.house;
    this.view = buildHouseView(house, this.game.world, this.renderer ? bakerFor(this.renderer) : undefined);
    for (const f of house.furniture) if (f.hide) this.spotTops.set(f.id, f.heightM);
    this.world = this.view.world;
    this.lit = this.view.nodes.map((n) => {
      const r = n.rect;
      const alongX = r.x1 - r.x0 >= r.y1 - r.y0;
      const cx = (r.x0 + r.x1) / 2;
      const cy = (r.y0 + r.y1) / 2;
      // Walls, doors and stairs belong to the two spaces beside them: they show when either is lit.
      const probes: readonly [Point, Point] | null =
        n.room === null
          ? alongX
            ? [
                { x: cx, y: r.y0 - 0.4 },
                { x: cx, y: r.y1 + 0.4 },
              ]
            : [
                { x: r.x0 - 0.4, y: cy },
                { x: r.x1 + 0.4, y: cy },
              ]
          : null;
      return {
        node: n.node,
        floor: n.floor,
        kind: n.kind,
        id: n.id,
        room: n.room,
        probes,
        centre: { x: cx, y: cy },
        long: n.kind === 'furniture' && isLongPiece(r) ? r : null,
      };
    });
    this.parent.addChild(this.view.world);
    // The player is the standard training dummy (section: "the standard dummy training character").
    const dummy = loadCharacter(HOUSE_CAST.player).def;
    for (const o of this.game.props) {
      const g = new Graphics();
      const colour = o.kind === 'bottle' ? 0x4a9a5a : o.kind === 'can' ? 0xb0b6bd : 0xd04a4a;
      g.ellipse(0, 0.02, 0.12, 0.05).fill({ color: 0x000000, alpha: 0.35 });
      if (o.kind === 'toy') g.roundRect(-0.09, -0.16, 0.18, 0.16, 0.03).fill(colour);
      else g.roundRect(-0.05, -0.26, 0.1, 0.26, 0.03).fill(colour);
      this.view.floors[o.floor].actors.add(g, 0);
      this.propViews.set(o.id, { g, floor: o.floor });
    }
    this.player = new ActorView(dummy);
    this.view.floors[0].actors.add(this.player.view.root, 0);
    this.hunterView = new ActorView(loadCharacter(HOUSE_CAST.hunter).def);
    const h = this.game.hunter;
    this.hunterFloor = h.floor;
    this.lastHunter = { x: h.x, y: h.y };
    this.view.floors[h.floor].actors.add(this.hunterView.view.root, 0);
    this.cone = new Graphics();
    this.view.floors[h.floor].ground.addChild(this.cone);
    const p = this.game.player;
    const at = iso(p.x, p.y, p.z);
    this.cam = { x: at.x, y: at.y - p.floor * FLOOR_HEIGHT_M };
    this.visibility.settle(this.game.viewer());
  }

  /** The player's input this step, from the intents (movement is already a world direction). */
  private readInput(): PlayerInput {
    const i = this.intents;
    const crouchPress = i.consumeJump();
    const interact = i.consumeInteract();
    return {
      move: i.move,
      run: i.sprint,
      crouchPress,
      interactPress: interact?.down === true,
      peek: i.peek,
    };
  }

  update(stepS: number): void {
    this.game.step(stepS, this.readInput());
  }

  render(_alpha: number, frameDtS: number): void {
    const view = this.view;
    const player = this.player;
    if (!view || !player) return;
    const g = this.game;
    const p = g.player;

    // Doors follow the world.
    for (const d of g.house.doors) {
      const open = g.world.isOpen(d.id);
      if (this.doorStates.get(d.id) !== open) {
        this.doorStates.set(d.id, open);
        view.doors.get(d.id)?.setOpen(open);
      }
    }

    // The player's figure stands on the floor it is on.
    if (p.floor !== this.playerFloor) {
      view.floors[this.playerFloor].actors.remove(player.view.root);
      view.floors[p.floor].actors.add(player.view.root, 0);
      this.playerFloor = p.floor;
    }
    player.draw(
      frameDtS,
      { speedMps: p.speedMps, running: p.posture === 'run', crouching: p.crouching || p.posture === 'hidden' },
      p.facing,
      0,
    );
    // Hiding: the figure is half hidden inside the place.
    // Hiding under a bed (or in a closed place) the body is completely out of sight: it crawls in and fades with the
    // crouch, so no leg or foot ever shows. Where the cover is partial (a curtain, a bush) it stays dimly there.
    const hidKind = g.spots.find((sp) => sp.id === p.hidingIn)?.spec.kind;
    const hiddenAlpha = hidKind && COMPLETE_COVER.has(hidKind) ? 0 : 0.4;
    const goalAlpha = p.hidingIn ? hiddenAlpha : 1;
    this.playerAlpha += (goalAlpha - this.playerAlpha) * Math.min(1, frameDtS * 7);
    if (Math.abs(this.playerAlpha - goalAlpha) < 0.02) this.playerAlpha = goalAlpha;
    player.view.root.alpha = this.playerAlpha;
    player.view.root.visible = this.playerAlpha > 0.01;
    // The catch: the player collapses once, over the killing animation (the rules start it exactly once).
    const kill = g.round.killProgress;
    player.view.root.rotation = kill > 0 ? Math.min(1, kill * 2.2) * 1.45 * p.facing : 0;
    const at = iso(p.x, p.y, p.z);
    player.view.root.position.set(at.x, at.y);

    // Room visibility and lighting: what the eyes can see from where they are (body plus any peek).
    this.renderProps(view);
    this.renderHunter(view, frameDtS);
    const eyes = g.viewer();
    this.visibility.update(frameDtS, eyes);
    this.fadeFrontWalls(view);
    this.applyVisibility();
    for (const f of view.floors) f.actors.update();
    this.sortLongPieces(player.view.root.zIndex);
    view.fader.update([{ node: player.view.root, depth: () => player.view.root.zIndex }], frameDtS);

    // The camera glides after the player.
    const lean = iso(p.x + p.peekX, p.y + p.peekY, p.z);
    const goalX = lean.x;
    const goalY = lean.y - p.floor * FLOOR_HEIGHT_M - 0.8;
    const k = 1 - Math.exp(-CAMERA_RATE * frameDtS);
    this.cam.x += (goalX - this.cam.x) * k;
    this.cam.y += (goalY - this.cam.y) * k;
    const { width, height } = this.viewport();
    const scale = Math.min(width, height) / VIEW_SHORT_SIDE_M;
    view.world.scale.set(scale);
    view.world.position.set(width / 2 - this.cam.x * scale, height / 2 - this.cam.y * scale);
  }

  /** The hunter: drawn only where the player could see him, with the cone of what he sees. */
  private renderHunter(view: HouseView, frameDtS: number): void {
    const hv = this.hunterView;
    const cone = this.cone;
    if (!hv || !cone) return;
    const g = this.game;
    const h = g.hunter;
    if (h.floor !== this.hunterFloor) {
      view.floors[this.hunterFloor].actors.remove(hv.view.root);
      view.floors[this.hunterFloor].ground.removeChild(cone);
      view.floors[h.floor].actors.add(hv.view.root, 0);
      view.floors[h.floor].ground.addChild(cone);
      this.hunterFloor = h.floor;
    }
    const moved = Math.hypot(h.x - this.lastHunter.x, h.y - this.lastHunter.y);
    this.lastHunter = { x: h.x, y: h.y };
    const facing: 1 | -1 = Math.cos(h.facing) - Math.sin(h.facing) >= 0 ? 1 : -1;
    hv.draw(
      frameDtS,
      { speedMps: moved / Math.max(frameDtS, 1e-3), running: h.gait === 'run', crouching: false },
      facing,
      0,
    );
    const at = iso(h.x, h.y, h.z);
    hv.view.root.position.set(at.x, at.y);
    const seen =
      this.visibility.canSee(g.viewer(), h.floor, h) ||
      (h.floor === g.player.floor && Math.hypot(h.x - g.player.x, h.y - g.player.y) < 1.5);
    hv.view.root.visible = seen && view.floors[h.floor].container.visible;
    cone.clear();
    if (seen && g.round.phase !== 'prep') {
      const poly = visionPolygon(g.world, h.eyes());
      const alert = h.mode === 'chase' ? 0.42 : 0.26 + h.awareness * 0.16;
      cone
        .poly(poly.flatMap((q) => [iso(q.x, q.y).x, iso(q.x, q.y).y]))
        .fill({ color: h.mode === 'chase' ? 0xff3030 : 0xffd070, alpha: alert });
    }
  }

  /** The throwable objects: on the floor, carried over the player's head, or flying in an arc. */
  /** Put long furniture in front of or behind the player by where the player stands against its footprint. */
  private sortLongPieces(playerZ: number): void {
    const p = this.game.player;
    for (const n of this.lit) {
      if (!n.long || n.floor !== p.floor) continue;
      const order = personOrder(n.long, p);
      if (order === 'in-front') n.node.zIndex = playerZ - 0.5;
      else if (order === 'behind') n.node.zIndex = playerZ + 0.5;
    }
  }

  /**
   * While the player is in a room, that room's south and east walls (and their doors) face the camera and would
   * hide the room, so they are see-through (owner, 18/11/2026). Recomputed only when the occupied room changes.
   */
  private fadeFrontWalls(view: HouseView): void {
    const id = this.visibility.occupiedRoom;
    if (id === this.fadedRoom) return;
    this.fadedRoom = id;
    const room = id ? this.game.world.room(id) : undefined;
    const set = new Set<Container>();
    if (room && !room.outdoors)
      for (const n of view.nodes)
        if ((n.kind === 'wall' || n.kind === 'door') && n.floor === room.floor && isFrontWallOf(room.rect, n.rect))
          set.add(n.node);
    view.fader.setForced(set);
  }

  /** Everything back to the start of a round: the game, the lighting memory and the hunter's picture. */
  restart(): void {
    this.game.restart();
    this.visibility.reset();
    this.visibility.settle(this.game.viewer());
    this.playerAlpha = 1;
    if (this.player) this.player.view.root.rotation = 0;
    const p = this.game.player;
    const at = iso(p.x, p.y, p.z);
    this.cam = { x: at.x, y: at.y - p.floor * FLOOR_HEIGHT_M };
  }

  /**
   * Where each floating HIDE bubble goes on the screen right now: the hiding places near the player that
   * are lit and in view, the one the act key would use marked `inReach`.
   */
  hideBubbles(): { id: string; x: number; y: number; inReach: boolean }[] {
    const view = this.view;
    if (!view) return [];
    const g = this.game;
    const p = g.player;
    const cues = hideCues(g.spots, p.floor, p, p.hidingIn === null && p.carrying === null);
    const out: { id: string; x: number; y: number; inReach: boolean }[] = [];
    for (const c of cues) {
      if (this.visibility.objectAlpha(c.spot.id) < 0.3) continue; // in the dark: not seen yet
      const top = (this.spotTops.get(c.spot.id) ?? 1) + 0.55;
      const at = iso((c.spot.rect.x0 + c.spot.rect.x1) / 2, (c.spot.rect.y0 + c.spot.rect.y1) / 2, top);
      const w = view.world;
      out.push({
        id: c.spot.id,
        x: w.position.x + at.x * w.scale.x,
        y: w.position.y + (at.y - p.floor * FLOOR_HEIGHT_M) * w.scale.y,
        inReach: c.inReach,
      });
    }
    return out;
  }

  private renderProps(view: HouseView): void {
    const g = this.game;
    const p = g.player;
    for (const o of g.props) {
      const pv = this.propViews.get(o.id);
      if (!pv) continue;
      if (pv.floor !== o.floor) {
        view.floors[pv.floor].actors.remove(pv.g);
        view.floors[o.floor].actors.add(pv.g, 0);
        pv.floor = o.floor;
      }
      let z = 0.35; // lying on a surface
      if (o.mode === 'carried') z = 1.55;
      else if (o.mode === 'flying') z = 1.2 + Math.sin(Math.min(1, o.flownM / 8) * Math.PI) * 0.5;
      const at = iso(o.x, o.y, z);
      pv.g.position.set(at.x, at.y);
      const shown =
        o.mode === 'carried' ||
        (o.floor === p.floor && this.visibility.canSee(g.viewer(), o.floor, { x: o.x, y: o.y })) ||
        (o.floor === p.floor && Math.hypot(o.x - p.x, o.y - p.y) < 1.2);
      pv.g.visible = shown && view.floors[o.floor].container.visible;
    }
  }

  /**
   * Light every drawn thing by how visible its room is, in a dark, cold, uneasy light (owner, 18/11/2026):
   * the house is dim, the far corners of a room sink toward black, the lamps flicker now and then (more
   * when the hunter is close), and a faint blue-green cast lies over everything. The player and the
   * hunter are never tinted, so the player is always clear.
   */
  private applyVisibility(): void {
    const vis = this.visibility;
    const view = this.view;
    if (!view) return;
    const g = this.game;
    const eye = g.viewer();
    for (const f of [0, 1] as const) {
      const o = vis.floorOpacity(f);
      view.floors[f].container.visible = o > 0.01;
      view.floors[f].container.alpha = Math.min(1, o);
    }
    const lamp = lampLevel(g.timeS, Math.max(g.hunter.mode === 'chase' ? 1 : 0, g.hunter.awareness));
    for (const n of this.lit) {
      let level: number;
      if (n.kind === 'furniture') level = vis.objectAlpha(n.id);
      else if (n.room !== null) level = vis.roomLight(n.room);
      else if (n.probes) level = Math.max(vis.lightAt(n.floor, n.probes[0]), vis.lightAt(n.floor, n.probes[1]));
      else level = 0;
      n.node.visible = level > 0.02;
      if (!n.node.visible) continue;
      // The farther from the player, the darker, but never black inside the lit room.
      const d = n.floor === eye.floor ? Math.hypot(n.centre.x - eye.x, n.centre.y - eye.y) : 8;
      const fall = 1 - 0.55 * smoothstep(4, 15, d);
      const b = (0.12 + 0.88 * Math.min(1, level)) * AMBIENT * lamp * fall;
      n.node.tint = (Math.round(255 * b * 0.9) << 16) | (Math.round(255 * b * 0.98) << 8) | Math.round(255 * b * 1.06);
    }
  }

  unload(): void {
    this.view?.destroy();
    this.view = null;
    this.player = null;
    this.hunterView = null;
    this.cone = null;
    this.world = null;
  }

  debugStats(): Record<string, string | number> {
    const p = this.game.player;
    return { floor: p.floor, x: p.x.toFixed(1), y: p.y.toFixed(1), phase: this.game.round.phase };
  }
}

/** Hiding places that hide the whole body (the player's figure is not drawn at all while inside). */
export const COMPLETE_COVER = new Set(['under-bed', 'wardrobe', 'cupboard', 'chest', 'box', 'shed-cabinet']);

/** The house's overall darkness: lit rooms are this bright at most. */
const AMBIENT = 0.78;

const smoothstep = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/**
 * The lamps' brightness, 0..1 of full: steady, with brief dips every few seconds that come oftener and
 * deeper as the hunter closes in (`threat` 0..1). A pure function of the game clock, so it never differs
 * between frames and tests can check it.
 */
export function lampLevel(timeS: number, threat: number): number {
  const period = 6.3 - threat * 3.2;
  const phase = (timeS % period) / period;
  const dipLen = 0.05 + threat * 0.05;
  if (phase > dipLen) return 1;
  // Inside a dip: a stutter between dark and half-lit.
  const k = phase / dipLen;
  return 0.45 + 0.35 * Math.abs(Math.sin(k * Math.PI * 3)) * (1 - threat * 0.5) - 0.25 * threat;
}
