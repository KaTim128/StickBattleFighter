# TESTING CHECKLIST

Verification checklist for every milestone and release. Based on Playbook §15 and the master spec. **A successful build alone does not prove the game works.** Tick an item only with evidence (command output, test name, screenshot path or device log) in the Evidence column or the progress record.

**Test levels:** U = unit (Vitest) · I = integration · B = browser automation (Playwright) · V = visual inspection or screenshot · D = real device (manual, logged)

Proposed commands (exist from Phase 0): `npm run typecheck` · `npm test` · `npm run build` · `npm run e2e -- --trace off`

## 0. Initialisation (Phase I)
- [x] All required documents exist with meaningful content
- [x] 10 specialist agent files with valid YAML frontmatter
- [x] Rules and skills have valid frontmatter
- [x] No game code, fighters, arenas or assets created
- [x] Froggy repository unmodified (`git status` clean in froggy-arcade)

## 0b. Phase 0 bootstrap: 2D top-down (re-verified 10/11/2026 after the switch to 2D, TD-021)
- [x] `npm run typecheck` exits 0 (both tsconfig projects)
- [x] `npm test`: 5 files, 15 tests pass (fixed-step accumulator, game loop, pixel-ratio clamp, 2D view fit, Rapier 2D: no in-plane gravity, crate bounces off walls without tunnelling and comes to rest)
- [x] `npm run build` exits 0; the only size warning was triaged (TD-020)
- [x] `npm run e2e`: 2/2 pass (desktop Chrome + Pixel 7): ready state, physics steps advance, the crate slides more than 1 m and comes to rest, canvas not blank, zero console, page or network errors; screenshots saved
- [x] Pages build (`BASE_PATH=/StickBattleFighter/`) loads under the sub-path with zero errors

## 0c. Phase 1 engine foundation (verified 11/11/2026)
- [x] `npm run lint` (Biome): no issues
- [x] `npm run typecheck`, `npm run build`: exit 0, no warnings
- [x] `npm test`: 10 files, 26 tests: scene manager (switch, failed load cleanup, superseded load, clear once), asset loader (dedupe, missing asset, odd failures), FPS meter, y-sort (feet-based depth), engine-check scene load/unload ×3 with no leftover display objects or physics, missing optional texture keeps running, plus the Phase 0 tests
- [x] `npm run e2e`: 6/6 pass (desktop and mobile): smoke; debug overlay toggles with the backquote key and draws collider outlines and FPS; `?missingAssetTest` reports the failure in the status line with no page errors and the simulation keeps running
- [x] GitHub Pages sub-path build loads the physics `.wasm` correctly

## 0d. Phase 2 movement (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: 15 files, **67 tests**, including input (WASD/arrows mapping, diagonal = unit length, opposite keys cancel, jump latch, joystick dead zone and rim), movement (acceleration ramp, diagonal no faster, deceleration stop, hop peak and landing, no double jump), skeleton (an elbow and knee on every limb that actually bend; knees bend back and elbows forward in every greybox pose; feet grounded; per-joint blend), animator (eases into walk, air blend, stride-synced cycle), follow camera (scale per short side, clamping and centring, easing), and the training-yard scene with real physics (walk speed and stop, front/back and diagonal, wall containment, **sliding along walls**, pillars block, hop, camera follows, clean unload)
- [x] `npm run e2e`: 8 passed, 2 correctly skipped (each movement test runs on its own platform). Desktop keyboard: moves right, faces right, stops; moves up; Space hops and lands; cannot pass the left wall; camera follows; **touch controls hidden on desktop**. Mobile: a real touch drag (CDP) shows the joystick and moves the fighter; release stops it and hides the stick; JUMP button hops; no page errors
- [x] GitHub Pages sub-path build loads and runs

## 0e. Phase 3 camera (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: **92 tests**. Framing: alone, zooms to fit, the 17 m limit keeps the player on screen, ignores far fighters. Smoothness: no snapping after a knockback (≤ 0.25 m pan and < 0.15 m zoom per frame). Shake: shakes then fully settles, trauma² scaling, smooth between frames, capped. Scene: frames player and dummy and zooms out as they separate, both stay on screen; dummy can be shoved and settles; impact shakes then settles; dummy unloads.
- [x] `npm run e2e`: 11 passed (desktop and mobile; keyboard and touch tests skipped on the other platform by design). New: the camera zooms out to keep both fighters on screen within limits; debug **P** shakes and settles; **P** does nothing without the debug overlay.
- [ ] **Flaky watch:** the "camera zooms out" e2e failed once in a full parallel run, then passed alone and in two further full runs. Suspected timing under CPU load; the exact failing assertion was not captured. Watch in CI; if it recurs, capture the error-context file.

