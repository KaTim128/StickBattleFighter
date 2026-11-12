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
  // Flame Detonation (owner, 12/11/2026): two cupped hands round a white-hot core, bursting outward.
  'flame-detonation': svg(
    `${FIRE_GLOW}<path d="M24 2 L27 13 L37 6 L32 17 L45 16 L35 23 L46 30 L33 30 L38 42 L28 34 L24 46 L20 34 L10 42 L15 30 L2 30 L13 23 L3 16 L16 17 L11 6 L21 13 Z" fill="#ff7a1a" stroke="#7a1a06" stroke-width="1.5" stroke-linejoin="round"/><circle cx="24" cy="24" r="10" fill="url(#fg)"/><path d="M12 30 C12 38 18 40 22 36 M36 30 C36 38 30 40 26 36" stroke="#7a1a06" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  ),
  // Grapple Slam: a grey fist gripping a small figure overhead, a curved arrow down to the floor.
  'grapple-slam': svg(
    `<path d="M2 44 H46" stroke="#5a4632" stroke-width="4" stroke-linecap="round"/><ellipse cx="34" cy="42" rx="10" ry="3" fill="#b89a74" opacity=".8"/><path d="M8 34 C6 18 16 8 28 8" stroke="#eadcc2" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="4 3"/><path d="M4 30 L8 38 L13 31 Z" fill="#eadcc2"/><circle cx="34" cy="10" r="4" fill="#d9dce4" stroke="#141418" stroke-width="1.5"/><path d="M34 14 V24 M34 18 L28 14 M34 18 L40 14 M34 24 L30 30 M34 24 L38 30" stroke="#d9dce4" stroke-width="2.5" stroke-linecap="round"/><rect x="26" y="20" width="16" height="12" rx="5" fill="#6e6e78" stroke="#141418" stroke-width="2"/><path d="M31 21 V27 M36 21 V27" stroke="#141418" stroke-width="1.3"/><path d="M34 32 V40" stroke="#4c4c55" stroke-width="7" stroke-linecap="round"/>`,
  ),
  // Grave Chains: violet spectral chain links lashing out to a hook.
  'grave-chains': svg(
    `<g fill="none" stroke-width="3.2" stroke-linecap="round"><ellipse cx="9" cy="36" rx="5" ry="3.2" transform="rotate(-35 9 36)" stroke="#6a2bb0"/><ellipse cx="17" cy="30" rx="5" ry="3.2" transform="rotate(-35 17 30)" stroke="#a970ff"/><ellipse cx="25" cy="24" rx="5" ry="3.2" transform="rotate(-35 25 24)" stroke="#6a2bb0"/><ellipse cx="33" cy="18" rx="5" ry="3.2" transform="rotate(-35 33 18)" stroke="#a970ff"/></g><path d="M37 15 C42 10 46 14 43 19 C41 22 37 21 37 18" stroke="#e6dfcf" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="40" cy="9" r="2" fill="#d9c8ff" opacity=".8"/><circle cx="45" cy="25" r="1.6" fill="#a970ff" opacity=".7"/>`,
  ),
  // Basic combos, one per fighter (owner, 12/11/2026: "unique" combo symbols).
  // A flaming fist driving forward (Inferno).
  'flaming-fist': svg(
    `<path d="M2 18 C8 14 10 22 16 18 M2 30 C8 26 10 34 16 30" stroke="#ff7a1a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M16 12 C20 4 30 4 30 12 C34 6 42 10 38 18 C44 20 44 30 38 32 C40 40 30 44 26 38 C22 44 14 40 16 34 Z" fill="#ff7a1a" opacity=".6"/><rect x="18" y="14" width="20" height="18" rx="6" fill="#e2701d" stroke="#7a1a06" stroke-width="2.2"/><path d="M23 15 V23 M28 15 V23 M33 15 V23" stroke="#7a1a06" stroke-width="1.4"/><path d="M20 18 H36" stroke="#ffd25a" stroke-width="1.6" opacity=".8"/>`,
  ),
  // A heavy grey fist with an impact burst (Braxon).
  'heavy-fist': svg(
    `<path d="M36 6 L38 14 L46 12 L40 19 L46 25 L38 24 L36 32 L33 24 L26 26 L31 19 L26 12 L34 14 Z" fill="#eadcc2" stroke="#7d6448" stroke-width="1.2"/><path d="M4 26 H12" stroke="#4c4c55" stroke-width="9" stroke-linecap="round"/><rect x="10" y="16" width="22" height="20" rx="7" fill="#6e6e78" stroke="#141418" stroke-width="2.5"/><path d="M16 17 V26 M21 17 V26 M26 17 V26" stroke="#141418" stroke-width="1.5"/><path d="M12 21 H30" stroke="#d9dce4" stroke-width="1.5" opacity=".7"/>`,
  ),
  // A bone staff sweeping round in a violet arc (Necro).
  'staff-swing': svg(
    `<path d="M6 34 C6 16 22 6 40 10" stroke="#a970ff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/><path d="M10 34 C12 22 22 14 36 14" stroke="#d9c8ff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/><path d="M12 44 L34 14" stroke="#2a241c" stroke-width="5.5" stroke-linecap="round"/><path d="M12 44 L34 14" stroke="#e6dfcf" stroke-width="3" stroke-linecap="round"/><path d="M17 37 L20 39 M24 28 L27 30" stroke="#2a241c" stroke-width="1.5"/><circle cx="36" cy="11" r="6" fill="#e6dfcf" stroke="#2a241c" stroke-width="1.8"/><circle cx="34" cy="10.5" r="1.4" fill="#a970ff"/><circle cx="38" cy="10.5" r="1.4" fill="#a970ff"/>`,
  ),
  // Necro (owner, 12/11/2026). Soul Drain: a violet orb of souls trailing ghostly wisps.
  'soul-drain': svg(
    `<defs><radialGradient id="sg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f1e8ff"/><stop offset=".45" stop-color="#a970ff"/><stop offset="1" stop-color="#2a0d3d"/></radialGradient></defs><path d="M4 32 C12 24 16 34 22 26 C18 36 26 38 30 30" stroke="#a970ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M6 20 C12 16 16 22 22 18" stroke="#d9c8ff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/><circle cx="32" cy="24" r="11" fill="url(#sg)" stroke="#1a0826" stroke-width="2"/>`,
  ),
  // Death Eruption: bone spikes and a skeletal hand bursting from cracked ground.
  'death-eruption': svg(
    `<path d="M2 40 H46" stroke="#2e2438" stroke-width="4" stroke-linecap="round"/><path d="M8 40 L12 22 L16 40 Z M30 40 L35 18 L40 40 Z" fill="#e6dfcf" stroke="#2a241c" stroke-width="1.5" stroke-linejoin="round"/><path d="M18 40 V26 M22 40 V22 M26 40 V24 M18 30 C18 26 26 26 26 30" stroke="#e6dfcf" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="42" rx="20" ry="3" fill="#a970ff" opacity=".45"/>`,
  ),
  // Undead Army: three skulls rising out of the ground.
  'undead-army': svg(
    `<path d="M2 42 H46" stroke="#2e2438" stroke-width="4" stroke-linecap="round"/><g fill="#e6dfcf" stroke="#2a241c" stroke-width="1.5"><circle cx="12" cy="30" r="6"/><circle cx="24" cy="22" r="7"/><circle cx="36" cy="30" r="6"/><rect x="9" y="34" width="7" height="5" rx="1.5"/><rect x="20" y="27" width="8" height="6" rx="1.5"/><rect x="33" y="34" width="7" height="5" rx="1.5"/></g><path d="M8 40 V44 M24 34 V44 M40 40 V44" stroke="#bfb6a3" stroke-width="3"/>`,
  ),
  // Teleport: a hooded figure fading into violet smoke on one side, reforming on the other.
  teleport: svg(
    `<path d="M8 40 L10 22 C10 14 20 14 20 22 L22 40 Z" fill="#33284a" opacity=".35" stroke="#120e18" stroke-width="1.5"/><path d="M26 40 L28 20 C28 11 40 11 40 20 L42 40 Z" fill="#4a3a63" stroke="#120e18" stroke-width="2" stroke-linejoin="round"/><ellipse cx="34.5" cy="22" rx="3" ry="3.6" fill="#07050a"/><path d="M12 30 C18 24 22 34 28 28" stroke="#a970ff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="2 3"/><circle cx="8" cy="18" r="2" fill="#a970ff" opacity=".7"/><circle cx="14" cy="12" r="1.5" fill="#d9c8ff" opacity=".7"/><ellipse cx="34" cy="42" rx="10" ry="2.5" fill="#a970ff" opacity=".45"/>`,
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
