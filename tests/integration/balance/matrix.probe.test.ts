import { mkdirSync, writeFileSync } from 'node:fs';
import { beforeAll, it } from 'vitest';
import { initPhysics } from '../../../src/physics/physics-world';
import { ALL_PLAYABLE, type FightStats, measureFight } from './harness';

/**
 * Opt-in balance matrix (B1): every playable fighter against every other, both sides, over `BALANCE_SEEDS` seeds, on `BALANCE_DIFFICULTY`
 * (default hard). Writes `docs/qa/balance-matrix-<DD-MM-YYYY>.md` with win rate, mean duration and damage dealt and taken.
 * Run with `npm run balance:matrix`. Never part of the normal suite (it plays about 130 fights per seed).
 */
const on = process.env.BALANCE_MATRIX === '1';
const seeds = Number(process.env.BALANCE_SEEDS ?? 2);
const difficulty = process.env.BALANCE_DIFFICULTY ?? 'hard';

beforeAll(async () => {
  await initPhysics();
});

it.skipIf(!on)(
  'writes the balance matrix',
  async () => {
    const fights: FightStats[] = [];
    for (const a of ALL_PLAYABLE)
      for (const b of ALL_PLAYABLE) {
        if (a >= b) continue;
        for (let s = 1; s <= seeds; s++) {
          fights.push(await measureFight(a, b, s, difficulty));
          fights.push(await measureFight(b, a, s + 100, difficulty));
        }
      }
    const rows = ALL_PLAYABLE.map((id) => {
      let games = 0;
      let wins = 0;
      let dealt = 0;
      let taken = 0;
      let dur = 0;
      for (const f of fights) {
        if (f.a !== id && f.b !== id) continue;
        games++;
        dur += f.durationS;
        const mine = f.a === id;
        if ((f.winner === 'a') === mine) wins++;
        dealt += mine ? f.damageToB : f.damageToA;
        taken += mine ? f.damageToA : f.damageToB;
      }
      return { id, games, winRate: wins / games, dur: dur / games, dealt: dealt / games, taken: taken / games };
    });
    const head = (id: string) => id.slice(0, 5);
    const pair = (a: string, b: string): string => {
      const sel = fights.filter((f) => (f.a === a && f.b === b) || (f.a === b && f.b === a));
      const w = sel.filter((f) => (f.winner === 'a' ? f.a : f.b) === a).length;
      return `${Math.round((w / Math.max(1, sel.length)) * 100)}`;
    };
    const d = new Date();
    const stamp = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const lines = [
      `# Balance matrix ${stamp}`,
      '',
      `Difficulty: ${difficulty}. Seeds per side: ${seeds}. Fights: ${fights.length}. Arena: Office, watched AI vs AI (showmanship on).`,
      'Limits: seeded and deterministic but a small sample per pairing; ability hit rate and ultimate impact are not measured yet.',
      '',
      '| Fighter | Win rate | Mean fight (s) | Damage dealt | Damage taken |',
      '|---|---|---|---|---|',
      ...rows.map(
        (r) =>
          `| ${r.id} | ${Math.round(r.winRate * 100)} % | ${r.dur.toFixed(1)} | ${r.dealt.toFixed(0)} | ${r.taken.toFixed(0)} |`,
      ),
      '',
      '## Head to head (row beats column, %)',
      '',
      `| | ${ALL_PLAYABLE.map(head).join(' | ')} |`,
      `|---|${ALL_PLAYABLE.map(() => '---').join('|')}|`,
      ...ALL_PLAYABLE.map(
        (a) => `| ${head(a)} | ${ALL_PLAYABLE.map((b) => (a === b ? '-' : pair(a, b))).join(' | ')} |`,
      ),
      '',
    ];
    mkdirSync('docs/qa', { recursive: true });
    writeFileSync(
      `docs/qa/balance-matrix-${stamp}${process.env.BALANCE_TAG ? `-${process.env.BALANCE_TAG}` : ''}.md`,
      lines.join('\n'),
    );
  },
  3_600_000,
);
