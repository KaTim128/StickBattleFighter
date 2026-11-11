import { bootstrap } from './app/bootstrap';

const container = document.getElementById('app');
const status = document.getElementById('status');
const debugPanel = document.getElementById('debug');

if (!container || !status || !debugPanel) {
  throw new Error('index.html is missing #app, #status or #debug');
}

bootstrap({ container, status, debugPanel }).catch((error: unknown) => {
  status.dataset.state = 'error';
  status.textContent = 'Stickman Arena failed to start. Please reload the page.';
  console.error('[bootstrap]', error);
});
