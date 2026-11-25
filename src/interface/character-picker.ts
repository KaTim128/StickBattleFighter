import { accentColour } from './accent-colour';

/**
 * Open Zone "Change Character" (owner plan O1): a compact overlay with every fighter's portrait; picking one swaps the player's fighter
 * on the spot. It is built from the same portraits the select screen uses, so nothing is drawn again. Presentation only.
 */
export interface PickerFighter {
  readonly id: string;
  readonly name: string;
  readonly colour: string;
}

export class CharacterPicker {
  readonly root: HTMLDivElement;
  private readonly grid: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly pick: (id: string) => void,
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'char-picker';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Change character');
    this.root.innerHTML = `
      <div class="cp-card">
        <div class="cp-head"><h2>Change character</h2><button type="button" class="cp-close" aria-label="Close">✕</button></div>
        <div class="cp-grid"></div>
      </div>`;
    this.grid = this.root.querySelector('.cp-grid')!;
    parent.appendChild(this.root);
    this.root.querySelector('.cp-close')!.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(fighters: readonly PickerFighter[], portraits: ReadonlyMap<string, string>, currentId: string): void {
    this.grid.replaceChildren(
      ...fighters.map((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cp-tile';
        b.dataset.fighter = f.id;
        b.style.setProperty('--tile', accentColour(f.colour));
        b.disabled = f.id === currentId;
        if (f.id === currentId) b.classList.add('current');
        const url = portraits.get(f.id);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = '';
          b.appendChild(img);
        }
        const name = document.createElement('span');
        name.textContent = f.name;
        b.appendChild(name);
        b.addEventListener('click', () => {
          this.close();
          this.pick(f.id);
        });
        return b;
      }),
    );
    this.root.hidden = false;
    this.onOpenChange(true);
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.onOpenChange(false);
  }
}
