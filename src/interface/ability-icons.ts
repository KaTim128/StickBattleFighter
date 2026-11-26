/**
 * Ability icons (owner, 12/11/2026), styled after the owner's reference sheets: round, full-bleed
 * painted emblems. Each icon fills its circle with a glowing backdrop in its element's colours
 * (fire, earth, soul, blood, shadow), lit from a bright core with soft light rays or a swirl, and a
 * single strong subject painted on top with shaded forms, a crisp dark edge and a highlight. A
 * vignette darkens the rim and a gloss catches the top. No thin stray strokes: every mark is a
 * deliberate shape. Original artwork; one per icon id (`AbilityDef.icon`, `AbilityKit.comboIcon`,
 * `AbilityKit.heavyIcon`).
 */
type Theme =
  | 'magic'
  | 'fire'
  | 'earth'
  | 'soul'
  | 'blood'
  | 'shade'
  | 'decay'
  | 'blue'
  | 'toxin'
  | 'wind'
  | 'steel'
  | 'psi'
  | 'gear'
  | 'sonic'
  | 'time'
  | 'crystal'
  | 'ink';

/** Backdrop colours per element: core, mid, edge. */
const THEME: Readonly<Record<Theme, readonly [string, string, string]>> = {
  fire: ['#ffe9a3', '#e8540f', '#3a0802'],
  earth: ['#f3e3c2', '#8c6a45', '#22170c'],
  soul: ['#ecdcff', '#7a35d0', '#170622'],
  blood: ['#ffb0a8', '#b3121c', '#1a0204'],
  shade: ['#b9bfcc', '#383a48', '#060609'],
  decay: ['#e2f7b8', '#4f7a1c', '#0f1608'],
  blue: ['#d8f0ff', '#1f6fe8', '#020a22'],
  toxin: ['#e8ffc8', '#2f8a12', '#06140a'],
  wind: ['#ffffff', '#3a78b8', '#06121f'],
  steel: ['#ffe9e9', '#a01826', '#1a0508'],
  psi: ['#f4eaff', '#7a3fd0', '#0d0618'],
  gear: ['#fff1d6', '#d9650f', '#15171b'],
  sonic: ['#eafcff', '#0e8fa8', '#04141a'],
  time: ['#fff4cf', '#1f4fa8', '#07142a'],
  crystal: ['#e9e2ff', '#5a4bbf', '#0e0a2c'],
  ink: ['#f2eee3', '#45454f', '#050507'],
  magic: ['#fff4c2', '#7a3fc4', '#150a26'],
};

const MATERIALS = `
<radialGradient id="fc" cx="42%" cy="38%" r="60%"><stop offset="0" stop-color="#fffef2"/><stop offset=".22" stop-color="#ffe680"/><stop offset=".5" stop-color="#ff9a1f"/><stop offset=".8" stop-color="#e2410e"/><stop offset="1" stop-color="#8a1704"/></radialGradient>
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8230a"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset=".8" stop-color="#ffcf4a"/><stop offset="1" stop-color="#fff6c8"/></linearGradient>
<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#d3dae4"/><stop offset=".52" stop-color="#7c8696"/><stop offset=".58" stop-color="#c3cbd6"/><stop offset=".85" stop-color="#eef2f7"/><stop offset="1" stop-color="#596273"/></linearGradient>
<radialGradient id="gr" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e2e5ec"/><stop offset=".45" stop-color="#8f929d"/><stop offset=".85" stop-color="#4b4d57"/><stop offset="1" stop-color="#2e3038"/></radialGradient>
<radialGradient id="sl" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#fbf6ff"/><stop offset=".3" stop-color="#c9a6ff"/><stop offset=".65" stop-color="#7a35d0"/><stop offset="1" stop-color="#26093a"/></radialGradient>
<radialGradient id="dc" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#f4ffd8"/><stop offset=".3" stop-color="#b6e05a"/><stop offset=".65" stop-color="#4f7a1c"/><stop offset="1" stop-color="#16200a"/></radialGradient>
<linearGradient id="bn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffcf2"/><stop offset=".5" stop-color="#e3d8bf"/><stop offset="1" stop-color="#9e9178"/></linearGradient>
<radialGradient id="bd" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#ffc2c2"/><stop offset=".35" stop-color="#ec2a34"/><stop offset=".8" stop-color="#7a0a10"/><stop offset="1" stop-color="#3a0306"/></radialGradient>
<radialGradient id="sh" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#5d5d70"/><stop offset=".5" stop-color="#22222c"/><stop offset="1" stop-color="#07070a"/></radialGradient>
<filter id="ds" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="1.4" stdDeviation="1" flood-color="#000" flood-opacity=".7"/></filter>
<filter id="gl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
<radialGradient id="vg" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="cp"><circle cx="24" cy="24" r="23.5"/></clipPath>`;

/** Soft light rays fanning out from (cx, cy). */
const rays = (cx: number, cy: number, n: number, colour: string, opacity: number, spin = 0) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + spin;
    const w = Math.PI / n / 2.2;
    const r = 40;
    d += `M${cx} ${cy} L${(cx + Math.cos(a - w) * r).toFixed(1)} ${(cy + Math.sin(a - w) * r).toFixed(1)} L${(cx + Math.cos(a + w) * r).toFixed(1)} ${(cy + Math.sin(a + w) * r).toFixed(1)} Z `;
  }
  return `<path d="${d}" fill="${colour}" opacity="${opacity}"/>`;
};

/** Broad swirling arcs of light (a vortex backdrop). */
const swirl = (colour: string, opacity: number) =>
  `<g fill="none" stroke="${colour}" stroke-linecap="round" opacity="${opacity}" filter="url(#bl)"><path d="M6 30 C6 12 30 4 40 16" stroke-width="5"/><path d="M42 18 C44 36 22 46 10 34" stroke-width="4"/><path d="M14 16 C22 10 34 14 34 24" stroke-width="3"/></g>`;

/** The round emblem: backdrop, a subject, vignette and gloss. */
const icon = (theme: Theme, backdrop: string, subject: string) => {
  const [core, mid, edge] = THEME[theme];
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="ab-icon-svg"><defs>${MATERIALS}<radialGradient id="bg" cx="50%" cy="46%" r="60%"><stop offset="0" stop-color="${core}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${edge}"/></radialGradient></defs><g clip-path="url(#cp)"><circle cx="24" cy="24" r="24" fill="url(#bg)"/>${backdrop}${subject}<circle cx="24" cy="24" r="24" fill="url(#vg)"/><ellipse cx="20" cy="9" rx="15" ry="7" fill="url(#gs)"/></g><circle cx="24" cy="24" r="23" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.2"/></svg>`;
};

/** A shaded fist, knuckles toward +x, at (x, y), size `s`. */
const fist = (x: number, y: number, s: number, fill = 'url(#gr)', line = '#17181d') =>
  `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ds)"><rect x="-14" y="-4" width="7" height="11" rx="3.4" fill="${fill}" stroke="${line}" stroke-width="1.6"/><rect x="-11" y="-9" width="22" height="18" rx="7" fill="${fill}" stroke="${line}" stroke-width="2"/><path d="M-4 -8 V2 M2 -8 V2 M8 -7 V1" stroke="${line}" stroke-width="1.3" opacity=".6"/><path d="M-8 -6 C-3 -8.5 4 -8.5 8 -6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/></g>`;

/** A flame tongue from (x, y) upward. */
const tongue = (x: number, y: number, h: number, w: number) =>
  `<path d="M${x} ${y} C${x - w} ${y - h * 0.35} ${x - w * 0.2} ${y - h * 0.65} ${x + w * 0.15} ${y - h} C${x + w * 0.35} ${y - h * 0.6} ${x + w} ${y - h * 0.4} ${x} ${y}Z" fill="url(#fl)"/>`;

/** A knife along +x from (0,0), length ~34, inside a transform. */
const KNIFE = `<path d="M10 -3.4 H26 L36 0 L26 3.4 H10 Z" fill="url(#st)" stroke="#20242c" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 -1.8 H26 L33 0" stroke="#fff" stroke-width=".9" fill="none" opacity=".9"/><rect x="7.5" y="-5.2" width="3" height="10.4" rx="1.2" fill="#9aa3b2" stroke="#20242c" stroke-width=".8"/><rect x="-3" y="-3" width="11" height="6" rx="2.6" fill="url(#sh)" stroke="#000" stroke-width="1"/>`;

/** A hooded white mask (Shroud) centred at (x, y), scale s. */
const MASKED = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ds)"><path d="M-11 12 C-12 -2 -8 -12 0 -14 C8 -12 12 -2 11 12 Z" fill="#0b0b10" stroke="#000" stroke-width="1"/><ellipse cx="0" cy="0" rx="5.8" ry="8.2" fill="#f1eee7" stroke="#8f8a80" stroke-width=".8"/><ellipse cx="-1.2" cy="-3.6" rx="2.6" ry="1.4" fill="#fff"/><path d="M-3 -1 L2.8 -2.3 L2.4 -0.9 Z" fill="#101014"/><rect x="0.4" y="4.2" width="2.4" height="1" rx=".5" fill="#101014"/></g>`;

