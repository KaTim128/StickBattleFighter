import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_LIBRARY, withEntries } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';
import { resolveCharacter } from '../../../src/characters/resolve';
import type { CharacterDefinition, MovesetProfile, StatsProfile } from '../../../src/characters/schema';
import { REQUIRED_STATES } from '../../../src/characters/schema';
import { validateCharacter } from '../../../src/characters/validate';
import { seededRandom } from '../../../src/combat/combatant';
import { COMBO_VARIANTS, MoveController } from '../../../src/combat/moves';

const LIB = BUILT_IN_LIBRARY;
const inferno = LIB.characters.inferno!;

/** A new character made the intended way: duplicate a definition, change its id and a few fields. */
function variant(id: string, change: (d: CharacterDefinition) => Partial<CharacterDefinition>): CharacterDefinition {
  const base = { ...inferno, id, displayName: id };
  return { ...base, ...change(base) } as CharacterDefinition;
}

describe('1. Base Stickman with the shared default profiles', () => {
  it('validates cleanly and resolves to the original boxing combo', () => {
    const report = validateCharacter('base-stickman', LIB);
    expect(report.errors).toEqual([]);
    const d = resolveCharacter('base-stickman', LIB);
    expect(Object.keys(d.moves)).toEqual(['jab', 'cross', 'hook', 'heavy', 'front-kick', 'flyingKick']); // owner: three punches then a kick
    expect(d.moves.jab!.next).toEqual({ tap: 'cross' });
    expect(d.moves.cross!.next).toEqual({ tap: 'hook' });
    expect(d.moves.hook!.next).toEqual({ tap: 'heavy' });
    expect(d.moves.heavy!.category).toBe('kick'); // owner: three punches then a kick
    expect(d.moves.jab!.damage).toBe(20);
    expect(d.animation.source.Jab).toBe('default'); // from the shared default profile
    expect(d.animation.source.Idle).toBe('style'); // boxing style profile
    expect(d.abilities).toBeNull();
    for (const s of REQUIRED_STATES) expect(d.animation.source[s]).not.toBe('safe');
  });
});

describe('2. Inferno: fire element, taekwondo style, its own profiles', () => {
  const d = resolveCharacter('inferno', LIB);

  it('validates cleanly and uses its own, style and default animations through the fallback chain', () => {
    expect(validateCharacter('inferno', LIB).errors).toEqual([]);
    expect(d.element).toBe('fire');
    expect(d.combatStyle).toBe('taekwondo');
    expect(d.animation.clipIds.RoundhouseKick).toEqual(['inferno.fire-roundhouse']); // Inferno-specific
    expect(d.animation.source.RoundhouseKick).toBe('character');
    expect(d.animation.clipIds.FrontKick).toEqual(['tkd.front-kick']); // taekwondo style
    expect(d.animation.source.FrontKick).toBe('style');
    expect(d.animation.clipIds.Idle).toEqual(['proc.idle.taekwondo']);
    expect(d.animation.clipIds.ClashFinisher).toEqual(['inferno.flame-uppercut']);
    expect(d.animation.source.Uppercut).toBe('default');
  });

  it('has punches, kicks, aerial taekwondo kicks and a downward fire kick, all from data', () => {
    expect(d.starters).toEqual({
      tap: 'jab',
      'tap-forward': 'front-kick',
      'air-tap': 'jumping-front-kick',
      'falling-tap': 'meteor-kick',
      heavy: 'blazing-axe-kick', // the Heavy Attack (owner, 12/11/2026)
    });
    const meteor = d.moves['meteor-kick']!;
    expect(meteor.aerial).toBe(true);
    expect(meteor.groundBounce).toBe(true);
    expect(meteor.burn).toEqual({ dps: 15, durationS: 2 });
    expect(meteor.effect).toBe('ground-fire-explosion');
    expect(d.moves.roundhouse!.category).toBe('kick');
  });

  it('applies its stat multipliers (kick damage 1.25, attack speed 1.15, movement 1.05, jump 1.1, knockback 1.15)', () => {
    const raw = LIB.moveset['inferno-moveset']!.moves.find((m) => m.id === 'roundhouse')!;
    expect(d.moves.roundhouse!.damage).toBeCloseTo(raw.damage * 1.25, 6);
    expect(d.moves.roundhouse!.windupS).toBeCloseTo(raw.startupS / 1.15, 6);
    expect(d.moves.roundhouse!.knockbackSpeedMps).toBeCloseTo(raw.knockbackMps * 1.15, 6);
    expect(d.moves.jab!.damage).toBe(22); // punches ×1.0
    expect(d.movement.maxSpeedMps).toBeCloseTo(5 * 1.05, 6);
    expect(d.movement.jumpSpeedMps).toBeCloseTo(6.5 * 1.1, 6);
  });

  it('gets fire effects, its own audio and the ember-and-ash defeat from its profiles', () => {
    expect(d.effects.limbTrail).toBe('flame-limbs');
    expect(d.effects.disintegration).toBe('ember-ash');
    expect(d.effects.finisher).toBe('finisher-fire');
    expect(d.audio.id).toBe('inferno-audio');
    expect(d.capabilities.usesFireEffects).toBe(true);
    expect(d.abilities?.ult.id).toBe('eruption');
  });
});

