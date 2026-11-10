# Video Reference Observation Report

> Required by Playbook §4.5. Prepared by the Master Developer on 10/11/2026.
> **Purpose:** extract transferable *presentation* principles for Stickman Arena's original, fully 3D, real-time combat.
> **Not a source of** characters, names, mechanics, genre, UI or audio. Stickman Arena is **not** a Pokémon game.

## 1. What was inspected, and how

| | Video A | Video B |
|---|---|---|
| Owner's file | `07.11.2026_14.25.07_REC_1.mp4` (uploaded twice; byte-identical) | `WhatsApp Video 2026-11-08 at 11.24.31 AM.mp4` (uploaded twice; byte-identical) |
| Format | H.264 1280×718, 25 fps, **2 min 33 s**, AAC audio | H.264 380×850 (portrait), ~35 fps, **1 min 06 s**, AAC audio |
| Content | Screen recording of a fan-made real-time top-down Pokémon fighting game (watermark "PokemonBattlegrounds"). Six-versus-six team battle, one fighter active per side. | Phone screen recording of a YouTube Short ("Poke Arena 2D – Charizard vs Blastoise", channel @Poke1v1). Real-time top-down 1v1 on a stadium pitch. |
| Method | Decoded with ffmpeg. One frame every 2 s across the whole video (77 frames), plus 5 fps dense sampling over 00:18–00:22 (a beam attack). | One frame every 2 s across the whole video (34 frames), plus 5 fps dense sampling over 00:47–00:50 (lead-up to the ultimate). |

### Limitations (stated plainly)

- **Audio was not analysed.** I cannot listen to audio tracks, so nothing here is about sound design. Sound principles in the spec come from the playbook, not these videos.
- Frame sampling (every 2 s, plus short 5 fps bursts) can **miss very short events** such as 1–3 frame hit-stops or subtle anticipation poses. Screen shake cannot be confirmed reliably from stills.
- Video B is a low-resolution phone recording with YouTube UI on top, so fine details (small numbers, small status icons) are partly unreadable.
- Both games are **2D sprite games seen top-down**. Every observation must be re-interpreted for a free third-person 3D camera.
- Timestamps below are file time (mm:ss). For Video A, the in-game match clock in the footage roughly matches file time.

## 2. Direct observations (what is visibly confirmed)

### Video A: top-down field battle

| Time | Observation |
|---|---|
| 00:00–00:02 | A tornado ability: a tall swirling vortex rises at the target. The action name appears twice: as a pill in the caster's top HUD corner and as small text under the caster. |
| 00:02–00:04 | A curved, glowing projectile with a long trail arcs from caster to target. A damage number ("100") pops at the impact point. |
| 00:04–00:06 | A long straight beam crosses the field. Text callouts ("CRITICAL!" and an effectiveness message) stack at the impact point. |
| 00:08–00:10 | A ground eruption of crystal spikes erupts *under* the target, with a damage number. |
| 00:16 | A dashing body attack misses: an explicit **"MISS"** callout at the target. |
| 00:18–00:22 (dense) | Beam attack: (1) the caster shows a short **charge pose** with a spout of water above it for about 0.4 s before firing; (2) the beam extends; (3) a bright **flash/glow** envelops the target on contact for about 0.2 s; (4) **multiple damage numbers** tick (94, 109) while the beam persists for about 0.6–0.8 s; (5) the target is **pushed back** along the beam direction; (6) the beam dissipates into droplets. |
| 00:20, 00:38, 01:02 | A heavy charging attack: the attacker is wrapped in a spiked, dark-purple energy shell while dashing. It reads clearly as the strongest move. |
| 00:22 | **"2 HIT COMBO!"** in large yellow italic text at the top of the screen. |
| 00:31 | **"BLOCKED!"** callout with a reduced damage number; a **hexagonal barrier** is visible around the defender. The hex shield appears in many other frames. |
| 00:32 | A body slam lands: a large white-orange **starburst** flash and two damage numbers. |
| 00:38 | Status callout ("FULLY PARALYZED!") above the affected fighter. |
| 00:40, 00:58 | **Persistent ground decals** (scorch or crack marks) and scattered debris remain on the grass after impacts. |
| 00:44 | Self-heal: a vertical **light pillar** on the caster plus a green "+338" number. |
| 01:04 | "...MUST RECHARGE!": the strongest attack leaves its user **vulnerable** afterwards. |
| 01:06, 01:30, 01:36 | Defeat: the fighter's sprite goes grey or prone, a huge **"[NAME] FAINTED!"** banner appears, and the HUD portrait turns grey. A short pause follows before the next fighter enters. |
| 01:48 | **Full-screen cinematic emphasis** on an ultimate-class hit: white background, black radial speed lines, the target silhouetted, damage number central. Lasts well under a second within the 2 s sampling. |
| 01:56 | "FROZEN!": the target is encased in an ice block (a visible status *on the model*). |
| 02:05 | **"CLASH!"**: two attacks meet and cancel, with a distinct callout. |
| Throughout | HUD: portrait, name, HP bar with numeric HP and status tags in each top corner; team pips under the bars; **match timer** top centre. The camera is fixed top-down. The arena is open grass with a pond and hedge border. |

### Video B: stadium pitch 1v1

