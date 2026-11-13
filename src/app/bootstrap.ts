import type { WebGLRenderer } from 'pixi.js';
import type { AbilityHudState } from '../abilities/ability-caster';
import { isAdminName } from '../admin/local-access';
import { AmbiencePlayer } from '../audio/ambience';
import { Announcer } from '../audio/announcer';
import { AudioClip, MusicLoop, musicFor } from '../audio/music';
import { pauseAudioWhenHidden } from '../audio/pause-when-hidden';
import { SoundBoard } from '../audio/sound-board';
import { readDraft } from '../characters/draft';
import { BUILT_IN_LIBRARY, DEFAULT_CAST, withEntries } from '../characters/library';
import { loadCharacter } from '../characters/load';
import { withOverrides } from '../characters/overrides';
import { resolveCharacter } from '../characters/resolve';
import type { CharacterLibrary } from '../characters/schema';
import { FpsMeter } from '../core/fps-meter';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, difficultyFor } from '../data/ai/difficulty';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { GREYBOX_COLOURS } from '../data/arenas/greybox-arena';
import { OFFICE } from '../data/arenas/office';
import { TRAINING_YARD } from '../data/arenas/training-yard';
import { AMBIENCES } from '../data/audio/ambiences';
import { BATTLE_MUSIC, FIGHT_STINGER, MENU_MUSIC, UI_CLICK } from '../data/audio/music';
import { SELECT_STANCES } from '../data/presentation/select-stances';
import { codeLabel } from '../input/bindings';
import { onDebugImpact, onDebugToggle, onFirstInput, onToggleDummyAttacks, onToggleMute } from '../input/debug-keys';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard, attachMouse, DesktopInput } from '../input/keyboard';
import { preventPageZoom } from '../input/no-zoom';
import { SettingsState } from '../input/settings-store';
import { attachTouchControls, showDodgeReady, showStickAiming, showUtilityAction } from '../input/touch-controls';
import { AbilityHud } from '../interface/ability-hud';
import { AimHint } from '../interface/aim-hint';
import { BlindVeil } from '../interface/blind-veil';
import { ClashHud } from '../interface/clash-hud';
import { CombatText } from '../interface/combat-text';
import { FightIntro } from '../interface/fight-intro';
import { fighterSheet } from '../interface/fighter-sheet';
import { FrontEnd } from '../interface/front-end';
import { keepLandscape, showHomeScreenHint } from '../interface/landscape';
import {
  enterFullscreen,
  keepFullscreen,
  MainMenu,
  type MenuFighter,
  type MenuOpponent,
  toggleFullscreen,
} from '../interface/main-menu';
import { SettingsPanel } from '../interface/settings-panel';
import { TopHud, UltimateShowcase } from '../interface/top-hud';
import { TutorialOverlay } from '../interface/tutorial-overlay';
import { VisionVeil } from '../interface/vision-veil';
import { initPhysics } from '../physics/physics-world';
import { loadPlayerName, savePlayerName } from '../progression/player-name';
import { DebugOverlay } from '../rendering/debug-overlay';
import { createTextureLoader } from '../rendering/pixi-assets';
import { renderIdleStrips, renderPortraits } from '../rendering/portraits';
import { screenDirToWorld } from '../rendering/projection';
import { createRenderSurface } from '../rendering/renderer';
import { TutorialRun } from '../tutorial/tutorial';
import { fighterSettingsHost } from './fighter-settings';
import type { ArenaScene } from './scenes/arena-scene';
import { EngineCheckScene } from './scenes/engine-check-scene';
import {
  type CameraState,
  type DoorState,
  type DummyState,
  FightArenaScene,
  type PlayerState,
} from './scenes/fight-arena-scene';
import type { ClashHudState } from './scenes/scene-clash';
import { goToBracket, setupTournamentPage, startTournament, tournamentInProgress } from './tournament-page';

/** Read-only hook used by the browser tests (tests/e2e). Exposes no gameplay control. */
export interface EngineDebugInfo {
  /** The live scene (development builds only), for screenshot scripts. */
  sceneRef?: unknown;
  /** Screen position (CSS pixels) of a world point, for screenshots and tests. */
  screenOf?: (x: number, y: number, z?: number) => { x: number; y: number } | null;
  ready: boolean;
  scene: string | null;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number } | null;
  player: PlayerState | null;
  camera: CameraState | null;
  dummy: DummyState | null;
  dummyAttacks: boolean;
  doors: DoorState[];
  /** The player's ability slots and ultimate meter (Phase 6). */
  abilities: AbilityHudState | null;
  /** Recent ability sound-hook ids. */
  sfx: string[];
  /** Recent sounds played by the sound board (melee contacts, KO, dusting, abilities). */
  sounds: string[];
  /** The background ambience playing (or waiting for the first input to start). */
  ambience: string | null;
  /** The battle music is playing (owner, 12/11/2026). */
  musicPlaying: boolean;
  /** The tutorial step on screen (`done` at the end), when the tutorial runs. */
  tutorial?: string;
  /** Interface button clicks that played the click sound (owner, 13/11/2026). */
  uiClicks: number;
  menuMusicPlaying: boolean;
  /** Where the ability being aimed will land (the ultimate's leap or a point-aimed ability), or null. */
  aimSpot: { x: number; y: number } | null;
  /** Practice/testing: set the dummy's health (e.g. to see a KO quickly). */
  setDummyHp(hp: number): void;
  /** The Punch Clash in progress (power, timer), or null. */
  clash: ClashHudState | null;
  /** Practice/testing: start a Punch Clash now. */
  startClash(): void;
  /** Practice/testing: fill the player's ultimate meter. */
  fillMeter(): void;
  /** Tests: chip an interior wall section (by its index) as if struck; damage before toughness. */
  damageWall(index: number, damage: number, fire?: boolean): void;
  /** Props summary: how many are broken, and how many are moving right now. */
  props: { total: number; broken: number; awake: number };
  assetFailures: { url: string; message: string }[];
  debugOverlay: { enabled: boolean; segments: number; fps: number };
  /** Render now and return the RGBA of the pixel at fractional canvas coords (0..1, top-left origin). */
  readPixel(xFrac: number, yFrac: number): [number, number, number, number];
  /** Game speed (0 = frozen, 1 = real time); tests freeze it for exact screenshots. */
  setTimeScale(scale: number): void;
}

