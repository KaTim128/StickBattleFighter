import { describe, expect, it } from 'vitest';
import { ABILITY_SLOTS } from '../../../src/abilities/ability-def';
import { hasSound, SoundBoard } from '../../../src/audio/sound-board';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';
import { IMPACTS } from '../../../src/data/combat/impacts';

describe('sound board (procedural, original sounds)', () => {
  it('has a sound for every impact profile, every ability hook, the KO and the dusting', () => {
    const ids = [
      ...Object.values(IMPACTS).map((p) => p.sound),
      ...ABILITY_SLOTS.flatMap((s) => Object.values(INFERNO_KIT[s].sfx)),
      'ko',
      'dust',
    ];
    for (const id of ids) expect(hasSound(id), id).toBe(true);
  });

  it('is a silent no-op without Web Audio (tests, old browsers)', () => {
    const board = new SoundBoard();
    board.unlock();
    expect(() => board.play('punch-heavy')).not.toThrow();
  });
});
