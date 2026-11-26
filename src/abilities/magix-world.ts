import type { AbilityDef, BuffEffect, CardsDelivery, LuckyHatDelivery, MirrorDelivery } from './ability-def';
import type { AbilityHost, AbilityTarget } from './ability-world';

type Vec2 = { x: number; y: number };

/**
 * Magix's props of the trade (new fighter): the 52 cards, what comes out of the Lucky Hat (a thrown sword or a bomb) and the dust cloud of
 * Mirror Act. Simulated here and drawn from this state by the VFX layer; every hit goes through `AbilityHost.hitFighter`, so they obey the
 * shared combat rules. The rabbit is not here: it is a real minion (see `scene-summons.ts`), so it can be hit like anyone.
 */

/** The cards fade over this long when they run out of range. */
export const CARD_FADE_S = 0.15;
/** How long a landed bomb shows its burst. */
export const BOMB_BURST_S = 0.4;

export interface Card {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: CardsDelivery;
  x: number;
  y: number;
  readonly dir: Vec2;
  speedMps: number;
  travelledM: number;
  /** Spin phase and rate (presentation). */
  spin: number;
  readonly spinRate: number;
  /** Some cards carry extra knockback. */
  readonly heavy: boolean;
  /** Which of the 52 this is (suit and face are drawn from it). */
  readonly index: number;
  /** Where it has been, newest first (its magic trail). */
  readonly trail: Vec2[];
}

/** A barrage being thrown: `count` cards over `durationS`, one after another; interrupting the caster ends it. */
export interface Volley {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: CardsDelivery;
  emitted: number;
  ageS: number;
  readonly baseDir: Vec2;
}

export interface Thrown {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: LuckyHatDelivery;
  readonly kind: 'sword' | 'bomb';
  x: number;
  y: number;
  readonly dir: Vec2;
  /** The bomb lands here. */
  readonly landAt: Vec2;
  ageS: number;
  /** A bomb's fuse once it has landed; 0 before. */
  fuseS: number;
  landed: boolean;
  /** Seconds since it burst (a burst is shown briefly, then it is gone). */
  burstS: number;
  spin: number;
}

/** The dust of Mirror Act: a cloud that hides the change, then the host makes the copy. */
export interface Dust {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: MirrorDelivery;
  x: number;
  y: number;
  ageS: number;
  changed: boolean;
}

export type LuckyKind = 'speed' | 'damage' | 'defence' | 'range' | 'hp' | 'sword' | 'bomb' | 'misfortune';
export const LUCKY_KINDS: readonly LuckyKind[] = ['speed', 'damage', 'defence', 'range', 'hp', 'sword', 'bomb', 'misfortune'];

/** The buff a Lucky Hat stat boost gives: exactly +`bonus` to one stat, and nothing else. */
export function luckyBuff(kind: LuckyKind, spec: LuckyHatDelivery): BuffEffect | null {
  const up = 1 + spec.bonus;
  const base = { durationS: spec.durationS, speedFactor: 1, damageTakenFactor: 1 };
  switch (kind) {
    case 'speed':
      return { ...base, speedFactor: up, label: `SPEED +${Math.round(spec.bonus * 100)}%` };
    case 'damage':
      return {
        ...base,
        abilityDamageFactor: up,
        meleeDamageFactor: up,
        label: `DAMAGE +${Math.round(spec.bonus * 100)}%`,
      };
    case 'defence':
      return { ...base, damageTakenFactor: 1 / up, label: `DEFENCE +${Math.round(spec.bonus * 100)}%` };
    case 'range':
      return { ...base, rangeFactor: up, label: `RANGE +${Math.round(spec.bonus * 100)}%` };
    case 'hp':
      return { ...base, shieldFraction: spec.bonus, label: `MAX HP +${Math.round(spec.bonus * 100)}%` };
    default:
      return null;
  }
}

export class MagixWorld {
  readonly cards: Card[] = [];
  readonly volleys: Volley[] = [];
  readonly thrown: Thrown[] = [];
  readonly dusts: Dust[] = [];
  /** What the hat gave last (tests and the HUD tag), and how many times it has been used (so the caller can tell a fresh result). */
  lastLucky: LuckyKind | null = null;
  luckyCount = 0;
  private made = 0;

  constructor(
    private readonly nearest: (casterId: string, at: Vec2, rangeM: number, host: AbilityHost) => AbilityTarget | null,
    private readonly friendly: (f: AbilityTarget, casterId: string, host: AbilityHost) => boolean,
    private readonly rng: () => number,
  ) {}

  /** Ability ids of this caster still being carried out (their cooldown waits). */
  runningIds(casterId: string): string[] {
    const ids: string[] = [];
    for (const v of this.volleys) if (v.casterId === casterId) ids.push(v.def.id);
    for (const t of this.thrown) if (t.casterId === casterId) ids.push(t.def.id);
    for (const d of this.dusts) if (d.casterId === casterId) ids.push(d.def.id);
    return ids;
  }

