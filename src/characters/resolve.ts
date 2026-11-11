import { ABILITY_KITS } from '../abilities/kits';
import { CLIPS, type Clip } from '../animation/clips';
import { RUN_FROM_MPS } from '../animation/greybox-motion';
import type { AttackDef } from '../combat/attacks';
import type { FighterDef } from '../data/fighters/fighter-def';
import {
  ANIMATION_STATES,
  type AnimationState,
  CAPABILITY_KEYS,
  type Capabilities,
  type CapabilityKey,
  type CharacterDefinition,
  type CharacterLibrary,
  type MoveDef,
  type MoveInput,
} from './schema';

/**
 * Turns a Character Definition and its profiles into the runtime fighter the
 * shared systems use (TD-039). Applies the template, capability filtering,
 * stat multipliers, and the animation fallback chain:
 *   1. the character's own Animation Profile
 *   2. its combat-style profile (`extends`)
 *   3. the shared default profile
 *   4. a safe fallback clip, with a development warning
 */

/** Which states play keyframed strikes (the rest are procedural motions). */
export const STRIKE_STATES: ReadonlySet<AnimationState> = new Set<AnimationState>([
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
  'ClashLoop',
  'ClashWin',
  'ClashFinisher',
]);

export const SHARED_DEFAULT_PROFILE = 'shared-default';

export type AnimationSource = 'character' | 'style' | 'default' | 'safe';

export interface ResolvedAnimation {
  readonly clips: Readonly<Record<AnimationState, readonly Clip[]>>;
  /** Where each state's clips came from (the fallback tier). */
  readonly source: Readonly<Record<AnimationState, AnimationSource>>;
  readonly clipIds: Readonly<Record<AnimationState, readonly string[]>>;
}

/** Fill a definition's missing fields from its template (one level of `template`, applied recursively). */
export function expandTemplate(
  def: CharacterDefinition,
  lib: CharacterLibrary,
  seen: string[] = [],
): CharacterDefinition {
  if (!def.template || seen.includes(def.id)) return def;
  const base = lib.characters[def.template];
  if (!base) return def;
  const parent = expandTemplate(base, lib, [...seen, def.id]);
  return {
    ...parent,
    ...def,
    profiles: { ...parent.profiles, ...def.profiles },
    rig: { ...parent.rig, ...def.rig, bones: { ...parent.rig.bones, ...def.rig?.bones } },
    capabilities: { ...parent.capabilities, ...def.capabilities },
    unlock: { ...parent.unlock, ...def.unlock },
  };
}

export function capabilitiesOf(def: CharacterDefinition): Capabilities {
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, def.capabilities[k] === true])) as Capabilities;
}

/** The profile chain for an Animation Profile id, ending at the shared default. */
export function animationChain(profileId: string, lib: CharacterLibrary): string[] {
  const chain: string[] = [];
  let id: string | undefined = profileId;
  while (id && lib.animation[id] && !chain.includes(id)) {
    chain.push(id);
    id = lib.animation[id]!.extends;
  }
  if (!chain.includes(SHARED_DEFAULT_PROFILE) && lib.animation[SHARED_DEFAULT_PROFILE])
    chain.push(SHARED_DEFAULT_PROFILE);
  return chain;
}

/** Resolve every state through the fallback chain. Problems are reported in `warnings`. */
export function resolveAnimation(profileId: string, lib: CharacterLibrary, warnings: string[]): ResolvedAnimation {
  const chain = animationChain(profileId, lib);
  const clips = {} as Record<AnimationState, Clip[]>;
  const source = {} as Record<AnimationState, AnimationSource>;
  const clipIds = {} as Record<AnimationState, string[]>;
  for (const state of ANIMATION_STATES) {
    const wantStrike = STRIKE_STATES.has(state);
    let found: { ids: string[]; tier: number } | null = null;
    chain.forEach((pid, tier) => {
      if (found) return;
      const entry = lib.animation[pid]!.states[state];
      if (entry === undefined) return;
      const ids = (typeof entry === 'string' ? [entry] : [...entry]).filter((cid) => {
        const clip = CLIPS[cid];
        if (!clip) {
          warnings.push(`Animation profile "${pid}": state ${state} uses unknown clip "${cid}" (skipped).`);
          return false;
        }
        if ((clip.kind === 'strike') !== wantStrike) {
          warnings.push(
            `Animation profile "${pid}": state ${state} needs a ${wantStrike ? 'strike' : 'procedural'} clip, not "${cid}" (skipped).`,
          );
          return false;
        }
        return true;
      });
      if (ids.length > 0) found = { ids, tier };
    });
    const f = found as { ids: string[]; tier: number } | null;
    if (f) {
      clipIds[state] = f.ids;
      clips[state] = f.ids.map((cid) => CLIPS[cid]!);
      const last = chain.length - 1;
      source[state] =
        f.tier === 0 ? 'character' : f.tier === last && chain[last] === SHARED_DEFAULT_PROFILE ? 'default' : 'style';
    } else {
      const safe = wantStrike ? 'safe.strike' : 'proc.safe';
      warnings.push(
        `[animation fallback] ${state}: nothing assigned in "${profileId}" or its fallbacks; using the safe "${safe}" clip.`,
      );
      clipIds[state] = [safe];
      clips[state] = [CLIPS[safe]!];
      source[state] = 'safe';
    }
  }
  return { clips, source, clipIds };
}

