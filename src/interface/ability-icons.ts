/**
 * Ability icons (owner, 12/11/2026: "Make them look smoother, sharper and more premium ...
 * realistic shading, depth, lighting and polished visual effects"). Original SVG artwork, one per
 * icon id; an ability names its icon in its data (`AbilityDef.icon`, `AbilityKit.comboIcon`).
 *
 * Every icon shares one material library: shaded gradients for fire, steel, stone-grey skin, soul
 * violet, bone, blood and shadow, a glossy top highlight, a soft glow for energy and a drop shadow
 * that lifts each subject off its button. Light comes from the top left; forms have a lit side, a
 * core shadow and a rim; edges are crisp dark outlines in the subject's own deep shade.
 */
const DEFS = `<defs>
<filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="0.9" flood-color="#000" flood-opacity=".65"/></filter>
<filter id="gl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="fc" cx="42%" cy="38%" r="60%"><stop offset="0" stop-color="#fffef2"/><stop offset=".22" stop-color="#ffe680"/><stop offset=".5" stop-color="#ff9a1f"/><stop offset=".8" stop-color="#e2410e"/><stop offset="1" stop-color="#8a1704"/></radialGradient>
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8230a"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset=".8" stop-color="#ffcf4a"/><stop offset="1" stop-color="#fff6c8"/></linearGradient>
<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#d3dae4"/><stop offset=".52" stop-color="#7c8696"/><stop offset=".58" stop-color="#c3cbd6"/><stop offset=".85" stop-color="#eef2f7"/><stop offset="1" stop-color="#596273"/></linearGradient>
<radialGradient id="gr" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#d6d9e2"/><stop offset=".45" stop-color="#8b8e99"/><stop offset=".85" stop-color="#4b4d57"/><stop offset="1" stop-color="#2e3038"/></radialGradient>
<radialGradient id="sl" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#fbf6ff"/><stop offset=".3" stop-color="#c9a6ff"/><stop offset=".65" stop-color="#7a35d0"/><stop offset="1" stop-color="#26093a"/></radialGradient>
<linearGradient id="bn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffcf2"/><stop offset=".5" stop-color="#e3d8bf"/><stop offset="1" stop-color="#9e9178"/></linearGradient>
<radialGradient id="bd" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#ffb3b3"/><stop offset=".35" stop-color="#e5242e"/><stop offset=".8" stop-color="#7a0a10"/><stop offset="1" stop-color="#3a0306"/></radialGradient>
<radialGradient id="sh" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#5d5d70"/><stop offset=".5" stop-color="#22222c"/><stop offset="1" stop-color="#07070a"/></radialGradient>
<radialGradient id="dust" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f3e6cc"/><stop offset=".6" stop-color="#b89a74" stop-opacity=".8"/><stop offset="1" stop-color="#7d6448" stop-opacity="0"/></radialGradient>
<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="ab-icon-svg">${DEFS}${body}</svg>`;

/** A shaded fist (grey stone skin), knuckles toward +x, at (x, y), size `s`. */
const fist = (x: number, y: number, s: number, fill = 'url(#gr)', line = '#17181d') =>
  `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ds)"><rect x="-11" y="-9" width="22" height="18" rx="7" fill="${fill}" stroke="${line}" stroke-width="2"/><path d="M-4 -8 V2 M2 -8 V2 M8 -7 V1" stroke="${line}" stroke-width="1.3" opacity=".75"/><path d="M-9 -5 C-4 -8 4 -8 9 -5" stroke="url(#gs)" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="-14" y="-4" width="6" height="11" rx="3" fill="${fill}" stroke="${line}" stroke-width="1.6"/></g>`;

/** A flame tongue from (x, y) upward, height h. */
const tongue = (x: number, y: number, h: number, w: number) =>
  `<path d="M${x} ${y} C${x - w} ${y - h * 0.35} ${x - w * 0.2} ${y - h * 0.65} ${x + w * 0.15} ${y - h} C${x + w * 0.35} ${y - h * 0.6} ${x + w} ${y - h * 0.4} ${x} ${y}Z" fill="url(#fl)"/>`;