  /** Start one of Magix's deliveries. Returns false if the delivery is not his. */
  release(casterId: string, def: AbilityDef, aim: Vec2, host: AbilityHost): boolean {
    const d = def.delivery;
    const at = host.position(casterId);
    const dir = norm({ x: aim.x - at.x, y: aim.y - at.y });
    if (d.type === 'cards') {
      this.volleys.push({ casterId, def, spec: d, emitted: 0, ageS: 0, baseDir: dir });
      return true;
    }
    if (d.type === 'luckyHat') {
      const kind = LUCKY_KINDS[Math.floor(this.rng() * LUCKY_KINDS.length)] ?? 'speed';
      this.lastLucky = kind;
      this.luckyCount++;
      const buff = luckyBuff(kind, d);
      host.emit({
        kind: 'impact',
        ability: def.id,
        look: def.look,
        vfx: def.vfx,
        sfx: def.sfx.release,
        x: at.x,
        y: at.y,
        radiusM: 1.4,
      });
      if (buff) {
        host.buff(casterId, buff, def.id);
        return true;
      }
      if (kind === 'misfortune') return true; // the bolt is loosed by the ability world (it is a real projectile)
      const reach =
        kind === 'bomb' ? Math.min(def.aimRangeM, Math.max(2.5, Math.hypot(aim.x - at.x, aim.y - at.y))) : 0;
      this.thrown.push({
        casterId,
        def,
        spec: d,
        kind: kind === 'bomb' ? 'bomb' : 'sword',
        x: at.x + dir.x * 0.6,
        y: at.y + dir.y * 0.6,
        dir,
        landAt: { x: at.x + dir.x * reach, y: at.y + dir.y * reach },
        ageS: 0,
        fuseS: 0,
        landed: false,
        burstS: 0,
        spin: 0,
      });
      return true;
    }
    if (d.type === 'mirror') {
      this.dusts.push({ casterId, def, spec: d, x: at.x, y: at.y, ageS: 0, changed: false });
      host.emit({
        kind: 'release',
        ability: def.id,
        look: def.look,
        vfx: def.vfx,
        sfx: def.sfx.cast,
        x: at.x,
        y: at.y,
        radiusM: 2.6,
      });
      return true;
    }
    return false;
  }

  /** The caster was interrupted (a hit, a KO): a barrage stops throwing; cards already in the air keep flying. */
  cancel(casterId: string): void {
    for (let i = this.volleys.length - 1; i >= 0; i--)
      if (this.volleys[i]?.casterId === casterId) this.volleys.splice(i, 1);
  }

  /** Everything this caster threw ends now. */
  clearOf(casterId: string): void {
    for (const list of [this.cards, this.volleys, this.thrown, this.dusts] as { casterId: string }[][])
      for (let i = list.length - 1; i >= 0; i--) if (list[i]?.casterId === casterId) list.splice(i, 1);
  }

  update(dtS: number, host: AbilityHost): void {
    this.updateVolleys(dtS, host);
    this.updateCards(dtS, host);
    this.updateThrown(dtS, host);
    this.updateDusts(dtS, host);
  }

