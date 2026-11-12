/**
 * DATA-DRIVEN CHARACTER CONFIGURATION (owner request 11/11/2026, TD-039).
 *
 * A stickman is ONE Character Definition (JSON) that references reusable
 * profiles by id. Shared systems (movement, combat, animation, hit areas,
 * clash, damage, defeat) read the RESOLVED character at runtime; there are no
 * character-name checks anywhere in shared code. Administrators create or edit
 * characters by editing JSON under `src/data/characters/` or with the admin
 * editor (`admin.html`), and every bundle is validated before use.
 */

// ---------------------------------------------------------------- animation

/** Gameplay states an Animation Profile maps to animation clips. */
export const ANIMATION_STATES = [
  'Idle',
  'Walk',
  'Run',
  'StartRun',
  'StopRun',
  'Turn',
  'JumpAnticipation',
  'JumpTakeoff',
  'JumpRise',
  'JumpApex',
  'Fall',
  'Land',
  'HardLand',
  'FightingStance',
  'Jab',
  'StraightPunch',
  'Hook',
  'Uppercut',
  'HeavyPunch',
  'FrontKick',
  'SideKick',
  'RoundhouseKick',
  'BackKick',
  'AxeKick',
  'SpinningKick',
  'JumpingFrontKick',
  'JumpingSideKick',
  'JumpingRoundhouseKick',
  'DownwardAerialKick',
  'AerialSpinningKick',
  'BlockHigh',
  'BlockMid',
  'BlockLow',
  'Parry',
  'Dodge',
  'LightHit',
  'HeavyHit',
  'AirborneHit',
  'Knockback',
  'WallImpact',
  'Knockdown',
  'GetUp',
  'ClashEntry',
  'ClashLoop',
  'ClashWin',
  'ClashLose',
  'ClashFinisher',
  'ClashStalemate',
  'Faint',
  'Defeat',
  'Disintegration',
] as const;
export type AnimationState = (typeof ANIMATION_STATES)[number];

/** States every character must be able to show (directly or through fallbacks). */
export const REQUIRED_STATES: readonly AnimationState[] = [
  'Idle',
  'Walk',
  'Run',
  'JumpRise',
  'Fall',
  'Land',
  'FightingStance',
  'BlockHigh',
  'LightHit',
  'Knockdown',
  'GetUp',
  'ClashLoop',
  'ClashFinisher',
  'Faint',
  'Defeat',
];

/**
 * Maps states to clip ids (one clip, or several to vary between). `extends`
 * names the next profile in the fallback chain (usually a combat-style
 * profile, which extends the shared default).
 */
export interface AnimationProfile {
  readonly id: string;
  readonly extends?: string;
  readonly states: Partial<Record<AnimationState, string | readonly string[]>>;
}

// ---------------------------------------------------------------- moves

/**
 * How a move is started on Button 1 (the five-button layout, INV-9, is kept):
 * `tap`, `tap-forward` (tap while moving towards where you face), `air-tap`
 * (in the air) and `falling-tap` (in the air on the way down).
 */
export const MOVE_INPUTS = ['tap', 'tap-forward', 'air-tap', 'falling-tap'] as const;
export type MoveInput = (typeof MOVE_INPUTS)[number];

export type MoveCategory = 'punch' | 'kick';

export interface MoveDef {
  readonly id: string;
  readonly displayName?: string;
  /** Which animation state shows this move (looked up in the Animation Profile). */
  readonly animationState: AnimationState;
  readonly category: MoveCategory;
  /** `kick` blows can break doors; heavy moves knock down. */
  readonly heavy: boolean;
  readonly aerial: boolean;
  /** Seconds (deterministic fixed-step timing, not frames). */
  readonly startupS: number;
  readonly activeS: number;
  readonly recoveryS: number;
  /** When the next combo move may start, as a fraction 0..1 of the recovery. */
  readonly cancelAt: number;
  /** Capsule hit area from the body to reach. */
  readonly hitbox: { readonly reachM: number; readonly radiusM: number };
  readonly damage: number;
  /** Impact strength for doors and furniture. */
  readonly strength: number;
  readonly knockbackMps: number;
  /** Forward push on the attacker as it strikes, m/s. */
  readonly lungeMps: number;
  /** Movement allowed while attacking (0..1). */
  readonly moveFactor: number;
  /** How the contact feels (flash, sparks, recoil, hit-stop, shake): src/data/combat/impacts.ts. */
  readonly impact: 'knuckle-light' | 'knuckle-heavy' | 'kick' | 'fire' | 'fire-heavy';
  /** Extra camera shake and zoom punch when it connects with anything. */
  readonly shake: number;
  readonly zoomPunch: number;
  /** Combo routes: which move follows on each input (missing = the combo ends). */
  readonly next?: Partial<Record<MoveInput, string>>;
  /** Effect played on contact (Effects library id), on top of the profile's defaults. */
  readonly effect?: string;
  readonly status?: { readonly burn?: { readonly dps: number; readonly durationS: number } };
  /** The target bounces off the floor (downward kicks). */
  readonly groundBounce?: boolean;
  /** Capabilities this move needs (it is removed from the moveset when any is off). */
  readonly requires?: readonly CapabilityKey[];
}