describe('3. A character with aerial attacks disabled', () => {
  const lib = withEntries(LIB, {
    characters: [
      variant('grounded', (b) => ({
        capabilities: { ...b.capabilities, canUseAerialKicks: false, canUseDownwardKick: false },
      })),
    ],
  });

  it('loses its aerial moves and starters, with warnings (not errors), and still validates', () => {
    const report = validateCharacter('grounded', lib);
    expect(report.errors).toEqual([]);
    expect(report.warnings.some((w) => w.includes('switched off'))).toBe(true);
    const d = resolveCharacter('grounded', lib);
    expect(d.moves['jumping-front-kick']).toBeUndefined();
    expect(d.moves['meteor-kick']).toBeUndefined();
    expect(d.starters['air-tap']).toBeUndefined();
    const c = new MoveController(d.moves, d.starters);
    c.press({ airborne: true, falling: false, forward: false });
    expect(c.attack).toBeNull(); // nothing happens in the air, and nothing breaks
    c.press({ airborne: false, falling: false, forward: false });
    expect(c.attack?.id).toBe('jab');
  });
});

describe('4. A character with Punch Clash disabled', () => {
  it('resolves with the capability off (the clash system checks it; see the clash integration test)', () => {
    const lib = withEntries(LIB, {
      characters: [variant('no-clash', (b) => ({ capabilities: { ...b.capabilities, canUsePunchClash: false } }))],
    });
    expect(validateCharacter('no-clash', lib).errors).toEqual([]);
    expect(resolveCharacter('no-clash', lib).capabilities.canUsePunchClash).toBe(false);
  });
});

describe('5. A character missing a custom animation', () => {
  it('falls back to its combat style, then the shared default', () => {
    const lib = withEntries(LIB, {
      animation: [{ id: 'bare', extends: 'style-taekwondo', states: {} }],
      characters: [variant('plain', (b) => ({ profiles: { ...b.profiles, animation: 'bare' } }))],
    });
    expect(validateCharacter('plain', lib).errors).toEqual([]);
    const d = resolveCharacter('plain', lib);
    expect(d.animation.clipIds.RoundhouseKick).toEqual(['tkd.roundhouse']); // style
    expect(d.animation.source.RoundhouseKick).toBe('style');
    expect(d.animation.source.Uppercut).toBe('default');
  });
});

describe('6. A character using fallback animations', () => {
  it('uses the safe fallback clip, with a clear warning, when nothing in the chain has the state', () => {
    const shared = LIB.animation['shared-default']!;
    const { AxeKick: _gone, ...rest } = shared.states;
    const lib = withEntries(LIB, { animation: [{ ...shared, states: rest }] });
    const d = resolveCharacter('inferno', lib);
    expect(d.animation.source.AxeKick).toBe('safe');
    expect(d.animation.clipIds.AxeKick).toEqual(['safe.strike']);
    expect(d.warnings.some((w) => w.includes('[animation fallback] AxeKick'))).toBe(true);
    expect(validateCharacter('inferno', lib).warnings.some((w) => w.includes('AxeKick'))).toBe(true);
  });

  it('skips an unknown clip id (and reports it), falling back to the next profile in the chain', () => {
    const lib = withEntries(LIB, {
      animation: [{ id: 'typo', extends: 'style-taekwondo', states: { SideKick: 'tkd.side-kik' } }],
      characters: [variant('typo-fighter', (b) => ({ profiles: { ...b.profiles, animation: 'typo' } }))],
    });
    const report = validateCharacter('typo-fighter', lib);
    expect(report.errors.some((e) => e.includes('unknown clip "tkd.side-kik"'))).toBe(true);
    const d = resolveCharacter('typo-fighter', lib);
    expect(d.animation.clipIds.SideKick).toEqual(['tkd.side-kick']);
  });
});

