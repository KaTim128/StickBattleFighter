/**
 * Ability icons (owner, 12/11/2026), styled after the owner's reference sheets: round, full-bleed
 * painted emblems. Each icon fills its circle with a glowing backdrop in its element's colours
 * (fire, earth, soul, blood, shadow), lit from a bright core with soft light rays or a swirl, and a
 * single strong subject painted on top with shaded forms, a crisp dark edge and a highlight. A
 * vignette darkens the rim and a gloss catches the top. No thin stray strokes: every mark is a
 * deliberate shape. Original artwork; one per icon id (`AbilityDef.icon`, `AbilityKit.comboIcon`,
 * `AbilityKit.heavyIcon`).
 */
type Theme = 'fire' | 'earth' | 'soul' | 'blood' | 'shade';

/** Backdrop colours per element: core, mid, edge. */
const THEME: Readonly<Record<Theme, readonly [string, string, string]>> = {
  fire: ['#ffe9a3', '#e8540f', '#3a0802'],
  earth: ['#f3e3c2', '#8c6a45', '#22170c'],
  soul: ['#ecdcff', '#7a35d0', '#170622'],
  blood: ['#ffb0a8', '#b3121c', '#1a0204'],
  shade: ['#b9bfcc', '#383a48', '#060609'],
};

const MATERIALS = `
<radialGradient id="fc" cx="42%" cy="38%" r="60%"><stop offset="0" stop-color="#fffef2"/><stop offset=".22" stop-color="#ffe680"/><stop offset=".5" stop-color="#ff9a1f"/><stop offset=".8" stop-color="#e2410e"/><stop offset="1" stop-color="#8a1704"/></radialGradient>
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8230a"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset=".8" stop-color="#ffcf4a"/><stop offset="1" stop-color="#fff6c8"/></linearGradient>
<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#d3dae4"/><stop offset=".52" stop-color="#7c8696"/><stop offset=".58" stop-color="#c3cbd6"/><stop offset=".85" stop-color="#eef2f7"/><stop offset="1" stop-color="#596273"/></linearGradient>
<radialGradient id="gr" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e2e5ec"/><stop offset=".45" stop-color="#8f929d"/><stop offset=".85" stop-color="#4b4d57"/><stop offset="1" stop-color="#2e3038"/></radialGradient>
<radialGradient id="sl" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#fbf6ff"/><stop offset=".3" stop-color="#c9a6ff"/><stop offset=".65" stop-color="#7a35d0"/><stop offset="1" stop-color="#26093a"/></radialGradient>
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
  // Teleport: a hooded figure dissolving into a violet vortex.
  teleport: icon(
    'soul',
    swirl('#e8dcff', 0.5),
    `<g filter="url(#ds)"><path d="M14 44 L16 22 C16 12 32 12 32 22 L34 44 Z" fill="#4a3a63" stroke="#120e18" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="24.5" cy="24.5" rx="3.6" ry="4.4" fill="#07050a"/></g><path d="M14 40 C20 34 28 44 34 38" stroke="#c9a6ff" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".9"/>`,
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
  // Thrown Blade: a spinning knife flying through a red blur.
  'thrown-blade': icon(
    'blood',
    rays(32, 18, 14, '#ffd0c8', 0.16),
    `<g transform="translate(8 34) rotate(-40)" filter="url(#ds)">${KNIFE}</g><path d="M36 13.5 L39.5 9.5" stroke="#ec2a34" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`,
  ),
  // Stalker Lunge: the masked figure darting forward, a red slash behind the knife.
  'stalker-lunge': icon(
    'shade',
    rays(34, 22, 12, '#ffd0c8', 0.14),
    `<path d="M6 40 C14 30 28 24 44 24" stroke="#ec2a34" stroke-width="4" fill="none" stroke-linecap="round" filter="url(#gl)" opacity=".9"/>${MASKED(20, 22, 1)}<g transform="translate(28 30) rotate(-12) scale(.5)" filter="url(#ds)">${KNIFE}</g>`,
  ),
  // Behind You: the mask rising out of shadow, a knife raised.
  'behind-you': icon(
    'shade',
    swirl('#9a9aae', 0.4),
    `${MASKED(22, 24, 1.25)}<g transform="translate(30 36) rotate(-62) scale(.55)" filter="url(#ds)">${KNIFE}</g>`,
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