## 0f. Phase 4 office, combo and door (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: **127 tests**. Office layout (12 cubicles, 6 per side; boss-room arrangement; distinct looks; bounds; no solid overlaps; spawns; closed door = 2 regions, broken = 1; cubicles reachable; open aisle). Combo (single jab; jab → hook → heavy flow; finisher strongest; reset; no mash-through; flying kick once per jump; door strengths). Door rule (contact never; light strikes no; kick, heavy strike and heavy knockback yes). Capsule hits (whole path, facing side only). Boxer stance (slightly bent, staggered); jump stance (rise knee up, fall tucked). Office scene with real physics: walking never opens the door; jab and hook don't break it, the finisher does and the way is clear; the flying kick does; a knocked-back dummy does; three presses standing still land three hits; the camera follows into the boss room smoothly.
- [x] `npm run e2e`: **14 passed** in 3 consecutive full runs. New: shoving the dummy against the door keeps it shut, the 1-2-3 combo smashes it, walk into the boss room, camera follows; jump peak > 0.8 m; the touch MELEE button throws the jab.
- [ ] **Watch:** one earlier full run had a one-off mobile smoke-test failure that did not recur in later runs (cause not captured).

## 0g. Phase 5 combat engine (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: **152 tests**. Combatant rules (damage, crit seeding, block chip and stamina, parry, guard break, dodge invulnerability and cost, stamina regen delay, stun, knockdown, KO and respawn); combat scene (combo damages the dummy, block reduces damage, parry stuns the attacker, dodge avoids a hit, KO and respawn, dummy attacks); input queue (two quick taps both kept, one per step; mashing capped at 3).
- [x] `npm run e2e`: **16 passed**, and **96/96** across 6 repeats of the whole suite (`--repeat-each 6`). New: combo damage with floating numbers, hold J to block, T toggles dummy attacks, an unguarded player takes damage, Shift dodges.
- [ ] V Owner playtest of feel: block timing, parry window, dodge distance, damage numbers (values provisional, OQ-05)

## 0h. Owner feedback round (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: **166 tests**. New: compact office (≤ 30 m wide, ≤ 7.5 m aisle, one connected area, no enclosed pockets); props (jab shoves a chair and it is planted again; jab + hook breaks it into pieces and the way is clear; a desk breaks and its monitor falls to the floor; desk items ride along; a metal cabinet never breaks but moves; walking never shoves a desk); get-up state (cannot act, invulnerable, then free); flying kick slide < 3.5 m (was about 5 m+ in the same test); combo variants (3 looks per attack, never twice in a row, same attack data); game loop time scale.
- [x] `npm run e2e`: **48/48** over 3 full-suite repeats. New: holding MELEE never selects or highlights its label (user-select none, transparent tap highlight, long-press menu blocked).
- [x] V Screenshots: `docs/screenshots/office-compact-overview.png`, `props-chair-shoved.png`, `props-chair-broken.png`, `props-boss-desk-smashed.png`, `fall-and-get-up.png`, `combo-variants.png`.
- [ ] V Owner check on a real phone: holding MELEE no longer highlights the label.

## 0i. Phase 6 abilities (verified 11/11/2026)
- [x] Lint, typecheck and build clean
- [x] `npm test`: **189 tests**. Caster (phases and release event, cooldown, stamina, busy, airborne, meter gating and charge, interrupts except the ultimate, no interrupt after release); burn (damage over time, can KO); stamina spending; invulnerability; ability input queue and keys. In the arena: Fire Bolt hits, burns and fires its sound hooks; a pillar stops it; cooldown and stamina gating; Flame Dash distance, hit and fading trail; Eruption warns first, then knocks down only inside the ring; Meteor Fist needs a full meter, leaps (lifted), lands on the target, empties the meter; damage charges the meter; a hit during the wind-up cancels the bolt; fire burns a desk until it breaks.
- [x] `npm run e2e`: **18 passed**. New: Q fires a bolt that damages the dummy, the bar shows the cooldown, F does nothing without a full meter; touch shows five combat buttons and A1 casts.
- [x] V Screenshots: `docs/screenshots/phase6-abilities.png` (bolt in flight and hit, flame trail, eruption warning and blast, meteor leap with landing warning, impact, ultimate ready).
- [ ] V Owner playtest of ability feel and balance (values provisional, OQ-05)

