import battleMp3 from '../../../assets/audio/music-battle-japanese-boss.mp3?url';
import battleOgg from '../../../assets/audio/music-battle-japanese-boss.ogg?url';
import menuMp3 from '../../../assets/audio/music-menu-pulse-epic.mp3?url';
import menuOgg from '../../../assets/audio/music-menu-pulse-epic.ogg?url';
import countdownMp3 from '../../../assets/audio/sfx-countdown-fight.mp3?url';
import countdownOgg from '../../../assets/audio/sfx-countdown-fight.ogg?url';
import clickMp3 from '../../../assets/audio/sfx-ui-click.mp3?url';
import clickOgg from '../../../assets/audio/sfx-ui-click.ogg?url';

/** Recorded audio, each as Ogg Vorbis with an MP3 fallback. */
export interface AudioTrackDef {
  readonly ogg: string;
  readonly mp3: string;
  /**
   * Where the loop runs, in seconds from the track's first sound: it plays from the start once (the
   * intro), then repeats [startS, endS) gaplessly. Without it, a one-shot.
   */
  readonly loop?: { readonly startS: number; readonly endS: number };
  /** Level under the settings' volume, 0..1 (balanced under the combat effects). */
  readonly level: number;
}

/**
 * Battle music (owner, 12/11/2026: "use this audio instead, just use this"): the owner's supplied
 * Japanese gaming boss-battle track, unchanged except that the final fade-out is cut and the end is
 * crossfaded (0.35 s, on the beat) back into the body at 43.7 s (times from its first sound, 25 ms in), so after the intro it loops for
 * the whole fight with no gap (prepared once; see assets/ASSET_REGISTER.md).
 */
export const BATTLE_MUSIC: Readonly<Record<string, AudioTrackDef>> = {
  'japanese-boss': { ogg: battleOgg, mp3: battleMp3, loop: { startS: 43.686486, endS: 166.632177 }, level: 0.42 },
};

/**
 * The fight countdown (owner, 13/11/2026: the owner's supplied deep-voice "3, 2, 1, Fight!" clip,
 * trimmed to start on "three"). The words land at `COUNTDOWN_WORDS_S` seconds into the clip; the
 * scene's intro timeline is built from the same numbers, so the text and the voice stay together.
 */
export const FIGHT_COUNTDOWN: AudioTrackDef = { ogg: countdownOgg, mp3: countdownMp3, level: 0.95 };
export const COUNTDOWN_WORDS_S = { three: 0.01, two: 1.12, one: 1.98, fight: 2.86 } as const;

/**
 * Menu music (owner, 13/11/2026): the owner's supplied "Pulse" epic track on the title screen and
 * every menu, looping with no gap: trimmed to its first and last sound, its last 0.3 s crossfaded
 * into its opening, so after the first pass it loops [0.3 s, end) (see assets/ASSET_REGISTER.md).
 */
export const MENU_MUSIC: AudioTrackDef = {
  ogg: menuOgg,
  mp3: menuMp3,
  loop: { startS: 0.3, endS: 137.154195 },
  level: 0.4,
};

/** The click on every interface button (owner, 13/11/2026; never on combat buttons). */
export const UI_CLICK: AudioTrackDef = { ogg: clickOgg, mp3: clickMp3, level: 0.6 };
