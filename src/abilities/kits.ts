import { INFERNO_KIT } from '../data/abilities/inferno';
import type { AbilityKit } from './ability-def';

/** Ability kits by id: a Character Definition's `abilityKit` names one (TD-039). */
export const ABILITY_KITS: Readonly<Record<string, AbilityKit>> = {
  'inferno-kit': INFERNO_KIT,
};
