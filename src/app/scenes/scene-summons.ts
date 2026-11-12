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
  attack(f: FighterEntity): void;
  /** A minion rose (dust and a sound) or crumbled away. */
  risen(f: FighterEntity): void;
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
 * furniture, crumble when their time is up, and a summoner never has more than `maxAlive` (the
 * oldest goes first).
 */
export class SceneSummons {
  readonly list: FighterEntity[] = [];
  private made = 0;

  constructor(private readonly host: SummonHost) {}

  /**
   * Raise `spec.count` minions around `owner`, or at random spots near its nearest enemy
   * (`near: 'enemy'`). Returns how many appeared (some spots may be blocked).
   */
  spawn(owner: FighterEntity, spec: SummonSpec): number {
    const def = this.host.loadDef(spec.character);
    const radius = def.body.footRadiusM;
    const enemy = spec.near === 'enemy' ? this.nearestEnemy(owner, Number.POSITIVE_INFINITY) : null;
    let raised = 0;
    for (let i = 0; i < spec.count; i++) {
      const spot = enemy ? this.spotAround(enemy, radius) : this.spotNear(owner, radius, i, spec.count);
      if (!spot) continue;
      // Keep within the cap: the summoner's oldest minion crumbles to make room.
      const mine = this.list.filter((m) => m.summon?.owner === owner && !m.combatant.isKo);
      if (mine.length >= spec.maxAlive) mine[0]?.combatant.expire();
      const f = new FighterEntity(`${owner.name}-summon-${++this.made}`, def, spot, false);
      f.team = owner.team;
      f.summon = { owner, leftS: spec.lifeS, persistent: spec.persistent === true };
      f.faceToward(owner.aim.x, owner.aim.y);
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

  /** A random free spot 1.4–3.2 m from `centre`, in sight of it (not through a wall), inside the map. */
  private spotAround(centre: FighterEntity, radius: number): Vec2 | null {
    for (let attempt = 0; attempt < 14; attempt++) {
      const a = this.host.random() * Math.PI * 2;
      const want = 1.4 + this.host.random() * 1.8;
      const end = { x: centre.x + Math.cos(a) * want, y: centre.y + Math.sin(a) * want };
      const block = this.host.blocked({ x: centre.x, y: centre.y }, end);
      const d = block === null ? want : want * block - radius - 0.1;
      if (d < radius + 0.6) continue;
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
      if (c.canAct && !f.combo.attack) f.faceToward(dx, dy);
      if (d > reach) move = { x: dx / d, y: dy / d };
      else if (c.state === 'free' && !f.combo.attack && f.attackCooldownS === 0) {
        this.host.attack(f);
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

  /** Everyone gone at once (scene exit). */
  clear(): void {
    for (const f of this.list) this.host.detach(f);
    this.list.length = 0;
  }
}
