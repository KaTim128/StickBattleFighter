import type { Container } from 'pixi.js';
import type { GameScene } from '../../core/scene';
import type { PhysicsWorld } from '../../physics/physics-world';

/** Screen size in CSS pixels, read each frame so scenes can frame themselves. */
export type Viewport = () => { width: number; height: number };

/** A scene with a physical arena: exposes what the debug overlay and test hook read. */
export interface ArenaScene extends GameScene {
  readonly world: Container | null;
  readonly physics: PhysicsWorld | null;
  debugStats(): Record<string, string | number>;
}