## 0j. Hit feel and KO dissolve (verified 11/11/2026)
- [x] `npm test`: **194 tests**. New: a landed jab flashes the target, queues `punch-light`, recoils the puncher and freezes the next step (hit-stop); the finisher sounds `punch-heavy`; a held guard sounds `block` with no flash; a KO queues `ko`, the dummy stays visible while fainted, fades while `dust` plays, is gone before respawn and is fully visible after; every impact, ability and KO sound id has a recipe; the sound board is silent without Web Audio.
- [x] `npm run e2e`: **36/36** over 2 repeats.
- [x] V Browser (frozen frames): white flash with contact star on a jab; KO blow; lying; dissolving into dust; gone (`docs/screenshots/hit-feel-and-ko-dissolve.png`). Played sounds confirmed in order (`punch-light`, `ko`, `dust`), no console errors.
- [ ] Owner listening check on real speakers or headphones (sound cannot be judged in headless tests).

## 0k. Punch Clash (verified 11/11/2026)
- [x] `npm test`: **207 tests**. Trigger (both sides required, window, range, cooldown); rules (mash duration and final stretch within the owner's ranges, presses count only while mashing, both build power, exchange speeds up and spikes, 5% stalemate band, finisher scaling and 3–6 frame hit-stop). In the arena: a natural exchange (jabs, blocking the dummy's replies) triggers a clash; fast mashing wins (camera closes in, finisher damage, loser knocked down and back, camera returns); no mashing loses; a near-tie is a stalemate (both thrown back, no damage); beats sound louder as it builds; contacts cleared after.
- [x] `npm run e2e`: **19 passed** (new: real keyboard mashing fills the bar, result banner, clash sounds).
- [x] V Screenshots: `docs/screenshots/punch-clash.png` (normal, lock-up, mid, final stretch, finisher, camera back).
- [ ] Owner playtest: is 6.5 presses/s the right challenge for the training dummy?

## 0l. Wall transparency (verified 11/11/2026)
- [x] `npm test`: **211 tests**. A pillar in front of a fighter fades smoothly (mid-fade seen, then 30%) while the other pillars stay solid; it restores to 100% when the fighter walks away; in the open office doorway only the covering wall sections fade; nothing fades when nothing covers a fighter.
- [x] V Screenshots: `docs/screenshots/wall-transparency.png`.

## 0m. Aimed ultimate (verified 11/11/2026)
- [x] `npm test`: **214 tests**. I enters aiming at the soft-locked target with the meter untouched; WASD moves the spot, not the fighter; I launches and the leap lands on the spot (within 0.8 m) away from the dummy, which is unharmed; the spot is clamped to the maximum range; a drag places it directly; a hit while aiming cancels it and keeps the meter; keys K/L/O/I.
- [x] `npm run e2e`: desktop I → W → I lands up the screen; touch hold–drag–release on ULT jumps where dragged.
- [x] V Screenshots: `docs/screenshots/ultimate-aiming.png` (aim at the target, aim moved, mid-leap).

## 0n. Walking and running (verified 11/11/2026)
- [x] `npm test`: **216 tests**. Legs alternate and each fist swings opposite its leg; the swinging foot lifts; running strides wider, leans more and pumps the arms harder, with no locked knees; one stride of distance = one cycle at walk and run speeds; idle → walk → run weights blend by speed and ease rather than snap; the walk keeps the guard up.
- [x] V Frames: `docs/screenshots/walk-run-gait.png` (run cycle; turn and start-up).

