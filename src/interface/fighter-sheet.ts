import type { AbilityDef, AbilitySlot } from '../abilities/ability-def';
import { type FighterRatings, fighterRatings } from '../characters/ratings';
import type { FighterDef } from '../data/fighters/fighter-def';
import { type Bindings, codeLabel, SLOT_ACTION } from '../input/bindings';

/**
 * Everything the fighter details screen shows (owner, 12/11/2026): the six ratings, and each
 * ability with what it does, its numbers, and how to use it on the device being played (desktop
 * keys come from the player's own bindings). Pure: built from the fighter's data.
 */
export interface SheetAbility {
  readonly slot: AbilitySlot | 'combo' | 'heavy';
  /** The key or button that uses it: "Q", "Left click", "ULT". */
  readonly key: string;
  readonly name: string;
  readonly icon: string | null;
  readonly description: string;
  /** Label and value pairs: Damage, Cooldown, Stamina, Range, effects. */
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly howTo: string;
}

export interface FighterSheet {
  readonly ratings: FighterRatings;
  readonly abilities: readonly SheetAbility[];
}

export type Device = 'desktop' | 'touch';

const SLOT_BUTTON: Readonly<Record<AbilitySlot, string>> = {
  a1: 'first',
  a2: 'second',
  a3: 'third',
  a4: 'fourth',
  ult: 'ULT',
};

const s1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** The numbers worth knowing, in plain words. */
function abilityStats(a: AbilityDef): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const p = a.payload;
  const d = a.delivery;
  if (d.type === 'beam') {
    const ticks = Math.floor(d.durationS / d.tickS) + 1;
    out.push({ label: 'Damage', value: `${p.damage} per hit, up to ${ticks} hits` });
  } else if (p.damage > 0) out.push({ label: 'Damage', value: p.falloff ? `up to ${p.damage}` : `${p.damage}` });
  if (p.falloff) out.push({ label: 'Up close', value: 'hits hardest; weaker at range' });
  if (d.type === 'beam' && d.ramp)
    out.push({
      label: 'Build-up',
      value: `after ${s1(d.ramp.afterS)} s of contact ×${s1(d.ramp.startFactor)}, rising to ×${s1(d.ramp.maxFactor)}`,
    });
  if (p.burn) out.push({ label: 'Burn', value: `${p.burn.dps}/s for ${s1(p.burn.durationS)} s` });
  if (p.stunS) out.push({ label: 'Stun', value: `${s1(p.stunS)} s` });
  if (p.blindS) out.push({ label: 'Blind', value: `${s1(p.blindS)} s` });
  if (p.decay) {
    out.push({ label: 'Target damage', value: `-${Math.round((1 - p.decay.attackFactor) * 100)}%` });
    out.push({ label: 'Target defence', value: `-${Math.round((1 - p.decay.defenceFactor) * 100)}%` });
    out.push({ label: 'Curse lasts', value: `${s1(p.decay.durationS)} s` });
  }
  if (p.bleed) out.push({ label: 'Bleed', value: `${p.bleed.dps}/s for ${s1(p.bleed.durationS)} s` });
  if (p.lifesteal) out.push({ label: 'Heals', value: `${Math.round(p.lifesteal * 100)}% of damage dealt` });
  if (p.heavy) out.push({ label: 'Knockdown', value: 'yes' });
  if (d.type === 'buff') {
    out.push({ label: 'Lasts', value: `${s1(d.durationS)} s` });
    if (d.speedFactor !== 1) out.push({ label: 'Speed', value: `+${Math.round((d.speedFactor - 1) * 100)}%` });
    if (d.attackSpeedFactor && d.attackSpeedFactor !== 1)
      out.push({ label: 'Attack speed', value: `+${Math.round((d.attackSpeedFactor - 1) * 100)}%` });
    if (d.meleeDamageFactor && d.meleeDamageFactor !== 1)
      out.push({ label: 'Knife damage', value: `+${Math.round((d.meleeDamageFactor - 1) * 100)}%` });
    if (d.meleeBleed)
      out.push({ label: 'Cuts bleed', value: `${d.meleeBleed.dps}/s for ${s1(d.meleeBleed.durationS)} s` });
    if (d.darkensFoes) out.push({ label: 'Enemy sight', value: `${s1(d.darkensFoes.visibleM)} m in the dark` });
    if (d.damageTakenFactor !== 1)
      out.push({ label: 'Damage taken', value: `-${Math.round((1 - d.damageTakenFactor) * 100)}%` });
  }
  if (d.type === 'summon') {
    out.push({ label: 'Summons', value: `${d.count} ${d.character.replace(/-/g, ' ')}s` });
    out.push({ label: 'Lasts', value: d.lifeS === null ? 'until destroyed' : `${s1(d.lifeS)} s` });
  }
  if (d.type === 'teleport' && d.retreatM !== undefined)
    out.push({ label: 'Escape', value: `${s1(d.retreatM)} m away from the opponent` });
  else if (d.type === 'teleport') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'leap') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'beam') out.push({ label: 'Range', value: `${s1(d.rangeM)} m` });
  else if (d.type === 'projectile') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'dash')
    out.push({ label: 'Distance', value: d.untilBlocked ? 'until a wall stops him' : `${s1(d.distanceM)} m` });
  else if (d.type === 'nova') out.push({ label: 'Area', value: `${s1(d.radiusM)} m radius` });
  if (a.slot === 'ult') out.push({ label: 'Charge', value: 'fills as you deal and take damage' });
  else {
    out.push({ label: 'Cooldown', value: `${s1(a.cooldownS)} s` });
    out.push({ label: 'Stamina', value: `${a.staminaCost}` });
  }
  out.push({ label: 'Wind-up', value: `${s1(a.castS)} s` });
  return out;
}

