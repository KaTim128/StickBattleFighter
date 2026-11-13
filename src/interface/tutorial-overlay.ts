import { stepText, type TutorialRun } from '../tutorial/tutorial';

/**
 * The tutorial's card (owner, 13/11/2026): the step number, its name and what to do with the
 * player's own keys or buttons, a progress bar, and Skip; at the end, a finish card with Open Zone
 * and the main menu. Original design; sits under the HUD, never over the touch buttons.
 */
export class TutorialOverlay {
  readonly root: HTMLDivElement;
  private readonly count: HTMLElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly bar: HTMLElement;
  private shown = '';

  constructor(
    parent: HTMLElement,
    private readonly keys: () => Readonly<Record<string, string>>,
    private readonly actions: { skip(): void; openZone(): void; menu(): void },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'tutorial-card';
    this.root.setAttribute('role', 'status');
    this.root.innerHTML = `
      <div class="tut-head"><span class="tut-count"></span><span class="tut-title"></span></div>
      <p class="tut-text"></p>
      <div class="tut-track"><div class="tut-bar"></div></div>
      <div class="tut-actions"><button type="button" class="tut-skip">Skip tutorial</button></div>`;
    parent.appendChild(this.root);
    this.count = this.root.querySelector('.tut-count')!;
    this.title = this.root.querySelector('.tut-title')!;
    this.text = this.root.querySelector('.tut-text')!;
    this.bar = this.root.querySelector('.tut-bar')!;
    this.root.querySelector('.tut-skip')!.addEventListener('click', () => this.actions.skip());
  }

  update(run: TutorialRun): void {
    if (run.finished) {
      if (this.shown === 'done') return;
      this.shown = 'done';
      this.root.classList.add('done');
      this.count.textContent = 'COMPLETE';
      this.title.textContent = 'You know the basics!';
      this.text.textContent = 'Try every fighter in the Open Zone, or take on a tournament.';
      this.bar.style.width = '100%';
      const actions = this.root.querySelector('.tut-actions')!;
      actions.replaceChildren();
      for (const [cls, label, fn] of [
        ['tut-open', 'Open Zone', () => this.actions.openZone()],
        ['tut-menu', 'Main menu', () => this.actions.menu()],
      ] as const) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.addEventListener('click', fn);
        actions.appendChild(b);
      }
      return;
    }
    const step = run.step!;
    const key = `${step.id}|${run.stepDone}`;
    this.root.classList.toggle('step-done', run.stepDone);
    this.bar.style.width = `${Math.round(run.progress * 100)}%`;
    if (key === this.shown) return;
    this.shown = key;
    this.count.textContent = `STEP ${run.stepNumber} / ${run.total}`;
    this.title.textContent = run.stepDone ? `${step.title} ✓` : step.title;
    this.text.textContent = run.stepDone ? 'Nice!' : stepText(step, this.keys());
  }
}
