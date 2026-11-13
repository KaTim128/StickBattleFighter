import { actionsFor, type BindAction, type Bindings, DEFAULT_BINDINGS, mouseCode } from './bindings';
import type { PlayerIntents, Vec2 } from './intents';

/** Screen direction of each movement action (+y is down the screen). */
const MOVE_DIRS: Partial<Record<BindAction, Vec2>> = {
  moveUp: { x: 0, y: -1 },
  moveDown: { x: 0, y: 1 },
  moveLeft: { x: -1, y: 0 },
  moveRight: { x: 1, y: 0 },
};

/** Movement vector from the held movement actions (opposite directions cancel; length ≤ 1). */
export function moveFromActions(held: Iterable<BindAction>): Vec2 {
  let x = 0;
  let y = 0;
  for (const a of new Set(held)) {
    const dir = MOVE_DIRS[a];
    if (dir) {
      x += dir.x;
      y += dir.y;
    }
  }
  x = Math.sign(x);
  y = Math.sign(y);
  const len = Math.hypot(x, y);
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

export interface DesktopInputOptions {
  /** The live bindings (read on every event, so a rebind applies at once). */
  bindings?: () => Bindings;
  /** While true (e.g. the settings screen is open) the game ignores desktop input. */
  paused?: () => boolean;
}

/**
 * Turns bound key and mouse codes into player intents (REQ-CTL-15). Keyboard and mouse share it,
 * so any action can sit on either device. Each code is held at most once.
 */
export class DesktopInput {
  private readonly heldCodes = new Set<string>();

  constructor(
    private readonly intents: PlayerIntents,
    private readonly options: DesktopInputOptions = {},
  ) {}

  private get bindings(): Bindings {
    return this.options.bindings?.() ?? DEFAULT_BINDINGS;
  }

  /** Is this code bound to anything (so the browser's default should be suppressed)? */
  isBound(code: string): boolean {
    return actionsFor(this.bindings, code).length > 0;
  }

  down(code: string): void {
    if (this.options.paused?.()) return;
    if (this.heldCodes.has(code)) return; // key repeat
    this.heldCodes.add(code);
    const i = this.intents;
    for (const action of actionsFor(this.bindings, code)) {
      switch (action) {
        case 'jump':
          i.pressJump();
          break;
        case 'attack':
          i.meleePress();
          break;
        case 'dodge':
          i.pressDodge();
          break;
        case 'grab':
          i.interactPress();
          break;
        case 'tag':
          i.pressTag();
          break;
        case 'ability1':
          i.pressAbility('a1');
          break;
        case 'ability2':
          i.pressAbility('a2');
          break;
        case 'ability3':
          i.pressAbility('a3');
          break;
        case 'ability4':
          i.pressAbility('a4');
          break;
        case 'ultimate':
          i.pressAbility('ult');
          break;
        case 'heavyAttack':
          i.pressHeavy();
          break;
        case 'beamLeft':
          i.beamTurnLeft = true;
          break;
        case 'beamRight':
          i.beamTurnRight = true;
          break;
        default:
          break;
      }
    }
    this.sync();
  }

  up(code: string): void {
    if (!this.heldCodes.delete(code)) return;
    for (const action of actionsFor(this.bindings, code)) {
      if (action === 'attack') this.intents.meleeRelease();
      if (action === 'beamLeft') this.intents.beamTurnLeft = false;
      if (action === 'beamRight') this.intents.beamTurnRight = false;
      if (action === 'grab') this.intents.interactRelease();
    }
    this.sync();
  }

  /** Let go of everything (window lost focus, settings opened, bindings changed). */
  releaseAll(): void {
    for (const code of [...this.heldCodes]) this.up(code);
    this.heldCodes.clear();
    this.sync();
  }

  private sync(): void {
    const held: BindAction[] = [];
    for (const code of this.heldCodes) held.push(...actionsFor(this.bindings, code));
    this.intents.setMoveFromScreen('keyboard', moveFromActions(held));
    this.intents.sprint = held.includes('sprint');
  }
}

/** Keys whose browser default (scrolling, find-as-you-type) must not fire while playing. */
const SCROLL_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

/** Wire the keyboard to the desktop input. Returns a function that removes the listeners. */
export function attachKeyboard(target: Window, input: DesktopInput): () => void {
  const down = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return; // the settings screen took it (e.g. while rebinding)
    if (input.isBound(e.code) || SCROLL_KEYS.has(e.code)) e.preventDefault();
    input.down(e.code);
  };
  const up = (e: KeyboardEvent): void => input.up(e.code);
  // Releasing keys while the window is unfocused must not leave the fighter running.
  const blur = (): void => input.releaseAll();
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}

/**
 * Mouse buttons over the game area (default: left = tap attack and ultimate launch, right = dodge)
 * and the cursor position (aiming the leaping ultimate). The browser's context menu is disabled
 * over the game area so right click can dodge (owner, 11/11/2026). Touch is handled by the touch
 * controls.
 */
export function attachMouse(target: HTMLElement, input: DesktopInput, intents: PlayerIntents): () => void {
  const local = (e: PointerEvent | MouseEvent): Vec2 => {
    const r = target.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return;
    intents.setPointer(local(e));
    const code = mouseCode(e.button);
    if (input.isBound(code)) e.preventDefault(); // no middle-click autoscroll or text selection
    input.down(code);
  };
  const up = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') input.up(mouseCode(e.button));
  };
  const move = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') intents.setPointer(local(e));
  };
  const leave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') intents.setPointer(null);
  };
  const noMenu = (e: Event): void => e.preventDefault();
  // Chorded presses (a second button while one is held) arrive as pointermove with `buttons`
  // changed and no pointerdown, so mouse buttons are also read from mousedown/mouseup.
  const mouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) {
      const code = mouseCode(e.button);
      if (input.isBound(code)) e.preventDefault();
      input.down(code);
    }
  };
  const mouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) input.up(mouseCode(e.button));
  };
  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerleave', leave);
  target.addEventListener('mousedown', mouseDown);
  target.addEventListener('contextmenu', noMenu);
  window.addEventListener('pointerup', up);
  window.addEventListener('mouseup', mouseUp);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerleave', leave);
    target.removeEventListener('mousedown', mouseDown);
    target.removeEventListener('contextmenu', noMenu);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('mouseup', mouseUp);
  };
}