/** How to use an ability on this device. */
function howTo(a: AbilityDef, device: Device, keys: Bindings): string {
  const d = a.delivery;
  if (device === 'touch') {
    const button = a.slot === 'ult' ? 'the ULT button' : `the ${SLOT_BUTTON[a.slot]} ability button`;
    const ready = a.slot === 'ult' ? ' once it reads READY' : '';
    if (d.type === 'teleport' && d.behindTargetM !== undefined)
      return `Tap ${button}: he appears behind the nearest enemy in range.`;
    if (d.type === 'teleport' && d.retreatM !== undefined)
      return `Tap ${button}: he vanishes and reappears well away from the opponent.`;
    if (d.type === 'teleport')
      return `Tap ${button} to start aiming, move the marker with the joystick, then tap ${button} again to teleport there. Tap ✕ to cancel.`;
    if (d.type === 'leap')
      return `Tap ${button}${ready} to start aiming, move the landing spot with the joystick, then tap ${button} again to jump. Tap ✕ to cancel.`;
    if (d.type === 'beam')
      return `Tap ${button}. While the beam pours, drag the joystick (or swipe on the right) to steer it.`;
    if (d.type === 'nova' && d.atTarget) return `Tap ${button}${ready}: it lands on the opponent you face.`;
    return `Tap ${button}${ready}.`;
  }
  const key = codeLabel(keys[SLOT_ACTION[a.slot]]);
  const move = `${codeLabel(keys.moveUp)} ${codeLabel(keys.moveLeft)} ${codeLabel(keys.moveDown)} ${codeLabel(keys.moveRight)}`;
  const ready = a.slot === 'ult' ? ' when the ultimate meter is full' : '';
  if (d.type === 'teleport' && d.behindTargetM !== undefined)
    return `Press ${key}: he appears behind the nearest enemy in range.`;
  if (d.type === 'teleport' && d.retreatM !== undefined)
    return `Press ${key}: he vanishes and reappears well away from the opponent.`;
  if (d.type === 'teleport')
    return `Press ${key} to start aiming, move the marker with ${move}, then press ${key} again to teleport there. Esc cancels.`;
  if (d.type === 'leap')
    return `Press ${key}${ready} to start aiming, move the landing spot with ${move}, then press ${key} again to jump. Esc cancels.`;
  if (d.type === 'beam') return `Press ${key}. While the beam pours, move the mouse to steer it.`;
  if (d.type === 'nova' && d.atTarget) return `Press ${key}${ready}: it lands on the opponent you face.`;
  return `Press ${key}${ready}.`;
}

