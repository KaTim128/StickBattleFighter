/**
 * The fullscreen shell (owner, 13/11/2026: "fullscreen must stay on across every mode, without
 * another tap"). Every fight, tournament step and practice session is its own page, and a browser
 * always leaves fullscreen when the page in fullscreen is unloaded. So the top window becomes a
 * thin shell holding the game in a full-window frame: the game asks for fullscreen on the shell
 * (same origin; a tap inside the frame counts for the shell too), and when the frame moves to
 * another page the shell, still in fullscreen, is untouched.
 *
 * Automated browsers (tests) run the game directly unless `?shell` asks for the shell; `?noshell`
 * or the session flag `stickman-arena.no-shell` (tests that play as a person) turn it off. The shell keeps its own address in step with the game's page, so a reload returns
 * to the same place.
 */
export function wantsShell(win: Window, params: URLSearchParams): boolean {
  if (win.top !== win) return false; // already inside the shell (or someone else's frame)
  if (params.has('noshell') || noShellFlag(win)) return false;
  const automated = (win.navigator as Navigator & { webdriver?: boolean }).webdriver === true;
  return params.has('shell') || !automated;
}

export function mountShell(doc: Document, win: Window): HTMLIFrameElement {
  for (const id of ['app', 'status', 'debug']) {
    const el = doc.getElementById(id);
    if (el) el.hidden = true;
  }
  const frame = doc.createElement('iframe');
  frame.id = 'game-frame';
  frame.title = 'Stickman Arena';
  frame.allow = 'fullscreen; autoplay; screen-wake-lock';
  frame.setAttribute('allowfullscreen', '');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;display:block;background:#11151c';
  frame.src = win.location.pathname + win.location.search + win.location.hash;
  frame.addEventListener('load', () => {
    try {
      const inner = frame.contentWindow!;
      // Keep the address bar's page (and a reload) on the game's current page.
      const search = inner.location.search;
      if (search !== win.location.search)
        win.history.replaceState(win.history.state, '', `${win.location.pathname}${search}`);
      doc.title = inner.document.title;
      inner.focus(); // keys go to the game straight away
    } catch {
      /* the frame left our origin: nothing to keep in step */
    }
  });
  doc.body.appendChild(frame);
  return frame;
}

/** Browser tests that pose as a person set this for their tab, so every page runs unwrapped. */
const NO_SHELL_KEY = 'stickman-arena.no-shell';
function noShellFlag(win: Window): boolean {
  try {
    return win.sessionStorage?.getItem(NO_SHELL_KEY) === '1';
  } catch {
    return false;
  }
}
