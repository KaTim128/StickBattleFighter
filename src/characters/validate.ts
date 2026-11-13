import { ABILITY_KITS } from '../abilities/kits';
import { CLIPS } from '../animation/clips';
import { hasSound } from '../audio/sound-board';
import { EFFECTS, isEffect } from '../vfx/effects-library';
import { animationChain, expandTemplate, moveRequirements, resolveAnimation, STRIKE_STATES } from './resolve';
import {
  ANIMATION_STATES,
  type AnimationState,
  BODY_STYLES,
  CAPABILITY_KEYS,
  type CharacterDefinition,
  type CharacterLibrary,
  HEAD_STYLES,
  HELD_ITEMS,
  LIMITS,
  MOVE_INPUTS,
  type MoveInput,
  REQUIRED_STATES,
} from './schema';

/**
 * Character validation (owner: "invalid character data should produce a clear
 * validation message rather than crashing"). Errors block a character from
 * being used (the game falls back to the Base Stickman and says why);
 * warnings flag fallbacks and switched-off content.
 */
export interface ValidationReport {
  readonly id: string;
  readonly errors: string[];
  readonly warnings: string[];
}

type Limit = keyof typeof LIMITS;

export function validateCharacter(id: string, lib: CharacterLibrary): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const report = { id, errors, warnings };
  const raw = lib.characters[id];
  if (!raw || typeof raw !== 'object') {
    errors.push(`Character "${id}" does not exist.`);
    return report;
  }
  if (raw.template && !lib.characters[raw.template]) errors.push(`Template "${raw.template}" does not exist.`);
  const def: CharacterDefinition = expandTemplate(raw, lib);

  const num = (where: string, v: unknown, limit: Limit) => {
    const [lo, hi] = LIMITS[limit];
    if (typeof v !== 'number' || !Number.isFinite(v))
      errors.push(`${where} must be a number (got ${JSON.stringify(v)}).`);
    else if (v < lo || v > hi) errors.push(`${where} = ${v} is outside the allowed range ${lo}–${hi}.`);
  };
  const str = (where: string, v: unknown) => {
    if (typeof v !== 'string' || v.trim() === '') errors.push(`${where} must be a non-empty text value.`);
  };
  const hex = (where: string, v: unknown) => {
    if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v))
      errors.push(`${where} must be a colour like "#ff7a2e" (got ${JSON.stringify(v)}).`);
  };

  // ---- identity and references
  if (def.id !== id) errors.push(`Definition id "${def.id}" does not match its key "${id}".`);
  str('displayName', def.displayName);
  str('combatStyle', def.combatStyle);
  if (!def.profiles) {
    errors.push('profiles are missing.');
    return report;
  }
  const refs: [keyof CharacterDefinition['profiles'], keyof CharacterLibrary][] = [
    ['animation', 'animation'],
    ['moveset', 'moveset'],
    ['stats', 'stats'],
    ['effects', 'effects'],
    ['audio', 'audio'],
    ['ai', 'ai'],
  ];
  for (const [field, table] of refs) {
    const ref = def.profiles[field];
    if (!ref || !(lib[table] as Record<string, unknown>)[ref])
      errors.push(`profiles.${field} "${ref}" does not exist.`);
  }
  if (def.abilityKit !== null && def.abilityKit !== undefined && !ABILITY_KITS[def.abilityKit]) {
    errors.push(`abilityKit "${def.abilityKit}" does not exist.`);
  }

  // ---- rig
  if (!def.rig?.bones) errors.push('rig.bones are missing.');
  else for (const [k, v] of Object.entries(def.rig.bones)) num(`rig.bones.${k}`, v, 'boneM');
  if (def.rig?.scale !== undefined) num('rig.scale', def.rig.scale, 'sizeScale');
  hex('rig.colour', def.rig?.colour);
  hex('rig.colourBack', def.rig?.colourBack);
  hex('rig.outline', def.rig?.outline);
  if (def.rig?.pants !== undefined) hex('rig.pants', def.rig.pants);
  if (def.rig?.glow !== undefined) hex('rig.glow', def.rig.glow);

  // ---- capabilities
  for (const [k, v] of Object.entries(def.capabilities ?? {})) {
    if (!(CAPABILITY_KEYS as readonly string[]).includes(k)) errors.push(`Unknown capability "${k}".`);
    else if (typeof v !== 'boolean') errors.push(`Capability ${k} must be true or false.`);
  }
  const cap = (k: (typeof CAPABILITY_KEYS)[number]) => def.capabilities?.[k] === true;

  // ---- stats
  const stats = lib.stats[def.profiles.stats];
  if (stats) {
    const s = `stats "${stats.id}"`;
    num(`${s}.maxHp`, stats.maxHp, 'maxHp');
    num(`${s}.maxStamina`, stats.maxStamina, 'maxStamina');
    num(`${s}.staminaRegenPerS`, stats.staminaRegenPerS, 'staminaRegenPerS');
    num(`${s}.staminaRegenDelayS`, stats.staminaRegenDelayS, 'staminaRegenDelayS');
    num(`${s}.movement.maxSpeedMps`, stats.movement?.maxSpeedMps, 'maxSpeedMps');
    num(`${s}.movement.accelMps2`, stats.movement?.accelMps2, 'accelMps2');
    num(`${s}.movement.decelMps2`, stats.movement?.decelMps2, 'decelMps2');
    num(`${s}.movement.jumpSpeedMps`, stats.movement?.jumpSpeedMps, 'jumpSpeedMps');
    num(`${s}.movement.gravityMps2`, stats.movement?.gravityMps2, 'gravityMps2');
    num(`${s}.body.footRadiusM`, stats.body?.footRadiusM, 'footRadiusM');
    num(`${s}.body.massKg`, stats.body?.massKg, 'massKg');
    num(`${s}.power`, stats.power, 'power');
    num(`${s}.defence`, stats.defence, 'defence');
    num(`${s}.critChance`, stats.critChance, 'critChance');
    num(`${s}.critMultiplier`, stats.critMultiplier, 'critMultiplier');
    num(`${s}.knockbackResistance`, stats.knockbackResistance, 'knockbackResistance');
    num(`${s}.hitStunResistance`, stats.hitStunResistance, 'hitStunResistance');
    if (stats.objects) {
      num(`${s}.objects.maxLiftKg`, stats.objects.maxLiftKg, 'maxLiftKg');
      num(`${s}.objects.throwPower`, stats.objects.throwPower, 'throwPower');
      if (stats.objects.wallBreakPower !== undefined)
        num(`${s}.objects.wallBreakPower`, stats.objects.wallBreakPower, 'throwPower');
    }
    for (const [k, v] of Object.entries(stats.multipliers ?? {})) num(`${s}.multipliers.${k}`, v, 'multiplier');
  }

  // ---- animation profile chain and clips
  const animId = def.profiles.animation;
  if (lib.animation[animId]) {
    const seen = new Set<string>();
    let pid: string | undefined = animId;
    while (pid) {
      if (seen.has(pid)) {
        errors.push(`Animation profiles extend each other in a loop at "${pid}".`);
        break;
      }
      seen.add(pid);
      const p: (typeof lib.animation)[string] | undefined = lib.animation[pid];
      if (!p) {
        errors.push(`Animation profile "${pid}" (extended by another profile) does not exist.`);
        break;
      }
      for (const [state, entry] of Object.entries(p.states ?? {})) {
        if (!(ANIMATION_STATES as readonly string[]).includes(state)) {
          errors.push(`Animation profile "${pid}": unknown state "${state}".`);
          continue;
        }
        const ids = typeof entry === 'string' ? [entry] : (entry as string[]);
        for (const cid of ids) {
          const clip = CLIPS[cid];
          if (!clip) errors.push(`Animation profile "${pid}": state ${state} → unknown clip "${cid}".`);
          else if ((clip.kind === 'strike') !== STRIKE_STATES.has(state as AnimationState)) {
            errors.push(`Animation profile "${pid}": state ${state} → "${cid}" is the wrong kind of clip.`);
          }
        }
      }
      pid = p.extends;
    }
    const resolved = resolveAnimation(animId, lib, []);
    for (const state of REQUIRED_STATES) {
      if (resolved.source[state] === 'safe')
        errors.push(`Required animation state ${state} has no clip anywhere in its fallback chain.`);
    }
    for (const state of ANIMATION_STATES) {
      if (resolved.source[state] === 'safe' && !REQUIRED_STATES.includes(state)) {
        warnings.push(`[animation fallback] ${state} uses the safe fallback clip.`);
      }
    }
    if (!animationChain(animId, lib).includes('shared-default'))
      warnings.push('The shared default profile is missing: no defaults to fall back on.');
  }

  // ---- moveset
  const set = lib.moveset[def.profiles.moveset];
  if (set) {
    const m = `moveset "${set.id}"`;
    const ids = new Set<string>();
    for (const mv of set.moves ?? []) {
      const w = `${m} move "${mv.id}"`;
      if (!mv.id) errors.push(`${m}: a move has no id.`);
      if (ids.has(mv.id)) errors.push(`${m}: move id "${mv.id}" is used twice.`);
      ids.add(mv.id);
      if (!(ANIMATION_STATES as readonly string[]).includes(mv.animationState)) {
        errors.push(`${w}: unknown animation state "${mv.animationState}".`);
      } else if (!STRIKE_STATES.has(mv.animationState)) {
        errors.push(`${w}: animation state ${mv.animationState} is not an attack state.`);
      } else if (lib.animation[animId]) {
        const src = resolveAnimation(animId, lib, []).source[mv.animationState];
        if (src === 'safe')
          warnings.push(`${w}: no animation for ${mv.animationState}; it will use the safe fallback.`);
      }
      if (mv.category !== 'punch' && mv.category !== 'kick') errors.push(`${w}: category must be "punch" or "kick".`);
      num(`${w}.startupS`, mv.startupS, 'moveTimeS');
      num(`${w}.activeS`, mv.activeS, 'moveTimeS');
      num(`${w}.recoveryS`, mv.recoveryS, 'moveRecoveryS');
      num(`${w}.cancelAt`, mv.cancelAt, 'cancelAt');
      num(`${w}.hitbox.reachM`, mv.hitbox?.reachM, 'reachM');
      num(`${w}.hitbox.radiusM`, mv.hitbox?.radiusM, 'radiusM');
      num(`${w}.damage`, mv.damage, 'damage');
      num(`${w}.strength`, mv.strength, 'strength');
      num(`${w}.knockbackMps`, mv.knockbackMps, 'knockbackMps');
      num(`${w}.lungeMps`, mv.lungeMps, 'lungeMps');
      num(`${w}.moveFactor`, mv.moveFactor, 'moveFactor');
      num(`${w}.shake`, mv.shake, 'shake');
      num(`${w}.zoomPunch`, mv.zoomPunch, 'zoomPunch');
      if (mv.effect && !isEffect(mv.effect)) errors.push(`${w}: unknown effect "${mv.effect}".`);
      for (const req of mv.requires ?? []) {
        if (!(CAPABILITY_KEYS as readonly string[]).includes(req))
          errors.push(`${w}: requires unknown capability "${req}".`);
      }
      if (mv.status?.burn) {
        num(`${w}.status.burn.dps`, mv.status.burn.dps, 'damage');
        num(`${w}.status.burn.durationS`, mv.status.burn.durationS, 'moveTimeS');
      }
    }
    const byId = new Map((set.moves ?? []).map((mv) => [mv.id, mv]));
    for (const mv of set.moves ?? []) {
      for (const [input, to] of Object.entries(mv.next ?? {})) {
        if (!(MOVE_INPUTS as readonly string[]).includes(input))
          errors.push(`${m} move "${mv.id}": unknown combo input "${input}".`);
        const target = to ? byId.get(to) : undefined;
        if (!target) errors.push(`${m} move "${mv.id}": combo route ${input} → "${to}" does not exist.`);
        else if (to === mv.id) errors.push(`${m} move "${mv.id}": a combo route cannot lead back to the same move.`);
        else if (target.aerial !== mv.aerial)
          errors.push(`${m} move "${mv.id}": impossible combo route to "${to}" (ground and air moves cannot chain).`);
      }
    }
    for (const [input, to] of Object.entries(set.starters ?? {})) {
      if (!(MOVE_INPUTS as readonly string[]).includes(input)) {
        errors.push(`${m}: unknown starter input "${input}".`);
        continue;
      }
      const target = byId.get(to as string);
      if (!target) errors.push(`${m}: starter ${input} → "${to}" does not exist.`);
      else if ((input === 'air-tap' || input === 'falling-tap') !== target.aerial) {
        errors.push(
          `${m}: starter ${input} → "${to}": ${target.aerial ? 'a ground input needs a ground move' : 'an air input needs an aerial move'}.`,
        );
      }
    }
    // Capabilities must leave something to do on Button 1, and nothing unreachable.
    const usable = (set.moves ?? []).filter((mv) => moveRequirements(mv).every((k) => cap(k)));
    const usableIds = new Set(usable.map((mv) => mv.id));
    if (cap('canPunch') || cap('canKick')) {
      const tap = set.starters?.tap;
      if (!tap || !usableIds.has(tap)) warnings.push(`${m}: no ground move on a plain tap with these capabilities.`);
    }
    for (const input of ['air-tap', 'falling-tap'] as MoveInput[]) {
      const to = set.starters?.[input];
      if (to && !usableIds.has(to)) warnings.push(`${m}: the ${input} move "${to}" is switched off by capabilities.`);
    }
  }

  // ---- effects
  const fx = lib.effects[def.profiles.effects];
  if (fx) {
    const e = `effects "${fx.id}"`;
    for (const k of [
      'punchImpact',
      'kickImpact',
      'heavyImpact',
      'blockImpact',
      'clash',
      'finisher',
      'disintegration',
    ] as const) {
      if (!isEffect(fx[k])) errors.push(`${e}.${k}: unknown effect "${fx[k]}".`);
    }
    for (const k of ['limbTrail', 'aura'] as const) {
      const v = fx[k];
      if (v !== null && !isEffect(v)) errors.push(`${e}.${k}: unknown effect "${v}".`);
    }
    hex(`${e}.flashColour`, fx.flashColour);
    num(`${e}.shakeScale`, fx.shakeScale, 'shakeScale');
    num(`${e}.hitstopScale`, fx.hitstopScale, 'hitstopScale');
    if (fx.body !== undefined && !(BODY_STYLES as readonly string[]).includes(fx.body)) {
      errors.push(`${e}.body: unknown body style "${fx.body}" (use ${BODY_STYLES.join(' or ')}).`);
    }
    if (fx.held !== undefined && !(HELD_ITEMS as readonly string[]).includes(fx.held)) {
      errors.push(`${e}.held: unknown held item "${fx.held}" (use ${HELD_ITEMS.join(' or ')}).`);
    }
    if (fx.head !== undefined && !(HEAD_STYLES as readonly string[]).includes(fx.head)) {
      errors.push(`${e}.head: unknown head style "${fx.head}" (use ${HEAD_STYLES.join(' or ')}).`);
    }
    // Footstep dust is not elemental, so only elemental auras (embers) need the capability.
    const elementalAura = fx.aura ? !EFFECTS[fx.aura]?.stepDust : false;
    if ((fx.limbTrail || elementalAura) && !cap('usesElementalEffects')) {
      warnings.push(
        `${e}: elemental trail/aura effects are set but usesElementalEffects is off, so they will not show.`,
      );
    }
  }

  // ---- audio
  const au = lib.audio[def.profiles.audio];
  if (au) {
    const keys = [
      'lightPunch',
      'heavyPunch',
      'lightKick',
      'heavyKick',
      'block',
      'parry',
      'footstep',
      'jump',
      'land',
      'wallImpact',
      'clash',
      'finisher',
      'defeat',
      'disintegration',
    ] as const;
    for (const k of keys) {
      const list = au[k];
      if (!Array.isArray(list) || list.length === 0) errors.push(`audio "${au.id}".${k} needs at least one sound.`);
      else for (const sid of list) if (!hasSound(sid)) errors.push(`audio "${au.id}".${k}: unknown sound "${sid}".`);
    }
  }

  // ---- AI
  const ai = lib.ai[def.profiles.ai];
  if (ai) {
    num(`ai "${ai.id}".attackEveryS`, ai.attackEveryS, 'attackEveryS');
    num(`ai "${ai.id}".aggression`, ai.aggression, 'aggression');
    num(`ai "${ai.id}".clashMashRate`, ai.clashMashRate, 'clashMashRate');
    num(`ai "${ai.id}".settleDecelMps2`, ai.settleDecelMps2, 'settleDecelMps2');
    num(`ai "${ai.id}".reactionS`, ai.reactionS, 'reactionS');
  }

  // ---- defeat
  if (cap('canDisintegrate') && fx && !isEffect(fx.disintegration))
    errors.push('canDisintegrate is on but no disintegration effect is set.');
  return report;
}