export interface MovesetProfile {
  readonly id: string;
  /** The first move for each input when no combo is running. */
  readonly starters: Partial<Record<MoveInput, string>>;
  readonly moves: readonly MoveDef[];
}

// ---------------------------------------------------------------- stats

export interface StatsProfile {
  readonly id: string;
  readonly maxHp: number;
  readonly maxStamina: number;
  readonly staminaRegenPerS: number;
  readonly staminaRegenDelayS: number;
  readonly movement: {
    readonly maxSpeedMps: number;
    readonly accelMps2: number;
    readonly decelMps2: number;
    readonly jumpSpeedMps: number;
    readonly gravityMps2: number;
  };
  readonly body: { readonly footRadiusM: number; readonly massKg: number };
  readonly power: number;
  readonly defence: number;
  readonly critChance: number;
  readonly critMultiplier: number;
  readonly knockbackResistance: number;
  readonly multipliers: {
    readonly attackSpeed: number;
    readonly punchDamage: number;
    readonly kickDamage: number;
    readonly aerialDamage: number;
    readonly knockback: number;
    readonly movementSpeed: number;
    readonly jumpForce: number;
    readonly clashPower: number;
    readonly specialCharge: number;
  };
  /** 0..1: shortens hit stun. */
  readonly hitStunResistance: number;
  /**
   * Handling objects (Phase 7, spec §6.3 and §8: each fighter interacts with objects its own way):
   * the heaviest thing it can lift, how hard it throws, and whether what it throws catches fire.
   * Optional; defaults: 15 kg, ×1, no fire.
   */
  readonly objects?: ObjectHandling;
}

export interface ObjectHandling {
  readonly maxLiftKg: number;
  /** Multiplies throw speed (square root) and impact damage. */
  readonly throwPower: number;
  /** Thrown objects burst into flame: flammable ones burn, hits set the target alight. */
  readonly ignitesThrown?: boolean;
  /**
   * Can pick up movable furniture (drawer units, chairs) as well as small throwables, up to
   * `maxLiftKg` (Rampage's Heavy Throw, owner 12/11/2026). Default false.
   */
  readonly liftsFurniture?: boolean;
  /**
   * Multiplies the damage this fighter's blows and abilities do to breakable wall sections
   * (Inferno, owner 12/11/2026: "significantly better at breaking walls"). Default 1.
   */
  readonly wallBreakPower?: number;
}

export const DEFAULT_OBJECT_HANDLING: ObjectHandling = { maxLiftKg: 15, throwPower: 1, ignitesThrown: false };

// ---------------------------------------------------------------- effects and audio

/** Effect ids come from the effects library (src/characters/libraries.ts). */
export interface EffectsProfile {
  readonly id: string;
  readonly punchImpact: string;
  readonly kickImpact: string;
  readonly heavyImpact: string;
  readonly blockImpact: string;
  /** Around the fists and feet while attacking (null = none). */
  readonly limbTrail: string | null;
  /** A constant glow or particles around the character (null = none). */
  readonly aura: string | null;
  readonly clash: string;
  readonly finisher: string;
  readonly disintegration: string;
  /** Hit flash colour (the struck fighter blends to it). */
  readonly flashColour: string;
  readonly shakeScale: number;
  readonly hitstopScale: number;
  /** How the head is drawn: a plain round head (default) or a living flame that lights the room (TD-045). */
  readonly head?: HeadStyle;
  /**
   * How the body is drawn: plain outlined limbs (default) or a living flame (owner, 11/11/2026:
   * Inferno's "entire body should look genuinely fiery"): glowing layered limbs with ember-dark
   * edges, charred streaks, a white-hot core and flame tongues licking up from the joints.
   */
  readonly body?: BodyStyle;
}

export const HEAD_STYLES = ['round', 'flame', 'brute'] as const;
export type HeadStyle = (typeof HEAD_STYLES)[number];
export const BODY_STYLES = ['solid', 'flame', 'muscle'] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

/** Sound ids come from the sound board; several per event are picked between for variety. */
export interface AudioProfile {
  readonly id: string;
  readonly lightPunch: readonly string[];
  readonly heavyPunch: readonly string[];
  readonly lightKick: readonly string[];
  readonly heavyKick: readonly string[];
  readonly block: readonly string[];
  readonly parry: readonly string[];
  readonly footstep: readonly string[];
  readonly jump: readonly string[];
  readonly land: readonly string[];
  readonly wallImpact: readonly string[];
  readonly clash: readonly string[];
  readonly finisher: readonly string[];
  readonly defeat: readonly string[];
  readonly disintegration: readonly string[];
  readonly voice?: readonly string[];
}

export interface AiProfile {
  readonly id: string;
  /** Seconds between attacks when it may attack. */
  readonly attackEveryS: number;
  /** 0..1: chance to follow a strike with another. */
  readonly aggression: number;
  /** Punch Clash mashing speed, presses per second. */
  readonly clashMashRate: number;
  /** How quickly it stops after being shoved, m/s². */
  readonly settleDecelMps2: number;
  readonly reactionS: number;
}

