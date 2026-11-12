import battleMp3 from '../../../assets/audio/music-battle-steel-rain.mp3?url';
import battleOgg from '../../../assets/audio/music-battle-steel-rain.ogg?url';
import stingerMp3 from '../../../assets/audio/sfx-fight-stinger.mp3?url';
import stingerOgg from '../../../assets/audio/sfx-fight-stinger.ogg?url';

/**
 * Recorded audio (owner, 12/11/2026): original tracks rendered offline by `tools/audio/` (no
 * third-party audio), each as Ogg Vorbis with an MP3 fallback.
 */
export interface AudioTrackDef {
  readonly ogg: string;
  readonly mp3: string;
  /** Musical loop length, seconds: the loop runs exactly this long from the first sound (gapless). */
  readonly loopS?: number;
  /** Level under the settings' music volume, 0..1 (balanced under the combat effects). */
  readonly level: number;
}

/** "Steel Rain": the battle music, a Japanese cinematic boss-fight loop (32 bars at 92 BPM). */
export const BATTLE_MUSIC: Readonly<Record<string, AudioTrackDef>> = {
  'steel-rain': { ogg: battleOgg, mp3: battleMp3, loopS: (32 * 4 * 60) / 92, level: 0.5 },
};

/** The READY... FIGHT! stinger under the announcer; its FIGHT hit lands 1.5 s in. */
export const FIGHT_STINGER: AudioTrackDef = { ogg: stingerOgg, mp3: stingerMp3, level: 0.9 };
