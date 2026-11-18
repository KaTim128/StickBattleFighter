import woodClose from '../../../assets/audio/sfx/hide-seek/wood/sfx-wood-close.mp3?url';
import woodCloseOgg from '../../../assets/audio/sfx/hide-seek/wood/sfx-wood-close.ogg?url';
import woodOpen from '../../../assets/audio/sfx/hide-seek/wood/sfx-wood-open.mp3?url';
import woodOpenOgg from '../../../assets/audio/sfx/hide-seek/wood/sfx-wood-open.ogg?url';
import blade from '../../../assets/audio/sfx/shroud/blade-slash/sfx-sword-slash.mp3?url';
import bladeOgg from '../../../assets/audio/sfx/shroud/blade-slash/sfx-sword-slash.ogg?url';
import type { AudioTrackDef } from './music';

/**
 * Recorded Hide and Seek sound effects (owner, 19/11/2026), each Ogg with an MP3 fallback. Their sources and
 * licences are in assets/audio/sfx/SOURCES.tsv and assets/ASSET_REGISTER.md. Footsteps and the punch sounds are
 * not wired yet (see AUDIO_ASSET_CATALOG.md section 9).
 */
export const HOUSE_SFX = {
  /**
   * Wooden furniture opening: a door, cupboard, wardrobe or lid. Cut (owner, 19/11/2026) from one stretch of a longer
   * recording: a short creak into a knock, about 1.1 s, to match the opening animation, with no lead-in silence.
   */
  woodOpen: { ogg: woodOpenOgg, mp3: woodOpen, level: 0.7 },
  /** Wooden furniture closing: one soft clunk of 0.5 s, cut from the same recording. */
  woodClose: { ogg: woodCloseOgg, mp3: woodClose, level: 0.7 },
  /** The catch: a blade in, layered under the killing shriek. */
  blade: { ogg: bladeOgg, mp3: blade, level: 0.8 },
} as const satisfies Record<string, AudioTrackDef>;
