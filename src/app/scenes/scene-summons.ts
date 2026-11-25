import type { SummonSpec } from '../../abilities/ability-def';
import type { FighterDef } from '../../data/fighters/fighter-def';
import { FighterEntity } from './fighter-entity';

type Vec2 = { x: number; y: number };

/** What the summons need from the fight scene. */
export interface SummonHost {
  /** The resolved fighter for a character id (the summon's own data: look, stats, moves). */
  loadDef(characterId: string): FighterDef;
  /** Give a new fighter a body and a view in the arena; remove them again. */
  attach(f: FighterEntity): void;
  detach(f: FighterEntity): void;
  /** Fraction 0..1 along a segment where a wall, door or furniture blocks it, or null. */
  blocked(from: Vec2, to: Vec2): number | null;
  /** True if a body of this radius can stand here (not inside walls or furniture, inside the arena). */
  isFree(at: Vec2, radiusM: number): boolean;
  fighters(): readonly FighterEntity[];
  /** One simulation step of a fighter under the shared rules (attacks, movement, physics). */
  step(f: FighterEntity, stepS: number, move: Vec2): void;
  /** Press the fighter's attack button (it starts or continues its combo). */
  attack(f: FighterEntity, heavy?: boolean): void;
  /** Cast one of a minion's own abilities at a spot (Ink Clone's arrows, the ink monster's slam and breath); true if it started. */
  cast(f: FighterEntity, slot: 'a1' | 'a2' | 'a3' | 'a4' | 'ult', at: Vec2): boolean;
  /** A minion rose (dust and a sound) or crumbled away. */
  risen(f: FighterEntity): void;
  /** Magix's rabbit goes off: hurt and push everyone close, with confetti. */
  burst(f: FighterEntity, spec: NonNullable<SummonSpec['rabbit']>): void;
  random(): number;
}

/** A KO'd or expired minion crumbles for this long, then is gone. */
const CRUMBLE_S = 1.6;
/** How far a minion looks for an enemy, and how close it stays to its summoner otherwise. */
const SIGHT_M = 12;
const FOLLOW_M = 2.4;

/**
 * Summoned minions (Undead Army and Death's Dominion, owner 12/11/2026): real fighters on their
 * summoner's team, run by the shared combat engine (INV-5), so they move, attack, get hit, fall and
 * crumble exactly like everyone else. Each has its own simple AI: go for the nearest enemy in
 * sight and attack in reach, otherwise stay near the summoner. They never appear inside walls or
 * furniture, crumble when their time is up, and a summoner never has more than `maxAlive` (a
 * summon past the cap is refused, B5).
 */
export class SceneSummons {
  readonly list: FighterEntity[] = [];
  private made = 0;

  constructor(private readonly host: SummonHost) {}

  /** How many more of `owner`'s minions may stand now (the cap counts the living, not the crumbling). */
  room(owner: FighterEntity, spec: SummonSpec): number {
    // The cap is per kind of minion: Inkmaster's clone and his monster do not take each other's place.
    const kinds = spec.variants ?? [spec.character];
    const alive = this.list.filter(
      (m) => m.summon?.owner === owner && !m.combatant.isKo && kinds.includes(m.def.id),
    ).length;
    return Math.max(0, spec.maxAlive - alive);
  }

  /**
   * Raise up to `spec.count` minions around `owner`, or in a fan in front of its nearest enemy
   * (`near: 'enemy'`). Returns how many appeared (some spots may be blocked).
   */
  spawn(owner: FighterEntity, spec: SummonSpec): number {
    // A variant is chosen once, here, and stays that summon's weapon for its whole life (Ink Clone).
    const character = spec.variants
      ? (spec.variants[Math.floor(this.host.random() * spec.variants.length)] ?? spec.character)
      : spec.character;
    const def = this.host.loadDef(character);
    const radius = def.body.footRadiusM;
    const enemy = spec.near === 'enemy' ? this.nearestEnemy(owner, Number.POSITIVE_INFINITY) : null;
    let raised = 0;
    // Never above the cap: a summon with four standing raises none, with three it raises one (B5).
    const allowed = Math.min(spec.count, this.room(owner, spec));
    for (let i = 0; i < allowed; i++) {
      const spot = enemy ? this.spotInFront(enemy, radius, i, spec.count) : this.spotNear(owner, radius, i, spec.count);
      if (!spot) continue;
      const f = new FighterEntity(`${owner.name}-summon-${++this.made}`, def, spot, false);
      f.team = owner.team;
      f.summon = {
        owner,
        leftS: spec.lifeS,
        persistent: spec.persistent === true,
        rabbit: spec.rabbit,
        fuseS: null,
        burst: false,
      };
      // Raised by an enemy: they face it; otherwise they face where the summoner looks.
      if (enemy) f.faceToward(enemy.x - spot.x, enemy.y - spot.y);
      else f.faceToward(owner.aim.x, owner.aim.y);
      this.host.attach(f);
      this.list.push(f);
      this.host.risen(f);
      raised++;
    }
    return raised;
  }

