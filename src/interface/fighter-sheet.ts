import type { AbilityDef, AbilitySlot } from '../abilities/ability-def';
import { type FighterRatings, fighterRatings } from '../characters/ratings';
import type { FighterDef } from '../data/fighters/fighter-def';
import { type Bindings, codeLabel } from '../input/bindings';

/**
 * Everything the fighter details screen shows (owner, 12/11/2026): the six ratings, and each
 * ability with what it does, its numbers, and how to use it on the device being played (desktop
 * keys come from the player's own bindings). Pure: built from the fighter's data.
 */
export interface SheetAbility {
  readonly slot: AbilitySlot | 'combo';
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

const SLOT_BUTTON: Readonly<Record<AbilitySlot, string>> = { a1: 'first', a2: 'second', a3: 'third', ult: 'ULT' };
const SLOT_ACTION = { a1: 'ability1', a2: 'ability2', a3: 'ability3', ult: 'ultimate' } as const;

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
  if (p.burn) out.push({ label: 'Burn', value: `${p.burn.dps}/s for ${s1(p.burn.durationS)} s` });
  if (p.stunS) out.push({ label: 'Stun', value: `${s1(p.stunS)} s` });
  if (p.blindS) out.push({ label: 'Blind', value: `${s1(p.blindS)} s` });
  if (p.lifesteal) out.push({ label: 'Heals', value: `${Math.round(p.lifesteal * 100)}% of damage dealt` });
  if (p.heavy) out.push({ label: 'Knockdown', value: 'yes' });
  if (d.type === 'buff') {
    out.push({ label: 'Lasts', value: `${s1(d.durationS)} s` });
    if (d.speedFactor !== 1) out.push({ label: 'Speed', value: `+${Math.round((d.speedFactor - 1) * 100)}%` });
    if (d.damageTakenFactor !== 1)
      out.push({ label: 'Damage taken', value: `-${Math.round((1 - d.damageTakenFactor) * 100)}%` });
  }
  if (d.type === 'summon') {
    out.push({ label: 'Summons', value: `${d.count} ${d.character.replace(/-/g, ' ')}s` });
    out.push({ label: 'Lasts', value: d.lifeS === null ? 'until destroyed' : `${s1(d.lifeS)} s` });
  }
  if (d.type === 'teleport') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'leap') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'beam') out.push({ label: 'Range', value: `${s1(d.rangeM)} m` });
  else if (d.type === 'projectile') out.push({ label: 'Range', value: `${s1(d.maxRangeM)} m` });
  else if (d.type === 'dash') out.push({ label: 'Distance', value: `${s1(d.distanceM)} m` });
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
    if (d.type === 'teleport')
      return `Tap ${button}, then tap the spot on the map to teleport there. Tap the button again to cancel.`;
    if (d.type === 'leap') return `Hold ${button}${ready} and drag to place the landing spot; let go to jump.`;
    if (d.type === 'beam')
      return `Tap ${button}. While the beam pours, drag the joystick (or swipe on the right) to steer it.`;
    if (d.type === 'nova' && d.atTarget) return `Tap ${button}${ready}: it lands on the opponent you face.`;
    return `Tap ${button}${ready}.`;
  }
  const key = codeLabel(keys[SLOT_ACTION[a.slot]]);
  const confirm = codeLabel(keys.ultimateLaunch);
  const ready = a.slot === 'ult' ? ' when the ultimate meter is full' : '';
  if (d.type === 'teleport')
    return `Press ${key}, move the mouse to the spot, then ${confirm} to teleport there. Press ${key} again to cancel.`;
  if (d.type === 'leap') return `Press ${key}${ready}, hover the mouse over the landing spot, then ${confirm} to jump.`;
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
    icon: null,
    description: `A ${chain.length}-hit string of blows; the last one is the finisher.`,
    stats: [...hits, { label: 'Stamina', value: 'none' }],
    howTo:
      device === 'touch'
        ? 'Tap MELEE again and again to chain the combo; hold MELEE to block.'
        : `${attack} again and again to chain the combo; hold ${attack} to block.`,
  };
}

export function fighterSheet(def: FighterDef, device: Device, keys: Bindings): FighterSheet {
  const kit = def.abilities;
  const abilities: SheetAbility[] = [comboEntry(def, device, keys)];
  if (kit) {
    for (const slot of ['a1', 'a2', 'a3', 'ult'] as const) {
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
