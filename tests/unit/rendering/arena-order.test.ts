import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Owner, 24/11/2026 and 25/11/2026: the round Colosseum is first and the menu default, then the Office, then the Tutorial Zone (the old
 * training yard).
 */
describe('arena order', () => {
  const src = readFileSync('src/app/bootstrap.ts', 'utf8');
  it('lists the Colosseum first, then the Office, then the Tutorial Zone', () => {
    const block = src.slice(
      src.indexOf('const MENU_ARENAS'),
      src.indexOf('] as const', src.indexOf('const MENU_ARENAS')),
    );
    expect(block.indexOf("id: 'colosseum'")).toBeLessThan(block.indexOf("id: 'office'"));
    expect(block.indexOf("id: 'office'")).toBeLessThan(block.indexOf("id: 'training-yard'"));
    expect(block).toContain("name: 'Tutorial Zone'");
    expect(block).toContain("name: 'Colosseum'");
  });
});
