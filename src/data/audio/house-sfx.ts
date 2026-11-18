import door from '../../../assets/audio/sfx/hide-seek/door/sfx-door-open.mp3?url';
import doorOgg from '../../../assets/audio/sfx/hide-seek/door/sfx-door-open.ogg?url';
import blade from '../../../assets/audio/sfx/shroud/blade-slash/sfx-sword-slash.mp3?url';
import bladeOgg from '../../../assets/audio/sfx/shroud/blade-slash/sfx-sword-slash.ogg?url';
import chest from '../../../assets/audio/sfx/shroud/chest/sfx-chest-open.mp3?url';
import chestOgg from '../../../assets/audio/sfx/shroud/chest/sfx-chest-open.ogg?url';
import type { AudioTrackDef } from './music';

/**
 * Recorded Hide and Seek sound effects (owner, 19/11/2026), each Ogg with an MP3 fallback. Their sources and
 * licences are in assets/audio/sfx/SOURCES.tsv and assets/ASSET_REGISTER.md. Footsteps and the punch sounds are
 * not wired yet (see AUDIO_ASSET_CATALOG.md section 9).
 */
export const HOUSE_SFX = {
  /** A door opening: the player's door, and the hunter opening one. */
  door: { ogg: doorOgg, mp3: door, level: 0.7 },
  /** The hunter lifting a chest or cupboard lid. */
  chest: { ogg: chestOgg, mp3: chest, level: 0.7 },
  /** The catch: a blade in, layered under the killing shriek. */
  blade: { ogg: bladeOgg, mp3: blade, level: 0.8 },
} as const satisfies Record<string, AudioTrackDef>;