  private updateVolleys(dtS: number, host: AbilityHost): void {
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i]!;
      v.ageS += dtS;
      const due = Math.min(v.spec.count, Math.floor((v.ageS / v.spec.durationS) * v.spec.count) + 1);
      const at = host.position(v.casterId);
      const foe = this.nearest(v.casterId, at, v.spec.rangeM + 3, host);
      while (v.emitted < due) {
        const aimDir = foe ? norm({ x: foe.x - at.x, y: foe.y - at.y }) : v.baseDir;
        const a = (this.rng() * 2 - 1) * v.spec.spreadRad;
        const dir = {
          x: aimDir.x * Math.cos(a) - aimDir.y * Math.sin(a),
          y: aimDir.x * Math.sin(a) + aimDir.y * Math.cos(a),
        };
        this.cards.push({
          casterId: v.casterId,
          def: v.def,
          spec: v.spec,
          x: at.x + dir.x * 0.6,
          y: at.y + dir.y * 0.6,
          dir,
          speedMps: v.spec.speedMps * (0.85 + this.rng() * 0.3),
          travelledM: 0,
          spin: this.rng() * Math.PI * 2,
          spinRate: 14 + this.rng() * 10,
          heavy: this.rng() < v.spec.knockbackChance,
          index: this.made++ % 52,
          trail: [],
        });
        v.emitted++;
      }
      if (v.emitted >= v.spec.count) this.volleys.splice(i, 1);
    }
  }

  private updateCards(dtS: number, host: AbilityHost): void {
    const fighters = host.fighters();
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const c = this.cards[i]!;
      const step = c.speedMps * dtS;
      const from = { x: c.x, y: c.y };
      const to = { x: c.x + c.dir.x * step, y: c.y + c.dir.y * step };
      let done = false;
      if (host.blocked(from, to) !== null) done = true;
      else {
        for (const f of fighters) {
          if (!f.hittable || this.friendly(f, c.casterId, host)) continue;
          if (segmentDistance(from, to, f) > c.spec.radiusM + f.radiusM) continue;
          const payload = c.heavy
            ? { ...c.def.payload, knockbackMps: c.spec.knockbackMps, strength: c.def.payload.strength * 3 }
            : c.def.payload;
          host.hitFighter(c.casterId, f.id, payload, c.dir, c.def.look?.hitFlash);
          done = true;
          break;
        }
      }
      c.x = to.x;
      c.y = to.y;
      c.travelledM += step;
      c.spin += c.spinRate * dtS;
      c.trail.unshift({ x: from.x, y: from.y });
      if (c.trail.length > 6) c.trail.length = 6;
      if (done || c.travelledM >= c.spec.rangeM) this.cards.splice(i, 1);
    }
  }

  private updateThrown(dtS: number, host: AbilityHost): void {
    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const t = this.thrown[i]!;
      t.ageS += dtS;
      t.spin += dtS * 16;
      if (t.kind === 'sword') {
        const step = t.spec.sword.speedMps * dtS;
        const from = { x: t.x, y: t.y };
        const to = { x: t.x + t.dir.x * step, y: t.y + t.dir.y * step };
        let done = host.blocked(from, to) !== null || t.ageS > 1.4;
        if (!done)
          for (const f of host.fighters()) {
            if (!f.hittable || this.friendly(f, t.casterId, host)) continue;
            if (segmentDistance(from, to, f) > 0.4 + f.radiusM) continue;
            host.hitFighter(
              t.casterId,
              f.id,
              {
                damage: t.spec.sword.damage,
                knockbackMps: t.spec.sword.knockbackMps,
                heavy: false,
                strength: 160,
                impact: 'knuckle-light',
              },
              t.dir,
              t.def.look?.hitFlash,
            );
            host.emit({
              kind: 'impact',
              ability: t.def.id,
              look: t.def.look,
              vfx: 'magix-sword',
              sfx: 'card-hit',
              x: f.x,
              y: f.y,
              radiusM: 0.9,
            });
            done = true;
            break;
          }
        t.x = to.x;
        t.y = to.y;
        if (done) this.thrown.splice(i, 1);
        continue;
      }
      // A bomb: lobbed to where it was aimed, then a short fuse, then it goes off hurting everyone close.
      if (!t.landed) {
        const dx = t.landAt.x - t.x;
        const dy = t.landAt.y - t.y;
        const d = Math.hypot(dx, dy);
        const step = 12 * dtS;
        if (
          d <= step ||
          host.blocked({ x: t.x, y: t.y }, { x: t.x + (dx / (d || 1)) * step, y: t.y + (dy / (d || 1)) * step }) !==
            null
        ) {
          t.landed = true;
          t.fuseS = t.spec.bomb.fuseS;
        } else {
          t.x += (dx / d) * step;
          t.y += (dy / d) * step;
        }
        continue;
      }
      if (t.burstS > 0) {
        t.burstS += dtS;
        if (t.burstS > BOMB_BURST_S) this.thrown.splice(i, 1);
        continue;
      }
      t.fuseS -= dtS;
      if (t.fuseS > 0) continue;
      t.burstS = dtS;
      const b = t.spec.bomb;
      for (const f of host.fighters()) {
        if (!f.hittable || this.friendly(f, t.casterId, host)) continue;
        const gap = Math.hypot(f.x - t.x, f.y - t.y);
        if (gap > b.radiusM + f.radiusM) continue;
        const away = gap > 1e-6 ? { x: (f.x - t.x) / gap, y: (f.y - t.y) / gap } : t.dir;
        host.hitFighter(
          t.casterId,
          f.id,
          { damage: b.damage, knockbackMps: b.knockbackMps, heavy: true, strength: 300, impact: 'knuckle-heavy' },
          away,
          t.def.look?.hitFlash,
        );
      }
      host.emit({
        kind: 'impact',
        ability: t.def.id,
        look: t.def.look,
        vfx: 'magix-bomb',
        sfx: 'bomb-blast',
        x: t.x,
        y: t.y,
        radiusM: b.radiusM,
      });
    }
  }

  private updateDusts(dtS: number, host: AbilityHost): void {
    for (let i = this.dusts.length - 1; i >= 0; i--) {
      const d = this.dusts[i]!;
      d.ageS += dtS;
      const p = host.position(d.casterId);
      d.x = p.x;
      d.y = p.y;
      if (!d.changed && d.ageS >= d.spec.dustS * 0.5) {
        d.changed = true;
        // Hidden in the cloud, he becomes the opponent; with nobody to copy it simply clears.
        host.mirror?.(d.casterId, d.spec);
      }
      if (d.ageS >= d.spec.dustS) this.dusts.splice(i, 1);
    }
  }
}

function norm(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y);
  return l < 1e-6 ? { x: 1, y: 0 } : { x: v.x / l, y: v.y / l };
}

/** Distance from a fighter's centre to the segment `a -> b`. */
function segmentDistance(a: Vec2, b: Vec2, p: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}
