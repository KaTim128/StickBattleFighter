/**
 * No pinch or double-tap zoom on phones (owner, 13/11/2026: "the tournament screen player can zoom
 * in and out"). The viewport tag asks for a fixed scale; iPhone Safari ignores that, so its gesture
 * events (pinch) are cancelled here, and a second tap in quick succession on the same spot is not
 * allowed to zoom. Scrolling a list still works.
 */
export function preventPageZoom(): void {
  for (const type of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  // Two fingers on the page (a pinch) never zoom it.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  let lastTap = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = e.timeStamp;
      if (now - lastTap < 300 && e.cancelable && !(e.target instanceof HTMLInputElement)) e.preventDefault();
      lastTap = now;
    },
    { passive: false },
  );
}
