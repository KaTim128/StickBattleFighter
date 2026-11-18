import type { Container } from 'pixi.js';
import { loadCharacter } from '../../characters/load';
import type { GameScene } from '../../core/scene';
import { HOUSE } from '../../data/arenas/house';
import type { PlayerIntents } from '../../input/intents';
import { HideSeekGame, type PlayerInput } from '../../modes/hide-seek/game';
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
  private cam = { x: 0, y: 0 };
  private doorStates = new Map<string, boolean>();
  /** The last floor the player's figure was added to. */
  private playerFloor: 0 | 1 = 0;

  constructor(
    private readonly parent: Container,
    private readonly intents: PlayerIntents,
    private readonly viewport: Viewport,
    game: HideSeekGame = new HideSeekGame(HOUSE),
  ) {
    this.game = game;
  }

  async load(): Promise<void> {
    const house = this.game.house;
    this.view = buildHouseView(house, this.game.world);
    this.world = this.view.world;
    this.parent.addChild(this.view.world);
    // The player is the standard training dummy (section: "the standard dummy training character").
    const dummy = loadCharacter('training-dummy').def;
    this.player = new ActorView(dummy);
    this.view.floors[0].actors.add(this.player.view.root, 0);
    const p = this.game.player;
    const at = iso(p.x, p.y, p.z);
    this.cam = { x: at.x, y: at.y - p.floor * FLOOR_HEIGHT_M };
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
    player.draw(frameDtS, { speedMps: p.speedMps, running: p.posture === 'run', crouching: p.crouching }, p.facing, 0);
    const at = iso(p.x, p.y, p.z);
    player.view.root.position.set(at.x, at.y);

    // Only the floor the player is on is drawn for now (room visibility, P2-2, refines this).
    view.floors[0].container.visible = p.floor === 0;
    view.floors[1].container.visible = p.floor === 1;
    for (const f of view.floors) f.actors.update();
    view.fader.update([{ node: player.view.root, depth: () => player.view.root.zIndex }], frameDtS);

    // The camera glides after the player.
    const goalX = at.x;
    const goalY = at.y - p.floor * FLOOR_HEIGHT_M - 0.8;
    const k = 1 - Math.exp(-CAMERA_RATE * frameDtS);
    this.cam.x += (goalX - this.cam.x) * k;
    this.cam.y += (goalY - this.cam.y) * k;
    const { width, height } = this.viewport();
    const scale = Math.min(width, height) / VIEW_SHORT_SIDE_M;
    view.world.scale.set(scale);
    view.world.position.set(width / 2 - this.cam.x * scale, height / 2 - this.cam.y * scale);
  }

  unload(): void {
    this.view?.destroy();
    this.view = null;
    this.player = null;
    this.world = null;
  }

  debugStats(): Record<string, string | number> {
    const p = this.game.player;
    return { floor: p.floor, x: p.x.toFixed(1), y: p.y.toFixed(1), phase: this.game.round.phase };
  }
}