export const ABILITY_ICONS: Readonly<Record<string, string>> = {
  // ---------------- Inferno ----------------
  // Fireball: a molten sphere with a white-hot heart and a streaming comet tail.
  fireball: svg(
    `<path d="M3 31 C10 22 15 31 21 22 C18 33 26 36 31 27 L31 36 C21 42 9 40 3 31Z" fill="url(#fl)" opacity=".9" filter="url(#gl)"/><path d="M7 29 C12 25 16 29 21 25" stroke="#fff3b0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="31" cy="23" r="12" fill="url(#fc)" stroke="#6e1503" stroke-width="1.6" filter="url(#gl)"/><ellipse cx="27.5" cy="18.5" rx="4.5" ry="3" fill="#fff" opacity=".7"/>`,
  ),
  // Flame Dash: a burning streak driving forward to a hard arrowhead.
  'flame-dash': svg(
    `<path d="M2 15 H27 M6 24 H33 M2 33 H27" stroke="#b8230a" stroke-width="6.5" stroke-linecap="round"/><path d="M2 15 H27 M6 24 H33 M2 33 H27" stroke="url(#fl)" stroke-width="4.5" stroke-linecap="round" filter="url(#gl)"/><path d="M5 15 H18 M9 24 H24 M5 33 H18" stroke="#fff6c8" stroke-width="1.5" stroke-linecap="round"/><path d="M29 9 L46 24 L29 39 L33 24 Z" fill="url(#fc)" stroke="#6e1503" stroke-width="1.8" stroke-linejoin="round" filter="url(#ds)"/><path d="M31 12 L42 22" stroke="#fff" stroke-width="1.4" opacity=".7" stroke-linecap="round"/>`,
  ),
  // Fire Beam: a white-hot column of fire pouring from a glowing palm.
  'fire-beam': svg(
    `<rect x="15" y="16" width="32" height="16" rx="8" fill="#c42a08" filter="url(#gl)"/><rect x="15" y="18.5" width="32" height="11" rx="5.5" fill="#ff8a1f"/><rect x="15" y="21" width="32" height="6" rx="3" fill="#ffd25a"/><rect x="15" y="22.6" width="32" height="2.8" rx="1.4" fill="#fffef2"/><circle cx="14" cy="24" r="10" fill="url(#fc)" stroke="#6e1503" stroke-width="1.5" filter="url(#gl)"/><path d="M3 15 C8 15 9 20 9 24 C9 28 8 33 3 33" stroke="#4a0e03" stroke-width="3.2" fill="none" stroke-linecap="round"/><ellipse cx="11" cy="20" rx="3.5" ry="2.2" fill="#fff" opacity=".65"/>`,
  ),
  // Flame Detonation: a star-burst of fire around cupped hands and a blinding core.
  'flame-detonation': svg(
    `<path d="M24 2 L27.5 13 L37.5 5.5 L32.5 17 L45.5 16 L35.5 23.5 L46 30.5 L33 30.5 L38.5 42.5 L28 34.5 L24 46 L20 34.5 L9.5 42.5 L15 30.5 L2 30.5 L12.5 23.5 L2.5 16 L15.5 17 L10.5 5.5 L20.5 13 Z" fill="url(#fl)" stroke="#6e1503" stroke-width="1.3" stroke-linejoin="round" filter="url(#gl)"/><circle cx="24" cy="24" r="10.5" fill="url(#fc)"/><circle cx="21.5" cy="21" r="3.6" fill="#fff" opacity=".85"/><path d="M12 31 C12 39 18 41 22 37 M36 31 C36 39 30 41 26 37" stroke="#3b0b02" stroke-width="3.6" fill="none" stroke-linecap="round" filter="url(#ds)"/>`,
  ),
  // Eruption: the leap's arc slamming down into a fountain of fire.
  eruption: svg(
    `<path d="M5 31 C9 8 30 3 36 21" stroke="#fff3b0" stroke-width="2.4" fill="none" stroke-dasharray="3.5 3" stroke-linecap="round" filter="url(#gl)"/><path d="M31 16.5 L37.5 25 L40.5 15 Z" fill="#ffd25a" stroke="#6e1503" stroke-width="1"/><ellipse cx="28" cy="43" rx="17" ry="3.6" fill="#7a1704"/>${tongue(18, 43, 13, 5)}${tongue(28, 43, 19, 7)}${tongue(37, 43, 12, 5)}<ellipse cx="28" cy="42.5" rx="9" ry="1.8" fill="#fffef2" opacity=".85" filter="url(#gl)"/>`,
  ),
  // Inferno's combo: a fist wreathed in flame driving forward.
  'flaming-fist': svg(
    `${tongue(16, 36, 22, 6)}${tongue(24, 34, 26, 7)}${tongue(32, 36, 20, 6)}<g filter="url(#gl)">${fist(27, 26, 0.95, 'url(#fc)', '#6e1503')}</g><path d="M2 20 C7 17 9 23 14 20 M2 30 C7 27 9 33 14 30" stroke="#ff9a1f" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  ),
  // ---------------- Braxon ----------------
  // Ground Smash: two stone fists hammering into a cracked, dust-blown floor.
  'ground-smash': svg(
    `<ellipse cx="24" cy="40" rx="22" ry="6" fill="url(#dust)"/><path d="M2 41 H46" stroke="#4a3622" stroke-width="3.5" stroke-linecap="round"/><path d="M24 41 L19 47 M24 41 L30 47 M24 41 L14 45 M24 41 L35 45" stroke="#2a1d10" stroke-width="1.8" stroke-linecap="round"/><path d="M7 36 C9 29 13 27 16 29 M41 36 C39 29 35 27 32 29" stroke="#f3e6cc" stroke-width="2.2" fill="none" stroke-linecap="round"/>${fist(17, 22, 0.75)}${fist(31, 22, 0.75)}`,
  ),
  // Rampage Charge: a shoulder-first battering charge, speed lines and dust trailing.
  'rampage-charge': svg(
    `<ellipse cx="11" cy="41" rx="10" ry="4.5" fill="url(#dust)"/><path d="M2 13 H13 M2 21 H10 M2 29 H13" stroke="#e9ecf3" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><g filter="url(#ds)"><path d="M15 29 C17 17 27 12 37 17 C42 19 44 24 41 29 C37 34 25 34 19 34 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="35" cy="11" r="6" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><circle cx="38.5" cy="23" r="6" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><path d="M21 33 L29 39 L38 45 M21 33 L13 38 L7 45" stroke="#17181d" stroke-width="7.5" stroke-linecap="round" fill="none"/><path d="M21 33 L29 39 L38 45 M21 33 L13 38 L7 45" stroke="#2b2f3c" stroke-width="4.8" stroke-linecap="round" fill="none"/></g><path d="M20 20 C25 15 32 14 37 16" stroke="url(#gs)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M43 14 L47 9 M45 23 L48 23 M43 32 L47 36" stroke="#fff2a8" stroke-width="2.2" stroke-linecap="round" filter="url(#gl)"/>`,
  ),
  // Crushing Strike: a huge stone fist coming down onto a bright impact star.
  'crushing-strike': svg(
    `<path d="M24 47 L27.5 39 L36 42 L31.5 35 L41 32 L31.5 29.5 L33.5 21.5 L26.5 27.5 L24 19.5 L21.5 27.5 L14.5 21.5 L16.5 29.5 L7 32 L16.5 35 L12 42 L20.5 39 Z" fill="#f6ead2" stroke="#7d6448" stroke-width="1.3" filter="url(#gl)"/><circle cx="24" cy="33" r="4.5" fill="#fff" opacity=".85"/><path d="M24 1 V9" stroke="#4c4c55" stroke-width="9" stroke-linecap="round"/>${fist(24, 17, 0.95)}`,
  ),
  // Rampage Mode: a flexing silhouette erupting in a blood-red aura.
  'rampage-mode': svg(
    `<circle cx="24" cy="25" r="22" fill="url(#bd)" opacity=".85" filter="url(#gl)"/><g filter="url(#ds)"><path d="M15 30 C8 30 3.5 24 5.5 16 C6.5 11.5 11 11.5 12 16 C12 20 14 22 17 22" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><path d="M33 30 C40 30 44.5 24 42.5 16 C41.5 11.5 37 11.5 36 16 C36 20 34 22 31 22" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="12.5" r="3.6" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><circle cx="39.5" cy="12.5" r="3.6" fill="url(#gr)" stroke="#17181d" stroke-width="1.6"/><path d="M14 22 C14 20 34 20 34 22 L32 41 C28 44 20 44 16 41 Z" fill="url(#gr)" stroke="#17181d" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 24 V39 M18 30 H30 M19 35 H29" stroke="#3a3c44" stroke-width="1.2" opacity=".7"/><circle cx="24" cy="13" r="7" fill="url(#gr)" stroke="#17181d" stroke-width="1.8"/></g><ellipse cx="21.5" cy="10.5" rx="2.6" ry="1.6" fill="#fff" opacity=".55"/>`,
  ),
  // Grapple Slam: a fist hoisting a small figure overhead, the arc of the slam down to dust.
  'grapple-slam': svg(
    `<ellipse cx="34" cy="43" rx="12" ry="4" fill="url(#dust)"/><path d="M2 45 H46" stroke="#4a3622" stroke-width="3" stroke-linecap="round"/><path d="M8 34 C6 18 16 8 28 8" stroke="#f3e6cc" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="4 3"/><path d="M3.5 29.5 L8 38 L13 30.5 Z" fill="#f3e6cc"/><g filter="url(#ds)"><circle cx="35" cy="8.5" r="4" fill="#e6e9f0" stroke="#17181d" stroke-width="1.3"/><path d="M35 12.5 V21 M35 15.5 L29 12 M35 15.5 L41 12 M35 21 L31 26 M35 21 L39 26" stroke="#e6e9f0" stroke-width="2.4" stroke-linecap="round"/><path d="M35 33 V42" stroke="#4c4c55" stroke-width="7.5" stroke-linecap="round"/></g>${fist(35, 28, 0.62)}`,
  ),
  // Braxon's combo: a heavy stone fist with a cracking impact burst.
  'heavy-fist': svg(
    `<path d="M37 5 L39 13.5 L47.5 11.5 L41.5 19 L47.5 25.5 L39 24.5 L37 33 L34 24.5 L26.5 26.5 L31.5 19 L26.5 11.5 L34.5 13.5 Z" fill="#f6ead2" stroke="#7d6448" stroke-width="1.1" filter="url(#gl)"/><path d="M3 26 H11" stroke="#4c4c55" stroke-width="9" stroke-linecap="round"/>${fist(21, 26, 1)}`,
  ),
  // ---------------- Necro ----------------
  // Soul Drain: a violet soul orb, ghostly wisps streaming behind it.
  'soul-drain': svg(
    `<path d="M3 33 C11 25 15 35 21 27 C18 37 26 39 30 31" stroke="#a970ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85" filter="url(#gl)"/><path d="M5 20 C11 16 15 22 21 18" stroke="#e8dcff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".75"/><circle cx="32" cy="24" r="11.5" fill="url(#sl)" stroke="#1a0826" stroke-width="1.5" filter="url(#gl)"/><ellipse cx="28.5" cy="19.5" rx="4" ry="2.6" fill="#fff" opacity=".7"/><path d="M28 27 C30 29 34 29 36 27" stroke="#2a0d3d" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>`,
  ),
  // Death Eruption: bone spikes and a skeletal hand bursting from violet-lit ground.
  'death-eruption': svg(
    `<ellipse cx="24" cy="42" rx="21" ry="4" fill="#a970ff" opacity=".55" filter="url(#gl)"/><path d="M2 42 H46" stroke="#1c1426" stroke-width="3.5" stroke-linecap="round"/><g filter="url(#ds)"><path d="M7 42 L11.5 19 L16 42 Z M30 42 L35.5 15 L41 42 Z" fill="url(#bn)" stroke="#2a241c" stroke-width="1.3" stroke-linejoin="round"/><path d="M18 42 V25 M22 42 V20.5 M26 42 V23 M18 31 C18 26 26 26 26 31" stroke="#2a241c" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M18 42 V25 M22 42 V20.5 M26 42 V23 M18 31 C18 26 26 26 26 31" stroke="url(#bn)" stroke-width="2.6" fill="none" stroke-linecap="round"/></g><path d="M10.5 23 L11.5 19 M34.5 20 L35.5 15" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`,
  ),
  // Teleport: a hooded form dissolving into violet smoke and reforming beside it.
  teleport: svg(
    `<path d="M8 41 L10 22 C10 13 20 13 20 22 L22 41 Z" fill="#33284a" opacity=".35"/><circle cx="9" cy="16" r="2" fill="#a970ff" opacity=".7" filter="url(#gl)"/><circle cx="15" cy="10" r="1.6" fill="#e8dcff" opacity=".75"/><circle cx="5" cy="28" r="1.4" fill="#a970ff" opacity=".6"/><path d="M12 30 C18 24 22 34 28 28" stroke="#c9a6ff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="2 3" filter="url(#gl)"/><g filter="url(#ds)"><path d="M26 41 L28 19 C28 10 40 10 40 19 L42 41 Z" fill="#4a3a63" stroke="#120e18" stroke-width="1.6" stroke-linejoin="round"/><path d="M29 18 C30 12 38 12 39 18" stroke="url(#gs)" stroke-width="1.8" fill="none"/><ellipse cx="34.5" cy="21.5" rx="3.2" ry="3.8" fill="#07050a"/></g><ellipse cx="34" cy="42.5" rx="11" ry="2.6" fill="#a970ff" opacity=".5" filter="url(#gl)"/>`,
  ),
  // Undead Army: three polished skulls rising out of violet-lit earth.
  'undead-army': svg(
    `<ellipse cx="24" cy="43" rx="22" ry="3.5" fill="#a970ff" opacity=".45" filter="url(#gl)"/><path d="M2 43 H46" stroke="#1c1426" stroke-width="3.5" stroke-linecap="round"/><g fill="url(#bn)" stroke="#2a241c" stroke-width="1.4" filter="url(#ds)"><circle cx="11" cy="31" r="6.2"/><circle cx="24" cy="22" r="7.4"/><circle cx="37" cy="31" r="6.2"/><rect x="8" y="35" width="7" height="5" rx="1.6"/><rect x="20" y="27.5" width="8" height="6" rx="1.6"/><rect x="34" y="35" width="7" height="5" rx="1.6"/></g><g fill="#160f1f"><ellipse cx="9" cy="31" rx="1.6" ry="2"/><ellipse cx="13" cy="31" rx="1.6" ry="2"/><ellipse cx="21.5" cy="22" rx="2" ry="2.4"/><ellipse cx="26.5" cy="22" rx="2" ry="2.4"/><ellipse cx="35" cy="31" rx="1.6" ry="2"/><ellipse cx="39" cy="31" rx="1.6" ry="2"/></g><path d="M8 41 V45 M24 34 V45 M40 41 V45" stroke="#bfb6a3" stroke-width="2.6"/><ellipse cx="21" cy="17.5" rx="2.6" ry="1.5" fill="#fff" opacity=".7"/>`,
  ),
  // Grave Chains: spectral violet chain links lashing out to a bone hook.
  'grave-chains': svg(
    `<g fill="none" stroke-width="3.4" stroke-linecap="round" filter="url(#gl)"><ellipse cx="9" cy="37" rx="5.2" ry="3.3" transform="rotate(-35 9 37)" stroke="#6a2bb0"/><ellipse cx="17" cy="31" rx="5.2" ry="3.3" transform="rotate(-35 17 31)" stroke="#c9a6ff"/><ellipse cx="25" cy="25" rx="5.2" ry="3.3" transform="rotate(-35 25 25)" stroke="#7a35d0"/><ellipse cx="33" cy="19" rx="5.2" ry="3.3" transform="rotate(-35 33 19)" stroke="#e8dcff"/></g><path d="M37 15.5 C42 10 47 14 43.5 19.5 C41.5 22.5 37 21.5 37 18.5" stroke="#2a241c" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M37 15.5 C42 10 47 14 43.5 19.5 C41.5 22.5 37 21.5 37 18.5" stroke="url(#bn)" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="41" cy="8" r="2" fill="#e8dcff" opacity=".85" filter="url(#gl)"/>`,
  ),
  // Necro's combo: a bone staff sweeping round in a violet arc.
  'staff-swing': svg(
    `<path d="M6 35 C6 16 22 6 41 10" stroke="#7a35d0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7" filter="url(#gl)"/><path d="M10 35 C12 22 22 14 37 14" stroke="#e8dcff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/><g filter="url(#ds)"><path d="M12 45 L34 14" stroke="#2a241c" stroke-width="6" stroke-linecap="round"/><path d="M12 45 L34 14" stroke="url(#bn)" stroke-width="3.6" stroke-linecap="round"/><circle cx="36" cy="11" r="6.5" fill="url(#bn)" stroke="#2a241c" stroke-width="1.6"/></g><circle cx="33.7" cy="10.5" r="1.5" fill="#c9a6ff" filter="url(#gl)"/><circle cx="38.3" cy="10.5" r="1.5" fill="#c9a6ff" filter="url(#gl)"/><path d="M17 38 L20 40 M24 28 L27 30" stroke="#2a241c" stroke-width="1.4"/>`,
  ),
  // ---------------- Shroud ----------------
  // Thrown Blade: a spinning knife with motion arcs and a red-tipped edge.
  'thrown-blade': svg(
    `<path d="M6 30 A18 18 0 0 1 20 8" stroke="#dfe5ee" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/><path d="M4 22 A20 20 0 0 1 14 6" stroke="#dfe5ee" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".35"/><g transform="rotate(-38 28 26)" filter="url(#ds)"><path d="M16 23 H33 L45 26 L33 29 H16 Z" fill="url(#st)" stroke="#2c3038" stroke-width="1.2" stroke-linejoin="round"/><path d="M18 24.2 H33 L42 26" stroke="#fff" stroke-width="1" opacity=".9"/><path d="M37 24.6 L45 26 L37 27.4 Z" fill="#c4161f"/><rect x="13.5" y="21" width="3" height="10" rx="1.2" fill="#8b93a1" stroke="#2c3038" stroke-width=".8"/><rect x="4" y="23" width="10" height="6" rx="2.6" fill="url(#sh)" stroke="#000" stroke-width="1"/></g>`,
  ),
  // Stalker Lunge: a hunched black blur driving forward, knife first, with a red slash.
  'stalker-lunge': svg(
    `<path d="M2 16 H14 M2 24 H11 M2 32 H14" stroke="#3b3b4a" stroke-width="3" stroke-linecap="round"/><path d="M14 40 C16 26 24 16 34 18 C37 19 39 22 37 26 C34 30 28 33 22 40 Z" fill="url(#sh)" stroke="#000" stroke-width="1.4" filter="url(#ds)"/><path d="M14 40 L11 46 M20 40 L19 46 M25 38 L27 45" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="33" cy="15" rx="3.3" ry="4.2" fill="#f1eee7" stroke="#8f8a80" stroke-width=".8"/><path d="M33.6 13.5 L35.4 14.2" stroke="#101014" stroke-width="1"/><path d="M36 25 L46 22" stroke="url(#st)" stroke-width="2.6" stroke-linecap="round"/><path d="M24 34 C30 30 38 26 46 28" stroke="#e5242e" stroke-width="2.2" fill="none" stroke-linecap="round" filter="url(#gl)"/>`,
  ),
  // Behind You: a pale mask rising out of shadow behind a startled outline.
  'behind-you': svg(
    `<circle cx="18" cy="16" r="6" fill="none" stroke="#9aa3b2" stroke-width="2" opacity=".7"/><path d="M18 22 V36 M18 26 L12 31 M18 26 L24 31 M18 36 L14 44 M18 36 L22 44" stroke="#9aa3b2" stroke-width="2" stroke-linecap="round" opacity=".7"/><path d="M26 46 C24 30 26 14 33 8 C40 14 43 30 42 46 Z" fill="url(#sh)" stroke="#000" stroke-width="1.3" filter="url(#ds)"/><path d="M28 18 C29 11 37 11 38 18" stroke="#3b3b4a" stroke-width="1.6" fill="none"/><ellipse cx="33" cy="20" rx="4" ry="5.4" fill="#f1eee7" stroke="#8f8a80" stroke-width=".8"/><ellipse cx="32" cy="17.5" rx="1.6" ry=".9" fill="#fff"/><path d="M31 19 L34.6 18 M33 23.5 H34.6" stroke="#101014" stroke-width="1.1" stroke-linecap="round"/><path d="M38 28 L44 20" stroke="url(#st)" stroke-width="2.4" stroke-linecap="round"/><circle cx="28" cy="36" r="5" fill="#000" opacity=".35" filter="url(#gl)"/>`,
  ),
  // Rending Flurry: three crossing blood-red slashes over a steel blade.
  'rending-flurry': svg(
    `<g filter="url(#gl)"><path d="M6 10 C18 18 28 26 42 34" stroke="url(#bd)" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M4 22 C16 26 28 30 44 30" stroke="url(#bd)" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M10 38 C20 30 30 22 40 10" stroke="url(#bd)" stroke-width="3.6" stroke-linecap="round" fill="none"/></g><path d="M8 11 C18 18 26 24 36 30 M12 37 C20 31 28 24 37 13" stroke="#ffd0d0" stroke-width="1" stroke-linecap="round" opacity=".8"/><g transform="rotate(30 26 26)" filter="url(#ds)"><path d="M18 24 H32 L41 26 L32 28 H18 Z" fill="url(#st)" stroke="#2c3038" stroke-width="1"/><rect x="10" y="23.2" width="8" height="5.6" rx="2.4" fill="url(#sh)" stroke="#000" stroke-width=".9"/></g><circle cx="38" cy="40" r="1.6" fill="#a3121b"/><circle cx="33" cy="43" r="1.1" fill="#a3121b"/>`,
  ),
  // Hunting Frenzy: a hunched masked silhouette in a red aura, blood drops falling.
  'hunting-frenzy': svg(
    `<circle cx="24" cy="25" r="22" fill="url(#bd)" opacity=".8" filter="url(#gl)"/><path d="M11 46 C10 33 14 20 24 16 C33 20 37 32 37 46 Z" fill="url(#sh)" stroke="#000" stroke-width="1.3" filter="url(#ds)"/><path d="M15 21 C16 10 32 10 33 21 C29 18 19 18 15 21 Z" fill="#0b0b10" stroke="#000" stroke-width="1"/><ellipse cx="24.5" cy="21.5" rx="4.4" ry="5.8" fill="#f1eee7" stroke="#8f8a80" stroke-width=".8"/><path d="M22.5 20 L26.6 19 M24 25.5 H26" stroke="#101014" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="23.5" cy="18.5" rx="1.8" ry="1" fill="#fff"/><path d="M34 34 L44 26" stroke="url(#st)" stroke-width="2.4" stroke-linecap="round"/><path d="M42 27.5 L44 26" stroke="#c4161f" stroke-width="2.4" stroke-linecap="round"/><path d="M8 30 C8 33 10 34 10 34 C10 34 12 33 12 30 C12 28 10 26 10 26 C10 26 8 28 8 30 Z M40 38 C40 40.5 41.5 41.5 41.5 41.5 C41.5 41.5 43 40.5 43 38 C43 36.5 41.5 35 41.5 35 C41.5 35 40 36.5 40 38 Z" fill="#c4161f"/>`,
  ),
  // Shroud's combo: a knife mid-slash, a red arc trailing its edge.
  'knife-slash': svg(
    `<path d="M6 38 C10 22 22 10 40 8" stroke="#e5242e" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8" filter="url(#gl)"/><path d="M10 36 C14 24 24 14 37 12" stroke="#ffd0d0" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/><g transform="rotate(-42 24 30)" filter="url(#ds)"><path d="M22 27 H38 L47 30 L38 33 H22 Z" fill="url(#st)" stroke="#2c3038" stroke-width="1.2"/><path d="M24 28.2 H38 L44 30" stroke="#fff" stroke-width=".9"/><rect x="19.5" y="25" width="3" height="10" rx="1.2" fill="#8b93a1" stroke="#2c3038" stroke-width=".8"/><rect x="9" y="27" width="11" height="6" rx="2.6" fill="url(#sh)" stroke="#000" stroke-width="1"/></g>`,
  ),
};

let instance = 0;

/**
 * The icon's SVG markup. Gradient and filter ids get a per-copy suffix: the same icon sits on the
 * desktop bar and on a touch button, and an id referenced from a hidden copy would not paint.
 */
export function abilityIcon(id: string | undefined): string | null {
  const icon = id ? ABILITY_ICONS[id] : undefined;
  if (!icon) return null;
  const n = ++instance;
  return icon.replace(/id="(\w+)"/g, `id="$1-${n}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${n})`);
}