export interface UnlockProfile {
  readonly unlockedByDefault: boolean;
  /** Price in in-game tokens (never real money; server-validated in Phase 14). */
  readonly tokenCost: number;
  readonly requirement: string;
}

// ---------------------------------------------------------------- capabilities

export const CAPABILITY_KEYS = [
  'canWalk',
  'canRun',
  'canJump',
  'canDoubleJump',
  'canPunch',
  'canKick',
  'canBlock',
  'canParry',
  'canUseCombos',
  'canUseAerialPunches',
  'canUseAerialKicks',
  'canUseDownwardKick',
  'canUseSpinningKick',
  'canUsePunchClash',
  'canWallBounce',
  'canGroundBounce',
  'canDisintegrate',
  'usesElementalEffects',
  'usesFireEffects',
  'usesElectricEffects',
  'usesIceEffects',
  'isBossCharacter',
  'isPlayable',
  'isAIControlled',
] as const;
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
export type Capabilities = Readonly<Record<CapabilityKey, boolean>>;

// ---------------------------------------------------------------- definition

export interface CharacterDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  /** Another definition this one starts from (the Base Stickman template); its fields fill any left out here. */
  readonly template?: string;
  readonly characterType: 'fighter' | 'boss' | 'training';
  readonly element: 'none' | 'fire' | 'electric' | 'ice' | 'shadow' | 'earth';
  readonly combatStyle: string;
  readonly profiles: {
    readonly animation: string;
    readonly moveset: string;
    readonly stats: string;
    readonly effects: string;
    readonly audio: string;
    readonly ai: string;
  };
  /** The drawn stickman: skeleton proportions and colours. */
  readonly rig: {
    readonly bones: {
      readonly spine: number;
      readonly neck: number;
      readonly headRadius: number;
      readonly upperArm: number;
      readonly foreArm: number;
      readonly thigh: number;
      readonly shin: number;
    };
    readonly colour: string;
    readonly colourBack: string;
    readonly outline: string;
    readonly limbWidthM: number;
    readonly outlineWidthM: number;
    /**
     * Drawn size relative to a standard fighter (owner, 12/11/2026: Rampage "two times the size
     * of Inferno"). Scales the whole figure; collision size and reach stay in the stats and moves.
     */
    readonly scale?: number;
    /** Pants colour for muscle bodies (owner, 12/11/2026: "should at least have pants on"). */
    readonly pants?: string;
  };
  readonly capabilities: Partial<Capabilities>;
  readonly unlock: UnlockProfile;
  /** Abilities and ultimate kit id (null = none, e.g. a training dummy). */
  readonly abilityKit: string | null;
}

/** Everything loaded for the game: definitions and profiles by id. */
export interface CharacterLibrary {
  readonly characters: Readonly<Record<string, CharacterDefinition>>;
  readonly animation: Readonly<Record<string, AnimationProfile>>;
  readonly moveset: Readonly<Record<string, MovesetProfile>>;
  readonly stats: Readonly<Record<string, StatsProfile>>;
  readonly effects: Readonly<Record<string, EffectsProfile>>;
  readonly audio: Readonly<Record<string, AudioProfile>>;
  readonly ai: Readonly<Record<string, AiProfile>>;
}

/** Safe limits for configuration values (validation, owner: "validate all values"). */
export const LIMITS = {
  maxHp: [1, 100000],
  maxStamina: [0, 1000],
  staminaRegenPerS: [0, 500],
  staminaRegenDelayS: [0, 10],
  maxSpeedMps: [0.5, 15],
  accelMps2: [1, 300],
  decelMps2: [1, 300],
  jumpSpeedMps: [0, 20],
  gravityMps2: [1, 100],
  footRadiusM: [0.1, 1],
  massKg: [10, 1000],
  power: [0.1, 10],
  defence: [0.1, 10],
  critChance: [0, 1],
  critMultiplier: [1, 5],
  knockbackResistance: [0, 1],
  hitStunResistance: [0, 0.9],
  multiplier: [0.1, 5],
  moveTimeS: [0.01, 3],
  moveRecoveryS: [0, 3],
  cancelAt: [0, 1],
  reachM: [0.2, 3],
  radiusM: [0.05, 2],
  damage: [0, 2000],
  strength: [0, 5000],
  knockbackMps: [0, 30],
  lungeMps: [0, 20],
  moveFactor: [0, 1],
  shake: [0, 1],
  zoomPunch: [0, 0.2],
  aggression: [0, 1],
  clashMashRate: [0, 30],
  attackEveryS: [0.1, 30],
  settleDecelMps2: [1, 200],
  reactionS: [0, 5],
  shakeScale: [0, 3],
  hitstopScale: [0, 3],
  boneM: [0.02, 1.5],
  sizeScale: [0.5, 2.5],
  maxLiftKg: [0, 500],
  throwPower: [0.2, 3],
} as const satisfies Record<string, readonly [number, number]>;
