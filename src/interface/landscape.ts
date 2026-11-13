/**
 * Always landscape (owner, 13/11/2026: "automatically switch to landscape full-screen mode ...
 * without requiring players to rotate"). A touch device held upright gets the whole page laid out
 * in landscape and turned a quarter turn, so it plays sideways at once; the first tap also asks
 * for fullscreen and an orientation lock where the browser allows them (`enterFullscreen`), and
 * once the screen really is landscape the turn is dropped.
 *
 * Because the turned page's viewport units and media queries would still describe the upright
 * screen, the layout publishes its own sizes: `--vw` / `--vh` (1% of the layout's width and
 * height) and the classes `short` (layout height ≤ 480 px) and `narrow` (layout width ≤ 640 px),
 * which the stylesheet uses instead of `vw`, `vh` and size media queries.
 */
export function keepLandscape(touchDevice: boolean): void {
  const root = document.documentElement;
  const update = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const turn = touchDevice && h > w;
    const lw = turn ? h : w;
    const lh = turn ? w : h;
    root.classList.toggle('force-landscape', turn);
    root.style.setProperty('--vw', `${lw / 100}px`);
    root.style.setProperty('--vh', `${lh / 100}px`);
    root.style.setProperty('--screen-w', `${w}px`);
    root.classList.toggle('short', lh <= 480);
    root.classList.toggle('narrow', lw <= 640);
  };
  update();
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
}

const HINT_KEY = 'stickman-arena.home-screen-hint';

/**
 * iPhone Safari cannot give a web page the whole screen; added to the home screen, the game opens
 * full screen (the web app manifest). Once a session, such a phone gets a short line saying how.
 */
export function showHomeScreenHint(): void {
  const el = document.documentElement as Partial<Pick<HTMLElement, 'requestFullscreen'>> & {
    webkitRequestFullscreen?: () => void;
  };
  const nav = navigator as Navigator & { standalone?: boolean };
  const installed =
    nav.standalone === true ||
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: standalone)').matches;
  if (installed || el.requestFullscreen || el.webkitRequestFullscreen) return;
  try {
    if (sessionStorage.getItem(HINT_KEY)) return;
    sessionStorage.setItem(HINT_KEY, '1');
  } catch {
    /* no storage: it may show again, which is fine */
  }
  const hint = document.createElement('div');
  hint.className = 'home-screen-hint';
  hint.textContent = 'For full screen: tap Share, then Add to Home Screen';
  document.body.appendChild(hint);
  window.setTimeout(() => hint.classList.add('gone'), 6000);
  window.setTimeout(() => hint.remove(), 6800);
}
