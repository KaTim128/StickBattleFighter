import { describe, expect, it } from 'vitest';
import {
  finalAttackSpeed,
  finalDamageTakenFactor,
  finalDefence,
  finalMaxSpeedMps,
  finalMeleeDamageFactor,
  finalPower,
  finalStatsSnapshot,
} from '../../../src/characters/final-stats';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';
import { Combatant } from '../../../src/combat/combatant';
import { SPRINT } from '../../../src/physics/movement';

const PLAYABLE = ['inferno', 'rampage', 'necro', 'shroud'];

describe('one stat pipeline (B1-B2)', () => {
  it('with no buff or status, every final value is the base value', () => {
    for (const id of PLAYABLE) {
      const def = loadCharacter(id).def;
      const snap = finalStatsSnapshot(def);
      expect(snap.maxSpeedMps).toBe(def.movement.maxSpeedMps);
      expect(snap.power).toBe(def.stats.power);
      expect(snap.defence).toBe(def.stats.defence);
      expect(snap.attackSpeed).toBe(1);
      expect(snap.damageTakenFactor).toBe(1);
    }
    expect(BUILT_IN_LIBRARY.characters.inferno).toBeDefined();
  });

  it('layers apply in order: ability buff, then status, then sprint', () => {
    const def = loadCharacter('shroud').def;
    const c = new Combatant(def.stats);
    c.decay(5, 0.7, 0.8);
    c.bleed();
    const buff = { speedFactor: 1.17, attackSpeedFactor: 1.4, meleeDamageFactor: 1.1, damageTakenFactor: 0.85 };
    expect(finalMaxSpeedMps(def, false, buff, c.status)).toBeCloseTo(def.movement.maxSpeedMps * 1.17, 5);
    expect(finalMaxSpeedMps(def, true, buff, c.status)).toBeCloseTo(
      def.movement.maxSpeedMps * 1.17 * SPRINT.speedFactor,
      5,
    );
    expect(finalAttackSpeed(buff)).toBe(1.4);
    expect(finalMeleeDamageFactor(buff)).toBe(1.1);
    expect(finalPower(def, c.status)).toBeCloseTo(def.stats.power * 0.7, 5);
    expect(finalDefence(def, c.status)).toBeCloseTo(def.stats.defence * 0.8, 5);
    expect(finalDamageTakenFactor(buff, c.status)).toBeCloseTo(0.85 * 1.1, 5);
  });

  it('a slow in the status registry reaches final speed', () => {
    const def = loadCharacter('necro').def;
    const c = new Combatant(def.stats);
    c.status.apply('decay', 2, { speedFactor: 0.5 });
    expect(finalMaxSpeedMps(def, false, null, c.status)).toBeCloseTo(def.movement.maxSpeedMps * 0.5, 5);
  });

  it('the damage a hit really does matches the pipeline (buff scale and bleed)', () => {
    const def = loadCharacter('rampage').def;
    const c = new Combatant(def.stats);
    const hit = { baseDamage: 100, attackerPower: 1, fromFront: false } as unknown as Parameters<
      Combatant['receive']
    >[0];
    const plain = c.receive(hit).damage;
    const d2 = new Combatant(def.stats);
    d2.damageTakenScale = 0.85;
    d2.bleed();
    const factor = finalDamageTakenFactor({ damageTakenFactor: 0.85 }, d2.status);
    expect(d2.receive(hit).damage).toBe(Math.round((100 / def.stats.defence) * factor));
    expect(plain).toBe(Math.round(100 / def.stats.defence));
  });
});
