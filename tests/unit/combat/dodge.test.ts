import { describe, expect, it } from 'vitest';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';
import { Combatant, DEFENCE } from '../../../src/combat/combatant';
import { dodgeDirection } from '../../../src/combat/dodge-direction';

const facingRight = { x: 1, y: 0 };
const me = { x: 0, y: 0, radiusM: 0.5 };

/** Dodging a projectile (owner, 13/11/2026). */
describe('dodge direction', () => {
  it('with nothing incoming, the dodge is the back-step away from the facing', () => {
    const d = dodgeDirection(me, facingRight, []);
    expect(d.sidestep).toBe(false);
    expect(d.x).toBe(-1);
    expect(d.y + 0).toBe(0);
  });

  it('a shot flying at the fighter: sidestep to the nearer side of its path', () => {
    // A fireball coming from the right along y = 0.2 (it would clip the fighter's lower side).
    const shot = { x: 6, y: 0.2, dirX: -1, dirY: 0, radiusM: 0.3 };
    const d = dodgeDirection(me, facingRight, [shot]);
    expect(d.sidestep).toBe(true);
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(-1); // the fighter is above the path (y 0 < 0.2): step further up
    // The same shot just below the fighter: step the other way.
    const d2 = dodgeDirection(me, facingRight, [{ ...shot, y: -0.2 }]);
    expect(d2.y).toBeCloseTo(1);
  });

  it('dead centre picks a side; shots that will miss, have passed or are far away are ignored', () => {
    const centre = dodgeDirection(me, facingRight, [{ x: 5, y: 0, dirX: -1, dirY: 0, radiusM: 0.3 }]);
    expect(centre.sidestep).toBe(true);
    expect(Math.abs(centre.y)).toBeCloseTo(1);
    const wide = { x: 5, y: 2, dirX: -1, dirY: 0, radiusM: 0.3 }; // passes 2 m away
    const passed = { x: -2, y: 0, dirX: -1, dirY: 0, radiusM: 0.3 }; // already behind
    const far = { x: 30, y: 0, dirX: -1, dirY: 0, radiusM: 0.3 };
    expect(dodgeDirection(me, facingRight, [wide, passed, far]).sidestep).toBe(false);
  });

  it('the nearest of several incoming shots decides', () => {
    const near = { x: 3, y: 0.3, dirX: -1, dirY: 0, radiusM: 0.3 }; // fighter above its path
    const farther = { x: 0.2, y: 6, dirX: 0, dirY: -1, radiusM: 0.3 };
    const d = dodgeDirection(me, facingRight, [farther, near]);
    expect(d.y).toBeCloseTo(-1);
  });
});

/** Dodge spam (owner, 13/11/2026: "should not be used as an exploit ... by spamming"). */
describe('dodge fatigue', () => {
  const fresh = () => new Combatant(resolveCharacter('inferno', BUILT_IN_LIBRARY).stats);
  const waitOut = (c: Combatant) => {
    for (let i = 0; i < 600 && c.dodgeCooldownLeftS > 0; i++) c.update(1 / 60);
  };

  it('a single, rested dodge is unchanged: full invulnerability and the normal cooldown', () => {
    const c = fresh();
    expect(c.tryDodge()).toBe(true);
    expect(c.dodgeCooldownLeftS).toBeCloseTo(c.dodgeCooldownTotalS);
    expect(c.invulnerable).toBe(true);
  });

  it('chained dodges cost more, wait longer and lose their invulnerability', () => {
    const c = fresh();
    const cooldowns: number[] = [];
    const invuln: boolean[] = [];
    for (let n = 0; n < 4; n++) {
      c.stamina = c.stats.maxStamina; // never limited by stamina here
      const before = c.stamina;
      expect(c.tryDodge()).toBe(true);
      expect(before - c.stamina).toBeCloseTo(DEFENCE.dodgeCost * (1 + DEFENCE.dodgeChainCostStep * n));
      cooldowns.push(c.dodgeCooldownLeftS);
      invuln.push(c.invulnerable);
      waitOut(c);
    }
    expect(cooldowns[1]).toBeGreaterThan(cooldowns[0]!);
    expect(cooldowns[2]).toBeGreaterThan(cooldowns[1]!);
    expect(invuln[0]).toBe(true);
    expect(invuln[3]).toBe(false); // the fourth in a row gives no protection
    expect(c.dodgeChainLength).toBe(4);
  });

  it('pressing during the cooldown does nothing, and a short rest resets the chain', () => {
    const c = fresh();
    expect(c.tryDodge()).toBe(true);
    expect(c.tryDodge()).toBe(false); // mashing
    waitOut(c);
    for (let i = 0; i < Math.ceil((DEFENCE.dodgeChainWindowS + 0.1) * 60); i++) c.update(1 / 60);
    expect(c.dodgeChainLength).toBe(0);
    c.stamina = c.stats.maxStamina;
    expect(c.tryDodge()).toBe(true);
    expect(c.dodgeCooldownLeftS).toBeCloseTo(c.dodgeCooldownTotalS);
  });
});
