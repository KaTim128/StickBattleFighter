import type { AbilityDef, AbilityKit } from './ability-def';

/**
 * Ability loadout (master plan B13, owner 16/11/2026): every fighter knows five normal abilities
 * and equips four. The fifth (`kit.a5`) names the slot it takes (`a5.slot`); equipping it benches
 * the ability that normally sits there, which becomes the unequipped alternative. The four combat
 * buttons, the AI, the tutorial and the HUD keep working on a1..a4 unchanged (TD-085).
 */
export interface Loadout {
  /** Equip the fifth ability in place of the one in its slot. */
  readonly useFifth: boolean;
}

export const DEFAULT_LOADOUT: Loadout = { useFifth: false };

/** The kit as it fights: the fifth ability swapped in when chosen, the displaced one kept as the alternative. */
export function applyLoadout(kit: AbilityKit, loadout: Loadout = DEFAULT_LOADOUT): AbilityKit {
  const fifth = kit.a5;
  if (!fifth || !loadout.useFifth) return kit;
  const slot = fifth.slot;
  if (slot === 'ult') return kit;
  return { ...kit, [slot]: fifth, a5: kit[slot] };
}

/** The four equipped normal abilities in slot order, and the one on the bench (if the kit has five). */
export function equippedAbilities(kit: AbilityKit): {
  equipped: readonly AbilityDef[];
  alternative: AbilityDef | null;
} {
  return { equipped: [kit.a1, kit.a2, kit.a3, kit.a4], alternative: kit.a5 ?? null };
}
