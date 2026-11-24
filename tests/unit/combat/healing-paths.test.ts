import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** HL (owner 22/11/2026): no passive or automatic healing. HP may only go up through Combatant.heal(). */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('healing paths (HL)', () => {
  it("only combatant.ts writes a fighter's hp upward", () => {
    const offenders: string[] = [];
    for (const file of sources('src')) {
      if (file.endsWith('combat/combatant.ts')) continue;
      const text = readFileSync(file, 'utf8');
      // `combatant.hp = ...` / `c.hp += ...` outside the combatant (props and UI have their own hp fields).
      for (const m of text.matchAll(/\b(?:combatant|c|f|target|attacker)\.hp\s*(?:\+=|=(?!=))/g))
        offenders.push(`${file}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('there is no bench regeneration constant any more', () => {
    expect(readFileSync('src/modes/team/team-battle.ts', 'utf8')).not.toMatch(/benchRegen|benchHp/);
  });
});
