import type { PlayerIntents, Vec2 } from './intents';

/** Stick deflection from a finger offset (px): dead zone in the middle, length ≤ 1 at the rim. */
export function joystickVector(dx: number, dy: number, radiusPx: number, deadZone = 0.15): Vec2 {
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radiusPx <= 0) return { x: 0, y: 0 };
  const raw = Math.min(1, dist / radiusPx);
  if (raw <= deadZone) return { x: 0, y: 0 };
  const scaled = (raw - deadZone) / (1 - deadZone); // smooth ramp after the dead zone
  return { x: (dx / dist) * scaled, y: (dy / dist) * scaled };
}

const RADIUS_PX = 56;

/**
 * A swipe on the empty part of the screen (owner, 12/11/2026: steer the Fire Beam by swiping).
 * Reports the way the finger is moving: the anchor trails at most `trailPx` behind the finger,
 * so turning the swipe turns the direction at once. Nothing until it has moved `deadPx`.
 */
export class SwipeTracker {
  private anchor: Vec2 | null = null;
  private moved = false;

  constructor(
    private readonly deadPx = 12,
    private readonly trailPx = 40,
  ) {}

  start(x: number, y: number): void {
    this.anchor = { x, y };
    this.moved = false;
  }

  /** The finger is here now: the swipe direction (screen, unit length), or null if not swiping yet. */
  move(x: number, y: number): Vec2 | null {
    const a = this.anchor;
    if (!a) return null;
    const dx = x - a.x;
    const dy = y - a.y;
    const d = Math.hypot(dx, dy);
    if (!this.moved && d < this.deadPx) return null;
    this.moved = true;
    if (d < 1e-6) return null;
    if (d > this.trailPx) {
      a.x = x - (dx / d) * this.trailPx;
      a.y = y - (dy / d) * this.trailPx;
    }
    return { x: dx / d, y: dy / d };
  }

  end(): void {
    this.anchor = null;
  }
}

/**
 * Flick detection for dodge (REQ-CTL-12): the stick goes from near-centre to
 * near-full deflection within a short window. Ordinary steering ramps up more
 * slowly and never triggers it.
 */
export class FlickDetector {
  private lowAtMs: number | null = null;
  private fired = false;

  constructor(
    private readonly windowMs = 120,
    private readonly low = 0.3,
    private readonly high = 0.9,
  ) {}

