import baseAnimation from '../data/characters/base-stickman/animation-profile.json';
import baseCharacter from '../data/characters/base-stickman/character.json';
import baseMoveset from '../data/characters/base-stickman/moveset.json';
import baseStats from '../data/characters/base-stickman/stats.json';
import infernoAnimation from '../data/characters/inferno/animation-profile.json';
import infernoAudio from '../data/characters/inferno/audio.json';
import infernoCharacter from '../data/characters/inferno/character.json';
import infernoEffects from '../data/characters/inferno/effects.json';
import infernoMoveset from '../data/characters/inferno/moveset.json';
import infernoStats from '../data/characters/inferno/stats.json';
import necroAnimation from '../data/characters/necro/animation-profile.json';
import necroAudio from '../data/characters/necro/audio.json';
import necroCharacter from '../data/characters/necro/character.json';
import necroEffects from '../data/characters/necro/effects.json';
import necroMoveset from '../data/characters/necro/moveset.json';
import necroStats from '../data/characters/necro/stats.json';
import rampageAnimation from '../data/characters/rampage/animation-profile.json';
import rampageAudio from '../data/characters/rampage/audio.json';
import rampageCharacter from '../data/characters/rampage/character.json';
import rampageEffects from '../data/characters/rampage/effects.json';
import rampageMoveset from '../data/characters/rampage/moveset.json';
import rampageStats from '../data/characters/rampage/stats.json';
import defaultAi from '../data/characters/shared/ai-default.json';
import defaultAnimation from '../data/characters/shared/animation-default.json';
import boxingAnimation from '../data/characters/shared/animation-style-boxing.json';
import taekwondoAnimation from '../data/characters/shared/animation-style-taekwondo.json';
import defaultAudio from '../data/characters/shared/audio-default.json';
import defaultEffects from '../data/characters/shared/effects-default.json';
import shroudAnimation from '../data/characters/shroud/animation-profile.json';
import shroudAudio from '../data/characters/shroud/audio.json';
import shroudCharacter from '../data/characters/shroud/character.json';
import shroudEffects from '../data/characters/shroud/effects.json';
import shroudMoveset from '../data/characters/shroud/moveset.json';
import shroudStats from '../data/characters/shroud/stats.json';
import skeletonAi from '../data/characters/skeleton-warrior/ai.json';
import skeletonCharacter from '../data/characters/skeleton-warrior/character.json';
import skeletonEffects from '../data/characters/skeleton-warrior/effects.json';
import skeletonMoveset from '../data/characters/skeleton-warrior/moveset.json';
import skeletonStats from '../data/characters/skeleton-warrior/stats.json';
import dummyAi from '../data/characters/training-dummy/ai.json';
import dummyCharacter from '../data/characters/training-dummy/character.json';
import dummyStats from '../data/characters/training-dummy/stats.json';
import type {
  AiProfile,
  AnimationProfile,
  AudioProfile,
  CharacterDefinition,
  CharacterLibrary,
  EffectsProfile,
  MovesetProfile,
  StatsProfile,
} from './schema';

/**
 * The built-in character library: every JSON definition and profile under
 * `src/data/characters/` (TD-039). To add a character, add its JSON files and
 * list them here; the validator checks everything before the game uses it.
 * JSON is untyped, so entries are checked at runtime by `validateCharacter`.
 */
const byId = <T extends { id: string }>(items: readonly unknown[]): Record<string, T> =>
  Object.fromEntries((items as T[]).map((x) => [x.id, x]));

export const BUILT_IN_LIBRARY: CharacterLibrary = {
  characters: byId<CharacterDefinition>([
    baseCharacter,
    infernoCharacter,
    rampageCharacter,
    necroCharacter,
    shroudCharacter,
    skeletonCharacter,
    dummyCharacter,
  ]),
  animation: byId<AnimationProfile>([
    defaultAnimation,
    boxingAnimation,
    taekwondoAnimation,
    baseAnimation,
    infernoAnimation,
    rampageAnimation,
    necroAnimation,
    shroudAnimation,
  ]),
  moveset: byId<MovesetProfile>([
    baseMoveset,
    infernoMoveset,
    rampageMoveset,
    necroMoveset,
    shroudMoveset,
    skeletonMoveset,
  ]),
  stats: byId<StatsProfile>([
    baseStats,
    infernoStats,
    rampageStats,
    necroStats,
    shroudStats,
    skeletonStats,
    dummyStats,
  ]),
  effects: byId<EffectsProfile>([
    defaultEffects,
    infernoEffects,
    rampageEffects,
    necroEffects,
    shroudEffects,
    skeletonEffects,
  ]),
  audio: byId<AudioProfile>([defaultAudio, infernoAudio, rampageAudio, necroAudio, shroudAudio]),
  ai: byId<AiProfile>([defaultAi, dummyAi, skeletonAi]),
};

/** Who fights by default (the player's fighter and the Practice opponent). */
export const DEFAULT_CAST = { player: 'inferno', opponent: 'training-dummy' } as const;

/** Used in place of any character whose data is invalid (always valid: it is tested). */
export const FALLBACK_CHARACTER = 'base-stickman';

/** A library with extra or replaced entries (the admin editor's working copy, tests). */
export function withEntries(
  base: CharacterLibrary,
  extra: Partial<{ [K in keyof CharacterLibrary]: readonly unknown[] }>,
): CharacterLibrary {
  const merge = <T extends { id: string }>(key: keyof CharacterLibrary) => ({
    ...(base[key] as unknown as Record<string, T>),
    ...byId<T>(extra[key] ?? []),
  });
  return {
    characters: merge('characters'),
    animation: merge('animation'),
    moveset: merge('moveset'),
    stats: merge('stats'),
    effects: merge('effects'),
    audio: merge('audio'),
    ai: merge('ai'),
  } as CharacterLibrary;
}
