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
export function attachTouchControls(root: HTMLElement, intents: PlayerIntents): () => void {
  const layer = document.createElement('div');
  layer.className = 'touch-controls';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="joystick" hidden><div class="joystick-knob"></div></div>
    <button class="util-button" type="button" aria-label="Jump">JUMP</button>
    <button class="melee-button" type="button" aria-label="Melee">MELEE</button>
    <button class="ability-button" data-slot="a1" type="button" aria-label="Ability 1">A1</button>
    <button class="ability-button" data-slot="a2" type="button" aria-label="Ability 2">A2</button>
    <button class="ability-button" data-slot="a3" type="button" aria-label="Ability 3">A3</button>
    <button class="ability-button ult" data-slot="ult" type="button" aria-label="Ultimate">ULT</button>`;
  root.appendChild(layer);
  const stick = layer.querySelector<HTMLElement>('.joystick')!;
  const knob = layer.querySelector<HTMLElement>('.joystick-knob')!;
  const util = layer.querySelector<HTMLButtonElement>('.util-button')!;
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
  const onDown = (e: PointerEvent): void => {
    showForTouch(e);
    if (e.pointerType !== 'touch' || stickPointer !== null) return;
    if (e.target instanceof HTMLButtonElement || e.clientX > window.innerWidth * 0.4) return;
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
    if (e.pointerId !== stickPointer) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const v = joystickVector(dx, dy, RADIUS_PX);
    const k = Math.min(1, Math.hypot(dx, dy) / RADIUS_PX) / (Math.hypot(dx, dy) || 1);
    knob.style.transform = `translate(calc(-50% + ${dx * k * RADIUS_PX}px), calc(-50% + ${dy * k * RADIUS_PX}px))`;
    intents.setMove('touch', v);
    if (flick.sample(Math.hypot(v.x, v.y), e.timeStamp)) intents.pressDodge();
  };
  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    stick.hidden = true;
    intents.setMove('touch', { x: 0, y: 0 });
  };
  const onUtil = (e: PointerEvent): void => {
    e.preventDefault();
    intents.pressJump();
  };
  const onMelee = (e: PointerEvent): void => {
    e.preventDefault();
    intents.meleePress(); // tap = attack, hold = block
  };
  const onMeleeUp = (): void => intents.meleeRelease();
  const onAbility = (e: PointerEvent): void => {
    e.preventDefault();
    const slot = (e.currentTarget as HTMLElement).dataset.slot;
    if (slot === 'a1' || slot === 'a2' || slot === 'a3' || slot === 'ult') intents.pressAbility(slot);
  };
  for (const b of abilityButtons) b.addEventListener('pointerdown', onAbility);
  // A long press (holding MELEE to block) must not select the label or open the context menu.
  const noDefault = (e: Event): void => e.preventDefault();
  layer.addEventListener('contextmenu', noDefault);
  layer.addEventListener('selectstart', noDefault);

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  util.addEventListener('pointerdown', onUtil);
  melee.addEventListener('pointerdown', onMelee);
  melee.addEventListener('pointerup', onMeleeUp);
  melee.addEventListener('pointercancel', onMeleeUp);
  melee.addEventListener('pointerleave', onMeleeUp);
  return () => {
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
    layer.remove();
  };
}
