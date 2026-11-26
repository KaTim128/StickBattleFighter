import type { IdleStrip } from './portraits';

/**
 * A browser-side cache of the fighter-select idle strips (owner plan S1, 25/11/2026). Drawing them is the slowest thing on the select
 * screen (a GPU read-back per fighter), and a page reload threw all of it away. Each strip is kept in IndexedDB under a key made from
 * the fighter's id, a hash of everything that changes how it is drawn (its definition and select stance) and the renderer version, so
 * an edited fighter or a changed renderer is simply a cache miss. Every call fails soft: no IndexedDB (private mode) means no cache.
 */

/** Bump when the strip drawing itself changes in a way the fighter's data does not show. */
export const STRIP_RENDERER_VERSION = 2; // bumped for: Magix moustache face, slimmer Titan, no abs, Bohemeth arms (a drawing change does not change the fighter data hash)

const DB_NAME = 'stickman-arena-strips';
const STORE = 'strips';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** FNV-1a over the text, as hex: small, stable and plenty for telling edited data from unedited. */
export function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

/** The cache key of a fighter's strip, or null when its data cannot be hashed (then it is never cached). */
export function stripKey(id: string, drawnFrom: unknown): string | null {
  try {
    return `${id}|${hashText(JSON.stringify(drawnFrom))}|r${STRIP_RENDERER_VERSION}`;
  } catch {
    return null;
  }
}

/** The cached strips for these keys (null where there is none), read in one transaction. */
export async function getStrips(keys: readonly (string | null)[]): Promise<(IdleStrip | null)[]> {
  const db = await open();
  if (!db) return keys.map(() => null);
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const reads = keys.map(
      (k) =>
        new Promise<IdleStrip | null>((resolve) => {
          if (k === null) return resolve(null);
          const r = store.get(k);
          r.onsuccess = () => resolve((r.result as IdleStrip | undefined) ?? null);
          r.onerror = () => resolve(null);
        }),
    );
    return await Promise.all(reads);
  } catch {
    return keys.map(() => null);
  } finally {
    db.close();
  }
}

/** Keep a strip; old entries for the same fighter under other keys are left to be replaced by the browser's own eviction. */
export async function putStrip(key: string | null, strip: IdleStrip): Promise<void> {
  if (key === null) return;
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(strip, key);
  } catch {
    // a full or blocked store only means a slower next visit
  } finally {
    db.close();
  }
}
