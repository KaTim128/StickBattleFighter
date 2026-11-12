import type { WebGLRenderer } from 'pixi.js';
import type { AbilityHudState } from '../abilities/ability-caster';
import { AmbiencePlayer } from '../audio/ambience';
import { Announcer } from '../audio/announcer';
import { AudioClip, MusicLoop } from '../audio/music';
import { pauseAudioWhenHidden } from '../audio/pause-when-hidden';
import { SoundBoard } from '../audio/sound-board';
import { readDraft } from '../characters/draft';
import { BUILT_IN_LIBRARY, DEFAULT_CAST, withEntries } from '../characters/library';
import { loadCharacter } from '../characters/load';
import { resolveCharacter } from '../characters/resolve';
import type { CharacterLibrary } from '../characters/schema';
import { FpsMeter } from '../core/fps-meter';
import { GameLoop } from '../core/game-loop';
import { SceneManager } from '../core/scene';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { GREYBOX_COLOURS } from '../data/arenas/greybox-arena';
import { OFFICE } from '../data/arenas/office';
import { TRAINING_YARD } from '../data/arenas/training-yard';
import { AMBIENCES } from '../data/audio/ambiences';
import { BATTLE_MUSIC, FIGHT_STINGER } from '../data/audio/music';
import { codeLabel } from '../input/bindings';
import { onDebugImpact, onDebugToggle, onFirstInput, onToggleDummyAttacks, onToggleMute } from '../input/debug-keys';
import { PlayerIntents } from '../input/intents';
import { attachKeyboard, attachMouse, DesktopInput } from '../input/keyboard';
import { SettingsState } from '../input/settings-store';
import { attachTouchControls, showDodgeReady, showStickAiming, showUtilityAction } from '../input/touch-controls';
import { AbilityHud } from '../interface/ability-hud';
import { AimHint } from '../interface/aim-hint';
import { BlindVeil } from '../interface/blind-veil';
import { ClashHud } from '../interface/clash-hud';
import { CombatText } from '../interface/combat-text';
import { FightIntro } from '../interface/fight-intro';
import { fighterSheet } from '../interface/fighter-sheet';
import { enterFullscreen, exitFullscreen, MainMenu, type MenuFighter } from '../interface/main-menu';
import { SettingsPanel } from '../interface/settings-panel';
import { TopHud, UltimateShowcase } from '../interface/top-hud';
import { VisionVeil } from '../interface/vision-veil';
import { initPhysics } from '../physics/physics-world';
import { DebugOverlay } from '../rendering/debug-overlay';
import { createTextureLoader } from '../rendering/pixi-assets';
import { renderPortraits } from '../rendering/portraits';
import { screenDirToWorld } from '../rendering/projection';
import { createRenderSurface } from '../rendering/renderer';
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
 * `?character=<id>` picks the player's fighter (TD-039); `?opponent=<id>` the
 * opponent. `?character=draft` plays the admin editor's unsaved draft from this
 * browser's local storage (local testing only: nothing is published).
 */
