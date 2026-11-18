import { type Container, Graphics } from 'pixi.js';
import { loadCharacter } from '../../characters/load';
import type { GameScene } from '../../core/scene';
import { HOUSE, HOUSE_CAST } from '../../data/arenas/house';
import type { PlayerIntents } from '../../input/intents';
import { HideSeekGame, type PlayerInput } from '../../modes/hide-seek/game';
import { visionPolygon } from '../../modes/hide-seek/perception';
import { Visibility } from '../../modes/hide-seek/visibility';
import type { Point } from '../../modes/hide-seek/world';
import { FLOOR_HEIGHT_M } from '../../modes/hide-seek/world';
import { ActorView } from '../../rendering/actor-view';
import { buildHouseView, type HouseView } from '../../rendering/house-view';
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
  ) {
    this.game = game;
    this.visibility = new Visibility(game.world);
  }

  async load(): Promise<void> {
    const house = this.game.house;
    this.view = buildHouseView(house, this.game.world);
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
      return { node: n.node, floor: n.floor, kind: n.kind, id: n.id, room: n.room, probes };
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
    player.view.root.alpha = p.hidingIn ? 0.4 : 1;
    const at = iso(p.x, p.y, p.z);
    player.view.root.position.set(at.x, at.y);

    // Room visibility and lighting: what the eyes can see from where they are (body plus any peek).
    this.renderProps(view);
    this.renderHunter(view, frameDtS);
    const eyes = g.viewer();
    this.visibility.update(frameDtS, eyes);
    this.applyVisibility();
    for (const f of view.floors) f.actors.update();
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
      const alert = h.mode === 'chase' ? 0.3 : 0.14 + h.awareness * 0.14;
      cone
        .poly(poly.flatMap((q) => [iso(q.x, q.y).x, iso(q.x, q.y).y]))
        .fill({ color: h.mode === 'chase' ? 0xff3030 : 0xffd070, alpha: alert });
    }
  }

  /** The throwable objects: on the floor, carried over the player's head, or flying in an arc. */
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

  /** Light every drawn thing by how visible its room is: a tint (darkness) and hidden when black. */
  private applyVisibility(): void {
    const vis = this.visibility;
    const view = this.view;
    if (!view) return;
    for (const f of [0, 1] as const) {
      const o = vis.floorOpacity(f);
      view.floors[f].container.visible = o > 0.01;
      view.floors[f].container.alpha = Math.min(1, o);
    }
    for (const n of this.lit) {
      let level: number;
      if (n.kind === 'furniture') level = vis.objectAlpha(n.id);
      else if (n.room !== null) level = vis.roomLight(n.room);
      else if (n.probes) level = Math.max(vis.lightAt(n.floor, n.probes[0]), vis.lightAt(n.floor, n.probes[1]));
      else level = 0;
      n.node.visible = level > 0.02;
      if (n.node.visible) {
        const grey = Math.round(255 * (0.18 + 0.82 * Math.min(1, level)));
        n.node.tint = (grey << 16) | (grey << 8) | grey;
      }
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
