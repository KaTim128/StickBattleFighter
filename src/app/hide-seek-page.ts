import type { Application } from 'pixi.js';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard, attachMouse, DesktopInput } from '../input/keyboard';
import { attachTouchControls } from '../input/touch-controls';
import { HideSeekHud } from '../interface/hide-seek-hud';
import { screenDirToWorld } from '../rendering/projection';
import { createRenderSurface } from '../rendering/renderer';
import { HideSeekScene } from './scenes/hide-seek-scene';

/**
 * The Hide and Seek page (`?mode=hide-seek`, Phase 2, TD-095): its own small bootstrap so the fighting
 * game's page set-up stays untouched. Renderer, fixed-step loop, the desktop and touch input, the
 * scene and the HUD.
 */
export interface HideSeekDebug {
  phase: string;
  floor: number;
  x: number;
  y: number;
  prepLeftS: number;
  survivalLeftS: number;
  framesRendered: number;
}

declare global {
  interface Window {
    __hideSeekDebug?: HideSeekDebug;
    __hideSeek?: HideSeekScene;
  }
}

export async function bootstrapHideSeek(elements: { container: HTMLElement; status: HTMLElement }): Promise<void> {
  const { container, status } = elements;
  const params = new URLSearchParams(window.location.search);
  status.textContent = 'Loading…';
  document.body.classList.add('hide-seek');
  const app: Application = await createRenderSurface(container, 0x07080b);
  const viewport = () => ({ width: app.screen.width, height: app.screen.height });

  const intents = new PlayerIntents();
  intents.screenToWorld = (v) => screenDirToWorld(v.x, v.y);
  const desktop = new DesktopInput(intents);
  attachKeyboard(window, desktop);
  attachMouse(container, desktop, intents);
  attachTouchControls(document.body, intents);

  const scenes = new SceneManager({ onError: (name, error) => console.error(`[scene:${name}]`, error) });
  const scene = new HideSeekScene(app.stage, intents, viewport);
  if (!(await scenes.switchTo(() => scene))) throw new Error('The Hide and Seek scene failed to load');
  window.__hideSeek = scene;

  const hud = new HideSeekHud(document.body, {
    setRun: (down) => {
      intents.sprint = down;
    },
    crouch: () => intents.pressJump(),
    act: () => {
      intents.interactPress();
      intents.interactRelease();
    },
    setPeek: (down) => {
      intents.peek = down;
    },
  });

  const debug: HideSeekDebug = {
    phase: 'prep',
    floor: 0,
    x: 0,
    y: 0,
    prepLeftS: 20,
    survivalLeftS: 120,
    framesRendered: 0,
  };
  window.__hideSeekDebug = debug;
  let last: number | null = null;
  const loop = new GameLoop({
    update: (stepS) => scenes.update(stepS),
    render: (alpha) => {
      const now = performance.now();
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000) * loop.timeScale;
      last = now;
      scenes.render(alpha, dt);
      const g = scene.game;
      hud.update({
        phase: g.round.phase,
        prepLeftS: g.round.prepLeftS,
        survivalLeftS: g.round.survivalLeftS,
        prompt: g.prompt(),
        posture: g.player.hidingIn
          ? 'Hiding'
          : g.player.crouching
            ? 'Crouching'
            : g.player.posture === 'run'
              ? 'Running'
              : '',
      });
      Object.assign(debug, {
        phase: g.round.phase,
        floor: g.player.floor,
        x: g.player.x,
        y: g.player.y,
        prepLeftS: g.round.prepLeftS,
        survivalLeftS: g.round.survivalLeftS,
        framesRendered: debug.framesRendered + 1,
      });
      app.render();
    },
  });
  if (params.has('slowmo')) loop.timeScale = Math.min(1, Math.max(0.05, Number(params.get('slowmo')) || 1));
  loop.start();
  status.dataset.state = 'ready';
  status.textContent = 'Hide and Seek Nightmare';
}
