import { Graphics, Text } from 'pixi.js';

/**
 * Small health (and optionally stamina) bars floating above a fighter's head
 * (PRS-10 in-world bars; the full HUD arrives in Phase 11). World units.
 */
const W = 0.9;
const H = 0.09;

export class FighterBars {
  readonly node = new Graphics();

  /** A short tag above the bar: which stat Lucky Hat raised, or the lock's remaining time (null hides it). */
  private readonly tag = new Text({
    text: '',
    style: { fontSize: 44, fontWeight: 'bold', fill: 0xffe08a, stroke: { color: 0x0b0d12, width: 8 } },
  });
  private tagText = '';

  constructor(private readonly showStamina: boolean) {
    this.node.label = 'fighter-bars';
    this.tag.anchor.set(0.5, 1);
    this.tag.scale.set(0.0042);
    this.tag.visible = false;
    this.node.addChild(this.tag);
  }

  setTag(text: string | null): void {
    const t = text ?? '';
    if (t === this.tagText) return;
    this.tagText = t;
    this.tag.text = t;
    this.tag.visible = t !== '';
  }

  draw(x: number, headTopY: number, hpFrac: number, staminaFrac: number, visible: boolean): void {
    const g = this.node.clear();
    g.visible = visible;
    if (!visible) return;
    const top = headTopY - 0.3;
    this.tag.position.set(x, top - 0.06);
    const hp = Math.max(0, Math.min(1, hpFrac));
    const hpColour = hp > 0.5 ? 0x4ccf6a : hp > 0.25 ? 0xf2c14e : 0xe5484d;
    g.rect(x - W / 2 - 0.02, top - 0.02, W + 0.04, H + 0.04).fill({ color: 0x0b0d12, alpha: 0.75 });
    g.rect(x - W / 2, top, W * hp, H).fill(hpColour);
    if (this.showStamina) {
      const st = Math.max(0, Math.min(1, staminaFrac));
      g.rect(x - W / 2 - 0.02, top + H + 0.02, W + 0.04, H * 0.6 + 0.04).fill({ color: 0x0b0d12, alpha: 0.75 });
      g.rect(x - W / 2, top + H + 0.04, W * st, H * 0.6).fill(0xf5d76e);
    }
  }

  destroy(): void {
    this.node.destroy();
  }
}