  /** Feed the stick magnitude (0..1) with a timestamp; returns true once per flick. */
  sample(magnitude: number, nowMs: number): boolean {
    if (magnitude < this.low) {
      this.lowAtMs = nowMs;
      this.fired = false;
      return false;
    }
    if (!this.fired && magnitude >= this.high && this.lowAtMs !== null && nowMs - this.lowAtMs <= this.windowMs) {
      this.fired = true;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lowAtMs = null;
    this.fired = false;
  }
}

/**
 * Mobile and tablet controls (CONTROL_SCHEME §3): a floating joystick in the
 * left 40% of the screen and the contextual utility button (jump for now).
 * Hidden until the first touch, so desktop never shows them (REQ-CTL-2).
 * Five combat buttons (REQ-CTL-1, INV-9): MELEE plus A1, A2, A3 and ULT in an arc; JUMP sits apart.
 */
/** Dragging this far from where the ULT press started aims at the maximum range. */
const ULT_DRAG_FULL_PX = 120;
/** Smaller drags are ignored (a plain tap aims at the soft-locked target). */
const ULT_DRAG_DEADZONE_PX = 10;

export function attachTouchControls(root: HTMLElement, intents: PlayerIntents): () => void {
  const layer = document.createElement('div');
  layer.className = 'touch-controls';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="joystick" hidden><div class="joystick-knob"></div></div>
    <button class="util-button" type="button" aria-label="Jump">JUMP</button>
    <button class="dodge-button" type="button" aria-label="Dodge">DODGE</button>
    <button class="melee-button" type="button" aria-label="Melee">MELEE</button>
    <button class="ability-button" data-slot="a1" type="button" aria-label="Ability 1">A1</button>
    <button class="ability-button" data-slot="a2" type="button" aria-label="Ability 2">A2</button>
    <button class="ability-button" data-slot="a3" type="button" aria-label="Ability 3">A3</button>
    <button class="ability-button ult" data-slot="ult" type="button" aria-label="Ultimate">ULT</button>`;
  root.appendChild(layer);
  const stick = layer.querySelector<HTMLElement>('.joystick')!;
  const knob = layer.querySelector<HTMLElement>('.joystick-knob')!;
  const util = layer.querySelector<HTMLButtonElement>('.util-button')!;
  const dodge = layer.querySelector<HTMLButtonElement>('.dodge-button')!;
  const melee = layer.querySelector<HTMLButtonElement>('.melee-button')!;
  const abilityButtons = [...layer.querySelectorAll<HTMLButtonElement>('.ability-button')];

  let stickPointer: number | null = null;
  const flick = new FlickDetector();
  let origin = { x: 0, y: 0 };

  const showForTouch = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    layer.hidden = false;
    document.body.classList.add('touch-mode'); // the HUD shows cooldowns on the buttons instead of the desktop bar
  };
  // A finger on the empty right part of the screen swipes (steers a beam).
  let swipePointer: number | null = null;
  const swipe = new SwipeTracker();
  const onDown = (e: PointerEvent): void => {
    showForTouch(e);
    if (e.pointerType !== 'touch' || e.target instanceof HTMLButtonElement) return;
    if (e.clientX > window.innerWidth * 0.4) {
      if (swipePointer === null && !(e.target as Element | null)?.closest?.('.settings-panel, .main-menu')) {
        swipePointer = e.pointerId;
        swipe.start(e.clientX, e.clientY);
      }
      return;
    }
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    origin = { x: e.clientX, y: e.clientY };
    stick.style.left = `${origin.x}px`;
    stick.style.top = `${origin.y}px`;
    stick.hidden = false;
    knob.style.transform = 'translate(-50%, -50%)';
    flick.reset();
    flick.sample(0, e.timeStamp);
  };
  const onMove = (e: PointerEvent): void => {
    if (e.pointerId === swipePointer) {
      const v = swipe.move(e.clientX, e.clientY);
      if (v) intents.setSwipeFromScreen(v);
      return;
    }
    if (e.pointerId !== stickPointer) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const v = joystickVector(dx, dy, RADIUS_PX);
    const k = Math.min(1, Math.hypot(dx, dy) / RADIUS_PX) / (Math.hypot(dx, dy) || 1);
    knob.style.transform = `translate(calc(-50% + ${dx * k * RADIUS_PX}px), calc(-50% + ${dy * k * RADIUS_PX}px))`;
    intents.setMoveFromScreen('touch', v);
    if (flick.sample(Math.hypot(v.x, v.y), e.timeStamp)) intents.pressDodge();
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId === swipePointer) {
      swipePointer = null;
      swipe.end();
      intents.setSwipeFromScreen(null);
      return;
    }
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    stick.hidden = true;
    intents.setMove('touch', { x: 0, y: 0 });
  };
  // The contextual utility button: jump, or pick up / throw when there is something to grab or carry.
  const onUtil = (e: PointerEvent): void => {
    e.preventDefault();
    intents.interactPress(true);
  };
  const onUtilUp = (): void => intents.interactRelease();
  // Dodge: always a back-step away from where the fighter faces (owner, 12/11/2026).
  const onDodge = (e: PointerEvent): void => {
    e.preventDefault();
    intents.pressDodge();
  };
  const onMelee = (e: PointerEvent): void => {
    e.preventDefault();
    intents.meleePress(); // tap = attack, hold = block
  };
  const onMeleeUp = (): void => intents.meleeRelease();
  const onAbility = (e: PointerEvent): void => {
    e.preventDefault();
    const slot = (e.currentTarget as HTMLElement).dataset.slot;
    if (slot === 'a1' || slot === 'a2' || slot === 'a3') intents.pressAbility(slot);
  };
  for (const b of abilityButtons) b.addEventListener('pointerdown', onAbility);

  // ULT: press to start aiming, drag to place the landing spot, release to jump (owner, 11/11/2026).
  const ult = layer.querySelector<HTMLButtonElement>('.ability-button.ult')!;
  let ultPointer: number | null = null;
  let ultOrigin = { x: 0, y: 0 };
  const onUltDown = (e: PointerEvent): void => {
    e.preventDefault();
    ultPointer = e.pointerId;
    ultOrigin = { x: e.clientX, y: e.clientY };
    intents.setUltDrag(null);
    intents.pressAbility('ult'); // start aiming
  };
  const onUltMove = (e: PointerEvent): void => {
    if (e.pointerId !== ultPointer) return;
    const dx = e.clientX - ultOrigin.x;
    const dy = e.clientY - ultOrigin.y;
    if (Math.hypot(dx, dy) < ULT_DRAG_DEADZONE_PX) return;
    intents.setUltDragFromScreen({ x: dx / ULT_DRAG_FULL_PX, y: dy / ULT_DRAG_FULL_PX });
  };
  const onUltUp = (e: PointerEvent): void => {
    if (e.pointerId !== ultPointer) return;
    ultPointer = null;
    intents.pressAbility('ult'); // launch (the drag, if any, sets where)
  };
  ult.addEventListener('pointerdown', onUltDown);
  window.addEventListener('pointermove', onUltMove);
  window.addEventListener('pointerup', onUltUp);
  window.addEventListener('pointercancel', onUltUp);
  // A long press (holding MELEE to block) must not select the label or open the context menu.
  const noDefault = (e: Event): void => e.preventDefault();
  layer.addEventListener('contextmenu', noDefault);
  layer.addEventListener('selectstart', noDefault);

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  util.addEventListener('pointerdown', onUtil);
  dodge.addEventListener('pointerdown', onDodge);
  util.addEventListener('pointerup', onUtilUp);
  util.addEventListener('pointercancel', onUtilUp);
  melee.addEventListener('pointerdown', onMelee);
  melee.addEventListener('pointerup', onMeleeUp);
  melee.addEventListener('pointercancel', onMeleeUp);
  melee.addEventListener('pointerleave', onMeleeUp);
  return () => {
    ult.removeEventListener('pointerdown', onUltDown);
    window.removeEventListener('pointermove', onUltMove);
    window.removeEventListener('pointerup', onUltUp);
    window.removeEventListener('pointercancel', onUltUp);
    for (const b of abilityButtons) b.removeEventListener('pointerdown', onAbility);
    layer.removeEventListener('contextmenu', noDefault);
    layer.removeEventListener('selectstart', noDefault);
    melee.removeEventListener('pointerdown', onMelee);
    melee.removeEventListener('pointerup', onMeleeUp);
    melee.removeEventListener('pointercancel', onMeleeUp);
    melee.removeEventListener('pointerleave', onMeleeUp);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    util.removeEventListener('pointerdown', onUtil);
    dodge.removeEventListener('pointerdown', onDodge);
    util.removeEventListener('pointerup', onUtilUp);
    util.removeEventListener('pointercancel', onUtilUp);
    layer.remove();
  };
}

/** What the contextual utility button does right now (CONTROL_SCHEME: its icon changes). */
export type UtilityAction = 'jump' | 'pickup' | 'throw';

const UTILITY_LABELS: Readonly<Record<UtilityAction, string>> = { jump: 'JUMP', pickup: 'GRAB', throw: 'THROW' };

/** Relabel the utility button (cheap: touches the DOM only when the action changes). */
export function showUtilityAction(root: ParentNode, action: UtilityAction): void {
  const util = root.querySelector<HTMLButtonElement>('.util-button');
  if (!util || util.dataset.action === action) return;
  util.dataset.action = action;
  util.textContent = UTILITY_LABELS[action];
  util.setAttribute('aria-label', action === 'jump' ? 'Jump' : action === 'pickup' ? 'Pick up' : 'Throw');
}

/** Show the dodge cooldown on the DODGE button: 1 = ready, 0 = just used (cheap: only on change). */
export function showDodgeReady(root: ParentNode, ready: number): void {
  const button = root.querySelector<HTMLButtonElement>('.dodge-button');
  if (!button) return;
  const pct = `${Math.round(Math.max(0, Math.min(1, ready)) * 100)}%`;
  if (button.style.getPropertyValue('--fill') !== pct) button.style.setProperty('--fill', pct);
}
