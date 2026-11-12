import battleMp3 from '../../../assets/audio/music-battle-japanese-boss.mp3?url';
import battleOgg from '../../../assets/audio/music-battle-japanese-boss.ogg?url';
import stingerMp3 from '../../../assets/audio/sfx-fight-stinger.mp3?url';
import stingerOgg from '../../../assets/audio/sfx-fight-stinger.ogg?url';

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
 * The READY... FIGHT! stinger under the announcer (original, rendered by tools/audio/); its FIGHT hit
 * lands 1.5 s in.
 */
export const FIGHT_STINGER: AudioTrackDef = { ogg: stingerOgg, mp3: stingerMp3, level: 0.9 };