describe('7. A character with an invalid move configuration', () => {
  const broken: MovesetProfile = {
    id: 'broken-moves',
    starters: { tap: 'jab', 'air-tap': 'jab', 'tap-forward': 'ghost' },
    moves: [
      {
        ...LIB.moveset['inferno-moveset']!.moves[0]!,
        id: 'jab',
        startupS: 0,
        recoveryS: -0.1,
        knockbackMps: Number.POSITIVE_INFINITY,
        next: { tap: 'nowhere' },
      },
    ],
  };
  const lib = withEntries(LIB, {
    moveset: [broken],
    characters: [variant('broken', (b) => ({ profiles: { ...b.profiles, moveset: 'broken-moves' } }))],
  });

  it('gives clear validation messages for every problem', () => {
    const errors = validateCharacter('broken', lib).errors.join('\n');
    expect(errors).toContain('startupS = 0 is outside the allowed range'); // zero-length attack
    expect(errors).toContain('recoveryS = -0.1 is outside the allowed range'); // negative recovery
    expect(errors).toContain('knockbackMps must be a number'); // infinite knockback
    expect(errors).toContain('combo route tap → "nowhere" does not exist');
    expect(errors).toContain('starter tap-forward → "ghost" does not exist');
    expect(errors).toContain('starter air-tap → "jab": an air input needs an aerial move');
  });

  it('does not crash the game: loading falls back to the Base Stickman and keeps the report', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaded = loadCharacter('broken', lib);
    spy.mockRestore();
    expect(loaded.fellBack).toBe(true);
    expect(loaded.def.id).toBe('base-stickman');
    expect(loaded.report.errors.length).toBeGreaterThan(3);
  });
});

describe('validation limits and references', () => {
  it('rejects negative health, bad colours, unknown capabilities, missing profiles and unknown sounds', () => {
    const badStats: StatsProfile = { ...LIB.stats['inferno-stats']!, id: 'bad-stats', maxHp: -5 };
    const lib = withEntries(LIB, {
      stats: [badStats],
      audio: [{ ...LIB.audio['inferno-audio']!, id: 'bad-audio', jump: ['no-such-sound'] }],
      characters: [
        variant('bad', (b) => ({
          profiles: { ...b.profiles, stats: 'bad-stats', audio: 'bad-audio', effects: 'nope' },
          rig: { ...b.rig, colour: 'orange' },
          capabilities: { ...b.capabilities, canFly: true } as CharacterDefinition['capabilities'],
        })),
      ],
    });
    const errors = validateCharacter('bad', lib).errors.join('\n');
    expect(errors).toContain('maxHp = -5 is outside the allowed range');
    expect(errors).toContain('rig.colour must be a colour');
    expect(errors).toContain('Unknown capability "canFly"');
    expect(errors).toContain('profiles.effects "nope" does not exist');
    expect(errors).toContain('unknown sound "no-such-sound"');
  });

  it('rejects impossible combo transitions (ground into air) and routes back to the same move', () => {
    const set = LIB.moveset['inferno-moveset']!;
    const moves = set.moves.map((m) =>
      m.id === 'jab'
        ? { ...m, next: { tap: 'meteor-kick' } }
        : m.id === 'straight'
          ? { ...m, next: { tap: 'straight' } }
          : m,
    );
    const lib = withEntries(LIB, {
      moveset: [{ ...set, id: 'loops', moves }],
      characters: [variant('loops', (b) => ({ profiles: { ...b.profiles, moveset: 'loops' } }))],
    });
    const errors = validateCharacter('loops', lib).errors.join('\n');
    expect(errors).toContain('impossible combo route to "meteor-kick"');
    expect(errors).toContain('cannot lead back to the same move');
  });

  it('every built-in character validates without errors', () => {
    for (const id of Object.keys(LIB.characters)) expect(validateCharacter(id, LIB).errors, id).toEqual([]);
  });
});

