import { ABILITY_SLOTS, type AbilityDef, type AbilitySlot } from '../abilities/ability-def';
import { ABILITY_KITS } from '../abilities/kits';
import { BUILT_IN_LIBRARY } from '../characters/library';
import {
  checkOverride,
  type FighterOverride,
  getPath,
  kitWithOverrides,
  loadOverrides,
  saveOverride,
} from '../characters/overrides';
import { CAPABILITY_KEYS, type CharacterLibrary } from '../characters/schema';
import type { ConfigField, ConfigGroup, ConfigTab, FighterConfigHost } from '../interface/fighter-config';

/**
 * The admin fighter settings behind the menu's fighter page (owner, 13/11/2026): which fields can be
 * edited, their current and built-in values, and turning the edited values into a checked, saved
 * override (`src/characters/overrides.ts`). Field keys say where a value goes:
 * `def:<path>`, `stats:<path>`, `ai:<path>`, `move:<moveId>:<path>`, `ab:<slot>:<path>`.
 */

/** Stats shown in the Stats tab: path, label, limits. */
const STAT_FIELDS: readonly [string, string, number, number, number][] = [
  ['maxHp', 'Health (HP)', 1, 100000, 10],
  ['maxStamina', 'Stamina', 1, 10000, 1],
  ['staminaRegenPerS', 'Stamina regen per second', 0, 1000, 1],
  ['power', 'Power (damage multiplier)', 0, 100, 0.05],
  ['defence', 'Defence (damage taken divider)', 0.01, 100, 0.05],
  ['critChance', 'Critical hit chance (0 to 1)', 0, 1, 0.01],
  ['critMultiplier', 'Critical hit multiplier', 1, 10, 0.1],
  ['knockbackResistance', 'Knockback resistance (0 to 1)', 0, 1, 0.05],
  ['movement.maxSpeedMps', 'Top speed (m/s)', 0.1, 50, 0.1],
  ['movement.accelMps2', 'Acceleration (m/s²)', 0.1, 500, 1],
  ['movement.jumpSpeedMps', 'Jump speed (m/s)', 0, 50, 0.1],
  ['body.massKg', 'Body mass (kg)', 1, 1000, 1],
  ['objects.maxLiftKg', 'Heaviest object it can lift (kg)', 0, 1000, 1],
  ['objects.throwPower', 'Throw power', 0, 10, 0.05],
];

/** Melee move fields in Move Config. */
const MOVE_FIELDS: readonly [string, string, number, number, number][] = [
  ['damage', 'Damage', 0, 10000, 1],
  ['startupS', 'Wind-up (s)', 0, 5, 0.01],
  ['activeS', 'Active (s)', 0, 5, 0.01],
  ['recoveryS', 'Recovery (s)', 0, 5, 0.01],
  ['knockbackMps', 'Knockback (m/s)', 0, 100, 0.1],
  ['lungeMps', 'Lunge (m/s)', 0, 50, 0.1],
  ['moveFactor', 'Movement while attacking (0 to 1)', 0, 1, 0.05],
];

/** Ability fields every ability shows (its effects and timing), whether it uses them yet or not. */
const ABILITY_FIELDS: readonly [string, string, number, number, number][] = [
  ['staminaCost', 'Stamina cost', 0, 10000, 1],
  ['cooldownS', 'Cooldown (s)', 0, 600, 0.1],
  ['castS', 'Wind-up (s)', 0, 10, 0.05],
  ['recoveryS', 'Recovery (s)', 0, 10, 0.05],
  ['aimRangeM', 'Aim range (m)', 0, 100, 0.5],
  ['moveFactor', 'Movement while casting (0 to 1)', 0, 1, 0.05],
  ['payload.damage', 'Damage', 0, 10000, 1],
  ['payload.knockbackMps', 'Knockback (m/s)', 0, 100, 0.1],
  ['payload.stunS', 'Effect: stun (s)', 0, 30, 0.1],
  ['payload.blindS', 'Effect: blind (s)', 0, 30, 0.1],
  ['payload.burn.dps', 'Effect: burn damage per second', 0, 1000, 1],
  ['payload.burn.durationS', 'Effect: burn duration (s)', 0, 60, 0.1],
  ['payload.bleed.dps', 'Effect: bleed damage per second', 0, 1000, 1],
  ['payload.bleed.durationS', 'Effect: bleed duration (s)', 0, 60, 0.1],
  ['payload.lifesteal', 'Effect: life steal (share of damage)', 0, 5, 0.05],
];

