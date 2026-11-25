/**
 * The loading screen (spec section 9): the darkened menu art with a spinner and "Loading…" at the bottom right. It is in the page from
 * the first paint (index.html), fades away once the game says it is ready (or has failed, so an error is readable), and comes back
 * while the page is being left for another one (a new fight, the bracket, the menu). Presentation only.
 */
export function watchLoading(
  status: HTMLElement,
  root: HTMLElement | null = document.getElementById('loading-screen'),
): void {
  if (!root) return;
  const hide = (): void => {
    root.classList.add('gone');
    window.setTimeout(() => {
      if (root.classList.contains('gone')) root.hidden = true;
    }, 450);
  };
  const check = (): boolean => {
    const state = status.dataset.state;
    if (state === 'ready' || state === 'error') {
      hide();
      return true;
    }
    return false;
  };
  if (!check()) {
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(status, { attributes: true, attributeFilter: ['data-state'] });
  }
  // Leaving for another page: show it again so the switch never looks like a freeze.
  window.addEventListener('beforeunload', () => {
    root.hidden = false;
    root.classList.remove('gone');
  });
}
