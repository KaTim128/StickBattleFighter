/**
 * Scene lifecycle (Phase 1). A scene owns everything it creates (display
 * objects, physics world, listeners) and must release all of it in unload(),
 * so switching scenes never leaks memory or leaves stray objects behind.
 */
export interface GameScene {
  readonly name: string;
  /** Build the scene. May load assets; must not start loops of its own. */
  load(): Promise<void>;
  /** Advance gameplay by one fixed step (TD-013). */
  update(stepS: number): void;
  /**
   * Sync visuals to the latest state. `alpha` interpolates between fixed steps;
   * `frameDtS` is the real time since the previous frame (animation, camera easing).
   */
  render(alpha: number, frameDtS: number): void;
  /** Release everything the scene created. Called exactly once per successful load. */
  unload(): void;
}

export type SceneFactory = () => GameScene;

export interface SceneManagerEvents {
  onLoaded?(scene: GameScene): void;
  onUnloaded?(scene: GameScene): void;
  onError?(sceneName: string, error: unknown): void;
}

/**
 * Runs one scene at a time. Switches are serialised: if a newer switch is
 * requested while an older scene is still loading, the older one is unloaded
 * as soon as it finishes and never becomes active.
 */
export class SceneManager {
  private current: GameScene | null = null;
  private switchToken = 0;

  constructor(private readonly events: SceneManagerEvents = {}) {}

  get active(): GameScene | null {
    return this.current;
  }

  async switchTo(factory: SceneFactory): Promise<GameScene | null> {
    const token = ++this.switchToken;
    this.unloadCurrent();

    const scene = factory();
    try {
      await scene.load();
    } catch (error) {
      // A half-built scene still gets a chance to release what it created.
      this.safeUnload(scene);
      this.events.onError?.(scene.name, error);
      return null;
    }

    if (token !== this.switchToken) {
      // Superseded by a newer switch while loading.
      this.safeUnload(scene);
      return null;
    }

    this.current = scene;
    this.events.onLoaded?.(scene);
    return scene;
  }

  update(stepS: number): void {
    this.current?.update(stepS);
  }

  render(alpha: number, frameDtS: number): void {
    this.current?.render(alpha, frameDtS);
  }

  /** Unload the active scene, leaving none running. */
  clear(): void {
    this.switchToken++;
    this.unloadCurrent();
  }

  private unloadCurrent(): void {
    const scene = this.current;
    this.current = null;
    if (scene) {
      this.safeUnload(scene);
      this.events.onUnloaded?.(scene);
    }
  }

  private safeUnload(scene: GameScene): void {
    try {
      scene.unload();
    } catch (error) {
      this.events.onError?.(scene.name, error);
    }
  }
}
