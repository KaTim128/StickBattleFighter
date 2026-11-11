import type { Weapon } from '../../animation/greybox-motion';
import type { BoneLengths } from '../../animation/skeleton';
import type { CombatStats } from '../../combat/combatant';
import type { ComboSet } from '../../combat/combo';
import type { HopTuning, MovementTuning } from '../../physics/movement';

/** Everything that defines a fighter (REQ-ARC-3, data-driven). Every fighter runs the same engine. */
export interface FighterDef {
  readonly id: string;
  readonly weapon: Weapon;
  readonly movement: MovementTuning & HopTuning;
  readonly body: { readonly footRadiusM: number; readonly massKg: number };
  readonly bones: BoneLengths;
  readonly look: {
    readonly limb: number;
    readonly limbBack: number;
    readonly outline: number;
    readonly limbWidthM: number;
    readonly outlineWidthM: number;
  };
  readonly stats: CombatStats;
  readonly attacks: ComboSet;
}
