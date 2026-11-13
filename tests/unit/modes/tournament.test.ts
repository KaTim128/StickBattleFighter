import { describe, expect, it } from 'vitest';
import {
  advance,
  createTournament,
  entrant,
  openAiMatches,
  playerMatch,
  playerPlacement,
  recordResult,
  simulateMatch,
  stageComplete,
  stageName,
  stillIn,
  type TournamentState,
} from '../../../src/modes/tournament/tournament';

/** A seeded random source (mulberry32) so every bracket is reproducible. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = [
  { fighter: 'inferno', name: 'Inferno' },
  { fighter: 'rampage', name: 'Titan' },
  { fighter: 'necro', name: 'Necro' },
  { fighter: 'shroud', name: 'Shroud' },
];
const PLAYER = { fighter: 'inferno', name: 'You (Inferno)' };
const equal = () => 1;

/** Play a whole tournament: the player wins or loses as told; AI battles are simulated. */
function playOut(t: TournamentState, rand: () => number, playerWins: (stage: number) => boolean): void {
  for (let guard = 0; guard < 10 && !t.champion; guard++) {
    const pm = playerMatch(t);
    if (pm) recordResult(t, pm.id, playerWins(t.stage) ? 'p' : pm.a === 'p' ? pm.b! : pm.a!, 'played');
    for (const m of openAiMatches(t)) simulateMatch(t, m.id, equal, rand);
    expect(stageComplete(t)).toBe(true);
    advance(t);
  }
}

describe('tournament bracket (owner, 13/11/2026)', () => {
  it('names the stages by the fighters left', () => {
    expect(stageName(16)).toBe('Round of 16');
    expect(stageName(8)).toBe('Quarter Finals');
    expect(stageName(4)).toBe('Semi Finals');
    expect(stageName(2)).toBe('Final');
    expect(stageName(32)).toBe('Round of 32');
  });

  for (const size of [4, 8, 16]) {
    it(`${size} fighters: every fighter once, the player included, starting at ${stageName(size)}`, () => {
      const t = createTournament(size, PLAYER, POOL, seeded(size));
      expect(t.entrants).toHaveLength(size);
      expect(t.entrants.filter((e) => e.isPlayer)).toHaveLength(1);
      expect(new Set(t.entrants.map((e) => e.name)).size).toBe(size); // unique names
      expect(t.rounds[0]).toHaveLength(size / 2);
      expect(t.rounds).toHaveLength(Math.log2(size));
      const drawn = t.rounds[0]!.flatMap((m) => [m.a, m.b]);
      expect(new Set(drawn).size).toBe(size);
    });
  }

  it('a 4-fighter tournament has four different fighters', () => {
    const t = createTournament(4, PLAYER, POOL, seeded(31));
    expect(new Set(t.entrants.map((e) => e.fighter)).size).toBe(4);
  });

  it('the draw is random', () => {
    const a = createTournament(16, PLAYER, POOL, seeded(1)).rounds[0]!.map((m) => `${m.a}-${m.b}`);
    const b = createTournament(16, PLAYER, POOL, seeded(2)).rounds[0]!.map((m) => `${m.a}-${m.b}`);
    expect(a).not.toEqual(b);
  });

  it('plays from start to champion: winners advance, losers never come back', () => {
    const rand = seeded(7);
    const t = createTournament(16, PLAYER, POOL, rand);
    const out = new Set<string>();
    for (let guard = 0; guard < 10 && !t.champion; guard++) {
      const pm = playerMatch(t);
      if (pm) recordResult(t, pm.id, 'p', 'played');
      for (const m of openAiMatches(t)) simulateMatch(t, m.id, equal, rand);
      for (const m of t.rounds[t.stage]!) {
        for (const id of [m.a, m.b]) expect(out.has(id!)).toBe(false); // eliminated fighters never re-enter
        out.add(m.a === m.winner ? m.b! : m.a!);
      }
      advance(t);
    }
    expect(t.champion).toBe('p');
    expect(playerPlacement(t)).toBe('Champion');
    expect(stillIn(t)).toEqual(new Set(['p']));
    expect(out.size).toBe(15);
  });

  it('records where the player went out', () => {
    const t = createTournament(8, PLAYER, POOL, seeded(3));
    playOut(t, seeded(4), (stage) => stage < 1); // wins the quarter final, loses the semi
    expect(playerPlacement(t)).toBe('Out in the Semi Finals');
    expect(t.champion).not.toBe('p');
    const f = createTournament(4, PLAYER, POOL, seeded(5));
    playOut(f, seeded(6), (stage) => stage < 1);
    expect(playerPlacement(f)).toBe('Runner-up');
  });

  it('results are final and must come from the two fighters in the match', () => {
    const t = createTournament(8, PLAYER, POOL, seeded(9));
    const m = openAiMatches(t)[0]!;
    expect(() => recordResult(t, m.id, 'nobody', 'simulated')).toThrow();
    recordResult(t, m.id, m.a!, 'simulated');
    expect(() => recordResult(t, m.id, m.b!, 'simulated')).toThrow();
    // A later round cannot be decided before its stage.
    expect(() => recordResult(t, t.rounds[1]![0]!.id, 'p', 'played')).toThrow();
  });

  it('the stage does not advance until every match is decided', () => {
    const t = createTournament(8, PLAYER, POOL, seeded(11));
    expect(advance(t)).toBe(false);
    for (const m of openAiMatches(t)) simulateMatch(t, m.id, equal, seeded(1));
    expect(advance(t)).toBe(false); // the player's match is still open
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    expect(advance(t)).toBe(true);
    expect(t.stage).toBe(1);
  });

  it('every AI battle in a stage can be watched (no watch limit, owner 13/11/2026)', async () => {
    const { settleStage } = await import('../../../src/modes/tournament/tournament-flow');
    const rand = seeded(13);
    const t = createTournament(16, PLAYER, POOL, rand);
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    const ai = openAiMatches(t);
    expect(ai).toHaveLength(7);
    for (const m of ai.slice(0, 6)) {
      recordResult(t, m.id, m.a!, 'watched');
      settleStage(t);
      expect(t.stage).toBe(0); // still waiting: the last battle can be watched too
    }
    recordResult(t, ai[6]!.id, ai[6]!.b!, 'watched');
    settleStage(t);
    expect(t.stage).toBe(1);
    expect(t.rounds[0]!.filter((m) => m.how === 'watched')).toHaveLength(7);
  });

  it('odd sizes get byes and still finish (room to grow past 16)', () => {
    const t = createTournament(6, PLAYER, POOL, seeded(17));
    expect(t.rounds[0]).toHaveLength(4);
    const byes = t.rounds[0]!.filter((m) => m.how === 'bye');
    expect(byes).toHaveLength(2);
    playOut(t, seeded(18), () => true);
    expect(t.champion).toBe('p');
    const big = createTournament(32, PLAYER, POOL, seeded(19));
    expect(stageName(big.rounds[0]!.length * 2)).toBe('Round of 32');
    expect(entrant(big, 'p')!.isPlayer).toBe(true);
  });
});