/** Capabilities a move needs: those it lists plus those implied by what it is. */
export function moveRequirements(m: MoveDef): CapabilityKey[] {
  const req = new Set<CapabilityKey>(m.requires ?? []);
  req.add(m.category === 'kick' ? 'canKick' : 'canPunch');
  if (m.aerial) {
    req.add('canJump');
    req.add(m.category === 'kick' ? 'canUseAerialKicks' : 'canUseAerialPunches');
  }
  return [...req];
}

/** Moves available with these capabilities, as runtime attacks with multipliers applied. */
export function resolveMoves(
  def: CharacterDefinition,
  lib: CharacterLibrary,
  caps: Capabilities,
  warnings: string[],
): { moves: Record<string, AttackDef>; starters: Partial<Record<MoveInput, string>> } {
  const set = lib.moveset[def.profiles.moveset];
  const stats = lib.stats[def.profiles.stats];
  const moves: Record<string, AttackDef> = {};
  if (!set || !stats) return { moves, starters: {} };
  const mult = stats.multipliers;
  const speed = Math.max(0.1, mult.attackSpeed);
  const available = set.moves.filter((m) => moveRequirements(m).every((k) => caps[k]));
  const ids = new Set(available.map((m) => m.id));
  for (const m of available) {
    const damageMult =
      (m.category === 'kick' ? mult.kickDamage : mult.punchDamage) * (m.aerial ? mult.aerialDamage : 1);
    const next = caps.canUseCombos
      ? Object.fromEntries(Object.entries(m.next ?? {}).filter(([, to]) => to !== undefined && ids.has(to)))
      : {};
    moves[m.id] = {
      id: m.id,
      label: m.displayName ?? m.id,
      blow: m.category === 'kick' ? 'kick' : 'strike',
      windupS: m.startupS / speed,
      activeS: m.activeS / speed,
      recoveryS: m.recoveryS / speed,
      chainAtRecovery: m.cancelAt,
      reachM: m.hitbox.reachM,
      hitRadiusM: m.hitbox.radiusM,
      damage: m.damage * damageMult,
      heavy: m.heavy,
      strength: m.strength,
      knockbackSpeedMps: m.knockbackMps * mult.knockback,
      moveFactor: m.moveFactor,
      lungeMps: m.lungeMps,
      impact: m.impact,
      trauma: m.shake,
      zoomPunch: m.zoomPunch,
      animationState: m.animationState,
      category: m.category,
      aerial: m.aerial,
      next: next as Partial<Record<MoveInput, string>>,
      effect: m.effect ?? null,
      burn: m.status?.burn ?? null,
      groundBounce: (m.groundBounce ?? false) && caps.canGroundBounce,
    };
  }
  const starters: Partial<Record<MoveInput, string>> = {};
  for (const [input, id] of Object.entries(set.starters) as [MoveInput, string][]) {
    if (ids.has(id)) starters[input] = id;
    else if (set.moves.some((m) => m.id === id))
      warnings.push(`Move "${id}" (${input}) is switched off by this character's capabilities.`);
  }
  return { moves, starters };
}

const colour = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16);

/** Build the runtime fighter. Assumes the bundle passed validation (see validate.ts). */
export function resolveCharacter(id: string, lib: CharacterLibrary): FighterDef {
  const raw = lib.characters[id];
  if (!raw) throw new Error(`Unknown character "${id}"`);
  const def = expandTemplate(raw, lib);
  const warnings: string[] = [];
  const caps = capabilitiesOf(def);
  const stats = lib.stats[def.profiles.stats]!;
  const mult = stats.multipliers;
  const animation = resolveAnimation(def.profiles.animation, lib, warnings);
  const { moves, starters } = resolveMoves(def, lib, caps, warnings);
  let maxSpeed = stats.movement.maxSpeedMps * mult.movementSpeed;
  if (!caps.canRun) maxSpeed = Math.min(maxSpeed, RUN_FROM_MPS - 0.2); // walks only
  if (!caps.canWalk) maxSpeed = 0;
  return {
    id: def.id,
    displayName: def.displayName,
    element: def.element,
    combatStyle: def.combatStyle,
    characterType: def.characterType,
    weapon: null,
    movement: {
      maxSpeedMps: maxSpeed,
      accelMps2: stats.movement.accelMps2,
      decelMps2: stats.movement.decelMps2,
      jumpSpeedMps: stats.movement.jumpSpeedMps * mult.jumpForce,
      hopGravityMps2: stats.movement.gravityMps2,
    },
    body: { ...stats.body },
    bones: { ...def.rig.bones },
    look: {
      limb: colour(def.rig.colour),
      limbBack: colour(def.rig.colourBack),
      outline: colour(def.rig.outline),
      limbWidthM: def.rig.limbWidthM,
      outlineWidthM: def.rig.outlineWidthM,
    },
    stats: {
      maxHp: stats.maxHp,
      maxStamina: stats.maxStamina,
      staminaRegenPerS: stats.staminaRegenPerS,
      staminaRegenDelayS: stats.staminaRegenDelayS,
      power: stats.power,
      defence: stats.defence,
      critChance: stats.critChance,
      critMultiplier: stats.critMultiplier,
      knockbackResistance: stats.knockbackResistance,
      hitStunResistance: stats.hitStunResistance,
      canParry: caps.canParry,
    },
    multipliers: { ...mult },
    moves,
    attacks: moves,
    starters,
    animation,
    capabilities: caps,
    effects: lib.effects[def.profiles.effects]!,
    audio: lib.audio[def.profiles.audio]!,
    ai: lib.ai[def.profiles.ai]!,
    abilities: def.abilityKit ? (ABILITY_KITS[def.abilityKit] ?? null) : null,
    warnings,
  };
}
