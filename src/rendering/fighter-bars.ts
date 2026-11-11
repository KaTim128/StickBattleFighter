import { Graphics } from 'pixi.js';

/**
 * Small health (and optionally stamina) bars floating above a fighter's head
 * (PRS-10 in-world bars; the full HUD arrives in Phase 11). World units.
 */
const W = 0.9;
const H = 0.09;

export class FighterBars {
  readonly node = new Graphics();

  constructor(private readonly showStamina: boolean) {
    this.node.label = 'fighter-bars';
  }

  draw(x: number, headTopY: number, hpFrac: number, staminaFrac: number, visible: boolean): void {
    const g = this.node.clear();
    g.visible = visible;
    if (!visible) return;
    const top = headTopY - 0.3;
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