declare global {
  interface Window {
    __stickmanDebug?: EngineDebugInfo;
  }
}

export interface BootstrapElements {
  container: HTMLElement;
  status: HTMLElement;
  debugPanel: HTMLElement;
}

/**
 * Developer option `?playerAt=x,y`: start the player at an exact spot (layout review and
 * deterministic browser tests). Invalid values are ignored.
 */
/** `?playerAt=x,y` and `?dummyAt=x,y`: start positions for testing and practice. */
function withStarts(arena: ArenaLayout, playerAt: string | null, dummyAt: string | null): ArenaLayout {
  const parse = (at: string | null) => {
    const [x, y] = (at ?? '').split(',').map(Number);
    return x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y) ? null : { x, y };
  };
  const p = parse(playerAt);
  const d = parse(dummyAt);
  return { ...arena, ...(p ? { playerStart: p } : {}), ...(d ? { dummyStart: d } : {}) };
}

/**
 * The fighters as the admin has set them up (owner, 13/11/2026: fighter settings from the menu):
 * the built-in library with this browser's validated overrides applied. Read once per page.
 */
let tuned: CharacterLibrary | null = null;
function tunedLibrary(): CharacterLibrary {
  if (!tuned) {
    const { library, rejected } = withOverrides(BUILT_IN_LIBRARY);
    for (const [id, errors] of Object.entries(rejected))
      console.warn(`[fighter settings] changes to "${id}" are invalid and were not used:\n- ${errors.join('\n- ')}`);
    tuned = library;
  }
  return tuned;
}

/**
 * `?character=<id>` picks the player's fighter (TD-039); `?opponent=<id>` the
 * opponent. `?character=draft` plays the admin editor's unsaved draft from this
 * browser's local storage (local testing only: nothing is published).
 */
function castFromParams(params: URLSearchParams): { player?: string; opponent?: string; library?: CharacterLibrary } {
  const player = params.get('character') ?? undefined;
  const opponent = params.get('opponent') ?? undefined;
  if (player !== 'draft') return { player, opponent, library: tunedLibrary() };
  const draft = readDraft();
  if (!draft) return { opponent };
  return { player: draft.characterId, opponent, library: withEntries(BUILT_IN_LIBRARY, draft.entries) };
}

/** A blow this big gets a reaction from a crowd. */
const HEAVY_HIT_FOR_CROWD = 100;

/** Arenas on the main menu (the training yard is the Colosseum floor until it has its own arena). */
const MENU_ARENAS = [
  { id: 'office', name: 'Office' },
  { id: 'training-yard', name: 'Colosseum' },
] as const;

