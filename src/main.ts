import { bootstrap } from './app/bootstrap';

const container = document.getElementById('app');
const status = document.getElementById('status');

if (!container || !status) {
  throw new Error('index.html is missing #app or #status');
}

bootstrap(container, status).catch((error: unknown) => {
  status.dataset.state = 'error';
  status.textContent = 'Stickman Arena failed to start. Please reload the page.';
  console.error('[bootstrap]', error);
});
