/**
 * The tutorial (owner, 13/11/2026: "Practice mode ... select tutorial"; REQ-TUT): a short guided
 * run in the training yard that teaches the five combat actions and the rest of the controls, one
 * step at a time. Each step finishes when the player has actually done it. Pure rules: the page
 * feeds in what the player did each frame (`TutorialObservation`), the overlay shows the step.
 */
export type TutorialStepId = 'move' | 'punch' | 'combo' | 'heavy' | 'block' | 'dodge' | 'ability' | 'ultimate';

export interface TutorialStep {
  readonly id: TutorialStepId;
  readonly title: string;
  /** What to do, with `{key}` placeholders filled in for the player's device and keys. */
  readonly text: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'move', title: 'Move', text: 'Walk around the yard with {move}.' },
  { id: 'punch', title: 'Punch', text: 'Walk up to the dummy and punch it with {attack}.' },
  { id: 'combo', title: 'Combo', text: 'Keep tapping {attack} to chain a combo: land 4 hits.' },
  {
    id: 'heavy',
    title: 'Heavy attack',
    text: 'Swing your heavy attack with {heavy}. It hits hard but leaves you open.',
  },
  { id: 'block', title: 'Block', text: 'The dummy fights back now. Hold {attack} to block its punches.' },
  { id: 'dodge', title: 'Dodge', text: 'Dodge with {dodge}. Dodging a shot sidesteps it; spamming tires you out.' },
  { id: 'ability', title: 'Abilities', text: 'Use one of your abilities: {abilities}.' },
  { id: 'ultimate', title: 'Ultimate', text: 'Your ultimate is charged: unleash it with {ultimate}.' },
];

/** What the player did since the last frame (built by the page from the fight). */
export interface TutorialObservation {
  /** Metres moved this frame. */
  readonly movedM: number;
  /** Hits the player landed this frame. */
  readonly hits: number;
  readonly heavy: boolean;
  readonly guarding: boolean;
  readonly dodging: boolean;
  /** An ability being cast now: a basic one or the ultimate. */
  readonly ability: 'basic' | 'ultimate' | null;
}

/** How much of each step is needed. */
const NEED = { moveM: 3, punches: 1, comboHits: 4, blockS: 1 } as const;

export class TutorialRun {
  private index = 0;
  private movedM = 0;
  private hits = 0;
  private guardS = 0;
  /** Seconds since the current step was finished (a short pause before the next). */
  private doneS = -1;

  get step(): TutorialStep | null {
    return TUTORIAL_STEPS[this.index] ?? null;
  }

  get stepNumber(): number {
    return this.index + 1;
  }

  get total(): number {
    return TUTORIAL_STEPS.length;
  }

  get finished(): boolean {
    return this.index >= TUTORIAL_STEPS.length;
  }

  /** The current step is done and the next one is about to show. */
  get stepDone(): boolean {
    return this.doneS >= 0;
  }

  /** 0..1 progress through the current step (move distance, combo hits, block time). */
  get progress(): number {
    const id = this.step?.id;
    if (this.stepDone) return 1;
    if (id === 'move') return Math.min(1, this.movedM / NEED.moveM);
    if (id === 'combo') return Math.min(1, this.hits / NEED.comboHits);
    if (id === 'block') return Math.min(1, this.guardS / NEED.blockS);
    return 0;
  }

  update(o: TutorialObservation, dtS: number): void {
    if (this.finished) return;
    if (this.doneS >= 0) {
      this.doneS += dtS;
      if (this.doneS >= 1) this.next();
      return;
    }
    const id = this.step!.id;
    let done = false;
    if (id === 'move') {
      this.movedM += o.movedM;
      done = this.movedM >= NEED.moveM;
    } else if (id === 'punch') {
      done = o.hits > 0;
    } else if (id === 'combo') {
      this.hits += o.hits;
      done = this.hits >= NEED.comboHits;
    } else if (id === 'heavy') {
      done = o.heavy;
    } else if (id === 'block') {
      this.guardS = o.guarding ? this.guardS + dtS : Math.max(0, this.guardS - dtS * 0.5);
      done = this.guardS >= NEED.blockS;
    } else if (id === 'dodge') {
      done = o.dodging;
    } else if (id === 'ability') {
      done = o.ability === 'basic';
    } else {
      done = o.ability === 'ultimate';
    }
    if (done) this.doneS = 0;
  }

  /** Skip the rest. */
  skip(): void {
    this.index = TUTORIAL_STEPS.length;
  }

  private next(): void {
    this.index++;
    this.movedM = 0;
    this.hits = 0;
    this.guardS = 0;
    this.doneS = -1;
  }
}

/** Fill a step's `{key}` placeholders. */
export function stepText(step: TutorialStep, keys: Readonly<Record<string, string>>): string {
  return step.text.replace(/\{(\w+)\}/g, (_, k: string) => keys[k] ?? k);
}