const AI_FIELDS: readonly [string, string, number, number, number][] = [
  ['aggression', 'AI aggression (0 to 1)', 0, 1, 0.05],
  ['attackEveryS', 'AI pause between attack strings (s)', 0.1, 20, 0.1],
];

const words = (s: string): string => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** Numeric and on/off settings of an ability's delivery (its mechanics), by path. */
function deliveryFields(def: AbilityDef): [string, number | boolean][] {
  const out: [string, number | boolean][] = [];
  const walk = (o: unknown, path: string): void => {
    if (o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (k === 'type' || k === 'character') continue;
      const p = `${path}.${k}`;
      if (typeof v === 'number' || typeof v === 'boolean') out.push([p, v]);
      else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p);
    }
  };
  walk(def.delivery, 'delivery');
  return out;
}

export function fighterSettingsHost(onSaved: (fighterId: string) => void): FighterConfigHost {
  const base: CharacterLibrary = BUILT_IN_LIBRARY;
  return {
    tabs(id) {
      const override = loadOverrides()[id] ?? {};
      const char = base.characters[id];
      if (!char) return [];
      const stats = base.stats[char.profiles.stats];
      const moveset = base.moveset[char.profiles.moveset];
      const ai = base.ai[char.profiles.ai];
      const field = (
        key: string,
        label: string,
        kind: ConfigField['kind'],
        builtIn: unknown,
        now: unknown,
        lim?: [number, number, number],
      ): ConfigField => ({
        key,
        label,
        kind,
        value: (now ?? builtIn ?? (kind === 'bool' ? false : kind === 'number' ? 0 : '')) as string | number | boolean,
        changed: now !== undefined && now !== builtIn,
        ...(lim ? { min: lim[0], max: lim[1], step: lim[2] } : {}),
      });
      const def = override.definition ?? {};
      const appearance: ConfigGroup = {
        title: 'Appearance',
        fields: [
          field('def:displayName', 'Name', 'text', char.displayName, def.displayName),
          field('def:rig.colour', 'Accent colour (HUD, menu)', 'colour', char.rig.colour, def['rig.colour']),
          field(
            'def:rig.glow',
            'Glow colour (armour seams, core)',
            'colour',
            char.rig.glow ?? char.rig.colour,
            def['rig.glow'],
          ),
          field('def:rig.scale', 'Size (1 = normal)', 'number', char.rig.scale ?? 1, def['rig.scale'], [0.5, 2, 0.05]),
        ],
      };
      const statsTab: ConfigGroup = {
        title: 'Stats',
        fields: STAT_FIELDS.map(([p, label, lo, hi, step]) =>
          field(`stats:${p}`, label, 'number', getPath(stats, p), override.stats?.[p], [lo, hi, step]),
        ),
      };
      const moves: ConfigGroup[] = (moveset?.moves ?? []).map((m) => ({
        title: `Move: ${m.displayName ?? m.id}`,
        fields: MOVE_FIELDS.map(([p, label, lo, hi, step]) =>
          field(`move:${m.id}:${p}`, label, 'number', getPath(m, p), override.moves?.[m.id]?.[p], [lo, hi, step]),
        ),
      }));
      const kit = char.abilityKit ? ABILITY_KITS[char.abilityKit] : undefined;
      const abilities: ConfigGroup[] = kit
        ? ABILITY_SLOTS.map((slot) => {
            const a = kit[slot];
            const changes = override.abilities?.[slot] ?? {};
            const key = slot === 'ult' ? 'Ultimate' : `Ability ${slot.slice(1)}`;
            return {
              title: `${key}: ${a.name}`,
              fields: [
                ...ABILITY_FIELDS.map(([p, label, lo, hi, step]) =>
                  field(`ab:${slot}:${p}`, label, 'number', getPath(a, p), changes[p], [lo, hi, step]),
                ),
                field(
                  `ab:${slot}:payload.heavy`,
                  'Effect: knocks down (heavy)',
                  'bool',
                  a.payload.heavy,
                  changes['payload.heavy'],
                ),
                ...deliveryFields(a).map(([p, v]) =>
                  field(
                    `ab:${slot}:${p}`,
                    `Mechanics: ${words(p.split('.').slice(1).join(' '))}`,
                    typeof v === 'boolean' ? 'bool' : 'number',
                    v,
                    changes[p],
                    typeof v === 'number' ? [0, 10000, 0.05] : undefined,
                  ),
                ),
              ],
            };
          })
        : [];
      const other: ConfigGroup[] = [
        {
          title: 'AI (this fighter only)',
          fields: AI_FIELDS.map(([p, label, lo, hi, step]) =>
            field(`ai:${p}`, label, 'number', getPath(ai, p), override.ai?.[p], [lo, hi, step]),
          ),
        },
        {
          title: 'Capabilities',
          fields: CAPABILITY_KEYS.map((k) =>
            field(`def:capabilities.${k}`, words(k), 'bool', char.capabilities[k] ?? true, def[`capabilities.${k}`]),
          ),
        },
      ];
      return [
        { id: 'appearance', label: 'Appearance', groups: [appearance] },
        { id: 'stats', label: 'Stats', groups: [statsTab] },
        { id: 'moves', label: 'Move Config', groups: [...abilities, ...moves] },
        { id: 'other', label: 'Other', groups: other },
      ] satisfies ConfigTab[];
    },

    save(id, values) {
      const char = base.characters[id];
      if (!char) return [`Unknown fighter ${id}.`];
      const kit = char.abilityKit ? ABILITY_KITS[char.abilityKit] : undefined;
      const stats = base.stats[char.profiles.stats];
      const moveset = base.moveset[char.profiles.moveset];
      const ai = base.ai[char.profiles.ai];
      const definition: Record<string, string | number | boolean> = {};
      const statOut: Record<string, number> = {};
      const aiOut: Record<string, number> = {};
      const moves: Record<string, Record<string, number | boolean>> = {};
      const abilities: Partial<Record<AbilitySlot, Record<string, number | boolean>>> = {};
      for (const [key, v] of Object.entries(values)) {
        const [scope, a, b] = key.split(':') as [string, string, string | undefined];
        if (scope === 'def') {
          const builtIn =
            getPath(char, a) ?? (a.startsWith('capabilities.') ? true : a === 'rig.scale' ? 1 : undefined);
          if (a === 'rig.glow' && v === char.rig.colour && char.rig.glow === undefined) continue;
          if (v !== builtIn) definition[a] = v;
        } else if (scope === 'stats' && typeof v === 'number') {
          if (v !== getPath(stats, a)) statOut[a] = v;
        } else if (scope === 'ai' && typeof v === 'number') {
          if (v !== getPath(ai, a)) aiOut[a] = v;
        } else if (scope === 'move' && b) {
          const m = moveset?.moves.find((x) => x.id === a);
          if (m && v !== getPath(m, b)) {
            moves[a] = { ...(moves[a] ?? {}), [b]: v as number | boolean };
          }
        } else if (scope === 'ab' && b && kit) {
          const slot = a as AbilitySlot;
          const builtIn = getPath(kit[slot], b);
          // An effect the ability does not have stays off unless given a value.
          if (v === builtIn || (builtIn === undefined && (v === 0 || v === false))) continue;
          abilities[slot] = { ...(abilities[slot] ?? {}), [b]: v as number | boolean };
        }
      }
      const override: FighterOverride = {
        ...(Object.keys(definition).length ? { definition } : {}),
        ...(Object.keys(statOut).length ? { stats: statOut } : {}),
        ...(Object.keys(aiOut).length ? { ai: aiOut } : {}),
        ...(Object.keys(moves).length ? { moves } : {}),
        ...(Object.keys(abilities).length ? { abilities } : {}),
      };
      const errors = checkOverride(base, id, override);
      if (errors.length > 0) return errors;
      // An effect needs both of its numbers (burn and bleed: damage per second and duration).
      if (kit) {
        const tried = kitWithOverrides(id, kit, { [id]: override });
        for (const slot of ABILITY_SLOTS) {
          for (const eff of ['burn', 'bleed'] as const) {
            const e = tried[slot].payload[eff];
            if (e && (!(e.dps > 0) || !(e.durationS > 0)) && (e.dps > 0 || e.durationS > 0))
              return [`${tried[slot].name}: ${eff} needs both damage per second and a duration.`];
          }
        }
      }
      saveOverride(id, Object.keys(override).length ? override : null);
      onSaved(id);
      return [];
    },

    reset(id) {
      saveOverride(id, null);
      onSaved(id);
    },
  };
}