export const ABILITY_ICONS: Readonly<Record<string, string>> = {
  // ---------------- Inferno (fire) ----------------
  // Fireball: a molten sphere with a white-hot heart, its comet tail curling behind it.
  fireball: icon(
    'fire',
    rays(24, 24, 14, '#fff3c0', 0.18),
    `<path d="M4 33 C10 24 16 31 22 22 C19 33 27 36 33 26 L32 35 C22 43 9 42 4 33Z" fill="url(#fl)" filter="url(#gl)"/><circle cx="30" cy="22" r="11" fill="url(#fc)" stroke="#5a1003" stroke-width="1.4" filter="url(#gl)"/><ellipse cx="26.5" cy="17.5" rx="4" ry="2.6" fill="#fff" opacity=".75"/>`,
  ),
  // Flame Dash: a body of flame streaking forward into a burning arrowhead.
  'flame-dash': icon(
    'fire',
    rays(30, 24, 12, '#fff3c0', 0.14),
    `<path d="M3 24 C10 14 22 16 30 20 L30 28 C22 32 10 34 3 24 Z" fill="url(#fl)" filter="url(#gl)"/><path d="M8 24 C14 19 22 20 28 22.5" stroke="#fff6c8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/><path d="M27 10 L45 24 L27 38 L32 24 Z" fill="url(#fc)" stroke="#5a1003" stroke-width="1.6" stroke-linejoin="round" filter="url(#ds)"/>`,
  ),
  // Fire Beam: a white-hot column of fire pouring from a burning palm.
  'fire-beam': icon(
    'fire',
    rays(13, 24, 16, '#fff3c0', 0.16),
    `<rect x="14" y="15" width="36" height="18" rx="9" fill="#d63a0c" filter="url(#gl)"/><rect x="14" y="18" width="36" height="12" rx="6" fill="#ff9a1f"/><rect x="14" y="20.8" width="36" height="6.4" rx="3.2" fill="#ffe680"/><rect x="14" y="22.7" width="36" height="2.6" rx="1.3" fill="#fffef2"/><circle cx="13" cy="24" r="10" fill="url(#fc)" stroke="#5a1003" stroke-width="1.4" filter="url(#gl)"/><ellipse cx="10" cy="20" rx="3.4" ry="2.1" fill="#fff" opacity=".7"/>`,
  ),
  // Flame Detonation: a blinding core bursting into a ring of fire.
  'flame-detonation': icon(
    'fire',
    rays(24, 24, 18, '#fff6d0', 0.28),
    `<circle cx="24" cy="24" r="17" fill="none" stroke="url(#fl)" stroke-width="5" filter="url(#gl)" opacity=".9"/><circle cx="24" cy="24" r="11" fill="url(#fc)" filter="url(#gl)"/><circle cx="21" cy="20.5" r="4" fill="#fff" opacity=".9"/>`,
  ),
  // Blue Inferno: a dark figure wreathed in blue fire, arms thrown wide.
  'blue-fire': icon(
    'blue',
    rays(24, 26, 14, '#d8f0ff', 0.22),
    `<path d="M8 36 C10 22 16 18 24 6 C32 18 38 22 40 36 C34 32 30 34 24 40 C18 34 14 32 8 36 Z" fill="#2a8cff" filter="url(#gl)" opacity=".95"/><path d="M14 36 C16 26 20 22 24 13 C28 22 32 26 34 36 C30 33 27 34 24 38 C21 34 18 33 14 36 Z" fill="#9fdcff"/><g filter="url(#ds)"><circle cx="24" cy="22" r="4.6" fill="#06080f"/><path d="M24 26 V34 M24 28 L15 24 M24 28 L33 24 M24 34 L19 41 M24 34 L29 41" stroke="#06080f" stroke-width="3.2" stroke-linecap="round" fill="none"/></g>`,
  ),
  // Eruption: a fist slamming down into a fountain of fire.
  eruption: icon(
    'fire',
    rays(24, 40, 14, '#fff3c0', 0.2),
    `<ellipse cx="24" cy="42" rx="20" ry="5" fill="#3a0802"/>${tongue(12, 44, 16, 5)}${tongue(24, 44, 26, 8)}${tongue(36, 44, 16, 5)}<ellipse cx="24" cy="41.5" rx="11" ry="2.2" fill="#fffef2" opacity=".9" filter="url(#gl)"/><g transform="rotate(90 24 14)">${fist(24, 14, 0.62, 'url(#fc)', '#5a1003')}</g>`,
  ),
  // Inferno's combo: a fist wrapped in flame.
  'flaming-fist': icon(
    'fire',
    rays(24, 24, 12, '#fff3c0', 0.16),
    `${tongue(15, 38, 24, 6)}${tongue(24, 36, 30, 8)}${tongue(33, 38, 22, 6)}${fist(26, 25, 1, 'url(#fc)', '#5a1003')}`,
  ),
  // Blazing axe kick (heavy): a leg axing down in a blazing arc.
  'blazing-axe-kick': icon(
    'fire',
    rays(30, 38, 14, '#fff3c0', 0.18),
    `<path d="M8 8 C22 2 38 10 40 30" stroke="url(#fl)" stroke-width="7" fill="none" stroke-linecap="round" filter="url(#gl)"/><g filter="url(#ds)"><path d="M12 12 L30 33" stroke="#5a1003" stroke-width="8" stroke-linecap="round"/><path d="M12 12 L30 33" stroke="url(#fc)" stroke-width="5.5" stroke-linecap="round"/><ellipse cx="32" cy="35.5" rx="5.5" ry="3.4" transform="rotate(48 32 35.5)" fill="url(#fc)" stroke="#5a1003" stroke-width="1.4"/></g><ellipse cx="34" cy="42" rx="10" ry="2.4" fill="#fffef2" opacity=".85" filter="url(#gl)"/>`,
  ),
  // ---------------- Braxon (earth) ----------------
  // Ground Smash: two stone fists hammering cracked ground.
  'ground-smash': icon(
    'earth',
    rays(24, 38, 12, '#fff6e0', 0.18),
    `<path d="M0 39 H48 V48 H0 Z" fill="#2a1d10"/><path d="M24 39 L18 48 M24 39 L31 48 M24 39 L11 46 M24 39 L38 46" stroke="#f3e3c2" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>${fist(15, 27, 0.78)}${fist(33, 27, 0.78)}`,
  ),
  // Rampage Charge: a hulking shoulder driving forward in a cloud of dust.
  'rampage-charge': icon(
    'earth',
    rays(34, 24, 12, '#fff6e0', 0.16),
    `<ellipse cx="12" cy="36" rx="14" ry="8" fill="#f3e3c2" opacity=".35" filter="url(#bl)"/><g filter="url(#ds)"><path d="M10 34 C12 18 24 11 36 16 C42 19 44 25 40 30 C35 35 22 36 14 38 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="35" cy="11" r="6.4" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><circle cx="39" cy="23" r="6.6" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/></g>`,
  ),
  // Crushing Strike: a huge stone fist slamming onto a bright impact star.
  'crushing-strike': icon(
    'earth',
    rays(24, 33, 16, '#fff6e0', 0.26),
    `<path d="M24 46 L27.5 38 L36 41 L31.5 34 L41 31 L31.5 28.5 L33.5 20.5 L26.5 26.5 L24 18.5 L21.5 26.5 L14.5 20.5 L16.5 28.5 L7 31 L16.5 34 L12 41 L20.5 38 Z" fill="#fff6e0" filter="url(#gl)"/><g transform="rotate(90 24 15)">${fist(24, 15, 0.9)}</g>`,
  ),
  // Rampage Mode: a flexing silhouette in a blood-red aura.
  'rampage-mode': icon(
    'blood',
    rays(24, 26, 16, '#ffd0c8', 0.22),
    `<g filter="url(#ds)"><path d="M15 30 C8 30 3.5 24 5.5 16 C6.5 11.5 11 11.5 12 16 C12 20 14 22 17 22" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><path d="M33 30 C40 30 44.5 24 42.5 16 C41.5 11.5 37 11.5 36 16 C36 20 34 22 31 22" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 22 C14 20 34 20 34 22 L32 46 C28 48 20 48 16 46 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="24" cy="13" r="7" fill="url(#gr)" stroke="#17181d" stroke-width="1.8"/></g>`,
  ),
  // Grapple Slam: a stone hand driving a small figure down into the ground.
  'grapple-slam': icon(
    'earth',
    rays(24, 40, 12, '#fff6e0', 0.2),
    `<path d="M0 41 H48 V48 H0 Z" fill="#2a1d10"/><ellipse cx="24" cy="40" rx="14" ry="4" fill="#f3e3c2" opacity=".55" filter="url(#bl)"/><g filter="url(#ds)" stroke="#20242c" stroke-width="1.2"><circle cx="16" cy="35" r="3.6" fill="#e6e9f0"/><path d="M19 34 L31 31 M24 33 L22 27 M24 33 L28 38 M31 31 L35 27 M31 31 L36 36" stroke="#e6e9f0" stroke-width="2.6" stroke-linecap="round"/></g>${fist(28, 16, 0.85)}`,
  ),
  // Braxon's combo: a heavy stone fist.
  'heavy-fist': icon('earth', rays(30, 24, 14, '#fff6e0', 0.2), `${fist(22, 25, 1.15)}`),
  // Sledgehammer (heavy): both fists locked together, raised for the blow.
  sledgehammer: icon(
    'earth',
    rays(24, 30, 14, '#fff6e0', 0.22),
    `<g transform="rotate(-90 24 24)">${fist(24, 17, 0.85)}${fist(24, 31, 0.85)}</g>`,
  ),
  // ---------------- Necro (soul) ----------------
  // Soul Drain: a violet soul orb trailing ghostly wisps.
  'soul-drain': icon(
    'soul',
    swirl('#e8dcff', 0.4),
    `<path d="M3 34 C11 26 15 36 21 28 C18 38 26 40 30 32 L30 30 C24 34 16 30 3 34 Z" fill="#c9a6ff" opacity=".8" filter="url(#gl)"/><circle cx="31" cy="23" r="11.5" fill="url(#sl)" stroke="#1a0826" stroke-width="1.4" filter="url(#gl)"/><ellipse cx="27.5" cy="18.5" rx="4" ry="2.6" fill="#fff" opacity=".75"/>`,
  ),
  // Death Eruption: bone spikes bursting from violet-lit ground.
  'death-eruption': icon(
    'soul',
    rays(24, 42, 14, '#e8dcff', 0.2),
    `<path d="M0 42 H48 V48 H0 Z" fill="#170622"/><g filter="url(#ds)" fill="url(#bn)" stroke="#2a241c" stroke-width="1.3" stroke-linejoin="round"><path d="M6 43 L11 18 L16 43 Z"/><path d="M17 43 L24 9 L31 43 Z"/><path d="M32 43 L37 20 L42 43 Z"/></g><ellipse cx="24" cy="42" rx="20" ry="2.6" fill="#c9a6ff" opacity=".8" filter="url(#gl)"/>`,
  ),
  // Curse of Decay: a rotting green orb with a cracked skull in it, dripping, over a sour swirl.
  'curse-of-decay': icon(
    'decay',
    swirl('#e8ffc0', 0.42),
    `<g filter="url(#gl)"><circle cx="24" cy="22" r="12.5" fill="url(#dc)" stroke="#0f1608" stroke-width="1.4"/></g><g fill="#101a08" opacity=".85"><ellipse cx="20" cy="21" rx="2.6" ry="3.1"/><ellipse cx="28" cy="21" rx="2.6" ry="3.1"/><path d="M22.5 27 L24 25 L25.5 27 Z"/></g><path d="M24 10 L22.5 15 L25 17" stroke="#101a08" stroke-width="1.2" fill="none"/><g fill="#a8d84c"><path d="M15 31 C15 37 13 38 13 40 C13 42 17 42 17 40 C17 38 15 37 15 31 Z"/><path d="M31 33 C31 38 29.5 39 29.5 40.5 C29.5 42.2 32.5 42.2 32.5 40.5 C32.5 39 31 38 31 33 Z"/></g><ellipse cx="20" cy="16.5" rx="4" ry="2.4" fill="#fff" opacity=".55"/>`,
  ),
  // Undead Army: three skulls rising out of violet earth.
  'undead-army': icon(
    'soul',
    rays(24, 30, 14, '#e8dcff', 0.18),
    `<path d="M0 41 H48 V48 H0 Z" fill="#170622"/><g fill="url(#bn)" stroke="#2a241c" stroke-width="1.4" filter="url(#ds)"><circle cx="11" cy="31" r="6.4"/><circle cx="24" cy="21" r="8"/><circle cx="37" cy="31" r="6.4"/><rect x="8" y="35" width="7" height="5.5" rx="1.6"/><rect x="20" y="27" width="8" height="6.5" rx="1.6"/><rect x="34" y="35" width="7" height="5.5" rx="1.6"/></g><g fill="#160f1f"><ellipse cx="9" cy="31" rx="1.7" ry="2.1"/><ellipse cx="13" cy="31" rx="1.7" ry="2.1"/><ellipse cx="21.3" cy="21" rx="2.2" ry="2.6"/><ellipse cx="26.7" cy="21" rx="2.2" ry="2.6"/><ellipse cx="35" cy="31" rx="1.7" ry="2.1"/><ellipse cx="39" cy="31" rx="1.7" ry="2.1"/></g>`,
  ),
  // Grave Chains: heavy spectral chain links ending in a bone hook.
  'grave-chains': icon(
    'soul',
    swirl('#e8dcff', 0.35),
    `<g fill="none" stroke-width="3.6" stroke-linecap="round" filter="url(#gl)"><ellipse cx="10" cy="37" rx="5.6" ry="3.6" transform="rotate(-35 10 37)" stroke="#e8dcff"/><ellipse cx="18.5" cy="31" rx="5.6" ry="3.6" transform="rotate(-35 18.5 31)" stroke="#a970ff"/><ellipse cx="27" cy="25" rx="5.6" ry="3.6" transform="rotate(-35 27 25)" stroke="#e8dcff"/></g><path d="M31 21 C38 13 45 18 41 25 C39 28.5 34 27.5 34 24" stroke="#2a241c" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M31 21 C38 13 45 18 41 25 C39 28.5 34 27.5 34 24" stroke="url(#bn)" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ),
  // Necro's combo: a bone staff sweeping round in a violet arc.
  'staff-swing': icon(
    'soul',
    swirl('#e8dcff', 0.35),
    `<path d="M6 36 C6 18 22 8 40 11" stroke="#c9a6ff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".75" filter="url(#gl)"/><g filter="url(#ds)"><path d="M12 45 L33 15" stroke="#2a241c" stroke-width="6" stroke-linecap="round"/><path d="M12 45 L33 15" stroke="url(#bn)" stroke-width="3.6" stroke-linecap="round"/><circle cx="35" cy="12" r="7" fill="url(#bn)" stroke="#2a241c" stroke-width="1.6"/></g><circle cx="32.6" cy="11.5" r="1.6" fill="#a970ff"/><circle cx="37.4" cy="11.5" r="1.6" fill="#a970ff"/>`,
  ),
  // Soul Rend (heavy): a staff thrust bursting into a ring of soul fire.
  'soul-rend': icon(
    'soul',
    rays(32, 18, 16, '#f6eeff', 0.24),
    `<circle cx="32" cy="18" r="9" fill="url(#sl)" filter="url(#gl)"/><g filter="url(#ds)"><path d="M8 42 L28 22" stroke="#2a241c" stroke-width="6" stroke-linecap="round"/><path d="M8 42 L28 22" stroke="url(#bn)" stroke-width="3.6" stroke-linecap="round"/></g><circle cx="30" cy="16" r="3.4" fill="#fff" opacity=".85"/>`,
  ),
  // ---------------- Shroud (blood and shadow) ----------------
  // Bloodfade: a knife driven in with a burst of blood, the mask springing away behind a back arrow.
  bloodfade: icon(
    'shade',
    rays(36, 26, 12, '#ffd0c8', 0.16),
    `<circle cx="38" cy="28" r="7" fill="#a30d16" opacity=".85" filter="url(#gl)"/><circle cx="44" cy="22" r="2.4" fill="#e5242e"/><circle cx="46" cy="32" r="1.8" fill="#e5242e"/><circle cx="40" cy="38" r="1.6" fill="#a30d16"/><g opacity=".9">${MASKED(16, 24, 0.9)}</g><path d="M14 42 L6 42 M6 42 L10 38 M6 42 L10 46" stroke="#c9cfdc" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><g transform="translate(26 30) rotate(-8) scale(.5)" filter="url(#ds)">${KNIFE}</g>`,
  ),
  // Stalker Lunge: the masked figure darting forward, three red stab marks ahead of the knife.
  'stalker-lunge': icon(
    'shade',
    rays(34, 22, 12, '#ffd0c8', 0.14),
    `<path d="M6 40 C14 30 28 24 44 24" stroke="#ec2a34" stroke-width="4" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".9"/>${MASKED(20, 22, 1)}<g transform="translate(28 30) rotate(-12) scale(.5)" filter="url(#ds)">${KNIFE}</g><g fill="#e5242e"><circle cx="48" cy="18" r="2"/><circle cx="52" cy="24" r="2"/><circle cx="48" cy="30" r="2"/></g>`,
  ),
  // Behind You: the mask rising out of shadow, a knife raised.
  'behind-you': icon(
    'shade',
    swirl('#9a9aae', 0.4),
    `${MASKED(22, 24, 1.25)}<g transform="translate(30 36) rotate(-62) scale(.55)" filter="url(#ds)">${KNIFE}</g>`,
  ),
  // Bastion Anchor (Titan, B13): a heavy stone shield planted in cracked ground, braced against the push.
  'bastion-anchor': icon(
    'earth',
    rays(24, 30, 14, '#fff6e0', 0.18),
    `<path d="M0 38 H48 V48 H0 Z" fill="#2a1d10"/><path d="M6 38 L14 33 L20 39 L26 33 L32 39 L42 34" stroke="#f3e3c2" stroke-width="1.6" fill="none" opacity=".7"/><g filter="url(#ds)"><path d="M24 6 L39 11 C39 25 35 34 24 41 C13 34 9 25 9 11 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 11 L34 14.5 C34 24 31 30 24 35 C17 30 14 24 14 14.5 Z" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45"/><path d="M24 14 V32 M17 22 H31" stroke="#17181d" stroke-width="2.4" stroke-linecap="round" opacity=".7"/></g>`,
  ),
  // Soul Tether (Necro, B13): two bound souls joined by a looping, glowing cord.
  'soul-tether': icon(
    'soul',
    swirl('#e8dcff', 0.35),
    `<path d="M12 33 C14 18 22 40 26 24 C28 14 34 20 35 15" stroke="#c9a6ff" stroke-width="3.2" fill="none" stroke-linecap="round" filter="url(#gl)"/><path d="M12 33 C14 18 22 40 26 24 C28 14 34 20 35 15" stroke="#fbf6ff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/><circle cx="11" cy="34" r="7.5" fill="url(#sl)" stroke="#1a0826" stroke-width="1.4" filter="url(#gl)"/><circle cx="36" cy="14" r="6" fill="none" stroke="#e8dcff" stroke-width="2.4" filter="url(#gl)"/><circle cx="36" cy="14" r="2.4" fill="#fbf6ff"/><ellipse cx="8.5" cy="30.5" rx="2.8" ry="1.8" fill="#fff" opacity=".7"/>`,
  ),
  // Death Mark (Shroud, 20/11/2026): a red sigil, a ringed eye with a blade through it, over the masked hunter.
  'death-mark': icon(
    'blood',
    rays(24, 22, 14, '#ffd0c8', 0.18),
    `<g opacity=".85">${MASKED(24, 30, 1.1)}</g><g filter="url(#gl)" fill="none" stroke-linecap="round"><circle cx="24" cy="15" r="9" stroke="#fff0ee" stroke-width="3.4"/><path d="M24 4 L24 26 M16 9 L32 21 M32 9 L16 21" stroke="#fff0ee" stroke-width="2.6"/></g><g fill="none" stroke-linecap="round"><circle cx="24" cy="15" r="9" stroke="#ec2a34" stroke-width="1.8"/><path d="M24 4 L24 26 M16 9 L32 21 M32 9 L16 21" stroke="#ec2a34" stroke-width="1.4"/></g>`,
  ),
  // Rending Flurry: three crossing slashes of blood.
  'rending-flurry': icon(
    'blood',
    rays(24, 24, 12, '#ffd0c8', 0.14),
    `<g filter="url(#gl)" stroke-linecap="round" fill="none"><path d="M8 10 C18 18 28 26 40 36" stroke="#fff0ee" stroke-width="4.4"/><path d="M5 24 C17 26 29 28 43 26" stroke="#fff0ee" stroke-width="3.6"/><path d="M10 38 C20 30 30 22 40 10" stroke="#fff0ee" stroke-width="4"/></g><g stroke-linecap="round" fill="none"><path d="M8 10 C18 18 28 26 40 36" stroke="#ec2a34" stroke-width="2"/><path d="M5 24 C17 26 29 28 43 26" stroke="#ec2a34" stroke-width="1.6"/><path d="M10 38 C20 30 30 22 40 10" stroke="#ec2a34" stroke-width="1.8"/></g>`,
  ),
  // Hunting Frenzy: the masked hunter wreathed in red, blood dripping.
  'hunting-frenzy': icon(
    'blood',
    rays(24, 22, 16, '#ffd0c8', 0.24),
    `${MASKED(24, 25, 1.35)}<g fill="#7a0a10" stroke="#3a0306" stroke-width=".6"><path d="M9 30 C9 33 11 34 11 34 C11 34 13 33 13 30 C13 28 11 26 11 26 C11 26 9 28 9 30 Z"/><path d="M35 36 C35 39 37 40 37 40 C37 40 39 39 39 36 C39 34 37 32 37 32 C37 32 35 34 35 36 Z"/></g>`,
  ),
  // ---------------- Vexoris (toxic green) ----------------
  // Karate combo: a gloved fist and a kick leaving green streaks.
  'karate-combo': icon(
    'toxin',
    rays(26, 24, 12, '#d8ffb0', 0.16),
    `<path d="M6 34 C12 20 26 14 42 18" stroke="#7dff3a" stroke-width="4.5" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".9"/>${fist(24, 26, 1)}`,
  ),
  // Back-pocket jar smash (heavy): a glowing jar mid-swing, shattering in a green burst.
  'jar-smash': icon(
    'toxin',
    rays(30, 20, 14, '#d8ffb0', 0.22),
    `<circle cx="30" cy="18" r="9" fill="#7dff3a" opacity=".5" filter="url(#bl)"/><path d="M8 8 C16 8 24 12 28 18" stroke="#7dff3a" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".8"/><g filter="url(#ds)"><path d="M26 14 L33 12 L35 19 L30 24 L26 22 Z" fill="url(#dc)" stroke="#16200a" stroke-width="1.4"/><rect x="28" y="8" width="7" height="4" rx="1.4" fill="#4b4d57" stroke="#17181d" stroke-width="1.1" transform="rotate(-18 31 10)"/></g><g fill="#e6fbea" stroke="#16200a" stroke-width=".6"><path d="M38 24 L43 22 L41 28 Z"/><path d="M33 30 L36 35 L30 34 Z"/><path d="M40 32 L44 36 L38 37 Z"/></g><g fill="#7dff3a" filter="url(#gl)"><circle cx="22" cy="32" r="2.4"/><circle cx="28" cy="38" r="3"/><circle cx="16" cy="38" r="2"/></g>`,
  ),
  'axe-kick': icon(
    'toxin',
    rays(26, 20, 14, '#d8ffb0', 0.2),
    `<path d="M14 6 C26 10 30 24 28 38" stroke="#7dff3a" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".85"/><path d="M26 36 L40 36 L38 42 L22 42 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.6" filter="url(#ds)"/>`,
  ),
  'venom-spray': icon(
    'toxin',
    rays(10, 26, 12, '#d8ffb0', 0.2),
    `<g filter="url(#gl)" fill="#7dff3a"><circle cx="22" cy="20" r="3.4" opacity=".9"/><circle cx="30" cy="26" r="4.4" opacity=".8"/><circle cx="26" cy="33" r="3" opacity=".9"/><circle cx="37" cy="22" r="3.2" opacity=".7"/><circle cx="38" cy="32" r="4" opacity=".6"/></g><rect x="5" y="22" width="11" height="8" rx="3" fill="url(#gr)" stroke="#17181d" stroke-width="1.4"/><path d="M16 26 H22" stroke="#b9bfcc" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  'toxic-jar': icon(
    'toxin',
    rays(24, 28, 12, '#d8ffb0', 0.18),
    `<g filter="url(#ds)"><path d="M17 14 H31 V18 C35 21 36 27 36 33 C36 40 31 43 24 43 C17 43 12 40 12 33 C12 27 13 21 17 18 Z" fill="url(#dc)" stroke="#16200a" stroke-width="1.6"/><rect x="16" y="9" width="16" height="6" rx="2" fill="#4b4d57" stroke="#17181d" stroke-width="1.4"/><path d="M17 24 C17 30 19 36 22 40" stroke="#fff" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/></g>`,
  ),
  'chemical-trap': icon(
    'toxin',
    rays(24, 30, 12, '#d8ffb0', 0.2),
    `<ellipse cx="24" cy="38" rx="17" ry="5" fill="#7dff3a" opacity=".35" filter="url(#bl)"/><g filter="url(#ds)"><rect x="17" y="22" width="14" height="17" rx="5" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><rect x="21" y="17" width="6" height="6" rx="2" fill="#4b4d57" stroke="#17181d" stroke-width="1.3"/><path d="M20 30 H28 M20 34 H28" stroke="#7dff3a" stroke-width="2.2" stroke-linecap="round"/></g><g fill="#7dff3a" filter="url(#gl)" opacity=".8"><circle cx="14" cy="26" r="3"/><circle cx="34" cy="22" r="3.6"/><circle cx="38" cy="32" r="2.6"/></g>`,
  ),
  'vapor-step': icon(
    'toxin',
    rays(14, 26, 10, '#d8ffb0', 0.14),
    `<g opacity=".5" filter="url(#bl)"><circle cx="12" cy="28" r="9" fill="#9ab87a"/><circle cx="22" cy="24" r="7" fill="#9ab87a"/></g><path d="M6 36 C18 30 30 26 42 14" stroke="#7dff3a" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".85"/><g filter="url(#ds)"><circle cx="34" cy="17" r="4.2" fill="#2e3226" stroke="#0b0e07" stroke-width="1.4"/><circle cx="32.8" cy="16" r="1.4" fill="#7dff3a"/><circle cx="36.4" cy="16.2" r="1.2" fill="#7dff3a"/></g>`,
  ),
  grenade: icon(
    'toxin',
    rays(24, 26, 16, '#ffe9a8', 0.22),
    `<circle cx="24" cy="28" r="15" fill="#ffb347" opacity=".3" filter="url(#bl)"/><g filter="url(#ds)"><ellipse cx="24" cy="29" rx="11.5" ry="13" fill="#4a5a30" stroke="#10160b" stroke-width="1.8"/><path d="M14 24 H34 M14 29 H34 M14 34 H34 M24 17 V41" stroke="#2c3820" stroke-width="1.5" fill="none"/><rect x="20" y="12" width="8" height="6" rx="1.5" fill="#6d6f7a" stroke="#17181d" stroke-width="1.4"/><path d="M28 14 C34 10 38 12 38 17" stroke="#c9d1b0" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="38" cy="19" r="3" fill="none" stroke="#c9d1b0" stroke-width="1.8"/></g><ellipse cx="19" cy="25" rx="2.6" ry="4" fill="#fff" opacity=".28"/>`,
  ),
  'sky-dive': icon(
    'wind',
    rays(24, 26, 14, '#ffffff', 0.25),
    `<path d="M10 8 C14 18 20 26 30 38" stroke="#bfe2ff" stroke-width="4" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".7"/><g filter="url(#ds)"><path d="M32 36 L26 18 C20 22 14 24 8 20 C16 30 24 38 32 36Z" fill="#eef6ff" stroke="#26323f" stroke-width="1.6"/><path d="M32 36 L36 22 C40 24 42 28 42 34 C38 38 34 38 32 36Z" fill="#d4eeff" stroke="#26323f" stroke-width="1.6"/></g><ellipse cx="32" cy="41" rx="10" ry="3" fill="#bfe2ff" opacity=".5" filter="url(#bl)"/>`,
  ),
  'wind-blade': icon(
    'wind',
    rays(24, 24, 14, '#ffffff', 0.2),
    `<circle cx="24" cy="24" r="16" fill="none" stroke="#bfe2ff" stroke-width="2" stroke-dasharray="4 5" opacity=".7" filter="url(#gl)"/><g filter="url(#ds)"><path d="M24 24 C28 12 38 8 44 12 C40 20 32 26 24 24Z" fill="#f2f8ff" stroke="#26323f" stroke-width="1.5"/><path d="M24 24 C20 36 10 40 4 36 C8 28 16 22 24 24Z" fill="#cfe3f6" stroke="#26323f" stroke-width="1.5"/></g><circle cx="24" cy="24" r="3" fill="#ffffff"/>`,
  ),
  'tornado-surge': icon(
    'wind',
    rays(24, 24, 14, '#ffffff', 0.2),
    `<g fill="none" stroke="#d4eeff" stroke-width="3" stroke-linecap="round" filter="url(#gl)"><path d="M10 10 C20 6 34 8 38 12"/><path d="M13 18 C22 14 32 16 35 20"/><path d="M16 26 C23 23 30 24 32 28"/><path d="M19 33 C24 31 28 32 29 35"/></g><g filter="url(#ds)"><circle cx="24" cy="12" r="3.4" fill="#eef6ff" stroke="#26323f" stroke-width="1.4"/></g>`,
  ),
  tailwind: icon(
    'wind',
    rays(24, 24, 14, '#ffffff', 0.18),
    `<g fill="none" stroke="#bfe2ff" stroke-width="3" stroke-linecap="round" filter="url(#gl)"><path d="M4 18 H30 C36 18 36 10 30 10"/><path d="M6 26 H36 C42 26 42 34 36 34"/><path d="M10 34 H22"/></g><g filter="url(#ds)"><path d="M30 24 C36 14 42 12 44 8 C44 18 40 28 32 30Z" fill="#eef6ff" stroke="#26323f" stroke-width="1.5"/></g>`,
  ),
  'feather-guard': icon(
    'wind',
    rays(24, 24, 14, '#ffffff', 0.18),
    `<g filter="url(#ds)"><path d="M24 6 C10 10 8 26 14 40 C20 36 24 30 24 24 C24 30 28 36 34 40 C40 26 38 10 24 6Z" fill="#eef6ff" stroke="#26323f" stroke-width="1.8"/><path d="M24 10 V38 M17 14 C15 22 16 30 19 36 M31 14 C33 22 32 30 29 36" stroke="#8fc4f4" stroke-width="1.6" fill="none"/></g>`,
  ),
  'celestial-tempest': icon(
    'wind',
    rays(24, 24, 18, '#ffffff', 0.3),
    `<g fill="none" stroke="#d4eeff" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="6"/><path d="M24 24 m-11 0 a11 11 0 1 1 11 11"/><path d="M24 24 m-17 0 a17 17 0 1 1 17 17" opacity=".7"/></g><circle cx="24" cy="24" r="3" fill="#ffffff"/>`,
  ),
  'wing-combo': icon(
    'wind',
    rays(24, 24, 14, '#ffffff', 0.15),
    `<path d="M6 36 C12 18 28 8 42 10 C34 16 24 24 18 38Z" fill="#eef6ff" stroke="#26323f" stroke-width="1.6" filter="url(#ds)"/><path d="M14 34 C20 22 30 16 38 14 M18 38 C22 28 28 22 34 18" stroke="#8fc4f4" stroke-width="1.6" fill="none"/>`,
  ),
  'wing-smash': icon(
    'wind',
    rays(24, 28, 16, '#ffffff', 0.25),
    `<g filter="url(#ds)"><path d="M24 8 C14 8 6 14 4 24 C12 20 18 22 24 30 C30 22 36 20 44 24 C42 14 34 8 24 8Z" fill="#eef6ff" stroke="#26323f" stroke-width="1.6"/></g><ellipse cx="24" cy="38" rx="16" ry="4" fill="#bfe2ff" opacity=".6" filter="url(#bl)"/><path d="M10 38 H38" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  ),
  'sliding-slice': icon(
    'steel',
    rays(24, 26, 14, '#ffffff', 0.2),
    `<path d="M4 38 H44" stroke="#ff6a72" stroke-width="3" opacity=".55" filter="url(#gl)"/><g filter="url(#ds)"><path d="M8 34 L42 22" stroke="#eef2f7" stroke-width="4.5" stroke-linecap="round"/><path d="M10 40 C16 36 24 38 30 36" stroke="#cfd7e2" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="6" y="31" width="8" height="5" rx="1.5" fill="#6a1520" stroke="#1a0508" stroke-width="1.2" transform="rotate(-20 10 33)"/></g><path d="M16 44 H40" stroke="#ffd0d4" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
  ),
  'perfect-parry': icon(
    'steel',
    rays(24, 24, 16, '#ffffff', 0.3),
    `<g filter="url(#ds)"><path d="M8 38 L36 10" stroke="#eef2f7" stroke-width="5" stroke-linecap="round"/><path d="M8 10 L36 38" stroke="#cfd7e2" stroke-width="5" stroke-linecap="round"/></g><circle cx="22" cy="24" r="6" fill="#ffffff" filter="url(#gl)"/><g stroke="#ff6a72" stroke-width="2" stroke-linecap="round"><path d="M22 10 V4 M22 44 V38 M8 24 H2 M42 24 H36"/></g>`,
  ),
  'blade-tempest': icon(
    'steel',
    rays(24, 24, 16, '#ffffff', 0.25),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M6 12 L40 8" stroke="#ffd0d4" stroke-width="2.6"/><path d="M8 20 L44 22" stroke="#ff6a72" stroke-width="2.6"/><path d="M6 30 L40 38" stroke="#ffd0d4" stroke-width="2.6"/><path d="M10 40 L36 14" stroke="#ff6a72" stroke-width="2.6"/><path d="M24 6 L24 44" stroke="#ffffff" stroke-width="2.6"/></g>`,
  ),
  'focus-stance': icon(
    'steel',
    rays(24, 24, 14, '#ffffff', 0.15),
    `<circle cx="24" cy="24" r="14" fill="none" stroke="#ff6a72" stroke-width="2" opacity=".7" filter="url(#gl)"/><g filter="url(#ds)"><path d="M14 40 L24 8 L34 40" fill="none" stroke="#eef2f7" stroke-width="4" stroke-linecap="round"/></g><circle cx="24" cy="24" r="3" fill="#ff6a72" filter="url(#gl)"/>`,
  ),
  'iaido-draw': icon(
    'steel',
    rays(24, 24, 14, '#ffffff', 0.2),
    `<path d="M4 30 H44" stroke="#ff6a72" stroke-width="3" opacity=".6" filter="url(#gl)"/><g filter="url(#ds)"><path d="M8 34 L40 14" stroke="#eef2f7" stroke-width="4.5" stroke-linecap="round"/><rect x="6" y="32" width="8" height="5" rx="1.5" fill="#6a1520" stroke="#1a0508" stroke-width="1.2" transform="rotate(-32 10 34)"/></g>`,
  ),
  'final-judgement': icon(
    'steel',
    rays(24, 24, 18, '#ffffff', 0.3),
    `<g stroke-linecap="round" filter="url(#gl)" fill="none"><path d="M8 8 L40 40" stroke="#ff6a72" stroke-width="3.2"/><path d="M40 8 L8 40" stroke="#ffd0d4" stroke-width="3.2"/><path d="M24 4 V44" stroke="#ffffff" stroke-width="3.2"/><path d="M4 24 H44" stroke="#ff6a72" stroke-width="3.2"/></g><circle cx="24" cy="24" r="4" fill="#ffffff" filter="url(#gl)"/>`,
  ),
  'katana-combo': icon(
    'steel',
    rays(24, 24, 14, '#ffffff', 0.15),
    `<g filter="url(#ds)"><path d="M6 40 L36 8" stroke="#eef2f7" stroke-width="4" stroke-linecap="round"/><path d="M12 42 L42 14" stroke="#cfd7e2" stroke-width="4" stroke-linecap="round"/></g><path d="M8 36 C16 22 28 14 40 12" stroke="#ff6a72" stroke-width="2.4" fill="none" opacity=".7" filter="url(#gl)"/>`,
  ),
  'overhead-cut': icon(
    'steel',
    rays(24, 26, 16, '#ffffff', 0.25),
    `<path d="M24 4 V40" stroke="#ff6a72" stroke-width="4" opacity=".6" filter="url(#gl)"/><g filter="url(#ds)"><path d="M24 6 V38" stroke="#eef2f7" stroke-width="5" stroke-linecap="round"/><rect x="18" y="34" width="12" height="4" rx="1.5" fill="#6a1520" stroke="#1a0508" stroke-width="1.2"/></g><ellipse cx="24" cy="42" rx="14" ry="3" fill="#ff6a72" opacity=".4" filter="url(#bl)"/>`,
  ),
  'gravity-vortex': icon(
    'psi',
    swirl('#f4eaff', 0.3),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M8 16 C26 6 42 16 38 27 C34 37 17 34 17 24 C17 18 28 18 28 24" stroke="#c7a1ff" stroke-width="3.6"/><path d="M8 34 C14 43 32 45 41 36" stroke="#8a4fe0" stroke-width="2.6"/></g><circle cx="24" cy="24" r="2.4" fill="#f4eaff"/>`,
  ),
  'telekinetic-toss': icon(
    'psi',
    rays(24, 24, 14, '#f4eaff', 0.2),
    `<g filter="url(#ds)"><rect x="14" y="22" width="20" height="13" rx="2" fill="#2c2640" stroke="#c7a1ff" stroke-width="1.8"/><path d="M18 22 V17 H30 V22" fill="none" stroke="#8a4fe0" stroke-width="1.6"/></g><g fill="none" stroke="#c7a1ff" stroke-width="2.4" stroke-linecap="round" filter="url(#gl)"><path d="M24 12 V4 M20 8 L24 4 L28 8"/><path d="M8 40 C14 44 34 44 40 40" opacity=".7"/></g>`,
  ),
  'psychic-rupture': icon(
    'psi',
    rays(24, 24, 14, '#f4eaff', 0.2),
    `<g fill="none" stroke="#c7a1ff" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"><path d="M14 10 C22 18 22 30 14 38"/><path d="M22 8 C32 18 32 30 22 40" opacity=".8"/><path d="M30 6 C42 18 42 30 30 42" opacity=".6"/></g><g filter="url(#ds)"><circle cx="9" cy="24" r="4.5" fill="#2c2640" stroke="#f4eaff" stroke-width="1.8"/></g>`,
  ),
  'floating-prison': icon(
    'psi',
    rays(24, 28, 14, '#f4eaff', 0.2),
    `<g fill="none" stroke="#c7a1ff" stroke-width="2.4" stroke-linecap="round" filter="url(#gl)"><ellipse cx="24" cy="14" rx="12" ry="4"/><ellipse cx="24" cy="24" rx="14" ry="5"/><ellipse cx="24" cy="34" rx="12" ry="4"/></g><g filter="url(#ds)"><circle cx="24" cy="22" r="4" fill="#2c2640" stroke="#f4eaff" stroke-width="1.6"/><path d="M24 26 V32" stroke="#f4eaff" stroke-width="2"/></g>`,
  ),
  'gravity-well': icon(
    'psi',
    rays(24, 24, 16, '#f4eaff', 0.3),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="4" stroke="#f4eaff" stroke-width="3"/><path d="M24 4 L24 14 M20 10 L24 14 L28 10 M24 44 L24 34 M20 38 L24 34 L28 38 M4 24 L14 24 M10 20 L14 24 L10 28 M44 24 L34 24 M38 20 L34 24 L38 28" stroke="#c7a1ff" stroke-width="2.6"/></g>`,
  ),
  mindstorm: icon(
    'psi',
    rays(24, 24, 18, '#f4eaff', 0.3),
    `<g filter="url(#ds)"><rect x="8" y="10" width="8" height="8" rx="1" fill="#2c2640" stroke="#c7a1ff" stroke-width="1.4" transform="rotate(18 12 14)"/><rect x="31" y="8" width="7" height="7" rx="1" fill="#2c2640" stroke="#c7a1ff" stroke-width="1.4" transform="rotate(-22 34 12)"/><rect x="10" y="32" width="9" height="7" rx="1" fill="#2c2640" stroke="#8a4fe0" stroke-width="1.4" transform="rotate(-12 14 35)"/><rect x="32" y="31" width="7" height="8" rx="1" fill="#2c2640" stroke="#8a4fe0" stroke-width="1.4" transform="rotate(26 35 35)"/></g><circle cx="24" cy="24" r="6" fill="#f4eaff" filter="url(#gl)"/><circle cx="24" cy="24" r="12" fill="none" stroke="#c7a1ff" stroke-width="2" opacity=".7"/>`,
  ),
  'psi-combo': icon(
    'psi',
    rays(24, 24, 14, '#f4eaff', 0.15),
    `<g filter="url(#gl)" fill="#c7a1ff"><circle cx="14" cy="30" r="6"/><circle cx="32" cy="18" r="6" opacity=".8"/><circle cx="20" cy="12" r="3" opacity=".6"/></g><g fill="none" stroke="#f4eaff" stroke-width="2" stroke-linecap="round"><path d="M6 38 L22 24 M20 34 L38 12"/></g>`,
  ),
  'force-wave': icon(
    'psi',
    rays(24, 24, 16, '#f4eaff', 0.25),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M10 10 C26 14 26 34 10 38" stroke="#c7a1ff" stroke-width="3"/><path d="M18 10 C34 16 34 32 18 38" stroke="#8a4fe0" stroke-width="3" opacity=".8"/><path d="M26 12 C40 18 40 30 26 36" stroke="#f4eaff" stroke-width="2.6" opacity=".7"/></g>`,
  ),
  'rocket-fist': icon(
    'gear',
    rays(24, 24, 15, '#fff1d6', 0.25),
    `<g filter="url(#ds)"><rect x="4" y="21" width="16" height="6" rx="2" fill="#3a3f48" stroke="#8a919d" stroke-width="1.4"/><rect x="22" y="15" width="18" height="18" rx="4" fill="#586070" stroke="#c9ced8" stroke-width="2"/></g><g fill="#ff7a1a" filter="url(#gl)"><path d="M4 24 L-2 20 L-2 28 Z"/></g><g stroke="#15171b" stroke-width="1.6"><path d="M28 18 V30 M34 18 V30"/></g>`,
  ),
  'combat-drone': icon(
    'gear',
    rays(24, 22, 14, '#fff1d6', 0.2),
    `<g filter="url(#ds)"><ellipse cx="24" cy="26" rx="11" ry="7" fill="#586070" stroke="#c9ced8" stroke-width="2"/><rect x="21" y="16" width="6" height="4" fill="#3a3f48"/></g><path d="M8 14 H40" stroke="#c9ced8" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="26" r="3.4" fill="#ff7a1a" filter="url(#gl)"/><path d="M24 34 V42" stroke="#ffb455" stroke-width="2" stroke-dasharray="2 2"/>`,
  ),
  'magnetic-mine': icon(
    'gear',
    rays(24, 26, 15, '#fff1d6', 0.2),
    `<g filter="url(#ds)"><ellipse cx="24" cy="30" rx="15" ry="8" fill="#3a3f48" stroke="#8a919d" stroke-width="2"/></g><path d="M14 14 V22 A10 10 0 0 0 34 22 V14" fill="none" stroke="#ff7a1a" stroke-width="5" stroke-linecap="butt" filter="url(#gl)"/><path d="M14 14 H18 M30 14 H34" stroke="#e8edf5" stroke-width="5"/>`,
  ),
  'reinforced-plating': icon(
    'gear',
    rays(24, 24, 15, '#fff1d6', 0.2),
    `<g filter="url(#ds)"><path d="M10 10 H38 V26 C38 34 31 40 24 43 C17 40 10 34 10 26 Z" fill="#586070" stroke="#c9ced8" stroke-width="2.2"/></g><path d="M16 17 H32 M16 24 H32" stroke="#15171b" stroke-width="2"/><g fill="#ff7a1a"><circle cx="14" cy="14" r="1.6"/><circle cx="34" cy="14" r="1.6"/><circle cx="24" cy="36" r="1.6"/></g>`,
  ),
  'arc-coil': icon(
    'gear',
    rays(24, 24, 18, '#d8f0ff', 0.3),
    `<g fill="none" stroke="#3ea0ff" stroke-width="3" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="6"/><path d="M24 4 L19 15 L27 17 L21 26"/><path d="M42 24 L31 19 L29 27 L20 21" opacity=".8"/></g><circle cx="24" cy="24" r="3" fill="#f0fbff" filter="url(#gl)"/>`,
  ),
  overdrive: icon(
    'gear',
    rays(24, 24, 20, '#fff1d6', 0.35),
    `<g filter="url(#ds)"><circle cx="24" cy="24" r="12" fill="#3a3f48" stroke="#c9ced8" stroke-width="2"/></g><g fill="#ff7a1a" stroke="#15171b" stroke-width="1.2" filter="url(#gl)"><path d="M24 3 L28 12 H20 Z"/><path d="M24 45 L20 36 H28 Z"/><path d="M3 24 L12 20 V28 Z"/><path d="M45 24 L36 28 V20 Z"/></g><path d="M18 24 L22 28 L31 18" fill="none" stroke="#ffd9a0" stroke-width="3" stroke-linecap="round"/>`,
  ),
  'mech-combo': icon(
    'gear',
    rays(24, 24, 14, '#fff1d6', 0.15),
    `<g filter="url(#ds)" fill="#586070" stroke="#c9ced8" stroke-width="1.6"><rect x="5" y="26" width="12" height="12" rx="2"/><rect x="18" y="16" width="12" height="12" rx="2"/><rect x="31" y="8" width="12" height="12" rx="2"/></g><g fill="#ff7a1a"><circle cx="11" cy="32" r="2"/><circle cx="24" cy="22" r="2"/><circle cx="37" cy="14" r="2"/></g>`,
  ),
  'hydraulic-smash': icon(
    'gear',
    rays(24, 28, 16, '#fff1d6', 0.3),
    `<g filter="url(#ds)"><rect x="14" y="6" width="20" height="10" rx="2" fill="#3a3f48" stroke="#8a919d" stroke-width="1.6"/><rect x="20" y="16" width="8" height="12" fill="#c9ced8"/><rect x="12" y="28" width="24" height="10" rx="3" fill="#586070" stroke="#c9ced8" stroke-width="2"/></g><g stroke="#ff7a1a" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"><path d="M6 42 H42 M10 38 L4 44 M38 38 L44 44"/></g>`,
  ),
  'sonic-boom': icon(
    'sonic',
    rays(24, 24, 16, '#eafcff', 0.25),
    `<g filter="url(#ds)"><circle cx="14" cy="24" r="8" fill="#2b2f35" stroke="#7ae8ff" stroke-width="2"/><ellipse cx="17" cy="25" rx="3" ry="4.2" fill="#04080a"/></g><g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M26 15 C30 20 30 28 26 33" stroke="#eafcff" stroke-width="3"/><path d="M32 11 C38 18 38 30 32 37" stroke="#7ae8ff" stroke-width="3"/><path d="M38 7 C46 16 46 32 38 41" stroke="#19c4e0" stroke-width="2.6" opacity=".8"/></g>`,
  ),
  'vibration-punch': icon(
    'sonic',
    rays(24, 24, 14, '#eafcff', 0.25),
    `<g filter="url(#ds)"><rect x="18" y="16" width="20" height="16" rx="4" fill="#2b2f35" stroke="#7ae8ff" stroke-width="2"/></g><g fill="none" stroke="#7ae8ff" stroke-width="2.4" stroke-linecap="round" filter="url(#gl)"><path d="M12 14 L8 18 L12 22 L8 26 L12 30 L8 34"/><circle cx="28" cy="24" r="5"/></g>`,
  ),
  'resonance-barrier': icon(
    'sonic',
    rays(24, 24, 14, '#eafcff', 0.2),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="17" stroke="#7ae8ff" stroke-width="2.6"/><circle cx="24" cy="24" r="11" stroke="#19c4e0" stroke-width="2.2" opacity=".8"/><circle cx="24" cy="24" r="5" stroke="#eafcff" stroke-width="2.4"/></g>`,
  ),
  'resonance-break': icon(
    'sonic',
    rays(24, 24, 14, '#eafcff', 0.2),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M6 24 H20" stroke="#eafcff" stroke-width="2.4"/><path d="M12 18 C16 22 16 26 12 30" stroke="#7ae8ff" stroke-width="2"/></g><g filter="url(#ds)"><path d="M28 18 H33 L38 13 V35 L33 30 H28 Z" fill="#2b2f35" stroke="#7ae8ff" stroke-width="2"/></g><path d="M25 38 L43 10" stroke="#ff5a5a" stroke-width="3" stroke-linecap="round"/><path d="M30 36 l3 -6 l-3 -2 l4 -5" fill="none" stroke="#eafcff" stroke-width="1.8" stroke-linecap="round"/>`,
  ),
  dissonance: icon(
    'sonic',
    rays(24, 24, 16, '#eafcff', 0.3),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M4 24 C10 10 14 38 20 24 C26 10 30 38 36 24 C40 16 42 20 44 24" stroke="#eafcff" stroke-width="3"/><path d="M4 30 C10 18 14 44 20 30 C26 18 30 44 36 30" stroke="#19c4e0" stroke-width="2" opacity=".7"/></g>`,
  ),
  shatterwave: icon(
    'sonic',
    rays(24, 24, 20, '#eafcff', 0.35),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="6" stroke="#eafcff" stroke-width="3"/><circle cx="24" cy="24" r="12" stroke="#7ae8ff" stroke-width="2.6"/><circle cx="24" cy="24" r="18" stroke="#19c4e0" stroke-width="2.4" stroke-dasharray="6 4"/></g><g stroke="#eafcff" stroke-width="2.4" stroke-linecap="round"><path d="M24 2 V8 M24 40 V46 M2 24 H8 M40 24 H46"/></g>`,
  ),
  'sonic-combo': icon(
    'sonic',
    rays(24, 24, 14, '#eafcff', 0.15),
    `<g filter="url(#gl)" fill="none" stroke="#7ae8ff" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="32" r="5"/><circle cx="24" cy="22" r="5"/><circle cx="36" cy="12" r="5"/></g><path d="M6 40 L20 28 M18 36 L34 20" stroke="#eafcff" stroke-width="2" stroke-linecap="round"/>`,
  ),
  'gauntlet-blast': icon(
    'sonic',
    rays(24, 24, 16, '#eafcff', 0.25),
    `<g filter="url(#ds)"><rect x="4" y="18" width="12" height="12" rx="3" fill="#2b2f35" stroke="#7ae8ff" stroke-width="2"/><rect x="32" y="18" width="12" height="12" rx="3" fill="#2b2f35" stroke="#7ae8ff" stroke-width="2"/></g><g fill="none" stroke="#eafcff" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"><path d="M18 14 C22 20 22 28 18 34 M30 14 C26 20 26 28 30 34"/></g>`,
  ),
  'time-combo': icon(
    'time',
    rays(24, 24, 14, '#f0fdff', 0.15),
    `<g fill="none" stroke="#8defff" stroke-width="2.4" stroke-linecap="round" filter="url(#gl)"><circle cx="12" cy="32" r="5"/><circle cx="24" cy="22" r="5" opacity=".75"/><circle cx="36" cy="12" r="5" opacity=".5"/></g><path d="M6 40 L20 28 M18 36 L34 20" stroke="#b98a4a" stroke-width="2.2" stroke-linecap="round"/>`,
  ),
  'temporal-fist': icon(
    'time',
    rays(24, 24, 16, '#f0fdff', 0.25),
    `<g filter="url(#ds)"><rect x="14" y="16" width="20" height="16" rx="5" fill="#4a525c" stroke="#8defff" stroke-width="2.2"/></g><g fill="none" stroke="#b98a4a" stroke-width="2.6" stroke-linecap="round"><circle cx="24" cy="24" r="12" opacity=".8"/><path d="M24 24 V15"/></g>`,
  ),
  'rewind-time': icon(
    'time',
    rays(24, 24, 16, '#fff4cf', 0.25),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="16" stroke="#ffd36a" stroke-width="2.8"/><circle cx="24" cy="24" r="11" stroke="#2f7bff" stroke-width="1.8" opacity=".7"/></g><g fill="none" stroke="#fff4cf" stroke-width="2.8" stroke-linecap="round"><path d="M17 20 A9 9 0 1 1 15 28"/><path d="M12 14 V22 H20"/></g>`,
  ),
  'temporal-echo': icon(
    'time',
    rays(24, 24, 16, '#fff4cf', 0.3),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="30" cy="24" r="10" stroke="#ffd66b" stroke-width="2.6"/><path d="M30 24 V17 M30 24 L35 27" stroke="#fff4cf" stroke-width="2.4"/><path d="M6 24 H18 M12 18 L6 24 L12 30" stroke="#ffd66b" stroke-width="2.6" opacity=".85"/><circle cx="10" cy="24" r="4" stroke="#fff4cf" stroke-width="1.6" stroke-dasharray="2 3" opacity=".7"/></g>`,
  ),
  'chrono-slash': icon(
    'time',
    rays(24, 24, 16, '#fff4cf', 0.25),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><path d="M8 38 C14 14 30 8 42 10" stroke="#2f7bff" stroke-width="5" opacity=".8"/><path d="M8 38 C14 14 30 8 42 10" stroke="#ffd36a" stroke-width="2.4"/><path d="M14 40 C20 22 32 16 44 18" stroke="#fff4cf" stroke-width="1.6" opacity=".7"/></g><circle cx="42" cy="10" r="2.6" fill="#fff4cf" filter="url(#gl)"/>`,
  ),
  afterimage: icon(
    'time',
    rays(24, 24, 14, '#fff4cf', 0.2),
    `<g fill="none" stroke-linecap="round" stroke-width="2.6"><g stroke="#2f7bff" opacity=".4"><circle cx="9" cy="13" r="3.4"/><path d="M9 17 V28 M9 28 L5 37 M9 28 L14 37 M9 21 L16 25"/></g><g stroke="#ffd36a" opacity=".65"><circle cx="21" cy="13" r="3.4"/><path d="M21 17 V28 M21 28 L17 37 M21 28 L26 37 M21 21 L28 25"/></g><g stroke="#fff4cf" filter="url(#gl)"><circle cx="34" cy="13" r="3.4"/><path d="M34 17 V28 M34 28 L30 37 M34 28 L39 37 M34 21 L42 25"/></g></g>`,
  ),
  'age-acceleration': icon(
    'time',
    rays(24, 24, 15, '#fff4cf', 0.2),
    `<g filter="url(#ds)"><path d="M13 6 H35 M13 42 H35" stroke="#ffd36a" stroke-width="3" stroke-linecap="round"/><path d="M15 7 C15 18 24 20 24 24 C24 28 15 30 15 41 H33 C33 30 24 28 24 24 C24 20 33 18 33 7 Z" fill="#2a3f6a" stroke="#fff4cf" stroke-width="2"/></g><path d="M18 38 H30 L24 31 Z" fill="#ffd36a"/><path d="M24 24 V31" stroke="#ffd36a" stroke-width="1.6"/>`,
  ),
  'time-stop': icon(
    'time',
    rays(24, 24, 20, '#fff4cf', 0.35),
    `<g fill="none" stroke-linecap="round" filter="url(#gl)"><circle cx="24" cy="24" r="17" stroke="#ffd36a" stroke-width="3"/><circle cx="24" cy="24" r="11" stroke="#2f7bff" stroke-width="2.4" stroke-dasharray="5 3"/></g><g fill="#fff4cf" filter="url(#gl)"><rect x="17" y="15" width="5" height="18" rx="1.5"/><rect x="26" y="15" width="5" height="18" rx="1.5"/></g><g stroke="#fff4cf" stroke-width="2.4" stroke-linecap="round"><path d="M24 2 V6 M24 42 V46 M2 24 H6 M42 24 H46"/></g>`,
  ),
  'crystal-arsenal': icon(
    'crystal',
    rays(24, 24, 18, '#e9e2ff', 0.25),
    `<g filter="url(#ds)"><path d="M24 3 L28 10 L27 28 L24 31 L21 28 L20 10 Z" fill="#7b6cff" stroke="#e9e2ff" stroke-width="1.5"/><path d="M8 40 L12 30 L17 31 L18 42 Z" fill="#5a4bbf" stroke="#e9e2ff" stroke-width="1.4"/><path d="M36 42 L35 30 L40 29 L44 40 Z" fill="#4aa8ff" stroke="#e9e2ff" stroke-width="1.4"/></g><g stroke="#e9e2ff" stroke-width="2" stroke-linecap="round" fill="none"><path d="M24 31 V44"/><path d="M19 32 H29"/></g>`,
  ),
  'crystal-slide': icon(
    'crystal',
    rays(24, 24, 15, '#e9e2ff', 0.2),
    `<g stroke="#4aa8ff" stroke-width="2.4" stroke-linecap="round" opacity=".9"><path d="M4 30 H22"/><path d="M6 36 H26"/><path d="M8 24 H20"/></g><g filter="url(#ds)"><path d="M24 32 L34 20 L44 30 L40 38 L28 40 Z" fill="#7b6cff" stroke="#e9e2ff" stroke-width="1.8"/></g><g fill="#e9e2ff"><path d="M36 14 L39 22 L33 22 Z"/><path d="M44 18 L46 25 L41 24 Z"/></g>`,
  ),
  'ink-slash': icon(
    'ink',
    rays(24, 24, 14, '#f2eee3', 0.16),
    `<path d="M5 34 C10 12 32 6 44 16 C34 14 18 20 12 38 Z" fill="#050505" stroke="#f2eee3" stroke-width="1.4" stroke-linejoin="round" filter="url(#ds)"/><g fill="#050505" opacity=".85"><circle cx="40" cy="30" r="2.4"/><circle cx="35" cy="37" r="1.6"/><circle cx="43" cy="37" r="1.2"/></g>`,
  ),
  'ink-serpent': icon(
    'ink',
    rays(24, 24, 12, '#f2eee3', 0.14),
    `<path d="M6 36 C8 22 20 28 24 22 C28 16 18 10 28 8 C38 6 42 16 38 22 C34 28 30 32 36 38" fill="none" stroke="#050505" stroke-width="6" stroke-linecap="round" filter="url(#ds)"/><path d="M6 36 C8 22 20 28 24 22 C28 16 18 10 28 8 C38 6 42 16 38 22" fill="none" stroke="#f2eee3" stroke-width="1.2" stroke-linecap="round" opacity=".55"/><circle cx="37" cy="39" r="2.4" fill="#f2eee3"/>`,
  ),
  'ink-bull': icon(
    'ink',
    rays(24, 24, 16, '#f2eee3', 0.16),
    `<path d="M6 30 C8 22 16 20 24 22 C32 20 40 22 42 28 C43 34 38 38 34 38 L33 44 L29 44 L28 39 L18 39 L17 44 L13 44 L12 38 C8 38 5 34 6 30 Z" fill="#050505" stroke="#f2eee3" stroke-width="1.3" stroke-linejoin="round" filter="url(#ds)"/><path d="M8 24 C2 22 2 14 6 10 C6 16 9 19 13 22 Z M40 24 C46 22 46 14 42 10 C42 16 39 19 35 22 Z" fill="#050505" stroke="#f2eee3" stroke-width="1"/><path d="M15 30 L21 32 L16 33 Z M33 30 L27 32 L32 33 Z" fill="#f2eee3"/><g fill="none" stroke="#f2eee3" stroke-width="1" opacity=".55"><path d="M14 26 C18 24 22 26 26 24"/><path d="M26 28 C30 26 34 28 38 26"/></g>`,
  ),
  'ink-clone': icon(
    'ink',
    rays(24, 24, 13, '#f2eee3', 0.14),
    `<ellipse cx="24" cy="40" rx="14" ry="4.5" fill="#050505" opacity=".85"/><g filter="url(#ds)" stroke="#f2eee3" stroke-width="1.2" fill="#050505"><circle cx="24" cy="10" r="4.6"/><path d="M24 15 V28 M24 19 L15 25 M24 19 L33 14 M24 28 L18 38 M24 28 L30 38" fill="none" stroke="#050505" stroke-width="3.2" stroke-linecap="round"/></g><path d="M33 8 L38 28" stroke="#f2eee3" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  'disappearing-act': icon(
    'magic',
    rays(24, 24, 16, '#fff4c2', 0.2),
    `<g filter="url(#ds)"><ellipse cx="24" cy="30" rx="15" ry="9" fill="#5a4a78" opacity=".8"/><ellipse cx="17" cy="24" rx="9" ry="7" fill="#8a7aa8" opacity=".85"/><ellipse cx="31" cy="22" rx="9" ry="7" fill="#8a7aa8" opacity=".85"/><ellipse cx="24" cy="17" rx="8" ry="6" fill="#b4a4d0" opacity=".9"/></g><path d="M10 10 L12 14 L16 16 L12 18 L10 22 L8 18 L4 16 L8 14 Z M38 30 L39.5 33 L43 34.5 L39.5 36 L38 39 L36.5 36 L33 34.5 L36.5 33 Z" fill="#ffd86b" stroke="#fff4c2" stroke-width=".8"/>`,
  ),
  rabbit: icon(
    'magic',
    rays(24, 24, 15, '#fff4c2', 0.16),
    `<g filter="url(#ds)"><ellipse cx="18" cy="14" rx="3.6" ry="10" fill="#f6f3ee" stroke="#3a3340" stroke-width="1.4" transform="rotate(-8 18 14)"/><ellipse cx="29" cy="14" rx="3.6" ry="10" fill="#f6f3ee" stroke="#3a3340" stroke-width="1.4" transform="rotate(10 29 14)"/><ellipse cx="18" cy="14" rx="1.4" ry="6.5" fill="#f2a6b6" transform="rotate(-8 18 14)"/><circle cx="24" cy="31" r="11" fill="#f6f3ee" stroke="#3a3340" stroke-width="1.6"/><circle cx="20" cy="29" r="1.6" fill="#16161c"/><circle cx="28" cy="29" r="1.6" fill="#16161c"/><circle cx="24" cy="33.5" r="1.8" fill="#f2a6b6"/></g>`,
  ),
  'card-barrage': icon(
    'magic',
    rays(24, 24, 17, '#fff4c2', 0.18),
    `<g filter="url(#ds)" stroke="#2a2a35" stroke-width="1.4"><rect x="6" y="14" width="15" height="21" rx="2" fill="#faf6ee" transform="rotate(-24 13 24)"/><rect x="16" y="10" width="15" height="21" rx="2" fill="#faf6ee" transform="rotate(-4 24 20)"/><rect x="27" y="14" width="15" height="21" rx="2" fill="#faf6ee" transform="rotate(18 34 24)"/></g><path d="M24 17 L28 22 L24 29 L20 22 Z" fill="#d23a4a"/><circle cx="35" cy="22" r="2.6" fill="#15151c"/>`,
  ),
  'wand-misfortune': icon(
    'magic',
    rays(24, 24, 16, '#e0b8ff', 0.2),
    `<g filter="url(#ds)"><path d="M8 40 L32 16" stroke="#15151c" stroke-width="4.2" stroke-linecap="round"/><path d="M8 40 L12 36 M30 18 L33 15" stroke="#f6f3ee" stroke-width="4.2" stroke-linecap="round"/></g><g fill="#ffd86b" stroke="#fff4c2" stroke-width=".8"><path d="M38 8 L40 13 L45 15 L40 17 L38 22 L36 17 L31 15 L36 13 Z"/></g><path d="M34 22 L40 28 L35 29 L38 36" stroke="#b06cff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  ),
  'lucky-hat': icon(
    'magic',
    rays(24, 24, 16, '#fff4c2', 0.18),
    `<g filter="url(#ds)"><ellipse cx="24" cy="36" rx="17" ry="5" fill="#15151c" stroke="#3a3a48" stroke-width="1.2"/><path d="M12 36 L14 12 H34 L36 36 Z" fill="#15151c" stroke="#3a3a48" stroke-width="1.2"/><rect x="12.6" y="27" width="22.8" height="5.4" fill="#b3263a"/></g><path d="M20 12 C18 4 24 2 25 8 C26 2 32 4 29 12" fill="#f6f3ee" stroke="#3a3340" stroke-width="1.2"/><path d="M36 8 L37 11 L40 12 L37 13 L36 16 L35 13 L32 12 L35 11 Z" fill="#ffd86b"/>`,
  ),
  'mirror-act': icon(
    'magic',
    rays(24, 24, 20, '#fff4c2', 0.28),
    `<g filter="url(#ds)"><rect x="9" y="5" width="30" height="38" rx="4" fill="#d6e8ff" stroke="#e3b94a" stroke-width="2.4"/><path d="M15 38 L33 10" stroke="#fff" stroke-width="2.6" opacity=".7"/><circle cx="20" cy="18" r="4.2" fill="#15151c"/><path d="M20 22 V31 M20 25 L15 29 M20 25 L26 29" stroke="#15151c" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="21" r="3.6" fill="#7a3fc4" opacity=".75"/></g>`,
  ),
  'magix-combo': icon(
    'magic',
    rays(24, 24, 12, '#fff4c2', 0.12),
    `<g fill="none" stroke-linecap="round" filter="url(#ds)"><path d="M8 38 L30 14" stroke="#15151c" stroke-width="4.4"/><path d="M8 38 L11 35 M28 16 L30.5 13.5" stroke="#f6f3ee" stroke-width="4.4"/></g><path d="M34 10 L36 15 L41 17 L36 19 L34 24 L32 19 L27 17 L32 15 Z" fill="#ffd86b" stroke="#fff4c2" stroke-width=".8"/>`,
  ),
  'wand-flourish': icon(
    'magic',
    rays(24, 24, 15, '#fff4c2', 0.14),
    `<g filter="url(#ds)"><path d="M10 40 L30 20" stroke="#15151c" stroke-width="4.4" stroke-linecap="round"/><path d="M10 40 L13 37" stroke="#f6f3ee" stroke-width="4.4" stroke-linecap="round"/></g><path d="M6 14 C16 4 34 6 42 20" fill="none" stroke="#ffd86b" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 5"/><path d="M36 28 L38 33 L43 35 L38 37 L36 42 L34 37 L29 35 L34 33 Z" fill="#b06cff"/>`,
  ),
  'volt-combo': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M8 36 L18 26 L14 22 L26 12" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M8 36 L18 26 L14 22 L26 12" fill="none" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 40 L32 30 L28 26 L40 16" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M22 40 L32 30 L28 26 L40 16" fill="none" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  'surge-blast': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M6 24 H40" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M6 24 L16 18 L22 30 L30 18 L42 24" fill="none" stroke="#fffbd0" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="24" r="5" fill="#dfeeff" stroke="#0a1a2e" stroke-width="1.6"/>`,
  ),
  'flashstep': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M6 34 L42 14" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M6 34 L22 26 L18 22 L42 14" fill="none" stroke="#fffbd0" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="34" r="4" fill="#dfeeff" opacity=".5"/><circle cx="40" cy="15" r="5" fill="#dfeeff" stroke="#0a1a2e" stroke-width="1.4"/>`,
  ),
  'arc-lash': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M6 36 L18 26 L14 22 L30 14 L26 10 L42 8" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M6 36 L18 26 L14 22 L30 14 L26 10 L42 8" fill="none" stroke="#fffbd0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="9" r="4.5" fill="#fffbd0" filter="url(#gl)"/>`,
  ),
  'voltage-rush': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M8 14 L22 22 L12 30" fill="none" stroke="#19c4e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M8 14 L22 22 L12 30" fill="none" stroke="#fffbd0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 14 L26 22 L36 30" fill="none" stroke="#19c4e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M40 14 L26 22 L36 30" fill="none" stroke="#fffbd0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 40 L24 26 L32 40" fill="none" stroke="#19c4e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M16 40 L24 26 L32 40" fill="none" stroke="#fffbd0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  'static-break': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<circle cx="24" cy="24" r="13" fill="none" stroke="#19c4e0" stroke-width="2.4" stroke-dasharray="4 4" filter="url(#gl)"/><path d="M30 4 L16 26 L25 26 L18 44 L36 20 L26 20 Z" fill="none" stroke="#19c4e0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M30 4 L16 26 L25 26 L18 44 L36 20 L26 20 Z" fill="#fffbd0" stroke="#0a1a2e" stroke-width="1.2" stroke-linejoin="round"/>`,
  ),
  'thunder-circuit': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M10 4 L14 14 L10 20 L16 30" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M10 4 L14 14 L10 20 L16 30" fill="none" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 2 L28 14 L22 22 L26 34" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M24 2 L28 14 L22 22 L26 34" fill="none" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 4 L34 14 L38 20 L32 30" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M38 4 L34 14 L38 20 L32 30" fill="none" stroke="#fffbd0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 42 H40" stroke="#8ff8ff" stroke-width="3" stroke-linecap="round" filter="url(#gl)"/><circle cx="24" cy="38" r="5" fill="#fffbd0" filter="url(#gl)"/>`,
  ),
  'volt-overdrive': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<circle cx="24" cy="26" r="14" fill="none" stroke="#19c4e0" stroke-width="3" filter="url(#gl)"/><path d="M30 4 L16 26 L25 26 L18 44 L36 20 L26 20 Z" fill="none" stroke="#19c4e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M30 4 L16 26 L25 26 L18 44 L36 20 L26 20 Z" fill="#fffbd0" stroke="#0a1a2e" stroke-width="1.2" stroke-linejoin="round"/>`,
  ),
  'lightning-execution': icon(
    'sonic',
    rays(24, 24, 15, '#8ff8ff', 0.2),
    `<path d="M24 2 L18 18 L28 18 L14 46" fill="none" stroke="#19c4e0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#gl)"/><path d="M24 2 L18 18 L28 18 L14 46" fill="none" stroke="#fffbd0" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 44 H42" stroke="#8ff8ff" stroke-width="3" stroke-linecap="round" filter="url(#gl)"/><circle cx="14" cy="45" r="7" fill="none" stroke="#fffbd0" stroke-width="2" opacity=".7"/>`,
  ),
  'spin-cycle': icon(
    'earth',
    rays(24, 24, 16, '#f3e3c2', 0.18),
    `<g filter="url(#ds)"><circle cx="24" cy="24" r="6" fill="#a8573a" stroke="#22170c" stroke-width="1.6"/><path d="M24 24 L40 14" stroke="#7a3a28" stroke-width="5" stroke-linecap="round"/><circle cx="41" cy="13" r="4" fill="#d8c8b0" stroke="#22170c" stroke-width="1.6"/></g><path d="M8 24 C8 12 18 6 28 8 M40 28 C38 38 30 42 22 40 M12 34 C14 38 18 41 22 42" fill="none" stroke="#f3e3c2" stroke-width="2.2" stroke-linecap="round" opacity=".75"/><path d="M28 8 L24 4 M28 8 L32 5" stroke="#f3e3c2" stroke-width="2" stroke-linecap="round"/>`,
  ),
  'four-arm-uppercut': icon(
    'earth',
    rays(24, 24, 16, '#f3e3c2', 0.18),
    `<g filter="url(#ds)"><circle cx="24" cy="14" r="6" fill="#d8c8b0" stroke="#22170c" stroke-width="1.6"/><path d="M12 8 L19 20 M36 8 L29 20" stroke="#7a3a28" stroke-width="4" stroke-linecap="round"/><path d="M12 42 C12 32 18 26 22 22 M36 42 C36 32 30 26 26 22" stroke="#a8573a" stroke-width="5" stroke-linecap="round" fill="none"/></g><path d="M24 4 V0 M20 6 L18 2 M28 6 L30 2" stroke="#f3e3c2" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  'thunder-clap': icon(
    'earth',
    rays(24, 24, 20, '#f3e3c2', 0.3),
    `<g filter="url(#ds)"><path d="M8 26 L20 24 L22 30 L10 32 Z M40 26 L28 24 L26 30 L38 32 Z M10 16 L21 21 L19 25 L8 21 Z M38 16 L27 21 L29 25 L40 21 Z" fill="#7a3a28" stroke="#22170c" stroke-width="1.4"/></g><path d="M24 8 L21 18 L26 18 L22 28" stroke="#ffe680" stroke-width="2.6" fill="none" stroke-linejoin="round"/><circle cx="24" cy="24" r="14" fill="none" stroke="#f3e3c2" stroke-width="1.4" opacity=".6"/>`,
  ),
  'four-arm-smash': icon(
    'earth',
    rays(24, 24, 18, '#f3e3c2', 0.2),
    `<g filter="url(#ds)"><path d="M10 6 L16 24 M18 4 L21 24 M30 4 L27 24 M38 6 L32 24" stroke="#7a3a28" stroke-width="4.4" stroke-linecap="round"/><circle cx="16" cy="26" r="3.4" fill="#a8573a"/><circle cx="21" cy="26" r="3.4" fill="#a8573a"/><circle cx="27" cy="26" r="3.4" fill="#a8573a"/><circle cx="32" cy="26" r="3.4" fill="#a8573a"/></g><path d="M4 38 L12 32 L20 38 L24 30 L28 38 L36 32 L44 38" stroke="#22170c" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M6 42 H42" stroke="#f3e3c2" stroke-width="2" opacity=".6"/>`,
  ),
  'quake-barrage': icon(
    'earth',
    rays(24, 24, 16, '#f3e3c2', 0.2),
    `<g filter="url(#ds)" fill="#a8573a" stroke="#22170c" stroke-width="1.6"><circle cx="12" cy="14" r="5.5"/><circle cx="36" cy="14" r="5.5"/><circle cx="14" cy="32" r="5.5"/><circle cx="34" cy="32" r="5.5"/></g><path d="M18 14 H30 M18 32 H30 M6 22 H42" stroke="#f3e3c2" stroke-width="2.4" stroke-linecap="round" opacity=".75"/><circle cx="24" cy="24" r="4.5" fill="#fff4c2" opacity=".85"/>`,
  ),
  'fiery-fists': icon(
    'fire',
    rays(24, 24, 20, '#ffe9a3', 0.3),
    `<g filter="url(#ds)"><circle cx="13" cy="16" r="6" fill="#a8573a" stroke="#22170c" stroke-width="1.5"/><circle cx="35" cy="16" r="6" fill="#a8573a" stroke="#22170c" stroke-width="1.5"/><circle cx="14" cy="32" r="6" fill="#a8573a" stroke="#22170c" stroke-width="1.5"/><circle cx="34" cy="32" r="6" fill="#a8573a" stroke="#22170c" stroke-width="1.5"/></g><g fill="#ff9a1f" stroke="#fff0b0" stroke-width="1"><path d="M13 8 C9 4 14 2 13 0 C18 4 17 8 13 10 Z"/><path d="M35 8 C31 4 36 2 35 0 C40 4 39 8 35 10 Z"/><path d="M14 24 C10 20 15 18 14 16 C19 20 18 24 14 26 Z"/><path d="M34 24 C30 20 35 18 34 16 C39 20 38 24 34 26 Z"/></g>`,
  ),
  'four-fists': icon(
    'earth',
    rays(24, 24, 12, '#f3e3c2', 0.12),
    `<g filter="url(#ds)" fill="#a8573a" stroke="#22170c" stroke-width="1.6"><circle cx="12" cy="14" r="5.4"/><circle cx="36" cy="14" r="5.4"/><circle cx="14" cy="34" r="5.4"/><circle cx="34" cy="34" r="5.4"/></g><path d="M18 14 H30 M20 34 H28" stroke="#f3e3c2" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`,
  ),
  'double-fist': icon(
    'earth',
    rays(24, 24, 14, '#f3e3c2', 0.14),
    `<g filter="url(#ds)" fill="#a8573a" stroke="#22170c" stroke-width="1.6"><circle cx="30" cy="20" r="6.6"/><circle cx="34" cy="30" r="6.6"/></g><path d="M4 18 H20 M2 28 H22 M6 36 H20" stroke="#f3e3c2" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`,
  ),
  'ink-spear': icon(
    'ink',
    rays(24, 24, 16, '#f2eee3', 0.16),
    `<g filter="url(#ds)"><path d="M6 42 L34 14" stroke="#4a2c18" stroke-width="3.4" stroke-linecap="round" fill="none"/><path d="M32 16 C36 9 40 6 44 4 C42 9 40 13 36 20 Z" fill="#050505" stroke="#f2eee3" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 18 L26 14 M28 20 L23 18" stroke="#b01c24" stroke-width="2" stroke-linecap="round"/></g>`,
  ),
  masterpiece: icon(
    'ink',
    rays(24, 24, 20, '#f2eee3', 0.3),
    `<g filter="url(#ds)"><rect x="8" y="7" width="32" height="34" rx="2.5" fill="#efe6cf" stroke="#050505" stroke-width="2"/><rect x="6" y="5" width="36" height="4" rx="2" fill="#6b3a1c" stroke="#050505" stroke-width="1.4"/><rect x="6" y="39" width="36" height="4" rx="2" fill="#6b3a1c" stroke="#050505" stroke-width="1.4"/></g><path d="M13 32 C14 20 20 14 26 16 L24 12 L32 14 L30 18 C34 24 32 32 28 34 C24 30 20 34 13 32 Z" fill="#050505"/><circle cx="29" cy="20" r="1.4" fill="#efe6cf"/>`,
  ),
  'ink-combo': icon(
    'ink',
    rays(24, 24, 12, '#f2eee3', 0.12),
    `<g fill="none" stroke="#050505" stroke-linecap="round" filter="url(#ds)"><path d="M6 36 C12 22 22 14 38 12" stroke-width="5"/><path d="M10 40 C18 30 28 24 42 24" stroke-width="3.6"/></g><g fill="none" stroke="#f2eee3" stroke-linecap="round" opacity=".5"><path d="M6 36 C12 22 22 14 38 12" stroke-width="1"/></g>`,
  ),
  'brush-sweep': icon(
    'ink',
    rays(24, 24, 15, '#f2eee3', 0.14),
    `<g filter="url(#ds)"><path d="M8 40 L32 12" stroke="#6b3a1c" stroke-width="3.6" stroke-linecap="round"/><path d="M30 14 C36 6 44 6 45 8 C44 14 38 22 32 22 Z" fill="#050505" stroke="#f2eee3" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M6 24 C14 30 26 36 40 34" fill="none" stroke="#050505" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  ),
  'shard-volley': icon(
    'crystal',
    rays(24, 24, 16, '#e9e2ff', 0.2),
    `<g filter="url(#ds)" fill="#7b6cff" stroke="#e9e2ff" stroke-width="1.5"><path d="M6 24 L24 20 L24 28 Z"/><path d="M8 12 L26 15 L22 21 Z"/><path d="M8 36 L22 27 L26 33 Z"/><path d="M14 6 L30 12 L24 17 Z"/><path d="M14 42 L24 31 L30 36 Z"/></g><circle cx="34" cy="24" r="5" fill="#4aa8ff" stroke="#e9e2ff" stroke-width="1.6"/>`,
  ),
  'crystal-prison': icon(
    'crystal',
    rays(24, 24, 15, '#e9e2ff', 0.2),
    `<g stroke="#2a2266" stroke-width="5" stroke-linecap="round"><path d="M17 4 V24"/><path d="M31 4 V24"/></g><g filter="url(#ds)" fill="#7b6cff" stroke="#e9e2ff" stroke-width="1.6"><path d="M11 44 L12 24 L16 28 L20 24 L22 44 Z"/><path d="M26 44 L28 24 L32 28 L36 24 L38 44 Z"/></g><g fill="#4aa8ff" opacity=".9"><path d="M12 24 L14 18 L16 24 Z"/><path d="M28 24 L30 18 L32 24 Z"/></g>`,
  ),
  'crystal-groundstrike': icon(
    'crystal',
    rays(24, 24, 17, '#e9e2ff', 0.25),
    `<g filter="url(#ds)" fill="#7b6cff" stroke="#e9e2ff" stroke-width="1.5"><path d="M5 44 L9 24 L13 44 Z"/><path d="M15 44 L21 16 L27 44 Z"/><path d="M29 44 L35 20 L40 44 Z"/><path d="M38 44 L42 30 L46 44 Z"/></g><path d="M14 8 L24 10 L30 8 L28 14 L18 14 Z" fill="#5a4bbf" stroke="#e9e2ff" stroke-width="1.4"/><path d="M4 45 H46" stroke="#4aa8ff" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  'crystal-sovereign': icon(
    'crystal',
    rays(24, 24, 20, '#e9e2ff', 0.35),
    `<g filter="url(#ds)"><path d="M14 18 L24 8 L34 18 L32 38 L24 44 L16 38 Z" fill="#6f64ff" fill-opacity=".85" stroke="#e9e2ff" stroke-width="2.2"/></g><g fill="#e9e2ff" filter="url(#gl)"><path d="M16 12 L18 4 L21 11 Z"/><path d="M27 11 L30 4 L32 12 Z"/><path d="M21 10 L24 1 L27 10 Z"/></g><path d="M24 16 V38" stroke="#4aa8ff" stroke-width="2"/>`,
  ),
  'crystal-combo': icon(
    'crystal',
    rays(24, 24, 14, '#e9e2ff', 0.15),
    `<g filter="url(#ds)" fill="#6f64ff" stroke="#e9e2ff" stroke-width="1.6"><path d="M5 30 L11 24 L17 30 L11 38 Z"/><path d="M17 20 L24 12 L31 20 L24 30 Z"/><path d="M29 12 L37 5 L44 12 L37 21 Z"/></g>`,
  ),
  'crystal-crush': icon(
    'crystal',
    rays(24, 24, 16, '#e9e2ff', 0.25),
    `<g filter="url(#ds)"><path d="M12 6 L36 6 L40 22 L24 30 L8 22 Z" fill="#7b6cff" stroke="#e9e2ff" stroke-width="2"/></g><g stroke="#4aa8ff" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M6 40 L16 34 M42 40 L32 34 M24 44 V34"/></g>`,
  ),
  'plague-bloom': icon(
    'toxin',
    rays(24, 24, 18, '#e8ffc8', 0.3),
    `<g filter="url(#gl)" fill="#7dff3a"><circle cx="24" cy="24" r="6" opacity=".95"/><circle cx="14" cy="18" r="6" opacity=".7"/><circle cx="34" cy="18" r="6" opacity=".7"/><circle cx="12" cy="31" r="5" opacity=".6"/><circle cx="36" cy="31" r="5" opacity=".6"/><circle cx="24" cy="38" r="6" opacity=".7"/><circle cx="24" cy="10" r="4.5" opacity=".6"/></g><circle cx="24" cy="24" r="3" fill="#e8ffc8"/>`,
  ),
  // Shroud's combo: a knife mid-slash leaving a red arc.
  'knife-slash': icon(
    'shade',
    rays(26, 22, 12, '#ffd0c8', 0.12),
    `<path d="M6 38 C10 22 22 10 40 8" stroke="#ec2a34" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".9"/><g transform="translate(10 36) rotate(-45)" filter="url(#ds)">${KNIFE}</g>`,
  ),
  // Gutting Stab (heavy): a knife driven upward into a burst of blood.
  'gutting-stab': icon(
    'blood',
    rays(28, 16, 16, '#ffd0c8', 0.26),
    `<circle cx="30" cy="15" r="8" fill="url(#bd)" filter="url(#gl)"/><g transform="translate(9 41) rotate(-58)" filter="url(#ds)">${KNIFE}</g>`,
  ),
};

let instance = 0;

/**
 * The icon's SVG markup. Gradient, filter and clip ids get a per-copy suffix: the same icon sits on
 * the desktop bar and on a touch button, and an id referenced from a hidden copy would not paint.
 */
export function abilityIcon(id: string | undefined): string | null {
  const svg = id ? ABILITY_ICONS[id] : undefined;
  if (!svg) return null;
  const n = ++instance;
  return svg.replace(/id="(\w+)"/g, `id="$1-${n}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${n})`);
}
