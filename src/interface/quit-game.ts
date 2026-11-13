/**
 * Quit Game (owner, 13/11/2026: no "Thanks for playing" screen). A web page may only close a
 * window that script opened, or the installed app's own window (home-screen app, where closing it
 * returns to the device's home screen). So: leave fullscreen, try to close; if the browser keeps
 * the tab open, leave the game the closest honest way: back to the page the player came from, or
 * an empty tab. Nothing claims the game closed when it did not.
 */
export function quitGame(win: Window = window, delayMs = 250): void {
  const top = topWindow(win);
  try {
    if (top.document.fullscreenElement) void top.document.exitFullscreen().catch(() => {});
  } catch {
    /* not reachable: carry on */
  }
  try {
    top.close();
  } catch {
    /* refused */
  }
  win.setTimeout(() => {
    if (top.closed) return;
    top.location.replace(exitUrl(top.document.referrer, top.location.origin));
  }, delayMs);
}

/** Where to go when the tab cannot be closed: the site the player came from, else an empty page. */
export function exitUrl(referrer: string, origin: string): string {
  try {
    if (referrer && new URL(referrer).origin !== origin) return referrer;
  } catch {
    /* not a URL */
  }
  return 'about:blank';
}

/** The outermost same-origin window (the fullscreen shell when the game runs inside it). */
export function topWindow(win: Window = window): Window {
  try {
    const top = win.top;
    if (top && top !== win) {
      void top.document; // throws when another origin
      return top;
    }
  } catch {
    /* another origin: stay in our own window */
  }
  return win;
}
