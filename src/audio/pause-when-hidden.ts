/**
 * Silence the game when its tab is not showing (owner, 12/11/2026: "whenever the player is not
 * in the game tab, the music should immediately stop").
 *
 * Suspending the shared audio context stops everything at once: music and sound effects. The
 * music scheduler simply waits while the context's clock is frozen and carries on from the same
 * spot when the tab is shown again. Only a pause made here is resumed, so a context the browser
 * has not unlocked yet is left alone.
 */
export interface SuspendableAudio {
  readonly state: string;
  suspend(): Promise<void>;
  resume(): Promise<void>;
}

type Listenable = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export function pauseAudioWhenHidden(
  doc: Listenable & { readonly hidden: boolean },
  context: () => SuspendableAudio | null,
  win?: Listenable,
): () => void {
  let pausedHere = false;
  const quiet = (what: Promise<void>): void => {
    what.catch((error: unknown) => console.warn('[audio] could not pause or resume', error));
  };
  const pause = (): void => {
    const ctx = context();
    if (ctx?.state !== 'running') return;
    pausedHere = true;
    quiet(ctx.suspend());
  };
  const resume = (): void => {
    const ctx = context();
    if (!ctx || !pausedHere) return;
    pausedHere = false;
    quiet(ctx.resume());
  };
  const onVisibility = (): void => (doc.hidden ? pause() : resume());
  const onPageShow = (): void => {
    if (!doc.hidden) resume();
  };
  doc.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('pagehide', pause);
  win?.addEventListener('pageshow', onPageShow);
  return () => {
    doc.removeEventListener('visibilitychange', onVisibility);
    win?.removeEventListener('pagehide', pause);
    win?.removeEventListener('pageshow', onPageShow);
  };
}
