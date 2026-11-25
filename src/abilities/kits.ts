import { AERION_KIT } from '../data/abilities/aerion';
import { CHRONOS_KIT } from '../data/abilities/chronos';
import { GEARGRIND_KIT } from '../data/abilities/geargrind';
import { INFERNO_KIT } from '../data/abilities/inferno';
import { INK_CLONE_BOW_KIT, INK_MONSTER_KIT } from '../data/abilities/ink-summons';
import { INKMASTER_KIT } from '../data/abilities/inkmaster';
import { KENSHIRO_KIT } from '../data/abilities/kenshiro';
import { NECRO_KIT } from '../data/abilities/necro';
import { PRISMOR_KIT } from '../data/abilities/prismor';
import { PSION_KIT } from '../data/abilities/psion';
import { RAMPAGE_KIT } from '../data/abilities/rampage';
import { RESON_KIT } from '../data/abilities/reson';
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
  'chronos-kit': CHRONOS_KIT,
  'geargrind-kit': GEARGRIND_KIT,
  'prismor-kit': PRISMOR_KIT,
  'psion-kit': PSION_KIT,
  'reson-kit': RESON_KIT,
  'inkmaster-kit': INKMASTER_KIT,
  'ink-clone-bow-kit': INK_CLONE_BOW_KIT,
  'ink-monster-kit': INK_MONSTER_KIT,
};
