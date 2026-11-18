import type { AbilityDef, AbilityKit } from './ability-def';

/**
 * Ability loadout (master plan B13 and B14, owner 16/11/2026 and 18/11/2026): every fighter knows
 * five normal abilities and equips four. Any one of the five can sit on the bench: the loadout names
 * which ability goes on each of the four ability buttons (a1 to a4), and the one left over is the
 * unequipped alternative, never locked. The combat buttons, the AI, the tutorial and the HUD keep
 * working on a1..a4 unchanged (TD-085, TD-092).
 */
export type NormalSlot = 'a1' | 'a2' | 'a3' | 'a4';
export const NORMAL_SLOTS: readonly NormalSlot[] = ['a1', 'a2', 'a3', 'a4'];

export interface Loadout {
  /** Ability ids for a1, a2, a3 and a4, in that order. Empty = the standard four (as the kit lists them). */
  readonly equipped: readonly string[];
}

export const DEFAULT_LOADOUT: Loadout = { equipped: [] };

/** Every ability a kit knows (the four and the fifth), by id, as the kit lists them. */
function pool(kit: AbilityKit): Map<string, AbilityDef> {
  const all = new Map<string, AbilityDef>();
  for (const a of [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5]) if (a) all.set(a.id, a);
  return all;
}

/** Is this a usable arrangement for the kit (four different known abilities)? */
export function validLoadout(kit: AbilityKit, loadout: Loadout): boolean {
  if (loadout.equipped.length !== NORMAL_SLOTS.length) return false;
  const known = pool(kit);
  return new Set(loadout.equipped).size === NORMAL_SLOTS.length && loadout.equipped.every((id) => known.has(id));
}

/**
 * The kit as it fights: each chosen ability on its button, the one left over kept as the alternative
 * (`a5`). An ability moved off its own slot remembers where it started (`homeSlot`), which is how
 * the AI still knows how to use it. A loadout that does not fit the kit leaves the standard four.
 */
export function applyLoadout(kit: AbilityKit, loadout: Loadout = DEFAULT_LOADOUT): AbilityKit {
  if (!kit.a5 || loadout.equipped.length === 0 || !validLoadout(kit, loadout)) return kit;
  const known = pool(kit);
  const placed = new Map<NormalSlot, AbilityDef>();
  NORMAL_SLOTS.forEach((slot, i) => {
    const def = known.get(loadout.equipped[i] as string) as AbilityDef;
    placed.set(slot, def.slot === slot ? def : { ...def, slot, homeSlot: def.homeSlot ?? def.slot });
  });
  const benched = [...known.values()].find((a) => !loadout.equipped.includes(a.id)) as AbilityDef;
  return {
    ...kit,
    a1: placed.get('a1') as AbilityDef,
    a2: placed.get('a2') as AbilityDef,
    a3: placed.get('a3') as AbilityDef,
    a4: placed.get('a4') as AbilityDef,
    a5: benched,
  };
}

/** The ids on the four buttons of an (applied) kit. */
export function equippedIds(kit: AbilityKit): string[] {
  return [kit.a1.id, kit.a2.id, kit.a3.id, kit.a4.id];
}

/** The loadout after the alternative takes the place of whatever is on `slot` (that one goes to the bench). */
export function loadoutAfterSwap(applied: AbilityKit, slot: NormalSlot): Loadout {
  const alt = applied.a5;
  if (!alt) return DEFAULT_LOADOUT;
  const ids = equippedIds(applied);
  ids[NORMAL_SLOTS.indexOf(slot)] = alt.id;
  return { equipped: ids };
}

/** True when every ability sits where the kit lists it. */
export function isStandard(kit: AbilityKit, loadout: Loadout): boolean {
  return (
    applyLoadout(kit, loadout) === kit || equippedIds(applyLoadout(kit, loadout)).join() === equippedIds(kit).join()
  );
}
