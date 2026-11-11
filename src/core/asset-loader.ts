/**
 * Asset loading with a handled-error path (Phase 1). A missing or broken
 * asset never crashes the game: the caller gets a failed result, the failure
 * is recorded and reported once, and the scene can fall back to greybox art.
 */
export type AssetResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error };

export interface AssetFailure {
  readonly url: string;
  readonly message: string;
}

export type LoadFn<T> = (url: string) => Promise<T>;

export class AssetLoader<T> {
  private readonly cache = new Map<string, Promise<AssetResult<T>>>();
  private readonly failureList: AssetFailure[] = [];

  constructor(
    private readonly loadFn: LoadFn<T>,
    private readonly onFailure?: (failure: AssetFailure) => void,
  ) {}

  /** Loads each URL once; repeated calls share the same result. Never throws. */
  load(url: string): Promise<AssetResult<T>> {
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.attempt(url);
      this.cache.set(url, pending);
    }
    return pending;
  }

  get failures(): readonly AssetFailure[] {
    return this.failureList;
  }

  private async attempt(url: string): Promise<AssetResult<T>> {
    try {
      const value = await this.loadFn(url);
      if (value === undefined || value === null) throw new Error('loader returned nothing');
      return { ok: true, value };
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const failure = { url, message: error.message };
      this.failureList.push(failure);
      this.onFailure?.(failure);
      return { ok: false, error };
    }
  }
}
