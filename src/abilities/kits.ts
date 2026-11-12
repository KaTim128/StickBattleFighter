import { INFERNO_KIT } from '../data/abilities/inferno';
import { NECRO_KIT } from '../data/abilities/necro';
import { RAMPAGE_KIT } from '../data/abilities/rampage';
import { SHROUD_KIT } from '../data/abilities/shroud';
import type { AbilityKit } from './ability-def';

/** Ability kits by id: a Character Definition's `abilityKit` names one (TD-039). */
export const ABILITY_KITS: Readonly<Record<string, AbilityKit>> = {
  'inferno-kit': INFERNO_KIT,
  'rampage-kit': RAMPAGE_KIT,
  'necro-kit': NECRO_KIT,
  'shroud-kit': SHROUD_KIT,
};