## 0o. Office centre cubicles and breakables (verified 11/11/2026)
- [x] `npm test`: **220 tests**. 12 cubicles as six back-to-back pairs (north and south partners share a back panel, in the centre); every cubicle has chair, computer, keyboard, mouse and drawer pedestal; aisles and every walkway connected; every cubicle enterable; boss room sealed until the door breaks; tough tables, drawers and cabinets; a table survives a full combo and breaks on the second (wood sound, keyboard falls); a punch shatters a monitor into glass shards; a surviving desk item is knocked off; a steel drawer rings when hit, survives a combo and breaks with a metal sound; a cabinet takes 240 and moves.
- [x] `npm run e2e`: office door flow from the open area before the door.
- [x] V Screenshot: `docs/screenshots/office-centre-cubicles.png`.

## 1. Build and code health (every change)
- [ ] `npm run lint` passes (Biome)
- [ ] U `npm run typecheck` exits 0
- [ ] U/I `npm test` passes; no skipped tests without a recorded reason
- [ ] `npm run build` exits 0; no bundler warnings left untriaged
- [ ] B smoke test: app loads, canvas renders, **zero console errors**, no failed network requests
- [ ] No secrets, `.env` files or credentials in the diff

## 2. Movement and physics (REQ-PHY)
- [ ] U forward, backward, lateral, diagonal movement (diagonal not faster than cardinal)
- [ ] U acceleration, deceleration, turning rate per fighter data
- [ ] U/B jump, gravity, ground detection, landing
- [ ] B slopes, steps and stairs; no getting stuck on furniture edges
- [ ] B wall collision with no tunnelling at max speed and max knockback
- [ ] U knockback scales with Knockback Resistance and weight
- [ ] I rigid bodies sleep when idle; cosmetic objects use no expensive physics

## 3. Camera (REQ-CAM)
- [ ] B top-down follow with smoothing; auto-zoom keeps all fighters framed within zoom limits
- [ ] B wall obstruction and furniture obstruction (no clipping), recovery after obstruction
- [ ] B opponent framing in combat
- [ ] B stability during knockback and fast movement
- [ ] V screenshots at desktop and mobile aspect ratios

## 4. Combat (REQ-CMB)
- [ ] U hit, miss, block, dodge, interrupt, counter, recovery outcomes
- [ ] U hits depend on 2D position (plus airborne state), facing, range, timing; obstruction blocks hits; **no guaranteed hits**
- [ ] U melee (Button 1) has **no stamina cost**
- [ ] U stamina spend and regeneration; ability refused when stamina is insufficient
- [ ] U cooldowns start, tick and reset correctly; not bypassable by input spam
- [ ] U critical chance and critical damage applied
- [ ] U knockback direction and magnitude
- [ ] U defeat state triggers exactly once
- [ ] I combo chains and windows (if adopted)
- [ ] I pairwise fighter matchup regression (Phase 9)

## 5. Abilities and ultimates (REQ-ABL)
- [ ] U each ability: target validation, stamina, cooldown, range, hit detection, interruption
- [ ] I animation events trigger hitboxes, VFX and SFX on the correct frame
- [ ] U ultimate charge or cooldown rule (per OQ-04)
- [ ] V presentation targets PRS-1 to PRS-11 (if adopted, OQ-15): readable wind-up, impact layering, callouts, trails, ultimate beat

## 6. Animation (REQ-ANI)
- [ ] I every required animation state exists for each fighter (asset validation test)
- [ ] V smooth blends: idle ↔ move ↔ attack ↔ hit reaction ↔ knockback ↔ pickup ↔ throw
- [ ] V no T-poses, foot sliding beyond tolerance, or snapping on transitions
- [ ] V each fighter's animation set is distinct (no recolour reuse)
- [ ] U every idle and movement pose keeps a fighting stance: fists at or above chest height and in front of the body; lead foot stays ahead and feet never cross (pattern: `tests/unit/animation/skeleton.test.ts`)
- [ ] I no two fighters reference the same idle, movement or attack clip (automated check over fighter data, REQ-ANI-7)
- [ ] V side-by-side capture of all fighters idling and walking shows clearly different stances and gaits

## 7. Environment and objects (REQ-ENV, REQ-PHY-5..13)
- [ ] B all office prop categories present; greybox labelled
- [ ] I reachability: every walkable zone reachable; nothing blocks incorrectly
- [ ] U/I pickup validity (mass limits per fighter), carry, aim, throw
- [ ] I thrown objects collide with fighters, walls, furniture and floors; bounce and roll
- [ ] I glass shatters, wood topples or breaks, metal resists, indestructible movables never break
- [ ] I debris cleanup and limits; no runaway object counts
- [ ] I sand impairs visibility or accuracy temporarily (per OQ-12)
- [ ] I fighter-specific object interactions (Titan, Shadowfang, Ronin, Phantom, Inferno)

