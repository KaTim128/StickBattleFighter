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
  // Two fists hammering cracked ground, shockwave arcs spreading out.
  'ground-smash': svg(
    `<path d="M2 40 H46" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><path d="M24 40 L20 46 M24 40 L29 46 M24 40 L16 44" stroke="#3a2a1a" stroke-width="2" stroke-linecap="round"/><path d="M8 36 C10 30 14 28 16 30 M40 36 C38 30 34 28 32 30" stroke="#eadcc2" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="14" y="10" width="20" height="16" rx="5" fill="#a3241c" stroke="#26211c" stroke-width="2"/><path d="M14 18 H34 M19 10 V26 M24 10 V26 M29 10 V26" stroke="#26211c" stroke-width="1.5"/><path d="M18 26 V34 H30 V26" fill="#8e8982" stroke="#26211c" stroke-width="2"/>`,
  ),
  // A great horn driving forward with speed lines behind it.
  'rhino-charge': svg(
    `<path d="M2 16 H14 M2 24 H11 M2 32 H14" stroke="#b89a74" stroke-width="3" stroke-linecap="round"/><path d="M16 34 C16 22 26 16 34 18 L46 6 C44 18 42 26 36 32 C30 38 20 38 16 34 Z" fill="#e9dcc0" stroke="#26211c" stroke-width="2" stroke-linejoin="round"/><path d="M36 20 L44 9" stroke="#fffaf0" stroke-width="2" stroke-linecap="round"/><path d="M22 34 C22 28 26 25 30 26" stroke="#b8a684" stroke-width="2" fill="none"/>`,
  ),
  // A huge wrapped fist coming down onto an impact star.
  'crushing-strike': svg(
    `<path d="M24 46 L27 39 L35 42 L31 35 L40 32 L31 30 L33 22 L26 28 L24 20 L22 28 L15 22 L17 30 L8 32 L17 35 L13 42 L21 39 Z" fill="#eadcc2" stroke="#7d6448" stroke-width="1.5"/><path d="M18 4 V14" stroke="#b89a74" stroke-width="3" stroke-linecap="round"/><path d="M30 4 V14" stroke="#b89a74" stroke-width="3" stroke-linecap="round"/><rect x="14" y="12" width="20" height="16" rx="5" fill="#a3241c" stroke="#26211c" stroke-width="2"/><path d="M14 20 H34" stroke="#26211c" stroke-width="1.5"/>`,
  ),
  // A roaring rhino head in a blood-red burst: the rage taking hold.
  'rampage-mode': svg(
    `<defs><radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd2c0"/><stop offset=".45" stop-color="#ff5a3a"/><stop offset="1" stop-color="#5a0a0a" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="23" fill="url(#rg)"/><path d="M12 30 C10 18 22 12 30 18 C34 20 38 22 38 28 C38 34 30 36 22 36 C17 36 13 34 12 30Z" fill="#8e8982" stroke="#26211c" stroke-width="2"/><path d="M34 22 C38 16 38 10 36 6 C34 12 31 16 30 19 Z" fill="#e9dcc0" stroke="#26211c" stroke-width="1.5"/><ellipse cx="25" cy="25" rx="3" ry="2" fill="#ff2a1a"/><path d="M20 22 L29 23" stroke="#26211c" stroke-width="2.5" stroke-linecap="round"/><path d="M28 32 C30 30 34 30 36 31" stroke="#26211c" stroke-width="2" fill="none"/>`,
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
