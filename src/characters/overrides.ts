import type { AbilityDef, AbilityKit, AbilitySlot } from '../abilities/ability-def';
import type { CharacterLibrary } from './schema';
import { validateCharacter } from './validate';

/**
 * Admin fighter settings (owner, 13/11/2026): changes to a fighter's appearance, stats, moves,
 * abilities, AI and capabilities made from its page in the menu, kept as overrides on top of the
 * built-in data in this browser. Every change is validated before it is used (an invalid set is
 * ignored and the built-in fighter is used). Local only: publishing changes for every player needs
 * the server-side admin of REQ-BE-4 (security rules).
 */
export interface FighterOverride {
  /** Character definition fields by path (`displayName`, `rig.scale`, `rig.colour`, `rig.glow`, `capabilities.canJump`). */
  readonly definition?: Readonly<Record<string, string | number | boolean>>;
  /** Stats profile fields by path (`maxHp`, `movement.maxSpeedMps`, `power` ...). */
  readonly stats?: Readonly<Record<string, number>>;
  /** AI profile fields (`aggression`, `attackEveryS` ...), for this fighter only. */
  readonly ai?: Readonly<Record<string, number>>;
  /** Melee moves by id, fields by path (`damage`, `startupS`, `knockbackMps` ...). */
  readonly moves?: Readonly<Record<string, Readonly<Record<string, number | boolean>>>>;
  /** Abilities by slot, fields by path (`cooldownS`, `payload.damage`, `payload.burn.dps`, `delivery.speedMps` ...). */
  readonly abilities?: Readonly<Partial<Record<AbilitySlot, Readonly<Record<string, number | boolean>>>>>;
}

export type FighterOverrides = Readonly<Record<string, FighterOverride>>;

const KEY = 'stickman-arena.fighter-overrides.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadOverrides(): FighterOverrides {
  try {
    const raw = store()?.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as FighterOverrides) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {}; // unreadable: no overrides
  }
}

export function saveOverride(characterId: string, override: FighterOverride | null): void {
  const all = { ...loadOverrides() };
  if (override === null) delete all[characterId];
  else all[characterId] = override;
  store()?.setItem(KEY, JSON.stringify(all));
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Read a value by a dotted path. */
export function getPath(obj: unknown, path: string): unknown {
  let at: unknown = obj;
  for (const k of path.split('.')) {
    if (at === null || typeof at !== 'object') return undefined;
    at = (at as Record<string, unknown>)[k];
  }
  return at;
}

/** Set a value by a dotted path, creating objects on the way. */
export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let at = obj;
  for (const k of keys.slice(0, -1)) {
    if (at[k] === null || typeof at[k] !== 'object') at[k] = {};
    at = at[k] as Record<string, unknown>;
  }
  at[keys[keys.length - 1]!] = value;
}

function applyFields(target: Record<string, unknown>, fields: Readonly<Record<string, unknown>> | undefined): void {
  for (const [path, v] of Object.entries(fields ?? {})) setPath(target, path, v);
}

/** A copy of `lib` with one fighter's override applied (its AI profile is copied, never shared). */
export function applyOverride(lib: CharacterLibrary, characterId: string, o: FighterOverride): CharacterLibrary {
  const char = lib.characters[characterId];
  if (!char) return lib;
  const out = { ...lib } as { -readonly [K in keyof CharacterLibrary]: CharacterLibrary[K] };
  const def = clone(char) as unknown as Record<string, unknown>;
  applyFields(def, o.definition);
  const profiles = def.profiles as Record<string, string>;
  if (o.stats && lib.stats[profiles.stats!]) {
    const stats = clone(lib.stats[profiles.stats!]!) as unknown as Record<string, unknown>;
    applyFields(stats, o.stats);
    out.stats = { ...lib.stats, [profiles.stats!]: stats as never };
  }
  if (o.ai && lib.ai[profiles.ai!]) {
    const id = `${characterId}-ai-custom`;
    const ai = clone(lib.ai[profiles.ai!]!) as unknown as Record<string, unknown>;
    applyFields(ai, o.ai);
    ai.id = id;
    out.ai = { ...lib.ai, [id]: ai as never };
    profiles.ai = id;
  }
  if (o.moves && lib.moveset[profiles.moveset!]) {
    const set = clone(lib.moveset[profiles.moveset!]!) as unknown as { moves: Record<string, unknown>[] };
    for (const m of set.moves) applyFields(m, o.moves[m.id as string]);
    out.moveset = { ...lib.moveset, [profiles.moveset!]: set as never };
  }
  out.characters = { ...lib.characters, [characterId]: def as never };
  return out;
}

/**
 * The library with every saved override applied, each validated: a fighter whose changed data
 * does not pass validation keeps its built-in data (and the reason is reported).
 */
export function withOverrides(
  lib: CharacterLibrary,
  overrides: FighterOverrides = loadOverrides(),
): { library: CharacterLibrary; rejected: Record<string, string[]> } {
  let out = lib;
  const rejected: Record<string, string[]> = {};
  for (const [id, o] of Object.entries(overrides)) {
    const next = applyOverride(out, id, o);
    const report = validateCharacter(id, next);
    if (report.errors.length > 0) rejected[id] = report.errors;
    else out = next;
  }
  return { library: out, rejected };
}

/** Check one fighter's changes before saving them: the validation errors, if any. */
export function checkOverride(lib: CharacterLibrary, characterId: string, o: FighterOverride): string[] {
  return validateCharacter(characterId, applyOverride(lib, characterId, o)).errors;
}

/** Sane limits for edited ability numbers (they are not covered by the character schema). */
const ABILITY_LIMIT = 10_000;

/**
 * A fighter's ability kit with its saved ability changes (Move Config). Numbers are kept finite,
 * not negative and within limits; anything else is ignored.
 */
export function kitWithOverrides(
  characterId: string,
  kit: AbilityKit,
  overrides: FighterOverrides = loadOverrides(),
): AbilityKit {
  const changes = overrides[characterId]?.abilities;
  if (!changes) return kit;
  const out = { ...kit } as Record<AbilitySlot, AbilityDef>;
  for (const [slot, fields] of Object.entries(changes) as [AbilitySlot, Record<string, number | boolean>][]) {
    if (!out[slot] || !fields) continue;
    const def = clone(out[slot]) as unknown as Record<string, unknown>;
    for (const [path, v] of Object.entries(fields)) {
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0 || v > ABILITY_LIMIT)) continue;
      setPath(def, path, v);
    }
    out[slot] = def as unknown as AbilityDef;
  }
  return out as AbilityKit;
}