  /** A free spot in a ring around the summoner, in front first, never inside walls or furniture. */
  private spotNear(owner: FighterEntity, radius: number, i: number, n: number): Vec2 | null {
    const base = Math.atan2(owner.aim.y, owner.aim.x);
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = base + (((i - (n - 1) / 2) * 0.9 + attempt * 2.4) % (Math.PI * 2));
      const want = 1.4 + (attempt % 3) * 0.4;
      const end = { x: owner.x + Math.cos(a) * want, y: owner.y + Math.sin(a) * want };
      const block = this.host.blocked({ x: owner.x, y: owner.y }, end);
      const d = block === null ? want : want * block - radius - 0.1;
      if (d < radius + 0.5) continue;
      const at = { x: owner.x + Math.cos(a) * d, y: owner.y + Math.sin(a) * d };
      const crowded = this.host
        .fighters()
        .some((o) => !o.combatant.isKo && Math.hypot(o.x - at.x, o.y - at.y) < o.def.body.footRadiusM + radius + 0.05);
      if (!crowded && this.host.isFree(at, radius)) return at;
    }
    return null;
  }

  /**
   * A free spot in front of `centre`, the way it faces (owner, 13/11/2026: "spawn further away from
   * the opponent, in front of it instead of surrounding it"): the minions stand in a fan 2.6–3.6 m
   * ahead of it, in sight of it (not through a wall), inside the map; if the front is blocked the
   * fan widens toward its sides, never behind it.
   */
  private spotInFront(centre: FighterEntity, radius: number, i: number, n: number): Vec2 | null {
    const base = Math.atan2(centre.aim.y, centre.aim.x);
    const slot = i - (n - 1) / 2; // -1.5 .. 1.5 for four
    for (let attempt = 0; attempt < 14; attempt++) {
      const spread = 0.38 * slot + (attempt === 0 ? 0 : (this.host.random() - 0.5) * (0.5 + attempt * 0.12));
      const a = base + Math.max(-1.45, Math.min(1.45, spread));
      const want = 2.6 + this.host.random() * 1.0;
      const end = { x: centre.x + Math.cos(a) * want, y: centre.y + Math.sin(a) * want };
      const block = this.host.blocked({ x: centre.x, y: centre.y }, end);
      const d = block === null ? want : want * block - radius - 0.1;
      if (d < 1.8) continue;
      const at = { x: centre.x + Math.cos(a) * d, y: centre.y + Math.sin(a) * d };
      const crowded = this.host
        .fighters()
        .some((o) => !o.combatant.isKo && Math.hypot(o.x - at.x, o.y - at.y) < o.def.body.footRadiusM + radius + 0.05);
      if (!crowded && this.host.isFree(at, radius)) return at;
    }
    return null;
  }

  private nearestEnemy(f: FighterEntity, within: number): FighterEntity | null {
    let target: FighterEntity | null = null;
    let best = within;
    for (const o of this.host.fighters()) {
      if (o.team === f.team || o.combatant.isKo || o.summon) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    return target;
  }

  /** One step: lifetimes, crumbling, and each minion's AI. */
  update(stepS: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]!;
      const s = f.summon!;
      if (s.leftS !== null) s.leftS -= stepS;
      // Time's up, or its summoner fell (unless it stays until killed): it crumbles.
      const expired = s.leftS !== null && s.leftS <= 0;
      // The rabbit goes off when its fuse runs out, its time is up, or anyone knocks it out (hitting it sets it off early).
      if (s.rabbit && !s.burst && (f.combatant.isKo || expired || (s.fuseS !== null && s.fuseS <= 0))) {
        s.burst = true;
        this.host.burst(f, s.rabbit);
        if (!f.combatant.isKo) f.combatant.expire(); // it is gone in the burst
      }
      if (!f.combatant.isKo && (expired || (!s.persistent && s.owner.combatant.isKo))) f.combatant.expire();
      if (f.combatant.isKo) {
        this.host.step(f, stepS, { x: 0, y: 0 });
        if (f.combatant.koAge >= CRUMBLE_S) {
          this.host.detach(f);
          this.list.splice(i, 1);
        }
        continue;
      }
      this.think(f, stepS);
    }
  }

  /** Go for the nearest enemy in sight and attack in reach; otherwise stay by the summoner. */
  private think(f: FighterEntity, stepS: number): void {
    const owner = f.summon!.owner;
    if (f.summon!.rabbit) {
      this.thinkRabbit(f, stepS);
      return;
    }
    let target: FighterEntity | null = null;
    let best = Math.min(SIGHT_M, f.combatant.sightM); // in the dark: only what is close
    for (const o of this.host.fighters()) {
      if (o.team === f.team || o.combatant.isKo) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    const c = f.combatant;
    let move: Vec2 = { x: 0, y: 0 };
    if (c.blinded) target = null; // blinded: it cannot find anyone
    if (target) {
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      const opener = f.def.moves[f.def.starters.tap ?? ''];
      const reach = (opener?.reachM ?? 0.8) + target.def.body.footRadiusM + f.def.body.footRadiusM * 0.5;
      const busy = f.combo.attack !== null || (f.caster?.cast ?? null) !== null;
      if (c.canAct && !busy) f.faceToward(dx, dy);
      // Its own abilities first (an archer's arrows, the monster's slam and breath): each only in its useful range.
      if (f.caster && c.canAct && !busy && this.useAbility(f, target, d)) {
        this.host.step(f, stepS, { x: 0, y: 0 });
        return;
      }
      // A minion with no melee at all (the bow clone) keeps its distance and shoots.
      if (!opener && f.caster) {
        const want = Math.min(7, f.caster.def('a1').aimRangeM * 0.7);
        if (d < want * 0.55) move = { x: -dx / d, y: -dy / d };
        else if (d > want * 1.15) move = { x: (dx / d) * 0.8, y: (dy / d) * 0.8 };
      } else if (d > reach) move = { x: dx / d, y: dy / d };
      else if (!opener) move = { x: 0, y: 0 };
      else if (c.state === 'free' && !f.combo.attack && f.attackCooldownS === 0) {
        // A minion with a heavy move (the ink monster's bite) uses it now and then, like a player would.
        this.host.attack(f, f.def.starters.heavy !== undefined && this.host.random() < 0.4);
        f.attackCooldownS = f.def.ai.attackEveryS * (0.8 + this.host.random() * 0.4);
      }
    } else {
      const dx = owner.x - f.x;
      const dy = owner.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > FOLLOW_M) move = { x: (dx / d) * 0.7, y: (dy / d) * 0.7 };
    }
    this.host.step(f, stepS, move);
  }

  /** The rabbit hops at the nearest opponent; within its arming range a short fuse begins, and the burst is up to `update`. */
  private thinkRabbit(f: FighterEntity, stepS: number): void {
    const s = f.summon!;
    const spec = s.rabbit!;
    const target = this.nearestEnemy(f, Number.POSITIVE_INFINITY);
    let move: Vec2 = { x: 0, y: 0 };
    if (target) {
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (f.combatant.canAct) f.faceToward(dx, dy);
      move = { x: dx / d, y: dy / d };
      if (s.fuseS === null && d <= spec.armRangeM + target.def.body.footRadiusM) s.fuseS = spec.fuseS;
    }
    if (s.fuseS !== null) s.fuseS -= stepS;
    this.host.step(f, stepS, move);
  }

  /** Try the minion's abilities, nearest-range first; true if one started. */
  private useAbility(f: FighterEntity, target: FighterEntity, d: number): boolean {
    const caster = f.caster;
    if (!caster) return false;
    for (const slot of ['ult', 'a1', 'a2', 'a3', 'a4'] as const) {
      const def = caster.def(slot);
      if (def.id.startsWith('dormant-')) continue;
      const minM = def.delivery.type === 'beam' ? 2.6 : 0;
      const maxM = def.delivery.type === 'nova' ? def.delivery.radiusM + 0.6 : def.aimRangeM;
      if (d < minM || d > maxM) continue;
      if (this.host.cast(f, slot, { x: target.x, y: target.y })) return true;
    }
    return false;
  }

  /** Everything this fighter raised is gone at once (it left the arena, Open Zone character switch). */
  clearOwnedBy(owner: FighterEntity): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]!;
      if (f.summon?.owner !== owner) continue;
      this.host.detach(f);
      this.list.splice(i, 1);
    }
  }

  /** Everyone gone at once (scene exit). */
  clear(): void {
    for (const f of this.list) this.host.detach(f);
    this.list.length = 0;
  }
}
