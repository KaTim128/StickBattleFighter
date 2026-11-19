/**
 * Offline play (owner, 21/11/2026): registers the service worker the build emits (`sw.js`), which stores the whole
 * game on the device after one online visit. Production builds only, so development and tests never see a cache.
 */
export function registerOfflineSupport(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      // The game still runs online; only offline play is unavailable.
      console.warn('[offline] service worker not registered', error);
    });
  });
}
