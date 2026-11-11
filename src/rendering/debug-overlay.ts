import { Graphics } from 'pixi.js';

/**
 * Developer overlay (Phase 1): collider outlines drawn over the world plus a
 * small text panel (FPS, physics rate, counts). Off by default; toggled with
 * the backquote key or `?debug` in the URL. Never shown to players by default.
 */
export class DebugOverlay {
  readonly colliderLayer = new Graphics();
  private visible = false;
  private segments = 0;

  constructor(private readonly panel: HTMLElement) {
    this.colliderLayer.label = 'debug-colliders';
    this.setVisible(false);
  }

  get enabled(): boolean {
    return this.visible;
  }

  /** Line segments drawn on the most recent frame (for tests). */
  get drawnSegments(): number {
    return this.segments;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.colliderLayer.visible = visible;
    this.panel.hidden = !visible;
    if (!visible) {
      this.colliderLayer.clear();
      this.segments = 0;
    }
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  /** @param lines collider outlines as [x1, y1, x2, y2, ...] in world metres. */
  draw(lines: Float32Array, stats: Record<string, string | number>): void {
    if (!this.visible) return;
    const g = this.colliderLayer.clear();
    for (let i = 0; i + 3 < lines.length; i += 4) {
      g.moveTo(lines[i] ?? 0, lines[i + 1] ?? 0).lineTo(lines[i + 2] ?? 0, lines[i + 3] ?? 0);
    }
    g.stroke({ width: 0.04, color: 0x39ff88, alpha: 0.9 });
    this.segments = lines.length / 4;
    this.panel.textContent = Object.entries(stats)
      .map(([k, v]) => `${k}: ${v}`)
      .join('  ·  ');
  }

  destroy(): void {
    this.colliderLayer.destroy();
  }
}
