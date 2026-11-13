import type { AbilityKit } from '../../abilities/ability-def';
import type { Weapon } from '../../animation/greybox-motion';
import type { BoneLengths } from '../../animation/skeleton';
import type { ResolvedAnimation } from '../../characters/resolve';
import type {
  AiProfile,
  AudioProfile,
  Capabilities,
  EffectsProfile,
  MoveInput,
  ObjectHandling,
  StatsProfile,
} from '../../characters/schema';
import type { AttackDef } from '../../combat/attacks';
import type { CombatStats } from '../../combat/combatant';
import type { HopTuning, MovementTuning } from '../../physics/movement';

/**
 * A fighter as the shared systems use it at runtime: a Character Definition
 * with its profiles resolved (src/characters/resolve.ts, TD-039). Every
 * fighter runs the same engine; nothing in shared code checks which one it is.
 */
export interface FighterDef {
  readonly id: string;
  readonly displayName: string;
  readonly element: string;
  readonly combatStyle: string;
  readonly characterType: string;
  readonly weapon: Weapon;
  readonly movement: MovementTuning & HopTuning;
  readonly body: { readonly footRadiusM: number; readonly massKg: number };
  readonly bones: BoneLengths;
  /** Drawn size relative to a standard fighter (1 when absent). */
  readonly sizeScale?: number;
  readonly look: {
    readonly limb: number;
    readonly limbBack: number;
    readonly outline: number;
    readonly limbWidthM: number;
    readonly outlineWidthM: number;
    readonly pants?: number;
    /** Seam and core glow of a redesigned fighter (admin fighter settings). */
    readonly glow?: number;
  };
  readonly stats: CombatStats;
  readonly multipliers: StatsProfile['multipliers'];
  /** How this fighter lifts and throws objects (Phase 7). */
  readonly objects: ObjectHandling;
  /** Available moves by id (after capability filtering and multipliers). */
  readonly moves: Readonly<Record<string, AttackDef>>;
  /** Same as `moves` (kept for older call sites and tests). */
  readonly attacks: Readonly<Record<string, AttackDef>>;
  /** The first move for each input. */
  readonly starters: Partial<Record<MoveInput, string>>;
  readonly animation: ResolvedAnimation;
  readonly capabilities: Capabilities;
  readonly effects: EffectsProfile;
  readonly audio: AudioProfile;
  readonly ai: AiProfile;
  /** Three abilities and an ultimate (REQ-ABL-2); null for training dummies. */
  readonly abilities: AbilityKit | null;
  /** Fallbacks and switched-off moves noticed while resolving (shown in dev builds and the editor). */
  readonly warnings: readonly string[];
}
