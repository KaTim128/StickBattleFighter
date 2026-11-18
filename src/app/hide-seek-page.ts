import type { Application } from 'pixi.js';
import { AmbiencePlayer } from '../audio/ambience';
import { HideSeekAudio } from '../audio/hide-seek-audio';
import { SoundBoard } from '../audio/sound-board';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import { AMBIENCES } from '../data/audio/ambiences';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard, attachMouse, DesktopInput } from '../input/keyboard';
import { browserStorage, SettingsState } from '../input/settings-store';
import { attachTouchControls } from '../input/touch-controls';
import { HideSeekHud } from '../interface/hide-seek-hud';
import { keepFullscreen } from '../interface/main-menu';
import { SettingsPanel } from '../interface/settings-panel';
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
  // Settings (top-right gear, Esc) pause the round exactly as in the fights.
  const settings = new SettingsState(browserStorage());
  let paused = false;
  const desktop = new DesktopInput(intents, { paused: () => paused });
  attachKeyboard(window, desktop);
  attachMouse(container, desktop, intents);
  attachTouchControls(document.body, intents);

  const scenes = new SceneManager({ onError: (name, error) => console.error(`[scene:${name}]`, error) });
  const scene = new HideSeekScene(app.stage, intents, viewport, undefined, app.renderer);
  if (!(await scenes.switchTo(() => scene))) throw new Error('The Hide and Seek scene failed to load');
  window.__hideSeek = scene;

  // Sound: original and synthesised; a browser needs one tap or key before it may play (`&mute` silences it).
  const sound = new SoundBoard();
  sound.muted = params.has('mute');
  const ambience = new AmbiencePlayer();
  ambience.setMuted(sound.muted);
  ambience.play(AMBIENCES['house-night']!);
  const audio = new HideSeekAudio();
  audio.muted = sound.muted;
  const startAudio = (): void => {
    sound.unlock();
    if (sound.context && sound.musicBus) {
      ambience.attach(sound.context, sound.musicBus);
      audio.attach(sound.context, sound.musicBus);
    }
  };
  for (const ev of ['keydown', 'pointerdown'] as const) window.addEventListener(ev, startAudio, { once: true });

  const applyAudio = (): void => {
    ambience.setVolume(settings.current.musicVolume);
    sound.setVolume(settings.current.sfxVolume);
  };
  applyAudio();
  settings.onChange(applyAudio);
  // Fullscreen from the first tap, click or key, like every other mode (REQ-UI-39); automated
  // browsers stay windowed unless a test asks (`?fullscreen`) so screenshots keep the page size.
  if (navigator.webdriver !== true || params.has('fullscreen')) keepFullscreen();

  const leaveToMenu = (): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    window.location.assign(url.toString());
  };

  const hud = new HideSeekHud(
    document.body,
    {
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
    },
    {
      restart: () => {
        scene.restart();
        lastMode = 'patrol';
        for (const k of ['sprint', 'peek'] as const) intents[k] = false;
      },
      menu: leaveToMenu,
    },
  );
  new SettingsPanel(
    document.body,
    settings,
    (open) => {
      paused = open;
      if (open) for (const k of ['sprint', 'peek'] as const) intents[k] = false;
    },
    { leave: leaveToMenu },
  );
  let lastMode = 'patrol';
  let lastPhase = 'prep';

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
    update: (stepS) => {
      if (!paused) scenes.update(stepS);
    },
    render: (alpha) => {
      const now = performance.now();
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000) * loop.timeScale;
      last = now;
      scenes.render(alpha, dt);
      const g = scene.game;
      // Sound: what the player hears of every event, from where the body is; the heartbeat follows the hunter.
      const body = { floor: g.player.floor, x: g.player.x, y: g.player.y };
      for (const e of g.takeEvents()) audio.event(e, g.world, body);
      const h = g.hunter;
      const near = h.floor === body.floor ? Math.max(0, 1 - Math.hypot(h.x - body.x, h.y - body.y) / 12) : 0;
      audio.update(dt, g.round.phase === 'hunt' ? Math.max(h.mode === 'chase' ? 1 : 0, h.awareness, near * 0.5) : 0);
      if (h.mode === 'chase' && lastMode !== 'chase') audio.alert();
      lastMode = h.mode;
      if (g.round.phase !== lastPhase) {
        if (g.round.phase === 'killing') audio.kill();
        else if (g.round.phase === 'victory') audio.victory();
        lastPhase = g.round.phase;
      }
      hud.setBubbles(scene.hideBubbles());
      hud.update({
        killProgress: g.round.killProgress,
        hiddenView: g.player.hidingIn ? (g.player.peeking ? 'peek' : 'blind') : null,
        survivedS: g.round.survivedS,
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