/** The basic combo (Button 1): its moves and how to use it. */
function comboEntry(def: FighterDef, device: Device, keys: Bindings): SheetAbility {
  const chain: string[] = [];
  let id = def.starters.tap;
  while (id && chain.length < 6) {
    const m = def.moves[id];
    if (!m) break;
    chain.push(m.label);
    id = m.next?.tap;
  }
  const hits = chain.map((name, i) => {
    const m = Object.values(def.moves).find((x) => x.label === name);
    return { label: `Hit ${i + 1}`, value: `${name}${m ? ` (${Math.round(m.damage * def.stats.power)})` : ''}` };
  });
  const attack = codeLabel(keys.attack);
  return {
    slot: 'combo',
    key: device === 'touch' ? 'MELEE' : attack,
    name: 'Basic combo',
    icon: def.abilities?.comboIcon ?? null,
    description: `A ${chain.length}-hit string of blows; the last one is the finisher.`,
    stats: [...hits, { label: 'Stamina', value: 'none' }],
    howTo:
      device === 'touch'
        ? 'Tap MELEE again and again to chain the combo; hold MELEE to block.'
        : `${attack} again and again to chain the combo; hold ${attack} to block.`,
  };
}

/** The Heavy Attack (owner, 12/11/2026): the fighter's own heavy blow. */
function heavyEntry(def: FighterDef, device: Device, keys: Bindings): SheetAbility | null {
  const id = def.starters.heavy;
  const m = id ? def.moves[id] : undefined;
  if (!m) return null;
  const stats = [
    { label: 'Damage', value: `${Math.round(m.damage * def.stats.power)}` },
    { label: 'Wind-up', value: `${s1(m.windupS)} s` },
  ];
  if (m.heavy) stats.push({ label: 'Knockdown', value: 'yes' });
  if (m.burn) stats.push({ label: 'Burn', value: `${m.burn.dps}/s for ${s1(m.burn.durationS)} s` });
  if (m.bleed) stats.push({ label: 'Bleed', value: `${m.bleed.dps}/s for ${s1(m.bleed.durationS)} s` });
  stats.push({ label: 'Stamina', value: 'none' });
  const key = device === 'touch' ? 'HEAVY' : codeLabel(keys.heavyAttack);
  return {
    slot: 'heavy',
    key,
    name: m.label,
    icon: def.abilities?.heavyIcon ?? null,
    description: 'His own heavy blow: slower to start than the combo, but it hits hard and knocks down.',
    stats,
    howTo: device === 'touch' ? 'Tap HEAVY on the ground.' : `Press ${key} on the ground.`,
  };
}

export function fighterSheet(def: FighterDef, device: Device, keys: Bindings): FighterSheet {
  const kit = def.abilities;
  const abilities: SheetAbility[] = [comboEntry(def, device, keys)];
  const heavy = heavyEntry(def, device, keys);
  if (heavy) abilities.push(heavy);
  if (kit) {
    for (const slot of ['a1', 'a2', 'a3', 'a4', 'ult'] as const) {
      const a = kit[slot];
      abilities.push({
        slot,
        key:
          device === 'touch'
            ? slot === 'ult'
              ? 'ULT'
              : `Button ${slot.slice(1)}`
            : codeLabel(keys[SLOT_ACTION[slot]]),
        name: a.name,
        icon: a.icon ?? null,
        description: a.description ?? '',
        stats: abilityStats(a),
        howTo: howTo(a, device, keys),
      });
    }
  }
  return { ratings: fighterRatings(def), abilities };
}
