import { DEFAULT_LOADOUT, type Loadout } from './loadout';

type LoadoutStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const LOADOUT_KEY = 'stickman-arena.loadouts';
const GUEST = '(guest)';

type Stored = Record<string, Record<string, { equipped?: unknown }>>;

/**
 * Which four of the five abilities each profile equips for each fighter (master plan B14). Kept in
 * this browser only: it is a preference, not something valuable. A fighter never touched keeps the
 * standard four; saved ability ids that no longer exist simply leave the standard four (`applyLoadout`).
 */
export class LoadoutStore {
  constructor(private readonly storage: LoadoutStorage | null) {}

  private read(): Stored {
    try {
      const text = this.storage?.getItem(LOADOUT_KEY);
      const raw: unknown = text ? JSON.parse(text) : null;
      return raw && typeof raw === 'object' ? (raw as Stored) : {};
    } catch (error) {
      console.warn('[loadout] saved loadouts unreadable, using the standard four', error);
      return {};
    }
  }

  get(profile: string | null, fighterId: string): Loadout {
    const mine = this.read()[profile ?? GUEST];
    const saved = mine && Object.hasOwn(mine, fighterId) ? mine[fighterId] : undefined;
    const ids = saved?.equipped;
    // Only plain strings, at most four of them: the kit decides whether the arrangement is usable.
    return Array.isArray(ids) && ids.length === 4 && ids.every((id) => typeof id === 'string' && id.length < 40)
      ? { equipped: [...ids] }
      : DEFAULT_LOADOUT;
  }

  set(profile: string | null, fighterId: string, loadout: Loadout): boolean {
    try {
      const all = this.read();
      const key = profile ?? GUEST;
      const mine = Object.hasOwn(all, key) && all[key] ? all[key] : {};
      all[key] = { ...mine, [fighterId]: { equipped: [...loadout.equipped] } };
      this.storage?.setItem(LOADOUT_KEY, JSON.stringify(all));
      return this.storage !== null;
    } catch (error) {
      console.warn('[loadout] could not save the loadout', error);
      return false;
    }
  }
}
