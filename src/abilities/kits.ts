import { AERION_KIT } from '../data/abilities/aerion';
import { INFERNO_KIT } from '../data/abilities/inferno';
import { KENSHIRO_KIT } from '../data/abilities/kenshiro';
import { NECRO_KIT } from '../data/abilities/necro';
import { PSION_KIT } from '../data/abilities/psion';
import { RAMPAGE_KIT } from '../data/abilities/rampage';
import { SHROUD_KIT } from '../data/abilities/shroud';
import { VEXORIS_KIT } from '../data/abilities/vexoris';
import type { AbilityKit } from './ability-def';

/** Ability kits by id: a Character Definition's `abilityKit` names one (TD-039). */
export const ABILITY_KITS: Readonly<Record<string, AbilityKit>> = {
  'inferno-kit': INFERNO_KIT,
  'rampage-kit': RAMPAGE_KIT,
  'necro-kit': NECRO_KIT,
  'shroud-kit': SHROUD_KIT,
  'vexoris-kit': VEXORIS_KIT,
  'aerion-kit': AERION_KIT,
  'kenshiro-kit': KENSHIRO_KIT,
  'psion-kit': PSION_KIT,
};
