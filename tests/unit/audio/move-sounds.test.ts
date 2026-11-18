import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { hasSound } from '../../../src/audio/sound-board';
import { MOVE_RECIPES } from '../../../src/data/audio/move-sounds';
import inferno from '../../../src/data/characters/inferno/moveset.json';
import necro from '../../../src/data/characters/necro/moveset.json';
import rampage from '../../../src/data/characters/rampage/moveset.json';
import shroud from '../../../src/data/characters/shroud/moveset.json';
import skeleton from '../../../src/data/characters/skeleton-warrior/moveset.json';

interface Set {
  moves: { id: string; sfx?: string }[];
}
const SETS: Record<string, Set> = { inferno, rampage, necro, shroud, skeleton };

describe('unique attack audio (master plan B18)', () => {
  it('every melee move of the four fighters and the skeleton has its own existing contact sound', () => {
    const seen = new Map<string, string>();
    for (const [who, set] of Object.entries(SETS))
      for (const m of set.moves) {
        expect(m.sfx, `${who}.${m.id} has a sound`).toBeTruthy();
        expect(hasSound(m.sfx!), `${who}.${m.id}: ${m.sfx} exists`).toBe(true);
        expect(seen.get(m.sfx!), `${m.sfx} is shared with ${seen.get(m.sfx!)}`).toBeUndefined();
        seen.set(m.sfx!, `${who}.${m.id}`);
      }
    expect(seen.size).toBeGreaterThanOrEqual(29);
  });

  it("Shroud's five combo hits each sound different", () => {
    const ids = ['knife-slash', 'backhand-slash', 'rising-cut', 'cross-slash', 'lunging-stab'];
    const sounds = ids.map((id) => shroud.moves.find((m) => m.id === id)!.sfx);
    expect(new Set(sounds).size).toBe(5);
    expect(new Set(sounds.map((s) => JSON.stringify(MOVE_RECIPES[s!]))).size).toBe(5);
  });

  it('no two move or ability sounds are the same recipe (no re-pitched copies of one sound)', () => {
    const seen = new Map<string, string>();
    for (const [id, layers] of Object.entries(MOVE_RECIPES)) {
      const key = JSON.stringify(layers);
      expect(seen.get(key), `${id} copies ${seen.get(key)}`).toBeUndefined();
      seen.set(key, id);
    }
  });

  it('all five normal abilities and the ultimate of every fighter have their own release and impact sounds', () => {
    const release = new Map<string, string>();
    const impact = new Map<string, string>();
    for (const [kitId, kit] of Object.entries(ABILITY_KITS)) {
      if (kitId === 'dummy-kit') continue;
      for (const a of [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5!, kit.ult]) {
        const who = `${kitId}.${a.id}`;
        for (const [map, id] of [
          [release, a.sfx.release],
          [impact, a.sfx.impact],
        ] as const) {
          expect(hasSound(id), `${who}: ${id} exists`).toBe(true);
          expect(map.get(id), `${who}: ${id} is shared with ${map.get(id)}`).toBeUndefined();
          map.set(id, who);
        }
        expect(hasSound(a.sfx.cast), `${who}: cast ${a.sfx.cast} exists`).toBe(true);
      }
    }
    expect(release.size).toBeGreaterThanOrEqual(24);
  });
});