describe('tournament flow between stages', () => {
  it('waits for the player, then for watch or skip choices, then moves on', async () => {
    const { settleStage, skipBattles, recordFor } = await import('../../../src/modes/tournament/tournament-flow');
    const rand = seeded(21);
    const t = createTournament(16, PLAYER, POOL, rand);
    settleStage(t);
    expect(t.stage).toBe(0); // the player's match first
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    settleStage(t);
    expect(t.stage).toBe(0); // 7 AI battles wait: watch any, or skip the rest
    const open = openAiMatches(t);
    for (const m of open.slice(0, 3)) recordResult(t, m.id, m.a!, 'watched');
    settleStage(t);
    expect(t.stage).toBe(0); // 4 still open
    skipBattles(t, equal, rand); // Skip: the rest are settled and the next stage starts
    expect(t.stage).toBe(1);
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    skipBattles(t, equal, rand);
    expect(t.stage).toBe(2);
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    skipBattles(t, equal, rand);
    recordResult(t, playerMatch(t)!.id, 'p', 'played');
    settleStage(t);
    expect(t.champion).toBe('p');
    const rec = recordFor(t, new Date(2026, 10, 13))!;
    expect(rec).toEqual({
      date: '13/11/2026',
      fighter: 'inferno',
      size: 16,
      placement: 'Champion',
      champion: 'You (Inferno)',
    });
  });

  it('a knocked-out player can still watch or skip until a champion is crowned', async () => {
    const { settleStage, skipBattles } = await import('../../../src/modes/tournament/tournament-flow');
    const rand = seeded(23);
    const t = createTournament(8, PLAYER, POOL, rand);
    const pm = playerMatch(t)!;
    recordResult(t, pm.id, pm.a === 'p' ? pm.b! : pm.a!, 'played');
    for (let i = 0; i < 5 && !t.champion; i++) skipBattles(t, equal, rand);
    settleStage(t);
    expect(t.champion).not.toBeNull();
    expect(t.champion).not.toBe('p');
    expect(playerPlacement(t)).toBe('Out in the Quarter Finals');
  });
});