describe('MoveController (data-driven Button 1)', () => {
  const d = resolveCharacter('inferno', LIB);
  const ground = { airborne: false, falling: false, forward: false };
  const run = (c: MoveController, s: number) => {
    const started: string[] = [];
    for (let i = 0; i < Math.round(s * 60); i++) {
      const ev = c.update(1 / 60, false);
      if (ev.started) started.push(ev.started.id);
    }
    return started;
  };

  it('follows combo routes from data: jab → straight → hook → fire roundhouse; forward taps give the kick string', () => {
    const c = new MoveController(d.moves, d.starters);
    c.press(ground);
    expect(c.attack?.id).toBe('jab');
    c.press(ground);
    expect(run(c, 0.4)).toEqual(['straight']);
    c.press(ground);
    expect(run(c, 0.2)).toEqual(['hook']); // pressed while the straight is still running
    c.press(ground);
    expect(run(c, 0.5)).toEqual(['roundhouse']);
    const k = new MoveController(d.moves, d.starters);
    k.press({ ...ground, forward: true });
    expect(k.attack?.id).toBe('front-kick');
  });

  it('falling taps use the downward kick; rising taps the jumping kick; one aerial move per jump', () => {
    const c = new MoveController(d.moves, d.starters);
    c.press({ airborne: true, falling: true, forward: false });
    expect(c.attack?.id).toBe('meteor-kick');
    c.interrupt();
    c.press({ airborne: true, falling: false, forward: false });
    expect(c.attack).toBeNull(); // already used this jump
    c.landed();
    c.press({ airborne: true, falling: false, forward: false });
    expect(c.attack?.id).toBe('jumping-front-kick');
  });

  it('a string ends without a press, and a single press never chains twice', () => {
    const c = new MoveController(d.moves, d.starters);
    c.press(ground);
    expect(run(c, 0.6)).toEqual([]);
    expect(c.attack).toBeNull();
  });

  it('varies the look every strike, never twice in a row, using every look', () => {
    const c = new MoveController(d.moves, d.starters, seededRandom(7));
    const seen = new Set<number>();
    let last = -1;
    for (let i = 0; i < 30; i++) {
      c.press(ground);
      expect(c.variant).not.toBe(last);
      last = c.variant;
      seen.add(c.variant);
      c.interrupt();
    }
    expect(seen.size).toBe(COMBO_VARIANTS);
  });
});

describe('no character-name checks in shared code (owner)', () => {
  it('shared systems never branch on a character id or name', () => {
    // Registration files are the one place names belong (library index, clip asset ids, ability kit registry).
    const allowed = new Set(['src/characters/library.ts', 'src/abilities/kits.ts', 'src/animation/clips.ts']);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (p !== join('src', 'data')) walk(p);
        } else if (p.endsWith('.ts')) files.push(p.replaceAll('\\', '/'));
      }
    };
    walk('src');
    for (const f of files) {
      if (allowed.has(f)) continue;
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(/inferno|training-dummy|'base-stickman'/i.test(code), f).toBe(false);
    }
  });
});

describe('dodge animation per character (owner, 11/11/2026)', () => {
  const LIB2 = BUILT_IN_LIBRARY;
  it('the default stickman rolls back; Inferno turns into a flame', () => {
    const base = resolveCharacter('base-stickman', LIB2);
    const inferno = resolveCharacter('inferno', LIB2);
    expect(base.animation.clips.Dodge[0]).toMatchObject({ kind: 'procedural', id: 'proc.dodge.quick' }); // owner: a quick dodge, not a roll
    expect(inferno.animation.clips.Dodge[0]).toMatchObject({ kind: 'procedural', id: 'proc.dodge.flame' });
  });

  it('the dodge cooldown follows body weight from the stats profile', () => {
    const base = resolveCharacter('base-stickman', LIB2);
    const dummy = resolveCharacter('training-dummy', LIB2);
    expect(base.stats.massKg).toBe(base.body.massKg);
    expect(dummy.stats.massKg).toBeGreaterThan(base.stats.massKg!);
  });
});