| Time | Observation |
|---|---|
| 00:00–00:06 | Pre-fight: an empty pitch with the fighters walking in. Top HUD has portraits, names and HP bars for both sides. |
| 00:06–00:22 | Each fighter has a **small HP bar above its head** plus small segmented pips (likely a resource or charge meter). Action names appear in **boxed labels** above the caster ("Flamethrower!", "Bubble Beam!", "Rapid Spin!"). Basic hits show small "Clash" labels and small numbers. |
| 00:20 | Spinning melee ability: the fighter becomes a fiery spinning ring; the opponent shows **"MISS"** after sidestepping. |
| 00:30 | Mid-match transformation ("is evolving!", bright white silhouette). **Not transferable**: this is a franchise mechanic. |
| 00:34 | An airborne move: the fighter disappears upward and a **ground shadow/target circle** marks where it will land. A strong telegraph. |
| 00:36 | Water burst with **"3 hit combo"** text. |
| 00:38 | Heal shown as "+25% HP". |
| 00:40–00:50 (dense) | **"Ultimate ready!"** text floats beside the fighter when the ultimate becomes available. The camera **pans to keep both fighters in frame** on the tall pitch. |
| 00:52 | Ultimate: a huge X-shaped water attack covering much of the screen, with its name in a large boxed label. A status label ("Soaked!") follows. |
| 00:58–01:02 | KO: the screen **flashes to a full warm colour** for a moment, then "K.O." in the HUD and a **"[NAME] wins!"** banner. |

## 3. Interpretation: transferable principles

*(This is my interpretation of the observations above, separated as Playbook §4.5 requires.)*

1. **Every action has a visual signature.** Colour, shape and motion differ per ability (trail arc versus straight beam versus ground eruption versus vortex), so actions read without text. → Spec PRS-1.
2. **Power is telegraphed in proportion.** Small attacks fire almost instantly; strong ones show a charge pose (about 0.4 s for the beam) or an energy shell; landing zones of airborne moves are marked on the ground. → PRS-2, REQ-ABL-6.
3. **Impact has layers:** contact flash, then burst particles, then a damage number, then target recoil or knockback, then a lingering decal. → PRS-3.
4. **Combat outcomes are explicit:** MISS, BLOCKED, CRITICAL, CLASH and combo counts each get their own callout style and size. Big text is for big moments only (combos, KOs). → PRS-4.
5. **Defence is visible:** a geometric barrier shows when a block happens. → PRS-5.
6. **Status lives on the body:** ice encasement and colour tints, not just HUD icons. → PRS-6.
7. **Projectiles leave trails**, which makes their path readable and dodgeable. → PRS-7.
8. **Ultimates get a short cinematic beat** (speed lines or a full-screen flash, well under a second) and a **"ready" notification** beforehand. → PRS-8.
9. **Heavy attacks carry a recovery cost** ("must recharge"), which creates counter-play. This fits REQ-CMB-1 recovery states.
10. **Defeat is a moment:** banner, greyed portrait, brief pause. → PRS-9.
11. **HUD hierarchy:** big portraits and bars at the top for both sides, a centre timer, and small bars above heads for in-world reading. → PRS-10.
12. **The camera serves readability:** a static overview (A) or a tracking pan that keeps both fighters framed (B). In 3D this maps to the opponent-framing requirement REQ-CAM-3.

## 4. Original Stickman Arena adaptations (proposals for Master Developer and owner review)

| Principle | 3D adaptation idea |
|---|---|
| Visual signature | Each fighter has a palette and VFX language: Inferno = embers, heat haze, orange-white cores; Phantom = violet afterimages and runes; Ronin = crisp white slash arcs; Titan = sparks, hydraulic steam, dust shockwaves; Shadowfang = black-red smoke and claw streaks. |
| Telegraphs | Ground decals (circles, cones, lines) projected on the 3D floor and furniture so they read from any camera angle; anticipation poses authored in the rig with a data-driven wind-up time per action. |
| Impact layering | Data-driven "impact profile" per action: hit-stop frames, flash, particle burst, camera shake amplitude, knockback vector, decal. Light melee = small; ultimate = large. |
| Callouts | World-space floating text anchored to the hit point and billboarded to the camera; combo counter in screen space. |
| Ultimate beat | A short camera push-in or radial speed-line overlay (about 0.3–0.6 s), with an "ULTIMATE READY" cue on Button 5. Keep it brief so real-time play is not interrupted; do not pause the opponent unfairly. |
| Recovery cost | Ultimates and heavy abilities have a data-driven recovery window during which the user can be punished. |
| Camera | Third-person orbit camera with soft auto-framing that biases toward the opponent during combat, and obstruction handling around furniture. |

## 5. Must NOT be copied

Pokémon characters, creatures and names; move names (e.g. "Hydro Pump", "Giga Impact"); the type chart and effectiveness messages ("super effective", "not very effective"); evolution or mega-evolution; team-of-six switching as presented; Poké Ball imagery (the centre-circle logo in Video B); "[NAME] fainted!" wording; the HUD's exact layout, fonts and colour styling; any music, sound or sprite art; trainer characters at the arena edges. Stickman Arena callout wording, fonts and HUD layout must be designed independently.

## 6. Technical implications

- A **VFX system** with pooled particles, trails, decals, screen flashes and a camera-shake service (render specialist, with the animation specialist for timing).
- **Animation events** (wind-up start, active frames, impact frame, recovery end) must drive combat timing and VFX together (animation and combat specialists).
- A **hit-stop** service that can freeze or slow attacker and target for a few frames without desynchronising physics (combat and physics specialists).
- **Floating text** and callout system in the HUD layer (mobile controls and HUD owner).
- Mobile performance budget for particles (OQ-10).

## 7. Conflicts and items for owner clarification

1. Both videos are **top-down 2D**. Their framing is a readability lesson only; Stickman Arena stays third-person 3D (INV-1).
2. Both videos show **many** distinct moves per fighter. Stickman Arena is fixed at five actions (INV-9); variety comes from combo chains and animation variations, not extra buttons.
3. Video A shows team switching and Video B shows transformation. Neither is adopted. If the owner wants 3v3 to involve switching, specify it (OQ-07).
4. Whether PRS-1 to PRS-11 become binding is **OQ-15**.