## 8. AI (REQ-AI)
- [ ] I navigation around office furniture; unstuck recovery
- [ ] I approach, retreat, circling, dodge, block, counter, object use
- [ ] I respects cooldowns and stamina (same rules as players)
- [ ] I difficulty levels differ in behaviour quality; personalities distinct
- [ ] I no single-behaviour spam over a 3-minute soak test

## 9. Controls and HUD (REQ-CTL)
- [ ] B desktop: **no** joystick and **no** mobile combat buttons visible
- [ ] B mobile/tablet emulation: left joystick + **exactly five** right buttons in order (melee, A1, A2, A3, ultimate)
- [ ] D simultaneous touch (move + attack) on a real phone and a real tablet
- [ ] D landscape layout; safe areas and notches
- [ ] B key rebinding, conflict prevention, reset defaults, persistence of bindings
- [ ] B cooldown and stamina indicators update correctly
- [ ] B multiple viewport sizes; accessibility (contrast, touch target size)
- [ ] U tap Button 1 = melee; hold ≥ threshold (0.2 s) = block; release ends block (REQ-CTL-11)
- [ ] U stick flick triggers dodge in the flick direction; ordinary steering never does; double-tap mode works (REQ-CTL-12)
- [ ] B utility button: jump by default; pick-up icon near a throwable; throw while carrying; hold to drop; visually distinct from combat buttons (REQ-CTL-13)
- [ ] B soft target lock: nearest visible opponent; tap or Tab switches; aim assist never guarantees a hit (REQ-CTL-14)
- [ ] B both desktop presets (keyboard + mouse, keyboard only) work and rebind (REQ-CTL-15)
- [ ] B touch laptop: HUD switches to touch on first touch and back on keyboard or mouse input

## 10. Tutorial (REQ-TUT)
- [ ] B new player: tutorial starts; covers every REQ-TUT-2 topic
- [ ] B instructions adapt to keyboard vs touch
- [ ] I completion persisted server-side; returning player not forced through it again
- [ ] B replay from menu
- [ ] I Skip visible **only** for server-verified admins; a forged client flag is rejected
- [ ] I skip does not mark an ordinary user's tutorial complete

## 11. Game modes (REQ-MOD)
- [ ] I Practice Zone: fighter select, health restore, dummy config, dummy attacks toggle, respawn, restart
- [ ] I 1v1 entry cost and rewards from config
- [ ] I 3v3: random pool of five, select exactly three
- [ ] I Ladder Run difficulty increases per step
- [ ] I Story Mode: opponents, arenas, challenges, bosses
- [ ] I win, loss, draw, exit flows; rewards settled exactly once (idempotent)

## 12. Persistence, backend and security (REQ-BE, REQ-ECO, REQ-PRG)
- [ ] I profile persists across sessions and devices
- [ ] I stats tracked: matches, wins, losses, win rate, damage, KOs, ability and ultimate usage, unlocks
- [ ] I token ledger: every change is an auditable transaction; no negative balances; no double-spend
- [ ] I rewards, purchases, unlocks, tutorial completion server-validated; tampered client requests rejected
- [ ] I admin role verified server-side; the `admin128` username alone grants nothing
- [ ] I published config: defaults, versioning, audit history, rollback
- [ ] I migrations reversible in dev; access policies tested
- [ ] Security review: no secrets client-side; dependency audit

## 13. Performance (REQ-PRF; targets pending OQ-10)
- [ ] D frame rate on target desktop and mobile devices during a 3v3 with destruction
- [ ] D memory stable over a 20-minute session (no leaks)
- [ ] B initial load time and asset sizes within budget
- [ ] D input latency acceptable on touch devices
- [ ] I particle and debris budgets enforced on mobile

## 14. Regression (every milestone)
- [ ] Full automated suite green
- [ ] Previous milestones' acceptance tests re-run
- [ ] QA specialist read-only review recorded with pass/fail
- [ ] `DEVELOPMENT_PROGRESS.md` updated with evidence, branch and commit hash
