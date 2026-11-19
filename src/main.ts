import { bootstrap } from './app/bootstrap';
import { bootstrapHideSeek } from './app/hide-seek-page';
import { mountShell, wantsShell } from './app/shell';
import { registerOfflineSupport } from './pwa-register';

registerOfflineSupport();

const container = document.getElementById('app');
const status = document.getElementById('status');
const debugPanel = document.getElementById('debug');

if (!container || !status || !debugPanel) {
  throw new Error('index.html is missing #app, #status or #debug');
}

if (wantsShell(window, new URLSearchParams(window.location.search))) {
  // Fullscreen survives every page change: the game runs in a frame inside this shell (owner, 13/11/2026).
  mountShell(document, window);
} else if (new URLSearchParams(window.location.search).get('mode') === 'hide-seek')
  bootstrapHideSeek({ container, status }).catch((error: unknown) => {
    status.dataset.state = 'error';
    status.textContent = 'Hide and Seek failed to start. Please reload the page.';
    console.error('[hide-seek]', error);
  });
else
  bootstrap({ container, status, debugPanel }).catch((error: unknown) => {
    status.dataset.state = 'error';
    status.textContent = 'Stickman Arena failed to start. Please reload the page.';
    console.error('[bootstrap]', error);
  });
