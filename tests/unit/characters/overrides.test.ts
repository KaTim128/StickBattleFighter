import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { checkOverride, kitWithOverrides, withOverrides } from '../../../src/characters/overrides';
import { resolveCharacter } from '../../../src/characters/resolve';

/** Owner, 13/11/2026: the admin edits a fighter from its page; changes are checked before use. */
describe('fighter overrides', () => {
  it('applies appearance, stats, moves and capabilities to that fighter only', () => {
    const { library, rejected } = withOverrides(BUILT_IN_LIBRARY, {
      rampage: {
        definition: { displayName: 'Colossus', 'rig.glow': '#33ff66', 'rig.scale': 1.3, 'capabilities.canJump': false },
        stats: { maxHp: 2000, 'movement.maxSpeedMps': 4.5 },
        moves: { 'hammer-jab': { damage: 31 } },
      },
    });
    expect(rejected).toEqual({});
    const titan = resolveCharacter('rampage', library);
    expect(titan.displayName).toBe('Colossus');
    expect(titan.stats.maxHp).toBe(2000);
    expect(titan.movement.maxSpeedMps).toBeCloseTo(4.5, 6);
    expect(titan.moves['hammer-jab']!.damage).toBeGreaterThan(30);
    expect(titan.capabilities.canJump).toBe(false);
    expect(titan.look.glow).toBe(0x33ff66);
    // Others untouched.
    expect(resolveCharacter('inferno', library).stats.maxHp).toBe(1000);
  });

  it("a fighter's AI changes never leak into the shared AI profile", () => {
    const { library } = withOverrides(BUILT_IN_LIBRARY, { necro: { ai: { aggression: 0.9 } } });
    expect(resolveCharacter('necro', library).ai.aggression).toBe(0.9);
    expect(resolveCharacter('shroud', library).ai.aggression).toBe(BUILT_IN_LIBRARY.ai['shroud-ai']!.aggression);
  });

  it('invalid changes are refused and the built-in fighter is used', () => {
    const bad = { stats: { maxHp: -5 } };
    expect(checkOverride(BUILT_IN_LIBRARY, 'inferno', bad).length).toBeGreaterThan(0);
    const { library, rejected } = withOverrides(BUILT_IN_LIBRARY, { inferno: bad });
    expect(rejected.inferno).toBeDefined();
    expect(resolveCharacter('inferno', library).stats.maxHp).toBe(1000);
    expect(checkOverride(BUILT_IN_LIBRARY, 'inferno', { definition: { 'rig.glow': 'green' } }).length).toBeGreaterThan(
      0,
    );
  });

  it('Move Config changes ability numbers, effects and mechanics; nonsense numbers are ignored', () => {
    const kit = ABILITY_KITS['rampage-kit']!;
    const out = kitWithOverrides('rampage', kit, {
      rampage: {
        abilities: {
          a1: {
            cooldownS: 3,
            'payload.damage': 90,
            'payload.burn.dps': 10,
            'payload.burn.durationS': 2,
            'payload.heavy': false,
          },
          a2: { 'delivery.speedMps': 20, staminaCost: -4 },
        },
      },
    });
    expect(out.a1.cooldownS).toBe(3);
    expect(out.a1.payload.damage).toBe(90);
    expect(out.a1.payload.burn).toEqual({ dps: 10, durationS: 2 });
    expect(out.a1.payload.heavy).toBe(false);
    expect((out.a2.delivery as { speedMps: number }).speedMps).toBe(20);
    expect(out.a2.staminaCost).toBe(kit.a2.staminaCost); // a negative cost is ignored
    expect(kit.a1.cooldownS).not.toBe(3); // the built-in kit is never changed
  });
});