/** Playable fighters for the main menu: every built-in fighter made from a template. */
function menuFighters(): MenuFighter[] {
  return Object.values(tunedLibrary().characters)
    .filter((c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter')
    .map((c) => {
      const head = tunedLibrary().effects[c.profiles.effects]?.head;
      return {
        id: c.id,
        name: c.displayName,
        blurb: c.description,
        portrait: head === 'flame' || head === 'brute' ? head : 'round',
        colour: c.rig.colour,
      };
    });
}

/** Opponents for the menu (owner, 13/11/2026): the training dummy first (the default), then every playable fighter. */
function menuOpponents(): MenuOpponent[] {
  const dummy = tunedLibrary().characters[DEFAULT_CAST.opponent];
  return [
    { id: DEFAULT_CAST.opponent, name: dummy?.displayName ?? 'Training Dummy' },
    ...menuFighters().map((f) => ({ id: f.id, name: f.name })),
  ];
}

/** Browser tests set this storage flag to reach the live scene in a production build. */
const TEST_HOOKS_KEY = 'stickman-arena.test-hooks';
function testHooksOn(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(TEST_HOOKS_KEY) === '1';
  } catch {
    return false;
  }
}

export async function bootstrap({ container, status, debugPanel }: BootstrapElements): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  status.textContent = 'Loading…';
  // Phones and tablets always play in landscape (owner, 13/11/2026), laid out before anything draws.
  const touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  keepLandscape(touchDevice);
  if (touchDevice) preventPageZoom();

  // Renderer and physics download in parallel; physics is a separate .wasm (TD-023).
  const [app] = await Promise.all([createRenderSurface(container, GREYBOX_COLOURS.background), initPhysics()]);
  const viewport = () => ({ width: app.screen.width, height: app.screen.height });

  const assetFailures: EngineDebugInfo['assetFailures'] = [];
  const textures = createTextureLoader((failure) => {
    assetFailures.push(failure);
    console.warn(`[assets] could not load ${failure.url}: ${failure.message}`);
  });

  const intents = new PlayerIntents();
  // Settings (owner, 11/11/2026): saved in this browser; bindings apply the moment they change.
  const settings = new SettingsState(browserStorage());
  // Overlays that pause the fight (Settings, the main menu): the game ignores input while any is open.
  const pausedBy = new Set<string>();
  // The player's registered name (owner, 13/11/2026): their identity on screen; display only.
  let playerName = loadPlayerName();
  const blindVeil = new BlindVeil(document.body);
  const visionVeil = new VisionVeil(document.body);
  const aimHint = new AimHint(document.body);
  const fightIntro = new FightIntro(document.body);
  const announcer = new Announcer(
    () => settings.current.sfxVolume,
    () => sound.muted,
  );
  const desktop = new DesktopInput(intents, { bindings: () => settings.bindings, paused: () => pausedBy.size > 0 });
  attachKeyboard(window, desktop);
  attachMouse(container, desktop, intents);
  attachTouchControls(document.body, intents);

  const overlay = new DebugOverlay(debugPanel);
  const fps = new FpsMeter();
  const scenes = new SceneManager({ onError: (name, error) => console.error(`[scene:${name}]`, error) });

  // Default: the office arena (Phase 4). `?scene=training-yard` opens the movement/camera test yard;
  // `?scene=engine-check` opens the Phase 0/1 engine check. `?overview` shows a whole arena at once.
  // `?missingAssetTest` (engine check) requests a texture that does not exist, to prove it cannot crash the game.
  const sceneName = params.get('scene') ?? 'office';
  const optionalTextures = params.has('missingAssetTest') ? ['assets/does-not-exist.png'] : [];
  const scene: ArenaScene =
    sceneName === 'engine-check'
      ? new EngineCheckScene(app.stage, textures, viewport, optionalTextures)
      : new FightArenaScene(
          withStarts(
            sceneName === 'training-yard' ? TRAINING_YARD : OFFICE,
            params.get('playerAt'),
            params.get('dummyAt'),
          ),
          app.stage,
          intents,
          viewport,
          params.has('overview'),
          {
            ...castFromParams(params),
            difficulty: params.get('difficulty') ?? undefined,
            // A tournament match ends; `watch` is an AI battle the player watches (owner, 13/11/2026).
            match:
              params.get('mode') === 'tournament' && params.has('match')
                ? { spectate: params.has('watch') }
                : undefined,
          },
        );
  if (!(await scenes.switchTo(() => scene))) throw new Error(`${scene.name} scene failed to load`);
  // Fight arenas are drawn in the 2.5D view: keys and the joystick move along the screen (TD-045).
  if (scene instanceof FightArenaScene) intents.screenToWorld = (v) => screenDirToWorld(v.x, v.y);
  (scene instanceof FightArenaScene ? scene.floorLayer : scene.world)?.addChild(overlay.colliderLayer);

  if (params.has('debug')) overlay.setVisible(true);
  onDebugToggle(window, () => overlay.toggle());
  const combatText = new CombatText(document.body);
  const abilityHud = new AbilityHud(document.body, () => settings.bindings); // after the touch controls: it paints their ability buttons
  const clashHud = new ClashHud(document.body);
  const topHud = new TopHud(document.body);
  const showcase = new UltimateShowcase(document.body);
  const sound = new SoundBoard();
  sound.muted = params.has('mute');
  // Background ambience (owner, 12/11/2026: soundscapes, never music): each map its own;
  // `?ambience=<id>` previews any (e.g. the menu's `tunnel`), `?ambience=none` turns it off.
  const music = new AmbiencePlayer();
  music.setMuted(sound.muted);
  // Automated browsers (tests, CI: navigator.webdriver) skip the ambience unless asked for: headless
  // software audio rendering starves the page on small CI machines.
  const automated = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const arenaAmbience = scene instanceof FightArenaScene && !automated ? scene.arena.ambience : undefined;
  const ambienceId = params.get('ambience') ?? arenaAmbience;
  music.play(ambienceId ? (AMBIENCES[ambienceId] ?? null) : null);
  // Battle music (owner, 12/11/2026): the map's own track loops from FIGHT! for the whole fight.
  // `?music=<id>` picks any, `?music=none` turns it off; automated browsers skip it like the ambience.
  const musicId =
    params.get('music') ?? (scene instanceof FightArenaScene && !automated ? scene.arena.music : undefined);
  const musicDef = musicId ? BATTLE_MUSIC[musicId] : undefined;
  const battleMusic = musicDef ? new MusicLoop(new AudioClip(musicDef)) : null;
  battleMusic?.setMuted(sound.muted);
  const stinger = new AudioClip(FIGHT_STINGER);
  // Menu music (owner, 13/11/2026): on the title screen and every menu, looping; it gives way to
  // the battle music in a fight. Browsers only allow sound after the first tap or key.
  const menuMusic = new MusicLoop(new AudioClip(MENU_MUSIC));
  menuMusic.setMuted(sound.muted);
  const click = new AudioClip(UI_CLICK);
  const menusUp = (): boolean => ['menu', 'front', 'tournament'].some((k) => pausedBy.has(k));
  // Owner, 13/11/2026: the menu music runs through every menu, gives way to the battle music when
  // a fight starts, and comes back slowly once the battle is over.
  let battleOver = false;
  const updateMenuMusic = (): void => {
    if (automated && !params.has('music')) return;
    if (musicFor({ menusUp: menusUp(), fightStarted, battleOver }) === 'menu') {
      battleMusic?.stop(0.6);
      if (sound.context && sound.musicBus) menuMusic.start(sound.context, sound.musicBus, battleOver ? 5 : 1.5);
      debug.menuMusicPlaying = true;
    } else {
      menuMusic.stop(0.8);
      debug.menuMusicPlaying = false;
      startBattleMusic();
    }
  };
  let stingerPlayed = false;
  /** The fight has begun (FIGHT!, or straight away without an intro): start the music once audio is on. */
  let fightStarted = false;
  const startBattleMusic = (): void => {
    if (fightStarted && !battleOver && battleMusic && sound.context && sound.musicBus)
      battleMusic.start(sound.context, sound.musicBus);
  };
  // The game falls silent the moment its tab is hidden, and plays on when you come back (owner).
  pauseAudioWhenHidden(document, () => sound.context, window);
  // A page reached from the game itself (Play, a tournament step) tries to start its sound at once:
  // the browser allows it where the player has already interacted with the game; otherwise it
  // waits for the first tap or key as before.
  if (!automated && (params.has('play') || params.get('mode') === 'tournament')) {
    sound.unlock();
    if (sound.context && sound.musicBus) {
      music.attach(sound.context, sound.musicBus);
      void click.load(sound.context);
      void stinger.load(sound.context);
      if (menusUp()) updateMenuMusic();
    }
  }
  onFirstInput(window, () => {
    void sound.context?.resume();
    sound.unlock();
    if (sound.context && sound.musicBus) music.attach(sound.context, sound.musicBus);
    if (sound.context) void stinger.load(sound.context); // ready before READY
    if (sound.context) void click.load(sound.context);
    if (menusUp()) updateMenuMusic();
    else startBattleMusic();
  });
  onToggleMute(window, () => {
    sound.muted = !sound.muted;
    music.setMuted(sound.muted);
    battleMusic?.setMuted(sound.muted);
    menuMusic.setMuted(sound.muted);
  });
  const applyAudio = (): void => {
    music.setVolume(settings.current.musicVolume);
    battleMusic?.setVolume(settings.current.musicVolume);
    menuMusic.setVolume(settings.current.musicVolume);
    sound.setVolume(settings.current.sfxVolume);
    document.documentElement.style.setProperty('--touch-scale', String(settings.current.touchScale));
  };
  applyAudio();
  const controlsHint = (): string => {
    const b = settings.bindings;
    const k = codeLabel;
    return `move ${k(b.moveUp)}${k(b.moveLeft)}${k(b.moveDown)}${k(b.moveRight)} · sprint ${k(b.sprint)} · jump ${k(b.jump)} · ${k(b.attack)}: attack (hold: block) · ${k(b.dodge)}: dodge · ${k(b.ability1)}/${k(b.ability2)}/${k(b.ability3)} abilities · ${k(b.ultimate)} ultimate (aimed abilities: WASD moves the target, the same key again confirms, Esc cancels) · ${k(b.grab)} grab / throw · Esc settings`;
  };
  onToggleDummyAttacks(window, () => {
    if (!(scene instanceof FightArenaScene)) return;
    scene.dummyAttacks = !scene.dummyAttacks;
    status.textContent = `Stickman Arena · dummy attacks ${scene.dummyAttacks ? 'ON' : 'OFF'} · ${controlsHint()}`;
  });
  onDebugImpact(window, () => {
    if (overlay.enabled && scene instanceof FightArenaScene) scene.debugImpact();
  });

  const debug: EngineDebugInfo = {
    ready: false,
    scene: scenes.active?.name ?? null,
    physicsSteps: 0,
    framesRendered: 0,
    crate: null,
    player: null,
    camera: null,
    dummy: null,
    dummyAttacks: false,
    doors: [],
    props: { total: 0, broken: 0, awake: 0 },
    abilities: null,
    sfx: [],
    sounds: [],
    ambience: music.current,
    musicPlaying: false,
    uiClicks: 0,
    menuMusicPlaying: false,
    aimSpot: null,
    setDummyHp() {}, // replaced once the scene exists
    clash: null,
    startClash() {}, // replaced once the scene exists
    fillMeter() {}, // replaced once the scene exists
    damageWall() {}, // replaced once the scene exists
    assetFailures,
    debugOverlay: { enabled: false, segments: 0, fps: 0 },
    setTimeScale() {}, // replaced once the loop exists
    readPixel(xFrac, yFrac) {
      app.render();
      const gl = (app.renderer as WebGLRenderer).gl;
      const x = Math.floor(Math.min(1, Math.max(0, xFrac)) * (gl.drawingBufferWidth - 1));
      const y = Math.floor((1 - Math.min(1, Math.max(0, yFrac))) * (gl.drawingBufferHeight - 1));
      const out = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return [out[0] ?? 0, out[1] ?? 0, out[2] ?? 0, out[3] ?? 0];
    },
  };
  if (scene instanceof FightArenaScene) debug.screenOf = (x, y, z = 0) => scene.worldToScreen(x, y, z);
  // The live scene for tools: in development, or when a browser test asks for it (a flag in this
  // browser's storage that survives page changes). Nothing valuable is decided in the client, so
  // this gives no advantage that counts (security rules).
  if (import.meta.env.DEV || testHooksOn()) debug.sceneRef = scene;
  window.__stickmanDebug = debug;

  let physicsSteps = 0;
  let lastFrameMs: number | null = null;
  const loop = new GameLoop({
    update(stepS) {
      scenes.update(stepS);
      physicsSteps++;
    },
    render(alpha) {
      const now = performance.now();
      // Clamp so a long stall does not fling animations or the camera.
      const frameDtS = lastFrameMs === null ? 0 : Math.min(0.1, (now - lastFrameMs) / 1000) * loop.timeScale;
      if (lastFrameMs !== null) fps.addFrame((now - lastFrameMs) / 1000);
      lastFrameMs = now;

      scenes.render(alpha, frameDtS);
      if (overlay.enabled && scene.physics) {
        overlay.draw(scene.physics.debugLines(), {
          FPS: fps.fps.toFixed(0),
          ...scene.debugStats(),
          colliders: scene.physics.colliderCount,
          'asset failures': assetFailures.length,
        });
      }
      app.render();

      debug.framesRendered++;
      debug.physicsSteps = physicsSteps;
      if (scene instanceof EngineCheckScene) debug.crate = scene.state.crate;
      if (scene instanceof FightArenaScene) {
        debug.player = scene.player;
        showUtilityAction(document.body, debug.player.utility);
        showDodgeReady(document.body, debug.player.dodgeReady);
        showStickAiming(document.body, debug.player.beamAiming);
        blindVeil.update(debug.player.blindS);
        {
          // Lights out: the circle the player can still see, centred on their body, in screen pixels.
          const p = debug.player;
          const at = p.darkS > 0 ? scene.worldToScreen(p.x, p.y, 0.9) : null;
          const edge =
            at && Number.isFinite(p.sightM)
              ? scene.worldToScreen(p.x + p.sightM * Math.SQRT1_2, p.y - p.sightM * Math.SQRT1_2, 0.9)
              : null;
          const r = at && edge ? Math.hypot(edge.x - at.x, edge.y - at.y) : 0;
          visionVeil.update(p.darkS, at, r, p.nightVisionS);
        }
        aimHint.update(
          scene.targeting,
          document.body.classList.contains('touch-mode'),
          settings.bindings,
          scene.beaming,
        );
        // The intro's words, voice and impacts all start on the frame its phase begins.
        const began = fightIntro.update(scene.introState);
        // The recorded stinger (owner, 12/11/2026) carries READY's hit, the build and FIGHT's impact
        // and echo from this one start; until it has loaded the synthesised hits stand in.
        if (began === 'ready') {
          announcer.say('ready');
          if (!sound.playClip(stinger.ready, FIGHT_STINGER.level)) sound.play('intro-ready');
          stingerPlayed = stinger.ready !== null && !sound.muted;
        } else if (began === 'fight') {
          announcer.say('fight');
          if (!stingerPlayed) sound.play('intro-fight', 1.2);
          fightStarted = true;
          startBattleMusic();
        }
        if (!scene.introState && !fightStarted && !menu.isOpen) {
          fightStarted = true; // no intro (skipped): the music starts with the fight
          startBattleMusic();
        }
        debug.musicPlaying = battleMusic?.playing ?? false;
        {
          const spot = scene.ultAim?.to ?? scene.pointAimState?.to ?? null;
          debug.aimSpot = spot ? { x: spot.x, y: spot.y } : null;
        }
        debug.camera = scene.cameraState ? { ...scene.cameraState } : null;
        debug.dummy = scene.dummy;
        debug.dummyAttacks = scene.dummyAttacks;
        const events = scene.drainEvents();
        // The crowd answers the fight (Colosseum): a big blow draws an "ooh", a KO a roar.
        for (const e of events) {
          if (e.kind === 'ko') music.react('ko');
          else if (e.kind === 'hit' && e.amount >= HEAVY_HIT_FOR_CROWD) music.react('heavy-hit');
        }
        combatText.show(events, (x, y) => scene.worldToScreen(x, y));
        abilityHud.update(scene.abilityHud);
        tutorialFrame?.();
        const hud = scene.topHud;
        topHud.update(
          playerName && !scene.match?.spectate
            ? { ...hud, left: { ...hud.left, name: `${playerName} · ${hud.left.name}` } }
            : hud,
        );
        if (scene.matchResult && !battleOver) {
          // The battle is over: its music fades out and the menu music slowly returns.
          battleOver = true;
          battleMusic?.stop(2.5);
          updateMenuMusic();
        }
        if (scene.drainShowcases() > 0) showcase.play();
        clashHud.update(scene.clashHud);
        debug.clash = scene.clashHud.state;
        for (const { id, gain } of scene.drainSoundCues()) {
          sound.play(id, gain);
          debug.sounds.push(id);
          if (debug.sounds.length > 16) debug.sounds.shift();
        }
        debug.abilities = scene.abilityHud;
        debug.sfx = scene.abilities?.sfxLog.slice(-12) ?? [];
        debug.doors = scene.doorStates;
        const props = scene.propStates;
        debug.props = {
          total: props.length,
          broken: props.filter((p) => p.broken).length,
          awake: props.filter((p) => p.awake).length,
        };
      }
      debug.debugOverlay = { enabled: overlay.enabled, segments: overlay.drawnSegments, fps: fps.fps };
    },
  });
  if (scene instanceof FightArenaScene) {
    debug.startClash = () => scene.startClash();
    debug.fillMeter = () => scene.playerFighter.caster?.fillMeter();
    debug.damageWall = (index, damage, fire = false) => {
      const r = scene.arena.interiorWalls?.[index];
      if (r) scene.walls?.hitWhere((w) => w === r, { damage, direction: { x: 1, y: 0 }, fire });
    };
    debug.setDummyHp = (hp: number) => {
      scene.dummyFighter.combatant.hp = Math.max(1, Math.min(scene.dummyFighter.combatant.stats.maxHp, hp));
    };
  }
  // Slow motion for reviewing animations, e.g. ?slowmo=0.25 (debug; clamped so the game never stalls by URL).
  const slowmo = Number(params.get('slowmo'));
  if (slowmo > 0) loop.timeScale = Math.min(1, Math.max(0.05, slowmo));
  debug.setTimeScale = (scale: number) => {
    loop.timeScale = Math.min(1, Math.max(0, scale));
  };
  loop.start();

  // Combat controls only during a fight (owner, 13/11/2026): never on the menu, fighter pages,
  // the tournament draw or a watched battle, however the page is scrolled. The stylesheet hides
  // them unless the body has `fighting`.
  const showCombatControls = (): void => {
    const screenUp = ['menu', 'front', 'tournament'].some((k) => pausedBy.has(k));
    document.body.classList.toggle(
      'fighting',
      scene instanceof FightArenaScene && !screenUp && !document.body.classList.contains('spectating'),
    );
  };
  // The settings screen pauses the fight while open (the game ignores input, nothing moves).
  let timeScaleBeforeSettings = loop.timeScale;
  const setPaused = (reason: string, on: boolean): void => {
    const was = pausedBy.size > 0;
    if (on) pausedBy.add(reason);
    else pausedBy.delete(reason);
    const now = pausedBy.size > 0;
    showCombatControls();
    updateMenuMusic();
    if (was === now) return;
    desktop.releaseAll();
    intents.clear();
    if (now) {
      timeScaleBeforeSettings = loop.timeScale;
      loop.timeScale = 0;
    } else loop.timeScale = timeScaleBeforeSettings;
  };
  // The main menu (owner: Settings has a button to leave the game): fighter and arena, then Play.
  const cast = castFromParams(params);
  const currentChoice = {
    fighter: cast.player ?? DEFAULT_CAST.player,
    arena: sceneName,
    opponent: cast.opponent ?? DEFAULT_CAST.opponent,
    difficulty: difficultyFor(params.get('difficulty')).id,
    mode: (params.get('mode') === 'tournament' ? 'tournament' : 'practice') as 'practice' | 'tournament',
    size: tournamentInProgress()?.state.entrants.length ?? 8,
  };
  const menu = new MainMenu(
    document.body,
    menuFighters(),
    MENU_ARENAS,
    menuOpponents(),
    Object.values(DIFFICULTIES).map((d) => ({ id: d.id, name: d.label })),
    currentChoice,
    (choice) => {
      if (touchDevice) enterFullscreen();
      if (choice.mode === 'tournament') {
        const pool = menuFighters().map((f) => ({ fighter: f.id, name: f.name }));
        startTournament(choice, pool, params.has('mute'), playerName);
        return;
      }
      if (
        params.get('mode') !== 'tournament' &&
        choice.fighter === currentChoice.fighter &&
        choice.arena === currentChoice.arena &&
        choice.opponent === currentChoice.opponent &&
        choice.difficulty === currentChoice.difficulty
      ) {
        menu.setOpen(false);
        return;
      }
      const next = new URLSearchParams();
      next.set('character', choice.fighter);
      if (choice.arena !== 'office') next.set('scene', choice.arena);
      if (choice.opponent !== DEFAULT_CAST.opponent) next.set('opponent', choice.opponent);
      if (choice.difficulty !== DEFAULT_DIFFICULTY) next.set('difficulty', choice.difficulty);
      if (params.has('mute')) next.set('mute', '');
      next.set('play', '');
      window.location.search = next.toString();
    },
    (open) => setPaused('menu', open),
    (id) => {
      // The details screen: ratings and abilities for this device, with the player's own keys.
      const def = loadCharacter(id, tunedLibrary()).def;
      return fighterSheet(def, touchDevice ? 'touch' : 'desktop', settings.bindings);
    },
  );
  // Admin fighter settings on each fighter's page (owner, 13/11/2026): edits apply at once to the
  // menu and to the next fight on this device.
  menu.setConfigHost(
    fighterSettingsHost((id) => {
      tuned = null;
      const name = tunedLibrary().characters[id]?.displayName;
      if (name) menu.setFighterName(id, name);
      void drawPortraits();
    }),
  );
  // Settings → Leave: back to the menu, unless this page sets its own (a tournament fight is settled).
  let drawStances = async (): Promise<void> => {};
  let tutorialFrame: (() => void) | null = null;
  let leave = (): void => {
    menu.setOpen(false);
    // A practice fight (Open Zone or the tutorial) goes back to Practice, to try another fighter.
    front.setOpen(true, params.has('practice') ? 'practice' : 'title');
  };
  const settingsPanel = new SettingsPanel(
    document.body,
    settings,
    (open) => setPaused('settings', open),
    {
      leave: () => leave(),
      fullscreen: () => toggleFullscreen(),
    },
    () => {
      // Escape while aiming cancels the aim (owner, 12/11/2026) rather than opening the settings.
      if (!(scene instanceof FightArenaScene) || !scene.targeting) return false;
      intents.pressAimCancel();
      return true;
    },
  );
  // The front end (owner, 13/11/2026): title screen, name, Game Modes, fighter select. The old
  // set-up screen (practice opponent, both modes, fighter settings and Move Config) is now the
  // Admin Panel, shown only to the admin name (TD-065: a screen choice, not security).
  const front = new FrontEnd(document.body, {
    fighters: menuFighters(),
    arenas: MENU_ARENAS,
    difficulties: Object.values(DIFFICULTIES).map((d) => ({ id: d.id, name: d.label })),
    initial: {
      fighter: currentChoice.fighter,
      arena: currentChoice.arena,
      difficulty: currentChoice.difficulty,
      size: currentChoice.size,
    },
    presentation: (id) => SELECT_STANCES[id],
    sheetFor: (id) => {
      const def = loadCharacter(id, tunedLibrary()).def;
      return fighterSheet(def, touchDevice ? 'touch' : 'desktop', settings.bindings);
    },
    playerName: () => playerName,
    saveName: (raw) => {
      const r = savePlayerName(raw);
      if (r.ok) playerName = r.name;
      return r;
    },
    isAdmin: () => isAdminName(playerName),
    onScreen: (screen) => {
      menuMusic.setDuck(screen === 'select' ? 0.4 : 1);
      // The stances are only on fighter select: drawn the first time it opens.
      if (screen === 'select') void drawStances();
    },
    onOpenChange: (open) => setPaused('front', open),
    openSettings: () => settingsPanel.setOpen(true),
    openAdmin: () => {
      if (!isAdminName(playerName)) return;
      front.setOpen(false);
      menu.setOpen(true);
    },
    opponents: menuOpponents(),
    startPractice: (setup) => {
      if (touchDevice) enterFullscreen();
      const next = new URLSearchParams();
      next.set('character', setup.fighter);
      if (setup.arena !== 'office') next.set('scene', setup.arena);
      next.set('opponent', setup.opponent);
      next.set('difficulty', setup.difficulty);
      next.set('practice', '');
      if (params.has('mute')) next.set('mute', '');
      next.set('play', '');
      window.location.search = next.toString();
    },
    startTutorial: (fighter) => {
      if (touchDevice) enterFullscreen();
      const next = new URLSearchParams();
      next.set('character', fighter);
      next.set('scene', 'training-yard');
      next.set('tutorial', '');
      next.set('practice', '');
      if (params.has('mute')) next.set('mute', '');
      next.set('play', '');
      window.location.search = next.toString();
    },
    startTournament: (setup) => {
      if (touchDevice) enterFullscreen();
      const pool = menuFighters().map((f) => ({ fighter: f.id, name: f.name }));
      startTournament(setup, pool, params.has('mute'), playerName);
    },
  });
  menu.setBack(() => {
    menu.setOpen(false);
    front.setOpen(true, 'title');
  });
  settingsPanel.setProfile({
    name: () => playerName,
    save: (raw) => {
      const r = savePlayerName(raw);
      if (r.ok) {
        playerName = r.name;
        // A name that is no longer the admin's closes the Admin Panel at once.
        if (!isAdminName(playerName) && menu.isOpen) {
          menu.setOpen(false);
          front.setOpen(true, 'title');
        }
        front.refresh();
      }
      return r;
    },
  });
  // Every interface button clicks (owner, 13/11/2026), once per press; never the combat buttons.
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target instanceof Element ? e.target.closest('button, [role="button"]') : null;
      if (!t || t.closest('.touch-controls, .ability-bar')) return;
      debug.uiClicks++;
      sound.playClip(click.ready, UI_CLICK.level);
    },
    true,
  );
  // The tutorial (owner, 13/11/2026): guided steps in the training yard (src/tutorial).
  if (params.has('tutorial') && scene instanceof FightArenaScene) {
    const run = new TutorialRun();
    const f = scene.playerFighter;
    const keys = (): Record<string, string> => {
      if (touchDevice)
        return {
          move: 'the joystick (left thumb)',
          attack: 'MELEE',
          heavy: 'HEAVY',
          dodge: 'DODGE',
          abilities: 'the four ability buttons',
          ultimate: 'ULT',
        };
      const b = settings.bindings;
      const k = (c: string) => codeLabel(c);
      return {
        move: `${k(b.moveUp)}${k(b.moveLeft)}${k(b.moveDown)}${k(b.moveRight)}`,
        attack: k(b.attack),
        heavy: k(b.heavyAttack),
        dodge: k(b.dodge),
        abilities: `${k(b.ability1)}, ${k(b.ability2)}, ${k(b.ability3)} or ${k(b.ability4)}`,
        ultimate: k(b.ultimate),
      };
    };
    const overlay = new TutorialOverlay(document.body, keys, {
      skip: () => run.skip(),
      openZone: () => {
        front.setOpen(true);
        front.openSelect('practice');
      },
      menu: () => front.setOpen(true, 'title'),
    });
    let last = { x: f.x, y: f.y, hits: f.hits };
    let ultReady = false;
    let lastMs = performance.now();
    tutorialFrame = () => {
      // Real time since the last frame (frames come at the display's rate, not the simulation's).
      const now = performance.now();
      const dtS = Math.min(0.5, (now - lastMs) / 1000);
      lastMs = now;
      const ultId = f.caster?.def('ult').id;
      const cast = f.caster?.cast?.def.id ?? null;
      run.update(
        {
          movedM: Math.hypot(f.x - last.x, f.y - last.y),
          hits: Math.max(0, f.hits - last.hits),
          heavy: f.combo.attack?.id !== undefined && f.combo.attack.id === f.def.starters.heavy,
          guarding: f.combatant.state === 'guarding',
          dodging: f.combatant.state === 'dodging',
          ability: cast ? (cast === ultId ? 'ultimate' : 'basic') : null,
        },
        dtS,
      );
      last = { x: f.x, y: f.y, hits: f.hits };
      // The dummy only fights back while blocking is taught; the ultimate comes charged.
      scene.dummyAttacks = run.step?.id === 'block';
      if (run.step?.id === 'ultimate' && !ultReady) {
        ultReady = true;
        f.caster?.fillMeter();
      }
      overlay.update(run);
      debug.tutorial = run.finished ? 'done' : (run.step?.id ?? 'done');
    };
  }
  const menuFirst = scene instanceof FightArenaScene && !automated && !params.has('play');
  if (menuFirst) front.setOpen(true, 'title');
  // Tournament mode (owner, 13/11/2026): a saved tournament can be resumed from the menu; its
  // bracket and match pages are set up here.
  const resumable = tournamentInProgress();
  if (resumable) {
    menu.setResume('Resume tournament', () => goToBracket(resumable.arena, params.has('mute')));
    front.setResume(() => goToBracket(resumable.arena, params.has('mute')));
  }
  const bracketPage = params.get('mode') === 'tournament' && !params.has('match');
  const tournamentScreen = setupTournamentPage({
    params,
    scene: scene instanceof FightArenaScene ? scene : null,
    muted: params.has('mute'),
    setPaused,
    openMenu: () => front.setOpen(true, 'modes'),
    setLeave: (fn) => {
      leave = fn;
    },
  });
  showCombatControls();
  // READY... FIGHT! before every fight (owner, 12/11/2026). The menu's Play starts a new fight page,
  // which gets its own intro; automated browsers skip it unless asked (`?intro`).
  if (
    scene instanceof FightArenaScene &&
    !menuFirst &&
    !bracketPage &&
    (!automated || params.has('intro')) &&
    !params.has('nointro')
  )
    scene.startIntro();
  // Portraits are the fighters themselves, drawn by the game's own renderer (owner, 12/11/2026).
  // All in one GPU read-back, once the page is idle, so the first moments of a fight never stall.
  const drawPortraits = async (): Promise<void> => {
    try {
      const fighters = menuFighters();
      const defs = fighters.map((f) => resolveCharacter(f.id, tunedLibrary()));
      if (scene instanceof FightArenaScene) defs.push(scene.playerFighter.def, scene.dummyFighter.def);
      const urls = await renderPortraits(app, defs);
      fighters.forEach((f, i) => {
        menu.setPortrait(f.id, urls[i]!);
        front.setPortrait(f.id, urls[i]!);
      });
      tournamentScreen?.setPortraits(new Map(fighters.map((f, i) => [f.id, urls[i]!])));
      if (scene instanceof FightArenaScene) topHud.setPortraits(urls[fighters.length]!, urls[fighters.length + 1]!);
      if (front.isOpen && front.current === 'select') await drawStances();
    } catch (error) {
      console.warn('[portraits] could not render fighter portraits', error);
    }
  };
  // The fighters in their select stances (owner, 13/11/2026) for fighter select: drawn the first
  // time it opens, never during a fight or on the title screen.
  let stancesDrawn = false;
  drawStances = async (): Promise<void> => {
    if (stancesDrawn) return;
    stancesDrawn = true;
    try {
      const fighters = menuFighters();
      const strips = await renderIdleStrips(
        app,
        fighters.map((f) => resolveCharacter(f.id, tunedLibrary())),
        (d) => SELECT_STANCES[d.id],
      );
      fighters.forEach((f, i) => {
        front.setStrip(f.id, strips[i]!);
      });
    } catch (error) {
      console.warn('[select stances] could not draw the fighters', error);
    }
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => void drawPortraits(), { timeout: 1500 });
  else setTimeout(() => void drawPortraits(), 300);
  if (touchDevice) {
    // Each page change leaves fullscreen (every fight is its own page): every tap asks for it again
    // until it is back, and locks landscape where the browser allows (owner, 13/11/2026).
    keepFullscreen();
    showHomeScreenHint();
  }
  settings.onChange(() => {
    applyAudio();
    status.textContent = readyStatus();
  });

  debug.ready = true;
  status.dataset.state = 'ready';
  status.textContent = readyStatus();
  function readyStatus(): string {
    return assetFailures.length > 0
      ? `Stickman Arena · ${scene.name} · ${assetFailures.length} asset(s) failed to load (greybox shown)`
      : scene instanceof FightArenaScene
        ? scene.characters.player.fellBack
          ? `Stickman Arena · character "${scene.characters.player.report.id}" is invalid (using the Base Stickman): ${scene.characters.player.report.errors[0] ?? ''}`
          : `Stickman Arena · ${scene.arena.name}${scene.arena.greybox ? ' (greybox)' : ''} · ${scene.playerFighter.def.displayName} · ${controlsHint()}`
        : 'Stickman Arena · 2D engine check · renderer ✓ physics ✓';
  }
}

/** Local storage, or null where the browser refuses it (settings then last for this session only). */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
