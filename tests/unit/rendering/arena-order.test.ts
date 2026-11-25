import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Owner, 24/11/2026: the Office is the default and first; the training yard is the Tutorial Zone; the real Colosseum (round) goes first when built. */
describe('arena order', () => {
  const src = readFileSync('src/app/bootstrap.ts', 'utf8');
  it('lists the Office first and calls the training yard the Tutorial Zone', () => {
    const block = src.slice(
      src.indexOf('const MENU_ARENAS'),
      src.indexOf('] as const', src.indexOf('const MENU_ARENAS')),
    );
    expect(block.indexOf("id: 'office'")).toBeLessThan(block.indexOf("id: 'training-yard'"));
    expect(block).toContain("name: 'Tutorial Zone'");
    expect(block).not.toContain("name: 'Colosseum'");
  });
});
