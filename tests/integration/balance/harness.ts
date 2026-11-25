import { Container } from 'pixi.js';
import type { Loadout } from '../../../src/abilities/loadout';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { seededRandom } from '../../../src/combat/combatant';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';

export const STEP = 1 / 60;
export const ROSTER = ['inferno', 'rampage', 'necro', 'shroud'] as const;

/** What one watched AI-vs-AI fight measured (master plan B17). */
export interface FightStats {
  readonly a: string;
  readonly b: string;
  readonly seed: number;
  /** Seconds of fight (game time, including the intro) until a KO or the time limit. */
  readonly durationS: number;
  readonly winner: 'a' | 'b';
  readonly by: 'ko' | 'time';
  /** Damage each side took. */
  readonly damageToA: number;
  readonly damageToB: number;
  /** Attacks that reached a fighter (landed, blocked, dodged), and how many were dodged. */
  readonly attacksReaching: number;
  readonly dodged: number;
  readonly blocked: number;
  /** Hits in the longest unbroken chain either side landed (a combo event's amount). */
  readonly longestCombo: number;
}

/** Plays one fight between two AI fighters to its end and measures it. Deterministic for a seed. */
export async function measureFight(
  a: string,
  b: string,
  seed: number,
  difficulty = 'hard',
  loadouts?: { player?: Loadout; opponent?: Loadout },
): Promise<FightStats> {
  const scene = new FightArenaScene(
    OFFICE,
    new Container(),
    new PlayerIntents(),
    () => ({ width: 1280, height: 720 }),
    false,
    { player: a, opponent: b, match: { spectate: true }, difficulty, ...(loadouts ? { loadouts } : {}) },
  );
  // The scene's private random source, replaced so repeated fights differ but stay repeatable.
  (scene as unknown as { rng: () => number }).rng = seededRandom(seed);
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const pName = scene.playerFighter.name;
  let attacks = 0;
  let dodged = 0;
  let blocked = 0;
  let longestCombo = 0;
  for (let i = 0; i < 400 / STEP && !scene.matchResult; i++) {
    scenes.update(STEP);
    for (const e of scene.drainEvents()) {
      if (e.kind === 'combo') longestCombo = Math.max(longestCombo, e.amount);
      if (e.kind === 'miss' || e.kind === 'burn' || e.kind === 'combo') continue;
      attacks++;
      if (e.kind === 'dodged') dodged++;
      if (e.kind === 'blocked') blocked++;
    }
  }
  const r = scene.matchResult;
  const pHp = scene.player.hp;
  const dHp = scene.dummy.hp;
  const pMax = scene.playerFighter.combatant.stats.maxHp;
  const dMax = scene.dummyFighter.combatant.stats.maxHp;
  scenes.clear();
  void pName;
  return {
    a,
    b,
    seed,
    durationS: r?.atS ?? 400,
    winner: r?.winner === 'player' ? 'a' : 'b',
    by: r?.by ?? 'time',
    damageToA: Math.max(0, pMax - pHp),
    damageToB: Math.max(0, dMax - dHp),
    attacksReaching: attacks,
    dodged,
    blocked,
    longestCombo,
  };
}

export const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};
export const mean = (xs: readonly number[]): number => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);

/** Every pairing of the roster, both sides, over `seeds` seeds. */
export async function roundRobin(seeds: number, difficulty = 'hard'): Promise<FightStats[]> {
  const out: FightStats[] = [];
  for (const a of ROSTER)
    for (const b of ROSTER) {
      if (a >= b) continue;
      for (let s = 1; s <= seeds; s++) {
        out.push(await measureFight(a, b, s, difficulty));
        out.push(await measureFight(b, a, s + 100, difficulty));
      }
    }
  return out;
}

export interface Summary {
  readonly fights: number;
  readonly meanS: number;
  readonly medianS: number;
  readonly koShare: number;
  readonly dodgeRate: number;
  readonly blockRate: number;
  readonly meanDamagePerFight: number;
  readonly winShare: Readonly<Record<string, number>>;
  readonly longestCombo: number;
}

export function summarise(fights: readonly FightStats[]): Summary {
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  for (const f of fights) {
    games[f.a] = (games[f.a] ?? 0) + 1;
    games[f.b] = (games[f.b] ?? 0) + 1;
    const w = f.winner === 'a' ? f.a : f.b;
    wins[w] = (wins[w] ?? 0) + 1;
  }
  const attacks = fights.reduce((t, f) => t + f.attacksReaching, 0);
  return {
    fights: fights.length,
    meanS: mean(fights.map((f) => f.durationS)),
    medianS: median(fights.map((f) => f.durationS)),
    koShare: fights.filter((f) => f.by === 'ko').length / fights.length,
    dodgeRate: fights.reduce((t, f) => t + f.dodged, 0) / Math.max(1, attacks),
    blockRate: fights.reduce((t, f) => t + f.blocked, 0) / Math.max(1, attacks),
    meanDamagePerFight: mean(fights.map((f) => f.damageToA + f.damageToB)),
    winShare: Object.fromEntries(Object.keys(games).map((k) => [k, (wins[k] ?? 0) / (games[k] as number)])),
    longestCombo: Math.max(...fights.map((f) => f.longestCombo)),
  };
}

/** Every playable fighter (B1): the full roster the balance matrix covers. */
export const ALL_PLAYABLE = [
  'inferno',
  'rampage',
  'necro',
  'shroud',
  'vexoris',
  'aerion',
  'kenshiro',
  'psion',
  'geargrind',
  'reson',
  'chronos',
  'prismor',
  'inkmaster',
] as const;
