import type { TeamHudState } from '../app/scenes/scene-teams';

/**
 * 3 vs 3 team strips (owner, 13/11/2026): under each health bar, the side's three fighters with
 * their portraits and health; the one in the arena highlighted, the knocked out greyed. The
 * player's strip also shows when Tag is ready. Original design.
 */
export class TeamHud {
  readonly root: HTMLDivElement;
  private readonly sides: Record<'player' | 'opponent', HTMLDivElement>;
  private readonly tagReady: HTMLDivElement;
  private portraits = new Map<string, string>();
  private shown = '';

  constructor(parent: HTMLElement, tagKey: () => string) {
    this.root = document.createElement('div');
    this.root.className = 'team-hud';
    this.sides = { player: document.createElement('div'), opponent: document.createElement('div') };
    this.sides.player.className = 'team-strip team-left';
    this.sides.opponent.className = 'team-strip team-right';
    this.tagReady = document.createElement('div');
    this.tagReady.className = 'team-tag';
    this.tagReady.title = 'Tag a teammate';
    this.tagKey = tagKey;
    this.root.append(this.sides.player, this.tagReady, this.sides.opponent);
    parent.appendChild(this.root);
  }

  private readonly tagKey: () => string;

  setPortraits(urls: ReadonlyMap<string, string>): void {
    this.portraits = new Map(urls);
    this.shown = '';
  }

  update(s: TeamHudState): void {
    const ready = s.playerTagReady >= 1;
    this.tagReady.textContent = ready ? `TAG ${this.tagKey()}` : 'TAG…';
    this.tagReady.classList.toggle('ready', ready);
    this.tagReady.style.setProperty('--fill', `${Math.round(s.playerTagReady * 100)}%`);
    const key = JSON.stringify([s.player, s.opponent, this.portraits.size]);
    if (key === this.shown) return;
    this.shown = key;
    for (const side of ['player', 'opponent'] as const) {
      this.sides[side].replaceChildren(
        ...s[side].map((m) => {
          const cell = document.createElement('div');
          cell.className = `team-member${m.active ? ' active' : ''}${m.ko ? ' ko' : ''}`;
          cell.dataset.fighter = m.id;
          const face = document.createElement('img');
          face.className = 'team-face';
          face.alt = m.name;
          const url = this.portraits.get(m.id);
          if (url) face.src = url;
          const bar = document.createElement('span');
          bar.className = 'team-bar';
          const fill = document.createElement('span');
          fill.className = 'team-fill';
          fill.style.width = `${Math.round(m.hpFrac * 100)}%`;
          bar.append(fill);
          cell.append(face, bar);
          return cell;
        }),
      );
    }
  }
}