function castFromParams(params: URLSearchParams): { player?: string; opponent?: string; library?: CharacterLibrary } {
  const player = params.get('character') ?? undefined;
  const opponent = params.get('opponent') ?? undefined;
  if (player !== 'draft') return { player, opponent };
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
  return Object.values(BUILT_IN_LIBRARY.characters)
    .filter((c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter')
    .map((c) => {
      const head = BUILT_IN_LIBRARY.effects[c.profiles.effects]?.head;
      return {
        id: c.id,
        name: c.displayName,
        blurb: c.description,
        portrait: head === 'flame' || head === 'brute' ? head : 'round',
        colour: c.rig.colour,
      };
    });
}

export async function bootstrap({ container, status, debugPanel }: BootstrapElements): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  status.textContent = 'Loading…';

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
          castFromParams(params),
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
  let stingerPlayed = false;
  /** The fight has begun (FIGHT!, or straight away without an intro): start the music once audio is on. */
  let fightStarted = false;
  const startBattleMusic = (): void => {
    if (fightStarted && battleMusic && sound.context && sound.musicBus)
      battleMusic.start(sound.context, sound.musicBus);
  };
  // The game falls silent the moment its tab is hidden, and plays on when you come back (owner).
  pauseAudioWhenHidden(document, () => sound.context, window);
  onFirstInput(window, () => {
    sound.unlock();
    if (sound.context && sound.musicBus) music.attach(sound.context, sound.musicBus);
    if (sound.context) void stinger.load(sound.context); // ready before READY
    startBattleMusic();
  });
  onToggleMute(window, () => {
    sound.muted = !sound.muted;
    music.setMuted(sound.muted);
    battleMusic?.setMuted(sound.muted);
  });
  const applyAudio = (): void => {
    music.setVolume(settings.current.musicVolume);
    battleMusic?.setVolume(settings.current.musicVolume);
    sound.setVolume(settings.current.sfxVolume);
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
  if (import.meta.env.DEV) debug.sceneRef = scene;
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
        topHud.update(scene.topHud);
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

  // The settings screen pauses the fight while open (the game ignores input, nothing moves).
  let timeScaleBeforeSettings = loop.timeScale;
  const setPaused = (reason: string, on: boolean): void => {
    const was = pausedBy.size > 0;
    if (on) pausedBy.add(reason);
    else pausedBy.delete(reason);
    const now = pausedBy.size > 0;
    if (was === now) return;
    desktop.releaseAll();
    intents.clear();
    if (now) {
      timeScaleBeforeSettings = loop.timeScale;
      loop.timeScale = 0;
    } else loop.timeScale = timeScaleBeforeSettings;
  };
  // Phones and tablets fill the whole screen (owner, 12/11/2026): fullscreen on the first tap.
  const touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  // The main menu (owner: Settings has a button to leave the game): fighter and arena, then Play.
  const currentChoice = { fighter: castFromParams(params).player ?? DEFAULT_CAST.player, arena: sceneName };
  const menu = new MainMenu(
    document.body,
    menuFighters(),
    MENU_ARENAS,
    currentChoice,
    (choice) => {
      if (touchDevice) enterFullscreen();
      if (choice.fighter === currentChoice.fighter && choice.arena === currentChoice.arena) {
        menu.setOpen(false);
        return;
      }
      const next = new URLSearchParams();
      next.set('character', choice.fighter);
      if (choice.arena !== 'office') next.set('scene', choice.arena);
      if (params.has('mute')) next.set('mute', '');
      next.set('play', '');
      window.location.search = next.toString();
    },
    (open) => setPaused('menu', open),
    (id) => {
      // The details screen: ratings and abilities for this device, with the player's own keys.
      const def = loadCharacter(id).def;
      return fighterSheet(def, touchDevice ? 'touch' : 'desktop', settings.bindings);
    },
  );
  new SettingsPanel(
    document.body,
    settings,
    (open) => setPaused('settings', open),
    {
      leave: () => menu.setOpen(true),
      fullscreen: () => (document.fullscreenElement ? exitFullscreen() : enterFullscreen()),
    },
    () => {
      // Escape while aiming cancels the aim (owner, 12/11/2026) rather than opening the settings.
      if (!(scene instanceof FightArenaScene) || !scene.targeting) return false;
      intents.pressAimCancel();
      return true;
    },
  );
  const menuFirst = scene instanceof FightArenaScene && !automated && !params.has('play');
  if (menuFirst) menu.setOpen(true);
  // READY... FIGHT! before every fight (owner, 12/11/2026). The menu's Play starts a new fight page,
  // which gets its own intro; automated browsers skip it unless asked (`?intro`).
  if (scene instanceof FightArenaScene && !menuFirst && (!automated || params.has('intro')) && !params.has('nointro'))
    scene.startIntro();
  // Portraits are the fighters themselves, drawn by the game's own renderer (owner, 12/11/2026).
  // All in one GPU read-back, once the page is idle, so the first moments of a fight never stall.
  const drawPortraits = async (): Promise<void> => {
    try {
      const fighters = menuFighters();
      const defs = fighters.map((f) => resolveCharacter(f.id, BUILT_IN_LIBRARY));
      if (scene instanceof FightArenaScene) defs.push(scene.playerFighter.def, scene.dummyFighter.def);
      const urls = await renderPortraits(app, defs);
      fighters.forEach((f, i) => {
        menu.setPortrait(f.id, urls[i]!);
      });
      if (scene instanceof FightArenaScene) topHud.setPortraits(urls[fighters.length]!, urls[fighters.length + 1]!);
    } catch (error) {
      console.warn('[portraits] could not render fighter portraits', error);
    }
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => void drawPortraits(), { timeout: 1500 });
  else setTimeout(() => void drawPortraits(), 300);
  if (touchDevice) {
    // After choosing on the menu the page reloads, which leaves fullscreen: the first tap restores it.
    const once = (): void => {
      window.removeEventListener('pointerdown', once);
      if (!menu.isOpen) enterFullscreen();
    };
    window.addEventListener('pointerdown', once);
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
