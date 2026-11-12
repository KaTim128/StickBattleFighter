/**
 * Ability icons (owner, 12/11/2026: "change the text to ability images so it can fit the
 * buttons"). Small original SVG pictures, one per icon id; an ability names its icon in its data
 * (`AbilityDef.icon`). Fire abilities glow orange, earth abilities are stone and dust, rage is red.
 */
const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="ab-icon-svg">${body}</svg>`;

const FIRE_GLOW =
  '<defs><radialGradient id="fg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffd25a"/><stop offset=".7" stop-color="#ff7a1a"/><stop offset="1" stop-color="#d8320c"/></radialGradient></defs>';

export const ABILITY_ICONS: Readonly<Record<string, string>> = {
  // A blazing ball with a flame tail streaming behind it.
  fireball: svg(
    `${FIRE_GLOW}<path d="M4 30 C12 22 16 30 22 22 C18 32 26 34 30 26 L30 34 C22 40 10 38 4 30Z" fill="#ff7a1a" opacity=".85"/><path d="M8 27 C14 24 17 28 22 24" stroke="#ffd25a" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="31" cy="24" r="12" fill="url(#fg)" stroke="#7a1a06" stroke-width="2"/>`,
  ),
  // A burst forward wrapped in flame: three fiery streaks and an arrowhead.
  'flame-dash': svg(
    `<path d="M4 14 H26 M8 24 H32 M4 34 H26" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round"/><path d="M4 14 H18 M8 24 H24 M4 34 H18" stroke="#ffd25a" stroke-width="2" stroke-linecap="round"/><path d="M30 10 L44 24 L30 38 Z" fill="#ff5a14" stroke="#7a1a06" stroke-width="2" stroke-linejoin="round"/>`,
  ),
  // A thick, white-hot beam pouring from an open palm.
  'fire-beam': svg(
    `${FIRE_GLOW}<rect x="16" y="17" width="30" height="14" rx="7" fill="#ff7a1a"/><rect x="16" y="20.5" width="30" height="7" rx="3.5" fill="#ffd25a"/><rect x="16" y="22.5" width="30" height="3" rx="1.5" fill="#fffbe6"/><circle cx="14" cy="24" r="9" fill="url(#fg)"/><path d="M4 16 C8 16 9 20 9 24 C9 28 8 32 4 32" stroke="#7a1a06" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ),
  // A leap arcing down onto a fiery blast.
  eruption: svg(
    `<path d="M6 30 C10 8 30 4 36 22" stroke="#ffd25a" stroke-width="3" fill="none" stroke-dasharray="4 3" stroke-linecap="round"/><path d="M31 18 L37 25 L40 16 Z" fill="#ffd25a"/><path d="M14 44 L20 34 L24 40 L28 30 L32 40 L36 34 L42 44 Z" fill="#ff5a14" stroke="#7a1a06" stroke-width="2" stroke-linejoin="round"/><ellipse cx="28" cy="44" rx="16" ry="3" fill="#d8320c"/>`,
  ),
  // Two grey fists hammering cracked ground, shockwave arcs spreading out.
  'ground-smash': svg(
    `<path d="M2 40 H46" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><path d="M24 40 L20 46 M24 40 L29 46 M24 40 L16 44" stroke="#3a2a1a" stroke-width="2" stroke-linecap="round"/><path d="M8 36 C10 30 14 28 16 30 M40 36 C38 30 34 28 32 30" stroke="#eadcc2" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 4 V12 M30 4 V12" stroke="#4c4c55" stroke-width="7" stroke-linecap="round"/><rect x="12" y="12" width="24" height="18" rx="7" fill="#6e6e78" stroke="#141418" stroke-width="2.5"/><path d="M18 13 V22 M24 13 V22 M30 13 V22" stroke="#141418" stroke-width="1.5"/><path d="M14 16 H34" stroke="#d9dce4" stroke-width="1.5" opacity=".7"/>`,
  ),
  // A muscled body driving forward shoulder-first on two legs, dust and speed lines behind.
  'rampage-charge': svg(
    `<path d="M2 14 H12 M2 22 H9 M2 30 H12" stroke="#d9dce4" stroke-width="3" stroke-linecap="round" opacity=".8"/><ellipse cx="12" cy="42" rx="9" ry="4" fill="#b89a74" opacity=".75"/><circle cx="34" cy="12" r="6" fill="#6e6e78" stroke="#141418" stroke-width="2"/><path d="M16 28 C18 18 26 14 36 18 C40 20 42 24 40 28 C36 32 26 32 20 32 Z" fill="#6e6e78" stroke="#141418" stroke-width="2" stroke-linejoin="round"/><circle cx="37" cy="23" r="5.5" fill="#6e6e78" stroke="#141418" stroke-width="2"/><path d="M22 31 L30 38 L38 44 M22 31 L14 36 L8 44" stroke="#141418" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M22 31 L30 38 L38 44 M22 31 L14 36 L8 44" stroke="#6e6e78" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M42 16 L46 10 M44 24 L47 24 M42 32 L46 37" stroke="#fff2a8" stroke-width="2.5" stroke-linecap="round"/>`,
  ),
  // A huge grey fist coming down onto an impact star.
  'crushing-strike': svg(
    `<path d="M24 46 L27 39 L35 42 L31 35 L40 32 L31 30 L33 22 L26 28 L24 20 L22 28 L15 22 L17 30 L8 32 L17 35 L13 42 L21 39 Z" fill="#eadcc2" stroke="#7d6448" stroke-width="1.5"/><path d="M24 2 V10" stroke="#4c4c55" stroke-width="9" stroke-linecap="round"/><rect x="12" y="9" width="24" height="18" rx="7" fill="#6e6e78" stroke="#141418" stroke-width="2.5"/><path d="M18 10 V19 M24 10 V19 M30 10 V19" stroke="#141418" stroke-width="1.5"/><path d="M14 13 H34" stroke="#d9dce4" stroke-width="1.5" opacity=".7"/>`,
  ),
  // Flexing both arms in a blood-red burst, eyes blazing: the rage taking hold.
  'rampage-mode': svg(
    `<defs><radialGradient id="rg" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#ffd2c0"/><stop offset=".45" stop-color="#ff5a3a"/><stop offset="1" stop-color="#5a0a0a" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="26" r="23" fill="url(#rg)"/><path d="M15 30 C8 30 4 24 6 16 C7 12 11 12 12 16 C12 20 14 22 17 22" fill="#6e6e78" stroke="#141418" stroke-width="2" stroke-linejoin="round"/><path d="M33 30 C40 30 44 24 42 16 C41 12 37 12 36 16 C36 20 34 22 31 22" fill="#6e6e78" stroke="#141418" stroke-width="2" stroke-linejoin="round"/><circle cx="8.5" cy="13" r="3.5" fill="#6e6e78" stroke="#141418" stroke-width="2"/><circle cx="39.5" cy="13" r="3.5" fill="#6e6e78" stroke="#141418" stroke-width="2"/><path d="M14 22 C14 20 34 20 34 22 L32 40 C28 43 20 43 16 40 Z" fill="#6e6e78" stroke="#141418" stroke-width="2" stroke-linejoin="round"/><path d="M24 24 V38 M18 30 H30 M19 35 H29" stroke="#4c4c55" stroke-width="1.5"/><circle cx="24" cy="13" r="7" fill="#6e6e78" stroke="#141418" stroke-width="2"/><path d="M20 12 L23 13.5 M25 13.5 L28 12" stroke="#ff3a1a" stroke-width="2.2" stroke-linecap="round"/>`,
  ),
};

let instance = 0;

/**
 * The icon's SVG markup. Gradient ids get a per-copy suffix: the same icon sits on the desktop bar
 * and on a touch button, and a gradient referenced from a hidden copy would not paint.
 */
export function abilityIcon(id: string | undefined): string | null {
  const icon = id ? ABILITY_ICONS[id] : undefined;
  if (!icon) return null;
  const n = ++instance;
  return icon.replace(/id="(\w+)"/g, `id="$1-${n}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${n})`);
}
