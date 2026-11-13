import { describe, expect, it } from 'vitest';
import { wantsShell } from '../../../src/app/shell';
import { exitUrl } from '../../../src/interface/quit-game';

describe('Quit Game and the fullscreen shell (owner, 13/11/2026)', () => {
  it('a tab that cannot close goes back to the site the player came from, else an empty page', () => {
    expect(exitUrl('https://example.org/games', 'https://katim128.github.io')).toBe('https://example.org/games');
    expect(exitUrl('https://katim128.github.io/StickBattleFighter/', 'https://katim128.github.io')).toBe('about:blank');
    expect(exitUrl('', 'https://katim128.github.io')).toBe('about:blank');
  });

  it('the shell wraps a player visit, not one already framed, nor automated tests unless asked', () => {
    const win = (webdriver: boolean, framed = false): Window => {
      const w = { navigator: { webdriver } } as unknown as { top: unknown };
      w.top = framed ? {} : w;
      return w as unknown as Window;
    };
    expect(wantsShell(win(false), new URLSearchParams(''))).toBe(true);
    expect(wantsShell(win(false, true), new URLSearchParams(''))).toBe(false);
    expect(wantsShell(win(true), new URLSearchParams(''))).toBe(false);
    expect(wantsShell(win(true), new URLSearchParams('shell'))).toBe(true);
    expect(wantsShell(win(false), new URLSearchParams('noshell'))).toBe(false);
  });
});
