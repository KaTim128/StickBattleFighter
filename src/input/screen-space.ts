/**
 * Screen space for touch input (owner, 13/11/2026: the game always plays in landscape). On a
 * phone held upright where the browser cannot lock the orientation, the page is laid out in
 * landscape and turned a quarter turn (`html.force-landscape`, set by `src/interface/landscape.ts`).
 * Touch positions arrive in the phone's upright screen space, so they are turned back here into
 * the page's landscape layout before the controls read them.
 */
export function rotatedLayout(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('force-landscape');
}

/** A screen point (clientX, clientY) in layout space. */
export function toLayout(clientX: number, clientY: number): { x: number; y: number } {
  if (!rotatedLayout()) return { x: clientX, y: clientY };
  // The page is turned 90° clockwise: layout x runs down the screen, layout y runs right to left.
  return { x: clientY, y: window.innerWidth - clientX };
}

/** The layout's width in CSS pixels (the long side when turned). */
export function layoutWidth(): number {
  return rotatedLayout() ? window.innerHeight : window.innerWidth;
}
