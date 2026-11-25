# DEVELOPMENT PROGRESS

Persistent record of project state. Update after every meaningful piece of work (`/session-checkpoint`). **Never mark unverified work complete.**

## Current status

| Item | Value |
|---|---|
| Current phase | **Phase 5: combat engine: built and tested** (11/11/2026); stats PROVISIONAL until OQ-05 |
| Next milestone | Owner playtest and OQ-05 values, then **Phase 6:** abilities, ultimate, cooldowns |
| Branch | `ccr-6b7ad8fe-whr1i5` |
| Latest commit | see `git log -1` |
| Runnable game | `npm run dev`: **training yard**, where a jointed greybox stickman walks and hops freely (keyboard or touch) with a follow camera. `?scene=engine-check` opens the physics test. No combat yet. |
| Installed dependencies | pixi.js 8.22, @dimforge/rapier2d 0.21; dev: TypeScript 7.0.2, Vite 8.3.7, vite-plugin-wasm 3.6, Vitest 5.1, Playwright 1.63.0, Biome 2.6 |

## Owner feedback 25/11/2026 (TD-161)
- Hide and Seek and House Fight: no staircase, no upper floor, no curtains; two wardrobes and two boxes added to the hall and rooms. Hide and Seek unit tests rewritten for one floor, e2e visibility test replaced.
- Inkmaster: drawing animations for the serpent, dragon, clone (stick figure drawn fast) and ultimate; the dragon charges once and is faster.
- Verified: full suite, hide-seek and menu e2e, screenshots of the clone drawing, the dragon, the scroll with the ink stream, and the house without stairs. Not re-run: the balance probe (dragon now one 70-damage breath per 16 s).

## Batch 7: arenas and environment (25/11/2026, TD-160)
- Added `src/data/arenas/house-fight.ts`, the admin Game Modes card and arena, `furnitureHides` in the occlusion fader, the Tutorial Zone rename and Office default, the curved-wall end fix.
- Tests: unit (arena order, furniture occlusion), integration (House Fight 40 s AI fight inside the arena), full suite 1312 passed, menu, front-end and Hide and Seek e2e green.
- Known: the occlusion fix and curved wall are checked by unit tests and one overview screenshot, not close-up screenshots from several camera positions; house furniture uses office prop shapes.

## Inkmaster (25/11/2026, TD-159)
- Added the fighter, five abilities, The Masterpiece, three summons, animations, sounds, select stance, icons and AI (design sheet `docs/design/fighters/inkmaster.md`).
- Verified: typecheck, lint, unit and integration tests; browser screenshots of every ability, the scroll drawing and the monster. Matchup probe against the 12 other fighters: see the changelog row and the report.
- Known: creatures are procedural vector art; sound effects are synthesised placeholders in the project's style; no real-device check yet.

## Batch 6: Tournament (25/11/2026, TD-158)
- Added: `src/data/modes/tournament-rules.ts`, `src/modes/tournament/match-score.ts`, `src/app/headless-fight.ts`; scene overtime, tally, `fastForward`; `Combatant.healingLocked`; brain `forceEngage`; async real-fight `skipBattles`; Spectate toggle and Skip Battle button; the Leave coin toss is gone.
- Tests: `tests/unit/modes/match-score.test.ts`, integrity tests in `tests/unit/modes/tournament.test.ts`, `tests/integration/scenes/tournament-overtime.test.ts`, e2e spectate tournament.
- Known: time to skip a stage scales with fights (about 1 s each natively, slower on phones); overtime and the score are covered by tests, not yet by a manual play-through.

## Active assignments

Check this table before assigning work. No two active assignments may share a path or system.

| ID | Specialist | Objective | Write paths | Started | Status |
|---|---|---|---|---|---|
| *(none)* | | | | | |

## Phase 1 Batch A (17/11/2026, implementation model)

- **A1 housekeeping:** Story Mode removed from Game Modes; Admin Panel lists every character via `adminCharacters(lib)` (Players menu uses `playableFighters(lib)`).
- **A2 CI:** `.github/workflows/ci.yml` split into static, unit, build and an e2e matrix (project x 2 shards, 25 min each) so no job nears its timeout.
- **A3 input redesign:** per-fighter controls (`src/input/fighter-controls.ts`), tap/hold actions (`keyboard.ts`), `FighterControlsPanel`, General Settings reduced to Audio and Profile, "Change Fighter Keybinds" buttons, Esc via Keyboard Lock.
- **Tests:** `npm run typecheck` clean; `npm run lint` 0 errors (1 existing warning); `npx vitest run` 514 passed; Playwright front-end, menu, controls, fighter-controls, tournament green on desktop and mobile (see the final full run in the commit).
- **Test changes, explained:** `controls.spec.ts` no longer drives a Controls tab in Settings (moved by design to Fighter Controls, covered by `fighter-controls.spec.ts`); other specs scope `.settings-panel:not(.fighter-controls)` because both panels share styling classes. No assertion was loosened.
- **Limitation:** Esc capture depends on browser support for Keyboard Lock; checked in Chromium only.
- **Next:** Phase 1 Batch B (`IMPLEMENTATION_PLAN.md` §1), status-effect registry first.

## Phase 1 Batch B progress (17/11/2026)

- **B8 done:** `src/combat/status-effects.ts` registry; `Combatant.status`; entry points unchanged. 
- **B7 done:** bleeding is x1.1 damage taken for 6 s (TD-073, SUP-35). Test changes, explained: two Shroud tests asserted the old bleed damage over time (about 30 extra damage; "near 9 per second"); they now assert bleeding deals nothing itself and the factor is 1.1. Required by the owner decision in TD-072; nothing else loosened.
- **Verification:** typecheck clean, 527 unit and integration tests pass. Browser checks for B8/B7 not yet run.
- **B1-B2 done:** `final-stats.ts` is the one stat pipeline (TD-074); audit found rating totals 299 to 304, so no base stat changed.
- **Verification:** typecheck clean, lint 0 errors, 531 unit and integration tests pass.
- **B3 done (TD-075):** damage relationships pinned by tests (Fireball cooldown 3 s was the one outlier); ability names on the desktop bar; `depenetrate` fixes fighters sinking up to 0.32 m into walls and planted furniture; fixed a latent crash in `AbilityWorld.updateActions` found by the AI soak.
- **Verification:** typecheck clean, lint 0 errors, 553 unit and integration tests pass; `button-fit` and `phase6` e2e pass on desktop; screenshot of the new bar checked. Full e2e runs on CI.
- **B4 done (TD-076):** Fire Beam 2.4 s and about 31% more total damage; ends at once on any hit or stun (`breaksOnHit`); AI aims it through a delayed, slew-limited `BeamTracker` per difficulty. The extra second more than doubled the beam's damage until the ramp was softened (measured before choosing).
- **Verification:** typecheck clean, lint 0 errors, 565 unit and integration tests pass; `phase6`, `controls`, `fighter-controls` e2e pass on desktop. The interruption tests fail without the flag. Full e2e on CI.
- **B5 done (TD-077):** hard cap of four with refusal before the ultimate is spent; new `staggersTargets` capability makes skeleton hits damage-only.
- **B6 done (TD-078):** `noFlinch` stabs, no hit chain restarts a fall; stab damage +12% to keep the close-battle standard.
- **B9 done (TD-079):** smooth grab, AI throws furniture, Rampage Mode defence +40%.
- **B10 part 1 (TD-080):** Blue Inferno ultimate, nerfed Eruption as a5, balanced by measurement. Looked at in a browser (before/during screenshots): dark navy skin, blue flame hair and sparks, new HUD icon; the soft aura ring on the floor under him stays orange (a separate layer) and is a polish item.
- **B10 done (TD-080, TD-081).** Round-robin balance (72 fights, noisy): Shroud now about 50%; Titan was dominant (72-92%); nerfed per TD-083 to about 63% (ability damage -30%, health 1160, heavy and finisher trimmed); B17 re-measures all four.
- **Next:** B11 jumping, B13 fifth abilities and loadout, B14 loadout UI, B15 Shroud combo, B16 dodge, B17 fight length, B18 audio.

## Psion batch (21/11/2026, TD-129)
Done: Psion fighter (data, kit, animation, premium look, sounds, icons, AI), shared lift/barrier/volley/telekinetic framework, uniqueness test, renamed Vexoris/Aerion moves. Tests: 1085 passed | 2 skipped; typecheck clean. Known: visuals checked in screenshots for Mind Crush/Throw/Mindstorm only; Barrier and Prison not re-shot centred. Next: Geargrind, then Reson, Chronos.

## Geargrind batch (21/11/2026, TD-130)
Done: Geargrind fighter and kit, fist/drone/magnet/plating engine support, mechanic body skin, clips, sounds, icons, AI, stance, balance, tests (1108 passed | 2 skipped), admin-menu scroll fix. Known: drone is hurt only by projectiles; plating shown on a small figure; no bespoke hit-reaction clips. Next: Reson, then Chronos.

## Animation and balance batch (21/11/2026, TD-131)
Done: Kenshiro three-swing tap, hover locomotion for Psion and Aerion, upright Geargrind, spectator sight fix, ability and melee balance pass plus `ability-balance.test.ts`. Tests: 1114 passed | 2 skipped. Known: the swing arcs and floating were checked only in still screenshots; balance is estimated, not simulated. Next: Reson, then Chronos, then Arcstrike and Tidebreaker; Colosseum after all remaining fighters (owner, 21/11/2026).

## Reson batch (21/11/2026, TD-132)
Done: Reson fighter and kit, pierce/disrupt/sonic-barrier/rings engine support, `sonic` skin, idle/walk/run, clips, sounds, icons, AI, stance, tests (1137). Balance test widened to top/bottom three (explained in TD-132). Known: disrupt rotates movement only; checked in still screenshots. Next: Chronos, then Arcstrike and Tidebreaker, then Colosseum (owner, 21/11/2026).

## Chronos batch (21/11/2026, TD-133)
Done: Chronos fighter and kit, echo/rewind/decoy/slow-field/dodge-recovery engine support, `temporal` skin, clips, sounds, icons, AI, stance, tests. Known: combo echo is visual; decoy not targeted by the AI; checked in still screenshots. Next: Arcstrike, Tidebreaker and the remaining fighters, then Colosseum (owner, 21/11/2026).

## Reson update (21/11/2026, TD-134)
Done: scream (beam with pin), weight-scaled Vibration Punch, Resonance Break (mute, shatter) replacing Resonance Dash, new sounds, icons, poses, effects, tests (1168); Reson and Aerion select stances fixed; Reson idle/walk/run straightened. Known: checked in still screenshots only; the scream also takes beam steering input. Next: Arcstrike, Tidebreaker, remaining fighters, then Colosseum.

## Chronos rework (21/11/2026, TD-135)
Done: new kit (Rewind Time, Time Snare, Chrono Slash, Afterimage, Age Acceleration, Time Stop), time-stop machinery across scene, physics, props, walls and doors, held-cooldown rule, veil, sounds, icons, poses, tests (1180). Known: afterimages absorb shots but not melee; rewind counts blows, not damage over time; checked in screenshots and a scene test. Next: stance redesign (owner 21/11/2026), then Arcstrike, Tidebreaker, the rest, Colosseum.

## Stance redesign (21/11/2026, TD-136)
Done: new idle bases and select stances for Vexoris, Aerion, Psion (floating), Geargrind, Reson and Chronos; Psion hover 0.3. Tests: 1175. Known: checked in screenshots only; attack clips are unchanged but start from the new idle pose.

## Completed work

### 17/11/2026: Phase 0 (master plan): inspection and planning, no gameplay changes
- Documents:
  - `IMPLEMENTATION_PLAN.md`, `PHASE_HANDOFF.md`, `AUDIO_ASSET_CATALOG.md`;
  - `FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md`, `FIGHTER_SYSTEM_CHANGELOG.md`, `STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md`;
  - `docs/ARCHITECTURE_OVERVIEW.md`;
  - spec §20A and OQ-P0-1…8, TD-071, `CLAUDE.md`;
  - the owner's references in `docs/references/master-plan/`.
- Findings:
  - four normal abilities per fighter today, with no loadout;
  - global keybinds only;
  - status effects as separate fields;
  - no Parkour, no blue-flame transformation, no Other Games;
  - single-floor rendering;
  - all combat audio synthesised, with several reused sounds;
  - no positional audio;
  - Pixabay unreachable; FFmpeg present;
  - the three horror uploads are one file;
  - CI is cancelled at its 20-minute limit.
- **Self-audit (planning/review model, same run).**
  - Every path in the plan and the architecture overview was opened during inspection.
  - Every master-plan phase item has a row in the plan or an open question.
  - The order matches the owner's (1 → 2 → 3 → 4, with Parkour last and UI and tutorial before Parkour).
  - Contradictions found in the master plan:
    - bleeding stacking text;
    - Vexoris stacks;
    - the missing transformation and Parkour.
  - These are raised as open questions, not resolved silently.
  - Remaining uncertainty: the fifth abilities' exact numbers and the Hide and Seek renderer work (floors and room masking) are estimates until Phase 1 and 2 inspection of the affected files.
- Next task: the owner approves Phase 0 and answers the Phase 1 open questions; then Phase 1 Batch A.

### 16/11/2026: AI never idle; blindness removes all tracking (owner)
- Root causes found with a new 90 s watched-fight test across all ten pairings: (1) the brain returned no action at all when it could not see its target (blinded by Soul Drain, or in Hunting Frenzy's dark), up to 8.4 s still; (2) AI pushing into furniture or a wall stayed stuck; (3) Normal's hesitation stood still and could chain.
- Fixes: `src/ai/fighter-brain.ts` (`unsighted`: last known position, then search, guard; hesitation strafes), `fight-arena-scene.ts` (stuck detection and sidestep `AI_STUCK_S`/`AI_UNSTICK_S`, unsighted AI faces its movement, AI beam steering needs sight), `scene-abilities.ts` (`aimFor` no help when blinded, only within sight in the dark; `sees`), `ability-world.ts` (`AbilityHost.sees`: self-targeting abilities need sight).
- After rebasing on the owner's balance commits (Shroud, Necro, Inferno, skeletons): stuck detection measures real displacement (a body pressed into furniture keeps its velocity), the sidestep picks an open side or backs out (a corner trapped it), and an overdue punch string or heavy brings even a keep-away fighter in from 9 m (Necro could go a whole fight without his heavy).
- Tests: `tests/integration/ai/engagement.test.ts`, `tests/integration/ai/blindness.test.ts`; full suite 498 pass on top of the owner's commits; typecheck, lint clean.

### 13/11/2026 (latest+14): fullscreen throughout, Tag Team (owner)
- `keepFullscreen` on every device (not only touch): the first tap, click or key on the title screen enters fullscreen; any later input re-enters if lost; the Settings button only enters; the session "off" switch is gone (only Quit Game leaves it). Automated browsers stay windowed unless `?fullscreen` (REQ-UI-39). 3 vs 3 shown as Tag Team (REQ-UI-38).
- Checks: 486 unit/integration pass; typecheck and lint clean; e2e `shell.spec.ts` (first click → fullscreen, canvas fills the window), `front-end.spec.ts`, `landscape.spec.ts` pass.

### 13/11/2026 (latest+13): open player names, typing never triggers controls (owner)
- `validatePlayerName` accepts any characters (control characters removed), 10 visible characters (`nameLength`, grapheme clusters); inputs lose `maxlength` (it counted emojis as 2+). `src/input/typing.ts` `isTypingTarget`: the game keyboard ignores keys typed in text fields (it used to cancel their default, so bound letters and Space never reached the box) and releases held keys when typing starts; debug hotkeys use the same check (REQ-UI-37).
- Tests: `player-name.test.ts` (symbols, emojis, length, control characters), `front-end.spec.ts` (typing game keys into both name fields; a symbol-and-emoji name shown on fighter select and in the draw).

### 13/11/2026 (latest+12): Titan and Shroud redesigns, countdown, fullscreen shell, Leave, Quit, grab fix (owner)
- Titan (`src/rendering/premium-model.ts`, skin `muscle`): V-shaped muscular body, trapezius to a thick neck, bare deltoids, grey with a white chest panel, white eyes; no hump, armour or core. Rampage Mode: `sizeFactor` 1.1 (drawn bigger, `StickmanView.setGrowth`) and a one-time `shockwave` (2.2 m, 10 damage, push) (REQ-ABL-23).
- Grapple Slam: `SceneAbilities.hold` now cancels the seized fighter's cast, charge, dash and scripted attack; the stun blocks new ones (regression test fails without the fix).
- Shroud: hood face opening with a lit lip, a bigger mask filling it with curved shading (`maskInHood`).
- Title art (`assets/ui/title-menu.webp`): Titan about 20% taller than the others; Shroud's mask in a framed opening. LOCKED tag not clipped.
- Countdown 3, 2, 1, FIGHT with the owner's clip (`assets/audio/sfx-countdown-fight.*`), none in the Tutorial; announcer and stinger removed (REQ-AUD-12).
- Fullscreen shell (`src/app/shell.ts`, TD-070); Leave → main menu everywhere (`goToTitle`, `?home`); Quit without a goodbye screen (`src/interface/quit-game.ts`) (REQ-UI-36).
- Checks: `npx vitest run` 486 pass; typecheck and lint clean; e2e (see below); browser screenshots of Titan, Shroud and the title art.
- Then (owner): no eyes or mouths on any stickman but Shroud (Inferno's original face restored without its mouth, `magma-model.ts`; Titan's eyes and the brute mouth removed, `premium-model.ts`; skeleton warriors unchanged); Undead Army rises in a fan in front of the enemy, 2.6–3.6 m off (`scene-summons.ts` `spotInFront`, REQ-ABL-24); Inferno's and Titan's heads are round shaded balls (`shaded-ball.ts`); Titan recreated after the owner's second reference (skin `muscle`: grey mannequin, ball shoulders/knees/hip, slanted white chest panel, plated shins, one white eye); select strips read back in 4096 px chunks (a single 13,700 px read was blank); fighter-select strips loop forward over a full breath (30 frames) so flames burn forward; fighter-select strips drawn with a moving clock (`StickmanView.clockOverrideS`); Shroud's mask set inside the hood; robe edge lights on their own sides and trim along the torn hem (REQ-VIS-13).
- Next task: owner phone check of fullscreen across modes; premium ability icons (#51).

### 13/11/2026 (latest+11): Shroud's Bloodfade and three-stab Stalker Lunge; Rampage Mode cooldown cut (owner)
- New shared `assault` delivery (TD-069): approach, timed stabs (each a real hit), optional retreat; `assaultPose` gives three distinct stab motions and a backward spring; directional blood spray on every stab; per-stab sounds `blade-pierce`, `blade-stab-1/2/3`; new Bloodfade icon. Shroud a1 Bloodfade (70 + bleed 10/s × 3 s, flinch, spring back 5 m), a2 Stalker Lunge (3 × 26 + bleed 9/s × 3 s refreshed, never stacked). AI uses Bloodfade as a burst (0–5 m). Rampage Mode `cooldownFactor` 0.75 (REQ-ABL-22, SUP-34).
- Files: `src/abilities/{ability-def,ability-caster,ability-world}.ts`, `src/animation/ability-poses.ts`, `src/app/scenes/{fight-arena-scene,scene-abilities}.ts`, `src/audio/sound-board.ts`, `src/vfx/ability-vfx.ts`, `src/interface/ability-icons.ts`, `src/data/abilities/{shroud,rampage}.ts`, `src/data/ai/brains.ts`; tests `shroud.test.ts`, `rampage.test.ts`, `ability-caster.test.ts`.
- Checks: `npx vitest run` 481 pass (66 files); `npm run typecheck` and `npm run lint` clean; production build checked in Chromium (stab sounds in order, blood spray, Bloodfade spring back, no console errors).
- Next task: premium ability icons (#51); owner playtest of Shroud's feel.

### 13/11/2026 (latest+10): 3 vs 3 tag team (owner)
- Owner chose tag team (OQ-07) and a pool of four plus one repeat. Rules `src/modes/team/team-battle.ts`; scene `src/app/scenes/scene-teams.ts` + `FightArenaScene` (`teams` option, `swapIn`, `canTag`, team-aware `decideMatch` / `endMatchNow`); input `tag` (H) and touch TAG; UI: Game Modes → team select (`front-end.ts`), team strips (`src/interface/team-hud.ts`), Victory/Defeat card with Rematch. Page `?mode=3v3&team=…&foes=…`.
- Tests: unit (rules, bindings table gains Tag), integration (tag, bench, KO replacement, AI-vs-AI 3 vs 3), e2e (desktop + mobile).
- Next task: premium ability icons (#51); owner review on a phone.

### 13/11/2026 (latest+9): Practice (Tutorial, Open Zone), close watched battles, icon, art fixes (owner)
- **Practice:** title item under Game Modes → Tutorial (`src/tutorial/tutorial.ts` step machine, `src/interface/tutorial-overlay.ts`, wired in bootstrap with `?tutorial`) or Open Zone (fighter select in practice mode: opponent chips, ENTER; `?practice` pages leave back to Practice).
- **Watched battles (REQ-AI-9):** `src/ai/showmanship.ts`: both at least Hard; the leader eases off by decisions only. Measured over six matchups: winner's health left 22% on average (46% without), fights 27-50 s.
- **Art:** title art anchored to the top (Titan's head shows on wide fullscreen phones), Necro's face dark, Shroud's mask shaded as a curved dome; new app icon (Inferno's face + logo) with maskable and Apple versions.
- **Titan select pose** restored to the owner's preferred hands-on-hips version.
- **Tests:** tutorial (unit), showmanship (unit), watched-battle closeness (integration), Practice journey (e2e desktop + mobile).
- **Next task:** owner review on a phone; 3 vs 3 (REQ-MOD-2); premium ability icons (#51).

### 13/11/2026 (latest+8): menu buttons, fit and fullscreen, Titan stance, dodge, stages (owner)
- **Title:** the owner's art with its painted plates inpainted away, Necro's glowing eyes removed, and Shroud given a porcelain mask matching his in-game mask (owner request); the menu is real buttons styled like the Admin Panel plate.
- **Fit and fullscreen:** viewport locks zoom (and iOS pinch is cancelled, `src/input/no-zoom.ts`); `keepFullscreen` asks on every tap until granted; manifest + icons for home-screen full screen; iPhone hint once a session. Tournament draw scaled to fit one screen (`TournamentScreen.fit`). Checked on Pixel 7 (landscape and upright) and a 667×375 phone: title, modes, select, settings, Top-16 draw all fit without scrolling.
- **Titan select pose:** near hand behind the hip, far hand on the front of the hip, shoulders kept on the profile line (`shoulderSpread: 0.6`) so the armour reads cleanly.
- **Dodge (REQ-CMB-30):** projectile-aware sidestep and dodge fatigue. **Stages:** Top 16/8/4/2, then Champion.
- **Perf:** select stances drawn only when fighter select first opens (it made Leave → title slow on slow machines and timed out a test under load).
- **Next task:** owner review on a phone; 3 vs 3 (REQ-MOD-2); premium ability icons (#51).

### 13/11/2026 (latest+7): front end, player name, admin/user screens, fighter select and stances, menu music (owner)
- **Title screen** is the owner's supplied art (`assets/ui/title-menu.webp`), cover-fit, with invisible buttons over its painted plates: Story Mode (locked), Game Modes, Settings, Quit Game; Admin Panel plate only for `addmen1280`. Quit tries `window.close()`, then shows a goodbye screen (browsers refuse to close a tab the page did not open).
- **Name registration** before Game Modes/Story (1-10 characters, validated, saved), changeable in Settings → Profile; shown as "Name · Fighter" in the HUD and "Name (Fighter)" in the tournament draw.
- **Admin/User split (TD-065, flagged):** the old main menu is kept whole as the Admin Panel (practice opponents, modes, fighter settings, Move Config, difficulty). It is a client-side screen choice only, NOT security; real admin needs a server role (REQ-BE-4).
- **Game Modes:** Tournament and 3 vs 3 (coming soon: 3 vs 3 is not built yet). Ladder is not offered (no Ladder code exists).
- **Fighter select (REQ-UI-33, TD-066):** info panel (name, title, style, story, 6 stats, 4 abilities, ultimate) beside the large fighter; unique data-driven select stances for all four fighters (`src/data/presentation/select-stances.ts`, `src/animation/stance.ts`), breathing frame strips from the real rig, same diagonal facing and height, rim light and floor shadow.
- **Audio (REQ-AUD-11):** menu music (owner's track, gapless loop) on every menu, lowered on fighter select, replaced by the battle music in a fight, back with a slow fade once the battle is over; owner's click sound on interface buttons only. Settings also got a touch button size slider (mobile control configuration).
- **Files:** `src/interface/{front-end,fighter-info,landscape}.ts`, `src/interface/{main-menu,settings-panel}.ts`, `src/progression/player-name.ts`, `src/admin/local-access.ts`, `src/data/presentation/select-stances.ts`, `src/animation/stance.ts`, `src/rendering/portraits.ts`, `src/audio/music.ts`, `src/data/audio/music.ts`, `src/input/{settings-store,debug-keys}.ts`, `src/app/{bootstrap,tournament-page}.ts`, `index.html`, assets (menu music, click, title art); tests `tests/unit/{progression,presentation}/*`, `tests/unit/audio/music.test.ts`, `tests/e2e/{front-end.spec,front}.ts` and updated menu/tournament/fighter-settings/landscape specs.
- **Known limits:** the painted Story Mode plate is always lit (it is part of the art); the "2.5D" stances are poses on the 2D rig with depth cues, not true three-quarter art; music needs one tap on a fresh visit (browser rule). Owner to confirm the rights for the supplied music, click and title art (asset register).
- **Next task:** owner review of the front end on a phone; then 3 vs 3 mode (REQ-MOD-2) and premium ability icons (#51).

### 13/11/2026 (latest+6): landscape, settings, controls, tournament watching, clash fix (owner)
- **Per-fighter AI brains (REQ-AI-8, TD-063)**, committed 64b7cf2: unique brain per fighter; Easy/Normal/Hard/Expert scale intelligence only; whole kit at every level.
- **Always landscape (REQ-UI-31, TD-064):** an upright phone gets the page laid out in landscape and turned (`src/interface/landscape.ts`); touches mapped back (`src/input/screen-space.ts`); rotate screen and portrait pause removed. The first tap still asks for fullscreen and a landscape lock. CSS now uses `--vw`/`--vh` and `html.short`/`html.narrow` in place of viewport units and size media queries.
- **Settings button** above every screen (z-index 90, panel 95). **Combat controls** only with `body.fighting` (set in bootstrap: a fight scene with no menu or tournament screen up, and not spectating).
- **Tournament:** no watch limit (`watchesLeft` removed); open AI battles are tapped in the draw to watch; one Skip under the draw; per-battle rows and the in-fight Skip battle button removed. Settings → Leave in a tournament fight calls `endMatchNow(onTie)`, records the result, and the draw shows "Stage: A beat B (fight left early ...)".
- **Punch Clash fix (owner bug report):** in a watched battle the left fighter never mashed (side A only took player taps). `PunchClash` now takes an AI rate for side A when the AI plays it; the mash prompt is hidden while spectating.
- **Files:** `src/modes/tournament/{tournament,tournament-flow}.ts`, `src/app/tournament-page.ts`, `src/interface/tournament-screen.ts`, `src/app/bootstrap.ts`, `src/interface/landscape.ts`, `src/input/screen-space.ts`, `src/input/touch-controls.ts`, `src/combat/clash.ts`, `src/app/scenes/{scene-clash,fight-arena-scene}.ts`, `index.html`; tests `tests/unit/modes/tournament.test.ts`, `tests/unit/combat/clash.test.ts`, `tests/integration/scenes/match-mode.test.ts`, `tests/e2e/{tournament,landscape}.spec.ts`.
- **Checks:** tsc and lint clean; vitest 59 files, 446 tests passed; build OK; tournament e2e 3/3; landscape e2e 2/2 (3 runs). In the full parallel e2e run, `controls.spec.ts:61` and `phase6.spec.ts:94` failed under load and both passed on a single-worker rerun.
- **Known limits:** fullscreen always needs one tap (a browser rule); the browser's address bar stays upright until then. Not checked on a real phone yet.
- **Next task:** main menu redesign (task 69): music, click sound, title screen, name registration, admin/user split, Game Modes (Tournament, 3 vs 3), fighter select.

### 13/11/2026 (latest+4): AI path-finding and difficulty; Tournament mode (owner)
- **AI:** `NavGrid` A* round walls and furniture; Easy/Normal/Hard on the menu (REQ-AI-7).
- **Tournament (REQ-MOD-8, TD-062):** menu Game mode (Practice/Tournament) and size (4/8/16); bracket screen with portraits, stages, winners, eliminated and the player highlighted; your match; Watch (up to 3 per stage, with Skip battle) or Skip per battle or Skip Battles; champion screen with placement and record; resume from the menu. Bracket entries no longer clip (owner screenshot).
- **Files:** `src/ai/nav-grid.ts`, `src/data/ai/difficulty.ts`, `src/modes/tournament/*`, `src/app/tournament-page.ts`, `src/interface/tournament-screen.ts`, `src/interface/main-menu.ts`, `src/app/bootstrap.ts`, `src/app/scenes/fight-arena-scene.ts`, `index.html`; tests as listed in TESTING_CHECKLIST 13i.
- **Checks:** tsc and lint clean; vitest 56 files, 425 tests passed; build OK; e2e (one worker) 46 passed, 30 skipped. A long simulated-battle test got a 60 s timeout (it exceeded the default 5 s on a busy machine; the logic passed every run).
- **Known issues:** only 4 fighter types, so 8 and 16 fields repeat fighters (numbered); each match reloads the page; results are browser-local, not server progression.
- **Next task:** owner playtest; premium ability icons; server-side progression and rewards when the backend phase starts.

### 13/11/2026 (latest+3): Thrown furniture breaks; fighter AI opponents; opponent picker (owner)
- **Throws (SUP-29):** anything thrown breaks where it lands.
- **AI (REQ-AI-7, TD-061):** `src/ai/fighter-brain.ts`; any fighter opponent chases, punches in strings, uses its heavy, abilities and ultimate by range, backs off a downed player, and climbs onto furniture after the player. The training dummy is unchanged.
- **Opponent picker:** main menu Opponent row (Training Dummy default, then each fighter) sets `?opponent=`. Not restricted to admins: there is no sign-in yet (REQ-BE-4).
- **Checks:** tsc and lint clean; vitest 53 files, 403 tests passed; build OK; e2e 43 passed, 28 skipped, plus one Punch Clash timing failure under two workers that passed 3/3 on its own. Browser: menu shows the Opponent row; Play against Titan starts a fight where Titan closes in and attacks.
- **Known issues:** no path-finding (an AI can get stuck behind a desk); difficulty is the profile's aggression only.
- **Next task:** Tournament mode (owner's spec), then AI path-finding and difficulty levels.

### 13/11/2026 (latest+2): Redesign default, damage balance, rising walls (owner)
- **Redesign default (REQ-VIS-10, TD-060):** the preview gate is gone; Titan, Necro, Shroud and the dummy use their redesign and premium portraits everywhere.
- **Damage (REQ-CMB-31):** for example Inferno's punches are now 22/24/26 with a 55 kick finisher (was 35/40/45/137), and his heavy is 50 (was 131); Titan's string is 34/41/90 (power included) and his heavy 84 where his abilities are 120 to 190. Melee hits furniture and walls through `MELEE_OBJECT_DAMAGE_SCALE` so they break as before.
- **Walls (REQ-PHY-14, SUP-28):** the outer walls stand 4.5 m tall, always shown (owner changed it from airborne-only the same day); the front walls are faint glass with a faint top edge.
- **Changed tests:** exact old damage numbers in the props, combat, Rampage, character and phase 5 e2e tests now follow the new data or assert the new rule.
- **Checks:** tsc clean; lint clean; vitest 52 files, 398 tests passed; build OK; e2e 42 passed, 28 skipped (one phase 5 e2e test needed the new combo damage, then passed).
- **Also:** Shroud's knife points up diagonally; his mask tips down slightly.
- **Known issues:** the raised back-wall tops are mostly above the usual camera framing.
- **Next task:** AI opponents use abilities, heavy attacks and climbing; then Tournament mode.

### 13/11/2026 (latest+1): Titan rename deployed; Grapple Slam hit/miss; traversal, falls and landings (owner)
- **Deploy:** Pages deployed from 7fe079c (Titan rename; redesign still preview-only). The live URL could not be fetched from this environment (the network proxy blocks github.io), so the live page was not inspected; the deploy workflow reported success.
- **Grapple Slam (REQ-ABL-17):** a hit hoists overhead, then drops fast into a body-driven slam with dust, screen shake (new `look.impact.shake`) and 6 m/s knockback; a miss closes the hands on air and stumbles forward, with no slam and no damage. `AbilityWorld.grabOutcome` (miss, hold, slam) drives the pose; recovery 0.85 s to 1.05 s.
- **Traversal, falls, landings (REQ-PHY-12, SUP-27):** `supportUnder` lets a fighter on furniture walk across a gap of up to about 0.5 m or a 0.4 m step. Landings by the real drop: a knee bend, a firm squat (1.4–2.2 m, holds 0.12–0.32 s, no damage) or a collapse (2.2 m and up: damage, flat on the back or face down, then a get-up or push-up). A physical falling pose; no more dizzy stun from falls. Aerial attacks finish before the landing squat.
- **Files:** `src/physics/climbing.ts`, `src/app/scenes/scene-climbing.ts`, `src/app/scenes/fight-arena-scene.ts`, `src/app/scenes/fighter-entity.ts`, `src/combat/combatant.ts`, `src/animation/reaction-poses.ts`, `src/animation/ability-poses.ts`, `src/abilities/ability-world.ts`, `src/abilities/ability-def.ts`, `src/data/abilities/rampage.ts`; tests in `tests/unit/physics/climbing-rules.test.ts`, `tests/unit/animation/grab-poses.test.ts`, `tests/integration/scenes/climbing.test.ts`, `tests/integration/scenes/fourth-abilities.test.ts`.
- **Checks:** `npx tsc --noEmit` clean; lint clean; `npx vitest run` 51 files, 393 tests passed; `npm run build` OK; `npx playwright test` 42 passed, 28 skipped. Browser runs in the office: shelf-to-shelf crossing held 2 m height, walk-off took no damage, jump-off took damage, then collapse and get-up; Grapple Slam hit and miss captured.
- **Changed test:** the old "heavier fighter takes more damage falling off a bookshelf" test asserted the rule the owner reversed (walking off a bookshelf now never hurts); it is replaced by walk-off-is-safe and jump-off-hurts tests, with weight scaling still covered by the `fallDamage` unit test.
- **Known issues:** sideways falls are not distinct (the side-view rig only falls forward or back); the collapse lies the fighter on whatever it lands on (for example a desk) and it can slide off while down.
- **Next task:** AI opponents use abilities, heavy attacks and climbing; then Tournament mode.

### 13/11/2026 (latest): Fighter redesign proposal, preview only (owner review in progress)
- **Preview gate:** `?redesign` turns on `src/rendering/premium-model.ts` skins for the non-Inferno fighters (off by default; the shipped game is unchanged apart from the Titan rename).
- **Titan (formerly Braxon; character id `rampage`):** renamed in game data, the menu e2e test and the spec (REQ-ABL-14, §23). Proposal: gunmetal armour with steel-blue seams, a brute head, and an upper back and trapezius drawn in two passes (silhouette behind the body, seamless skin over it) so they read as one body; kept on his back when he faces left (the container already mirrors him).
- **Necro (Mage of Death):** deep black and dark purple, cursed-violet seams with a sickly-green core, no eyes in the hood; a gnarled blackwood staff with cursed runes, held lower in the left hand at a slight diagonal (foot about 5 cm off the floor); a three-quarter skull on an iron thorn collar whose sockets, aura and runes glow green while staff magic is used; darker cast particles.
- **Shroud:** a white mask with large, hollow almond eye openings after the owner's reference.
- **Files:** `src/rendering/premium-model.ts`, `src/rendering/stickman-view.ts`, `src/rendering/portraits.ts`, `src/data/characters/rampage/character.json`, `tests/e2e/menu.spec.ts`, `STICKMAN_ARENA_MASTER_SPEC.md`.
- **Checks:** `npx tsc --noEmit` clean; `npx vitest run` 49 files, 378 tests passed; `npx playwright test tests/e2e/menu.spec.ts` 4 passed; in-game and portrait screenshots captured with Playwright and reviewed.
- **Known issues:** Necro's health bar overlaps the staff skull; Necro's portrait does not show the skull (chest-up framing); the Soul Drain cast effect is still pale lavender; the live site is behind this branch (it was last deployed before the rollback).
- **Next task:** owner approval of the proposal; then turn it on by default, update REQ-VIS-10 and the TD log, run the full unit and e2e suites, wait for CI and deploy Pages.

### 13/11/2026 (later still): Fighter redesign rolled back (owner)
- The owner did not approve the rollout of the premium style to Braxon, Necro, Shroud and the dummy (nor the attempt after their reference images), and asked to roll back to the last approved state. Reverted commit af264aa (skins and portraits for all); Inferno keeps the approved model (`src/rendering/magma-model.ts`). Kept: the bookshelf, the furniture material finish, the detailed office props and the monitor-back fix.
- Open decision for the owner: how to bring the other fighters up to the reference images (code-drawn as now, or hand-painted sprite art on the same rig, which changes the asset pipeline and needs approval).

### 13/11/2026 (later): Redesign rolled out to everything (owner request; Master Developer)
- Fighters: shared premium painter `src/rendering/premium-model.ts` with a skin per body style (magma, muscle, robe, cloak, solid); premium portraits for all (`src/rendering/portraits.ts`).
- Furniture: material-aware finish in `isoBlock` (`src/rendering/iso-draw.ts`, `withMaterial`) on every prop; detailed cubicle panels, desks, monitors and filing cabinets (`src/rendering/prop-view.ts`).
- Tests: 378 unit/integration, 42 e2e pass; lint, typecheck and build clean. Screenshots: `docs/screenshots/prototype-redesign/` (roster, portraits-all, office-furniture).
- Not yet: skeleton warriors keep their bone style; the interface (menus, HUD) and other arenas' unique pieces are unchanged.

### 13/11/2026: Visual-redesign prototypes, Inferno and the bookshelf (owner request; Master Developer)
- Inferno's premium model (body style `magma`, `src/rendering/magma-model.ts`) on the shared rig; premium portrait (from the model, lit backdrop, frame) in the menu and the HUD; the bookshelf redesigned (`src/rendering/bookshelf-view.ts`). REQ-VIS-10, TD-059 (proposed).
- Checked in the running game (screenshots in `docs/screenshots/prototype-redesign/`): idle both facings, jab, heavy, Fire Beam, Flame Detonation, block, flinch, knockdown, get-up, fire KO, climbing a bookshelf; no detached parts, no console errors.
- Tests: 378 unit/integration pass; lint, typecheck and build clean.
- Owner approved the style (13/11/2026) and asked for slimmer boots (done).
- Previously stopped for owner approval. Not started: other fighters, furniture, arenas, UI; Grapple Slam polish; falling, landing and recovery; AI abilities; the Tournament mode.

### 12/11/2026 (evening): Necro and Shroud reworks, steady throws, battle music and stinger (owner requests; Master Developer)
- Necro: Undead Army skeletons last 10 s again (SUP-24). Teleport was reworked (one press away, double press in: af0d35e), then replaced by **Curse of Decay** on F at the owner's request (REQ-ABL-20).
- Shroud: **Shadow Escape** on Q (defensive blink away); Hunting Frenzy bursts a bulb and puts the lights out on the opponent (1.6 m sight, black screen with a circle for a player) while Shroud sees in night vision; knife +10% (REQ-ABL-21).
- Thrown furniture: no random spin; a steady arc with at most a quarter-turn pitch (REQ-PHY-13, SUP-26).
- Audio: battle music in the office from FIGHT!: first an original track ("Steel Rain"), then, at the owner's instruction, **the owner's supplied Japanese boss track**, loop-prepared (fade-out cut; end crossfaded on the beat into 43.7 s; seam step inside the track's normal range in a browser render, Ogg and MP3). An original READY... FIGHT! stinger rendered by `tools/audio/` (REQ-AUD-10, TD-058).
- Files: `src/combat/combatant.ts`, `src/abilities/*`, `src/data/abilities/{necro,shroud}.ts`, `src/app/scenes/*`, `src/rendering/stickman-view.ts`, `src/vfx/ability-vfx.ts`, `src/interface/{vision-veil,ability-icons,fighter-sheet}.ts`, `src/audio/{music,sound-board}.ts`, `src/data/audio/music.ts`, `src/environment/arena-props.ts`, `tools/audio/*`, `assets/audio/*`.
- Tests: 378 unit/integration pass (`npx vitest run`); e2e 42 pass (`npx playwright test --trace off`), including the new `music.spec.ts`; lint, typecheck and build clean. Browser screenshots checked: Curse bolt and rot, night vision, darkened player view, Shadow Escape.
- Limits: the music and stinger could not be listened to in the cloud session (checked by measurement only); the supplied track's licence needs the owner's confirmation (asset register); the announcer is still the device's speech voice (no offline voice engine was reachable); the AI does not use the new abilities.
- Next: owner listening test of the music and stinger; tune levels if needed.


### 12/11/2026 (later): Shroud, Heavy Attack, intro, target lock, beam, icons (owner requests; Master Developer)
- New fighter Shroud; Heavy Attack on K for all fighters; ultimate on I; Fire Beam build-up and J/L sweep with its own Settings section; target lock; READY/FIGHT intro; tumbling thrown furniture; centred heads behind the near arm; testing area silent; icons restyled.
- Tests: 368 unit/integration pass; key browser suites pass. Preview deployed at c7ef392; this batch deploys after CI.
- Limits: the announcer uses the device's speech engine (no recorded voice); the AI does not yet use heavy attacks, climbing or the new abilities; Shroud's look reviewed at 3x in the browser, not on a phone.


### 12/11/2026: Targeting, fourth abilities, walk/run, climbing, Braxon fixes, HUD (owner requests; Master Developer)
- **Controls:** J attack, K ultimate, L dodge, F ability 3, R ability 4; aimed abilities enter and confirm with their own key, WASD or the joystick move the target (Teleport faster than the leap), Escape or the touch ✕ cancel, instructions on screen. Settings storage v2 resets saved key layouts once.
- **New R abilities** (owner's picks): Flame Detonation (Inferno), Grapple Slam (Braxon), Grave Chains (Necro). Fighter details: fighter-coloured stat bars, unique combo icons.
- **Movement:** a proper walk without Shift; run only with Shift; relaxed idle after 3 s calm. Climbable furniture, ledge grab and Space-to-climb with an elbow-press animation and a smooth step-up, fall damage by height and weight.
- **Braxon:** connected pelvis and legs, head centred behind the near arm and facing forward; the charge runs until a wall. Heavy steel sound for metal props, louder for harder hits. Top HUD restyled.
- **Tests:** 354 unit/integration tests pass; browser suite run (results in the session report). Docs: spec REQ-ABL-17, REQ-CTL-21, REQ-ANI-13, REQ-PHY-12, REQ-UI-30, SUP-20, SUP-21; TD-056; TESTING_CHECKLIST §13d.
- **Known limits:** the steel sound was not listened to (no audio in the cloud browser); the opponent AI does not use the new abilities or climb; portrait-phone HUD overlap still open.
- **Next task:** owner playtest of the climb and targeting feel on a phone and desktop.


### 10/11/2026: Phase I, project initialisation (Master Developer)

**Reference inspection**
- Read the **entire** playbook v1.2 (`.docx`, 20 sections; converted with pandoc and read in full). The owner uploaded two byte-identical copies of v1.2 plus an earlier v1.0; the v1.0→v1.2 diff is the addition of §4.4 (reference games) and the version number.
- Analysed both gameplay videos frame by frame (ffmpeg; 1 frame per 2 s throughout plus 5 fps bursts around two power attacks). **Audio not analysed.** Report: `docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`.
- Inspected Creature Clash read only in `froggy-arcade` (`CreatureArena.ts`, `specials.ts`, `ultimates.ts`, `creatures.ts`, `creatureClash.ts`). Finding: it is **2D top-down**, not 3D (TD-011). Report: `docs/references/CREATURE_CLASH_OBSERVATIONS.md`. Froggy left unmodified.
- Stickman Kombat 2D: **not inspected** (not provided; public description from the playbook only).

**Files created**
- Root: `STICKMAN_ARENA_MASTER_SPEC.md`, `CLAUDE.md`, `DEVELOPMENT_PROGRESS.md`, `DEVELOPMENT_ROADMAP.md`, `TECHNICAL_DECISIONS.md`, `TESTING_CHECKLIST.md`, `README.md`, `.gitignore`
- `.claude/settings.json` (permissions: deny `.env` access, Froggy edits, force-push, hard reset, `rm -rf`; ask before npm install/uninstall/publish)
- `.claude/agents/`: 10 specialists (architect and QA read only)
- `.claude/rules/`: architecture, coding-standards, documentation, testing, asset-management, performance, security, collaboration, integration, reference-usage
- `.claude/skills/`: new-fighter, new-ability, new-arena, bug-investigation, release-check, assign-specialist, session-checkpoint, reference-observation
- `docs/workflow/MASTER_DEVELOPER_WORKFLOW.md`, `docs/workflow/SYSTEM_OWNERSHIP.md`
- `docs/references/` (playbook copy plus two observation reports), `docs/design/`
- Directory skeleton with an owner README per folder: `src/{app,core,rendering,vfx,camera,physics,input,characters,combat,abilities,animation,arenas,environment,ai,modes,interface,tutorial,progression,services,data/*}`, `backend/`, `assets/*` plus `ASSET_REGISTER.md`, `public/`, `tests/{unit,integration,e2e}`, `tools/`

**Verification performed**
- All agent and skill YAML frontmatter parsed successfully (Python `yaml.safe_load`); required keys present; agent names unique and matching file names.
- `.claude/settings.json` parsed as valid JSON.
- Ownership registry checked: every `src/` folder has exactly one owner; read-only agents (architect, QA) have no Edit/Write tools.
- No source code, fighters, arenas, gameplay systems or assets were created.
- `froggy-arcade` `git status` clean (unmodified).

### 10/11/2026: Owner decisions applied (Master Developer)
Owner answers to the initialisation questions, recorded across spec, TD log, CLAUDE.md, rules, agents, roadmap and checklist:

| Owner answer | Recorded as |
|---|---|
| 1. "Make the controls best suited; I'll let you deal with it" | Control scheme designed: `docs/design/CONTROL_SCHEME.md`, TD-016, REQ-CTL-11..15. Resolves OQ-02, OQ-03, OQ-14. |
| 2. AI players only for now; maybe online later | REQ-VIS-8, TD-018. Resolves OQ-13. |
| 3. Find free hostings | TD-017 (PROPOSED): Cloudflare Pages + Supabase Free; Workers + D1 as alternative; Firebase Spark rejected. Upgrade cost noted in MYR. No accounts or deployments made. |
| 4. Agree with the stack | TD-003 to TD-007 ACCEPTED. |
| 5. Adopt presentation targets | PRS-1..11 and REQ-ABL-6 binding. Resolves OQ-15. |
| 6. Confirm specialists, only when needed to save tokens | TD-009 confirmed; TD-019 token-economy policy in CLAUDE.md and workflow. Resolves OQ-18. |
| 7. Stickman Kombat 2D = style and feel (sound effects, attacks); movement like Creature Clash | Spec §2.1, reference-usage rule, combat agent. Resolves OQ-01. |
| 8. Original requirements not remembered | Spec "Important gap" updated: the playbook-based spec is the baseline. |

**Verification:** agent and skill YAML re-validated; spec open-question table re-checked (4 columns intact).

**Limitation:** official pricing pages (Cloudflare, Supabase) were not reachable from this session's network. Free-tier figures come from third-party 2026 summaries and must be confirmed when accounts are created.

### 10/11/2026: Game hosting switched to GitHub Pages (owner decision)
TD-017 updated: game on GitHub Pages (manual deploy workflow); Supabase Free still proposed for Phase 14 data.

### 10/11/2026: Phase 0 bootstrap (Master Developer; no specialists used, per TD-019)
**Acceptance criteria (set before editing):** typecheck, unit tests and build exit 0; a browser smoke test shows a rendered, non-blank WebGL canvas with working physics and zero console errors, on desktop and mobile emulation; the GitHub Pages sub-path build works.

**Files created:** `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/main.ts`, `src/app/bootstrap.ts`, `src/core/fixed-step.ts`, `src/core/game-loop.ts`, `src/physics/physics-world.ts`, `src/rendering/renderer.ts`, `src/rendering/engine-check-scene.ts` (greybox), `tests/unit/core/{fixed-step,game-loop}.test.ts`, `tests/unit/rendering/renderer.test.ts`, `tests/integration/physics/physics-world.test.ts`, `tests/e2e/smoke.spec.ts`, `.github/workflows/{ci,deploy-pages}.yml`.

**Ownership note:** the Master Developer wrote the starter `src/physics/` and `src/rendering/` files during bootstrap. Ownership stays with the Physics and Rendering specialists from Phase 1 on.

**Evidence (all run by the Master Developer on 10/11/2026):**

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 4 files, **11/11 passed** |
| `npm run build` | exit 0. Chunks: app 5.8 kB, three 534 kB (132 kB gzip), rapier 4.33 MB (1.67 MB gzip) |
| `npm run e2e` | **2/2 passed** (desktop-chromium 4.9 s, mobile-chromium 6.5 s) |
| Pages sub-path check | `BASE_PATH=/StickBattleFighter/` build served by `vite preview` reached the ready state at `/StickBattleFighter/` with no errors. The first attempt failed only because my check served the wrong base path; corrected and re-run. |
| `npm audit` | 0 vulnerabilities |
| Visual | Screenshots inspected: the crate rests on the grid floor with lighting, at both desktop and mobile aspect ratios. |

**Not done / deferred:** lint and format tooling (moved to Phase 1). GitHub CI results (checked 10/11/2026):
- Run #1 (3D commit `83c4e8f`): **failed**, mobile e2e only. Cause: a flawed test, not the game. It required more than 60 physics steps at the moment the crate landed, but a 3.5 m fall takes about 0.84 s (about 51 steps), so the result depended on timing. That test was removed with the 3D scene.
- Run #2 (2D commit `e7206a0`): **passed** (typecheck, tests, build, e2e on desktop and mobile). Nothing deployed: GitHub Pages is not yet enabled.

### 10/11/2026: Switched from 3D to 2D top-down (owner instruction)
**Owner:** "Make it in 2D not 3D like Creature Clash where the creature can go front and back and left and right, everything should be in 2D; show me a screenshot after creation."

**Acceptance criteria (set before editing):** the engine-check scene is 2D top-down (walled floor seen from above; free movement plane with no gravity); physics proves collisions (the crate bounces off walls without tunnelling and comes to rest); typecheck, tests, build and browser smoke tests pass on desktop and mobile; screenshots captured and inspected; all documents updated with 3D rules superseded, not deleted.

**Changes:**
- Libraries: removed three, @types/three and @dimforge/rapier3d-compat; added **pixi.js 8.22** and **@dimforge/rapier2d-compat 0.21** (TD-021).
- Code: `src/physics/physics-world.ts` (Rapier 2D, zero gravity, damping, restitution, friction, CCD); `src/rendering/renderer.ts` (Pixi app with its own ticker off, driven by our fixed-step loop); `src/rendering/engine-check-scene.ts` (2D greybox floor, grid, walls, crate with shadow); `src/camera/fit-view.ts` (fit arena to viewport); `src/arenas/engine-check-colliders.ts`; `src/data/arenas/engine-check.ts` (shared arena data, REQ-ARC-3); `src/app/bootstrap.ts` (position and rotation interpolation).
- Tests: new `tests/unit/camera/fit-view.test.ts`; physics integration test rewritten for 2D (no gravity in the plane; the crate bounces off at least 2 walls, never tunnels, comes to rest); e2e smoke test rewritten for 2D.
- Docs: spec (REQ-VIS-1/2/3/9, INV-1, §5.1, REQ-PHY-1/2, REQ-CMB-2, REQ-ANI-5, PRS-11, SUP-04), TD-021 and TD-022 (new), TD-004/005/007/011 superseded, control scheme (camera controls removed), CLAUDE.md, README, roadmap, checklist, rules, skills and agents (`rendering-3d-specialist` renamed to `rendering-specialist`).

**Issue found and fixed during verification:** the first 2D test run showed the crate stopping before any wall (too much friction), so the scene did not actually prove wall collisions. I traced its path, then raised the launch speed, lowered the floor friction and set low wall friction, all as arena data. The trace showed about 2.7 cm of momentary overlap on impact, which is normal contact solving; the test tolerance is 5 cm, well short of tunnelling.

**Evidence:** see the Phase 0 (2D) table below, which supersedes the 3D Phase 0 numbers.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 5 files, **15/15 passed** |
| `npm run build` | exit 0. Chunks: app 7 kB, pixi 512 kB (146 kB gzip), rapier 2D 3.40 MB (1.30 MB gzip) |
| `npm run e2e` | **2/2 passed** (desktop-chromium, mobile-chromium) |
| Screenshots | `docs/screenshots/phase0-2d-desktop.png` (1280×720 @2x), `docs/screenshots/phase0-2d-phone-landscape.png` (Pixel 7 landscape), both captured mid-slide with zero console errors and inspected. |

### 11/11/2026: Phase 1, engine foundation (Master Developer; no specialists used, per TD-019)
**Acceptance criteria (set before editing):** lint and format tooling; a smaller physics download (or a measured justification); scene load and unload with no leaks; an asset loader where a missing asset shows an error rather than a crash; a debug overlay (FPS, collider outlines); a y-sorted draw-order layer; all checks green, with e2e and screenshots.

**Delivered:** Biome lint and format (TD-024); Rapier switched to the separate `.wasm` build, measured at about 30% smaller (TD-023); `SceneManager` and `GameScene`; `AssetLoader` plus the Pixi adapter; `DebugOverlay`, `FpsMeter` and the backquote-key toggle; `YSortLayer` with greybox pillars in the engine check; the engine check refactored into a proper scene (`src/app/scenes/engine-check-scene.ts`; view file renamed `engine-check-view.ts`); lint step added to CI (TD-025).

**Issues found and fixed during the work:**
1. Vitest could not resolve `@dimforge/rapier2d` (the package only has a browser `module` entry). Fixed with a test alias plus inlining, documented in `vite.config.ts`.
2. `typescript-eslint` does not support TypeScript 7, so I chose Biome instead (TD-024).
3. Biome flagged the deprecated `recommended` key; switched to `preset`.
4. The first pillar layout sat on the crate's launch path, so the wall-bounce test failed (1 bounce instead of 2 or more). Moved the pillars off the path; the test is unchanged.

**Evidence (run by the Master Developer, 11/11/2026):**

| Command | Result |
|---|---|
| `npm run lint` | clean (40 files) |
| `npm run typecheck` | exit 0 |
| `npm test` | 10 files, **26/26 passed** |
| `npm run build` | exit 0, no warnings. pixi 511 kB (145 kB gzip); Rapier `.wasm` 2.40 MB (0.92 MB gzip), previously 1.29 MB gzip |
| `npm run e2e` | **6/6 passed** (desktop and mobile) |
| Pages sub-path | `.wasm` and the game load at `/StickBattleFighter/` with no errors |
| Visual | Debug overlay screenshot inspected: the panel shows FPS, steps, 8 colliders and 0 asset failures; green outlines match the walls, pillar footprints and crate; pillars render upright with shadows |

### 11/11/2026: Phase 2, player character and movement (Master Developer; no specialists used, per TD-019)
**Acceptance criteria (set before editing):** an input intent layer (keyboard plus touch joystick); free top-down movement with acceleration and deceleration, diagonals no faster, wall sliding, data-driven tuning; a hop with ground shadow; a **jointed** greybox stickman with smooth idle and walk; a follow camera; unit tests with synthetic input; e2e proving keyboard and touch movement, containment and screenshots.

**Delivered (TD-026):**
- **Input:** `src/input/` (`intents.ts`, `keyboard.ts`, `touch-controls.ts`).
- **Movement and physics:** `src/physics/movement.ts`; `PhysicsWorld.addCharacterBody`.
- **Animation:** `src/animation/` (`skeleton.ts`, `greybox-motion.ts`, `animator.ts`).
- **Rendering and camera:** `src/rendering/stickman-view.ts`, `src/camera/follow-camera.ts`.
- **Arena and fighter data:** reusable greybox arena helpers (`src/data/arenas/greybox-arena.ts`, `src/arenas/greybox-arena-colliders.ts`, `src/rendering/greybox-arena-view.ts`), the training yard (`src/data/arenas/training-yard.ts`) and test-fighter data (`src/data/fighters/greybox-stickman.ts`).
- **Scenes:** `TrainingYardScene` with scene selection by URL; scenes now frame their own camera (`render(alpha, frameDtS)`).
- **Touch styles:** joystick and JUMP button styles in `index.html`.

**Issues found and fixed:**
1. The first greybox poses had **knees bending forward and elbows backward** (sign error). Caught by comparing against the approved kick sample; fixed, and now locked by a test over every pose.
2. `satisfies` with extra colour keys failed type-checking. Removed; arena data is still type-checked where it is used.
3. A type error in the e2e touch helper.

**Ownership note:** the Master Developer wrote the starter code in `src/input`, `src/physics`, `src/animation`, `src/camera` and `src/rendering` for this phase. Each owning specialist takes over from the next phase that needs them.

**Evidence (11/11/2026):**

| Command | Result |
|---|---|
| `npm run lint` | clean (62 files) |
| `npm run typecheck` | exit 0 |
| `npm test` | 15 files, **67/67 passed** |
| `npm run build` | exit 0, no warnings |
| `npm run e2e` | **8 passed**, 2 skipped by design (keyboard test on desktop only, touch test on mobile only) |
| Pages sub-path | loads and runs at `/StickBattleFighter/` |
| Visual | Inspected: idle guard, mid-stride walk (bent back knee, arm swing), airborne tuck with the shadow left on the floor, mirrored when walking left, desktop follow camera, mobile joystick plus JUMP. Saved `docs/screenshots/phase2-desktop-walking.png` and `phase2-mobile-joystick.png`. |

**Known follow-ups (not Phase 2 blockers):**
- The mobile test viewport is portrait; the landscape layout (REQ-CTL-6) is Phase 11.
- The status line shows keyboard hints on touch devices; real HUD and help come in Phase 11/12.
- The hop is visual only (cannot clear obstacles); revisit in combat or arena phases.
- The figure is about 1.4 m on an 11 m-wide view; revisit scale with art direction (OQ-16).

### 11/11/2026: Wider, lower fighting stance with planted feet (owner request)
**Owner:** "It should have a wider leg stance and more fighter feel."
**Change:** added **two-bone leg IK** (`legIk` in `src/animation/skeleton.ts`), so stances are defined by where the feet stand and the knees solve themselves (always bending forward over the toes, with both feet planted). Greybox stance: about 0.74 m stagger (lead foot 0.30 m ahead, rear foot 0.44 m behind); the rear leg long and nearly straight, driving; the lead knee bent; hips at 0.62 m; deeper lean and tucked chin; idle bounces lightly on the balls of the feet (1.8 bounces per second). Test-fighter legs lengthened (thigh and shin 0.36 → 0.40 m) so a wide stance does not force a kneeling crouch.
**Iterations (honest record):** (1) fixed-angle wide pose: the rear foot floated off the floor, which led to the IK; (2) IK at a 0.54 m crouch: a test caught the lead leg locking straight at full stride; (3) it then looked like a kneeling lunge, so the legs were lengthened; (4) the rear knee still dipped, so the rear foot was moved further back. Each step was checked with in-game captures.
**New tests (79 total, all passing):** IK puts the foot exactly on target with the knee forward, and handles out-of-reach targets; idle has both feet on the floor at least 0.6 m apart with the hips crouched; the shuffle keeps at least 0.45 m of stagger throughout; **knees never lock fully straight** across idle and 40 shuffle phases.
**Verified:** lint, typecheck, build and e2e pass; in-game captures in `docs/screenshots/phase2-fighting-stance.png`.

### 11/11/2026: Fighting stance at all times (owner request)
**Owner:** "Ensure arms and body are not awkward when walking; the stickman should have a fighting walking stance at all times."
**Change:** the greybox idle, walk and air poses were rewritten (`src/animation/greybox-motion.ts`). Guard up (lead fist forward at chin height, rear fist tucked), knees always bent, staggered feet with the lead foot ahead, torso leaning in. Walking became a **boxer shuffle**: the lead foot steps, the rear follows a quarter-cycle later, feet stay low and never cross, and the guard only bobs slightly (no arm swing). Stride is now 1.1 m. Spec REQ-ANI-7 extended.
**Process:** the poses were previewed as stills first. The first attempt still looked wrong (hands too low and crossed, lunging back leg, high back kick, feet crossing), so it was revised before going into the game.
**New tests (75 total, all passing):** in every idle, walk and air pose both fists are at or above chest height and in front of the body; across 40 points of the shuffle cycle (and idle) the lead foot stays at least 12 cm ahead of the rear foot.
**Verified:** lint, typecheck and build clean; e2e all pass; in-game captures (standing, shuffling right and left, moving up) saved as `docs/screenshots/phase2-fighting-stance.png`.

### 11/11/2026: Phase 3, camera completion (Master Developer; no specialists used, per TD-019)
**Acceptance criteria (set before editing):** auto-zoom keeps all nearby fighters framed within limits, with the player always on screen; impact shake and zoom punch that settle back; no snapping under sudden knockbacks; unit, integration and e2e evidence.
**Delivered (TD-027):** `src/camera/framing.ts`, `camera-shake.ts`, multi-target `FollowCamera` with pan and zoom speed caps; grey **training dummy** in the training yard (shove-able, faces the player); debug impact key **P** (overlay on only); debug hook exposes camera and dummy state.
**Issues found and fixed:**
1. The camera could lurch up to 0.5 m and zoom 0.22 m in one frame after a sudden knockback. Fixed by adding speed caps (15 m/s pan, 6 m/s zoom).
2. Shake returned −0 instead of 0 at rest. Normalised.
3. Several of my tests had wrong assumptions: wide screens fit side-by-side fighters without zooming; the player carried momentum past the dummy's row; a pillar blocked the walk-up path; slow CI rendering means fixed-time key holds move the fighter less. All were fixed in the tests (position- and distance-based waits), not by weakening the game.
**Evidence (11/11/2026):** lint, typecheck and build clean; `npm test` 92/92; `npm run e2e` 11 passed (with one earlier flaky failure, now on watch; see the checklist).

### 11/11/2026: Phase 4 office arena plus owner-requested combat, jump and stance (Master Developer; no specialists used, per TD-019)
**Owner requests in this round:**
1. Office with 12 cubicles (6 per side), a distinct boss room, a smooth camera between rooms, and a door that only breaks from a kick or a heavy knockback.
2. A higher jump with its own jump stance.
3. A 1-2-3 combo (jab, hook, heavy finisher with strong knockback) and an aerial flying kick that can smash the door.
4. A slightly bent boxer stance as the unarmed default.

**My first office draft** (open plan, meeting room, storage and break area) was replaced by the owner's layout before completion.

**Delivered:** see TD-028, TD-029, `docs/design/arenas/office.md`, and spec REQ-ENV-8..11, REQ-PHY-2a, REQ-CMB-12..15 and REQ-ANI-7. The default scene is now the office (`?scene=training-yard`, `?scene=engine-check`, `?overview`).

**Issues found and fixed (honest record):**
1. A slicing edit corrupted the scene file; it was rewritten from source.
2. Overlapping glass partitions at a corner (caught by a layout test; draft layout).
3. The jab and hook pushed the dummy out of the finisher's reach (found in browser capture: 2 hits instead of 3). Retuned, and a standing-still three-hit test added.
4. A longer finisher reach missed a door the fighter stood against. Fixed by switching to capsule hit areas, with tests.
5. The hook pose did not read as a hook (frame-by-frame render); reworked.
6. The boxer stance at 0.68 m hips locked the rear knee at full stride (test); hips set to 0.67 m.
7. **Phase 3 camera e2e flakiness solved:** the test overshot the 16 m framing range under slow rendering, so the camera correctly stopped framing the dummy. The test now releases keys in a tight loop and asserts the real rule; it passed 3/3 alone and the suite passed 3/3 full runs.
8. A browser capture issue: slow high-resolution screenshots pause the game, so combo presses lost their timing. Assertions moved into e2e tests with no screenshots between presses.

**Evidence (11/11/2026):** lint clean (84 files); typecheck 0; `npm test` **127/127**; build clean; `npm run e2e` **14/14** in 3 consecutive full runs. Visuals inspected: office overview, boss room, boxer stance, the three combo strikes and the flying kick (frame-by-frame pose renders), jump rise, door before and after.

**Live preview:** GitHub Pages deploy #2 succeeded on 11/11/2026 (Phase 3 build). It is redeployed with this build after the push. This session's network blocks `github.io`, so the live URL could not be opened from here.

### 11/11/2026: Phase 5, combat engine (Master Developer; no specialists used, per TD-019)
**What changed:** health, damage and critical hits (seeded); HP and stamina bars; floating damage text; block (hold Button 1) with chip damage and stamina cost; parry; guard break; dodge (Shift / flick) with invulnerability; stamina regeneration; flinch, knockdown, get-up, KO and respawn; hit-stop; the dummy shares the player's engine and can attack (T). See TD-030 and REQ-CMB-16..21.
**Files:** `src/combat/combatant.ts`, `events.ts`, `combo.ts`, `attacks.ts`; `src/app/scenes/fighter-entity.ts`, `fight-arena-scene.ts`; `src/animation/reaction-poses.ts`; `src/rendering/fighter-bars.ts`, `stickman-view.ts`; `src/interface/combat-text.ts`; `src/input/intents.ts`, `keyboard.ts`, `touch-controls.ts`, `debug-keys.ts`; `src/data/fighters/*`; `index.html`; `src/app/bootstrap.ts` (`?playerAt=x,y`).
**Issues found and fixed:**
1. Player stopped too slowly after the dummy's settle value leaked into the shared step: each fighter now uses its own deceleration.
2. Dummy never attacked in the browser: its trigger range was narrower than where the player stops; widened.
3. **Lost combo taps (real bug):** two taps between simulation steps collapsed into one. Button 1 edges are now queued (regression test added).
4. Combo e2e tests pressed on fixed real-time gaps, which drift under load; they now press once per strike, reacting to the fighter like a player (`tests/e2e/combo.ts`).
**Evidence:** lint clean; typecheck 0; `npm test` **152/152**; build clean; `npm run e2e` **96/96** over 6 full-suite repeats. Screenshots: `docs/screenshots/phase5-combo-damage.png`, `phase5-guard.png`.
**Limitations:** stats are provisional (OQ-05). Feel (parry window, dodge distance) needs an owner playtest.

### 11/11/2026: Owner feedback round (Master Developer; no specialists used, per TD-019)
**Requests and what changed:**
1. *Tighter arena, shorter office:* office 36 × 18 m → **29 × 12 m**; the aisle between cubicle rows is about 6.6 m (was 12 m). A printer that sealed off a corner pocket was moved (found by the reachability test).
2. *Furniture moves or breaks by durability:* new `ArenaProps` (TD-031). Chairs shove on a jab and break on a hook; desks break to the finisher and drop their monitor, keyboard and cup; cabinets never break; bodies knocked into furniture damage it too.
3. *Better fall and a get-up:* tumble, landing bounce, lying flat, then sit-up and rise (new `gettingUp` state).
4. *Kick sends fighters too far:* kick knockback 10 → 7 m/s and harder knock-flight braking; the kick now slides about 2–3 m.
5. *Combo variations, same damage:* 3 looks per strike (for example straight/body/high jab; hook/uppercut/lead hook; rear straight/push kick/overhand), never the same twice in a row.
6. *Mobile button highlight while held:* no text selection, tap highlight or long-press menu on the touch controls.
Also added `?slowmo=` and a freeze hook for exact animation screenshots.
**Files:** `src/data/arenas/office.ts`; `src/environment/arena-props.ts`, `debris.ts`, `breakable-door.ts`; `src/physics/physics-world.ts`; `src/arenas/arena-colliders.ts`; `src/rendering/arena-view.ts`, `debris-view.ts`; `src/combat/combatant.ts`, `combo.ts`; `src/animation/reaction-poses.ts`, `attack-poses.ts`; `src/app/scenes/fight-arena-scene.ts`, `fighter-entity.ts`; `src/app/bootstrap.ts`; `src/core/game-loop.ts`; `src/input/touch-controls.ts`; `index.html`; tests.
**Issues found and fixed:** a re-hit cooldown meant for sliding bodies blocked the hook right after a jab (now applies only to knockback contact); the first fall screenshots were mistimed because the software renderer runs slower than real time (fixed with the freeze hook; the simulation trace was already correct).
**Evidence:** lint clean; typecheck 0; `npm test` **166/166**; build clean; `npm run e2e` **48/48** over 3 repeats; screenshots listed in `TESTING_CHECKLIST.md` §0h.
**Limitations:** pieces and fallen items are greybox; real-phone check of the button fix still to do by the owner.

### 11/11/2026: Phase 6, abilities and ultimate (Master Developer; no specialists used, per TD-019)
**Owner decisions:** ultimate = charge meter (OQ-04); Inferno gets the first kit.
**What changed:** shared ability framework (data, caster, delivery world), Inferno's Fire Bolt, Flame Dash, Eruption and Meteor Fist; burning fighters and furniture; one hit path for melee and abilities; cast animations; fire VFX with telegraphs; desktop ability bar; touch A1–A3 and ULT buttons (five combat buttons); sound-hook events. See TD-032 and REQ-ABL-3/7/8.
**Files:** `src/abilities/*`, `src/data/abilities/inferno.ts`, `src/data/fighters/inferno.ts`, `fighter-def.ts`, `greybox-stickman.ts`; `src/app/scenes/scene-abilities.ts`, `fight-arena-scene.ts`, `fighter-entity.ts`; `src/animation/ability-poses.ts`; `src/vfx/ability-vfx.ts`; `src/interface/ability-hud.ts`, `combat-text.ts`; `src/combat/combatant.ts`, `events.ts`; `src/environment/arena-props.ts`; `src/physics/physics-world.ts`; `src/input/intents.ts`, `keyboard.ts`, `touch-controls.ts`; `src/app/bootstrap.ts`; `index.html` (status hint moved to the top-left so it does not overlap the ability bar).
**Evidence:** lint clean; typecheck 0; `npm test` **189/189**; build clean; `npm run e2e` **18/18**; browser screenshots of every ability (`docs/screenshots/phase6-abilities.png`).
**Limitations:** numbers provisional (OQ-05); sound hooks fire but no audio plays yet (OQ-17); the dummy does not use abilities (AI is Phase 10).

### 11/11/2026: Hit feel and KO dissolve (owner request; Master Developer, no specialists, per TD-019)
**What changed:** every contact now flashes the target white, plays a synthesised contact sound by blow type, throws sparks with a contact flash, recoils the striker, shakes a little and freezes briefly; knockback already followed the hit direction. A KO freezes longer, then the fighter faints, lies still, and dissolves into drifting dust while fading out, with KO and dusting sounds. Sound effects for abilities now play too. See TD-033, REQ-CMB-24, REQ-ANI-9.
**Files:** `src/data/combat/impacts.ts`, `src/audio/sound-board.ts` (+README), `src/combat/attacks.ts`, `combatant.ts`, `src/abilities/ability-def.ts`, `src/data/fighters/greybox-stickman.ts`, `src/app/scenes/fight-arena-scene.ts`, `fighter-entity.ts`, `scene-abilities.ts`, `src/rendering/stickman-view.ts`, `src/vfx/ability-vfx.ts`, `src/input/debug-keys.ts`, `src/app/bootstrap.ts`.
**Issues found and fixed:** sparks were too small to see at normal zoom (about 1 px), so they were made thicker with a contact flash; the first KO capture never reached a KO, so a `setDummyHp` debug hook was added for reliable checks.
**Evidence:** lint clean; typecheck 0; `npm test` **194/194**; build clean; `npm run e2e` **36/36** (2 repeats); frozen-frame screenshots; played-sound log.
**Limitations:** sound quality needs a listening check by the owner; music is still open (OQ-17).

### 11/11/2026: Punch Clash (owner request; Master Developer, no specialists, per TD-019)
**What changed:** the full flow (sustained exchange → trigger → rapid exchange → 4 s mash with live power for both → camera closing in → final-stretch spike → comparison → scaled finisher or stalemate → camera returns; 8 s cooldown). See TD-034 and REQ-CMB-25.
**Files:** `src/combat/clash.ts`, `src/data/combat/clash.ts`, `src/app/scenes/scene-clash.ts`, `fight-arena-scene.ts`, `fighter-entity.ts`, `src/camera/follow-camera.ts`, `src/interface/clash-hud.ts`, `src/audio/sound-board.ts`, `src/combat/combatant.ts`, `src/data/fighters/training-dummy.ts`, `src/app/bootstrap.ts`, `index.html`.
**Issues found and fixed:** constant jabbing never triggers a clash because the dummy stays stunned and is pushed away, so the trigger test now plays like a person (jab, then block the reply), which triggers it reliably; the clash HUD overlapped the fighters' bars at the tightest zoom and was moved up.
**Evidence:** lint clean; typecheck 0; `npm test` **207/207**; build clean; `npm run e2e` **19/19**; screenshots of every stage.
**Next queued owner requests:** dynamic wall transparency; Inferno ultimate aiming (I / drag); walking and running animation; office centre cubicle pairs and breakables; Inferno fist flames.

### 11/11/2026: Dynamic wall transparency (owner request)
Walls, door sections, pillars and props that cover a fighter fade to 30% over 0.2 s and restore smoothly (TD-035, REQ-VIS-10). Files: `src/rendering/occlusion-fader.ts`, `arena-view.ts` (exposes wall and door sections), `fight-arena-scene.ts`. Evidence: `npm test` 211/211, e2e 19/19, screenshots. Finding: a fighter standing beside a vertical wall strip is not actually covered by it in this view; the covering cases are standing behind (north of) tall objects and in doorways, which is what the tests use.

### 11/11/2026: Aimed Meteor Fist (owner request)
I / F (or hold ULT) aims with a range ring, arc and landing zone while Inferno crouches; WASD or a drag moves it; I or releasing launches (TD-036, REQ-ABL-9). Fixed: fighters slid about 1.2 m after a dash or leap ended. Keyboard-only preset A3 moved from I to O. Evidence: `npm test` 214/214; e2e for both devices; screenshots.

### 11/11/2026: Walking and running (owner request)
Real walk and run cycles with alternating legs and fists swinging opposite them (arm IK), smooth idle/walk/run blending, snappier acceleration and turning (TD-037, REQ-ANI-10; the earlier shuffle rule is SUP-05). Finding: driving arm swings by shoulder angle moved the fist up rather than forward, so arms now use IK on fist positions. Evidence: `npm test` 216/216; frame captures.

### 11/11/2026: Office centre cubicles and breakables (owner request)
Six back-to-back cubicle pairs in the centre with walkways, steel drawer pedestals, breakable monitors and desk items, tougher tables/drawers/cabinets, material-specific debris, particles and sounds (TD-038, REQ-ENV-8/12, REQ-PHY-6b). Office is now 33 × 12 m (the row of pairs needs the length). Evidence: `npm test` 220/220, e2e, screenshot.

### 11/11/2026: Data-driven character system (owner request; Master Developer, no specialists, per TD-019)
Characters are JSON definitions plus reusable profiles with capability flags, a 4-tier animation fallback, a data-driven moveset controller, validation with safe limits and a safe fallback, a Base Stickman template, Inferno as the complete example (taekwondo punches and kicks, aerial and downward fire kicks, flame clash finisher, ember-and-ash defeat, **fist flames**: the queued owner request is delivered through its effects profile), and a local admin editor (`admin.html`). See TD-039, REQ-CHR-1..6 and `docs/characters/HOW_TO_CREATE_A_CHARACTER.md`.
**Files (new):** `src/characters/*`, `src/data/characters/**`, `src/animation/clips.ts`, `src/combat/moves.ts`, `src/vfx/effects-library.ts`, `src/abilities/kits.ts`, `src/admin/*`, `admin.html`, docs. **Changed:** fighter data files (now resolved from JSON), `fighter-def.ts`, `attacks.ts`, `combatant.ts`, `animator.ts`, `greybox-motion.ts` (taekwondo stance), `stickman-view.ts` (flash colour, limb tips), `ability-vfx.ts`, `fight-arena-scene.ts`, `fighter-entity.ts`, `scene-clash.ts`, `scene-abilities.ts`, `sound-board.ts`, `bootstrap.ts`, `vite.config.ts`, `tsconfig.json`. **Removed:** `combo.ts`, `attack-poses.ts` (replaced by the move controller and the clip library).
**Findings:** the validator caught Inferno's audio profile naming sounds that did not exist yet and fell back safely, exactly as intended; the no-name test caught two hard-coded ids (fallback and editor defaults), moved into the library registration.
**Evidence:** lint clean; typecheck 0; `npm test` **234/234**; build clean (game + editor); `npm run e2e` **24/24**; screenshots.
**Limitations:** see TD-039 (new clip shapes need code; several mapped states share motions until art; unlocks server-side later; no voice lines yet).

### 11/11/2026: Confident walk and run (owner request)
Owner: the gait "looks weird and not confident". Walk and run rebuilt upright and proud: tall hips, chest up, head level, long steps with a springy bounce and chest roll, fists swinging freely; the run drives from the chest with high knees and a strong arm drive (TD-040, REQ-ANI-11; the guard-up walk is SUP-06). **Files:** `src/animation/greybox-motion.ts`, `tests/unit/animation/skeleton.test.ts`, docs. **Evidence:** lint clean; typecheck 0; `npm test` 231/231; build clean; in-game frame capture (`docs/screenshots/confident-gait.png`). **Next task:** Phase 7, pickup, carry and throw.

### 11/11/2026: Diagonal boss-room wall and walk-through door (owner request)
Owner: "the player can't find the door"; then a sketch of a diagonal wall and "make sure the door is smaller". Root cause: tall walls drawn up the screen hid the doorway. Now the wall runs diagonally, the door is 1.3 m with a bright frame, mats and a floor arrow, interior walls are cut away, and walking into the door swings it open (it still breaks from a kick, finisher or a body). TD-041, REQ-ENV-13, SUP-07. **Files:** `src/core/oriented-rect.ts` (new), `src/rendering/prism.ts` (new), `breakable-door.ts`, `door-view.ts`, `arena-view.ts`, `arena-colliders.ts`, `navigation.ts`, `attacks.ts`, `physics-world.ts`, `arena-layout.ts`, `office.ts`, `fight-arena-scene.ts`, `fighter-entity.ts`, door tests. Also fixed the run arm drive (the gait commit had left one test failing). **Evidence:** lint clean; typecheck 0; `npm test` 232/232; `npm run e2e` 24/24; screenshots. **Next task:** Phase 7, pickup, carry and throw.

### 11/11/2026: Curved boss-room wall and rearranged furniture (owner sketches)
The diagonal wall became a curve bowing into the boss room with the door at its apex; office-side pantry and copy corners follow the curve; the boss room keeps open floor in front of the door (desk zone top right, meeting table bottom right, bookshelves, cabinets, plants). Walls draw seamless with a skirting board. Test fixes (timing, not loosened): the office e2e now waits on the door breaking rather than a short finisher frame, and the ultimate-aim e2e holds the aim long enough for a slow software-rendered browser and polls the ability state finely (both were flaky under parallel load). **Evidence:** lint clean; typecheck 0; `npm test` 232/232; `npm run e2e` 24/24 (plus phase 6 ×5 repeats, 20/20); screenshot `docs/screenshots/office-curved-wall.png`.

### 11/11/2026: Fire sound effects and background music (owner request)
Original fire sounds designed from the owner's three reference clips (measured, not used): Inferno's punches and kicks, Fire Bolt (whoosh and fireball burst), Meteor Fist (growling build-up, rushing launch, double explosion). Procedural music: a fight track per map and a menu theme (TD-042). **Files:** `src/audio/sound-board.ts`, `src/audio/music.ts` (new), `src/data/audio/music-tracks.ts` (new), `src/data/abilities/inferno.ts`, `src/data/characters/inferno/audio.json`, arena data, `bootstrap.ts`, tests. E2E headroom: two tests that wait in real time for game-time events were failing on this (slower) container even on the previous commit; their waits got more time, the checks are unchanged. **Evidence:** lint clean; typecheck 0; `npm test` 238/238; `npm run e2e` 24/24; browser check. **Limitation:** sounds cannot be heard here; owner check on speakers needed.

### 11/11/2026: 2.5D style mockups (owner request; awaiting approval)
Original mockups of the proposed pseudo-isometric look: an office corner (plank floor, cut-away walls with skirting and a window, desks with monitors, mesh-back chairs, shelving, water cooler, sofa, plants, rug), a furniture sheet, and a stickman close-up with the procedural fire head (idle, walk, punch) lighting the floor. Files: `docs/mockups/style-2-5d.html` (animated in a browser) and three PNGs. TD-043 (PROPOSED). Nothing in the game has changed yet.

### 11/11/2026: Phase 7 started: pickup, carry and throw (first slice)
G or U (desktop) or the contextual utility button (touch: GRAB / THROW / JUMP) picks up a nearby throwable, carries it overhead and throws it at the locked target; hold to put it down. Thrown objects fly over furniture, bounce off walls, hit fighters by mass and speed, take damage, and glass shatters (TD-044). **Files:** `src/data/combat/throwing.ts` (new), `src/environment/arena-props.ts`, `src/physics/physics-world.ts` (FURNITURE collision group), `src/input/intents.ts`, `keyboard.ts`, `touch-controls.ts`, `src/animation/reaction-poses.ts` (carry and throw poses), `src/rendering/occlusion-fader.ts`, `fight-arena-scene.ts`, `fighter-entity.ts`, `bootstrap.ts`, tests (`tests/integration/scenes/throwing.test.ts`, `tests/unit/input/interact.test.ts`, `tests/e2e/phase7.spec.ts`). Also fixed: the mockup HTML tripped the linter. **Evidence:** lint clean; typecheck 0; `npm test` 248/248; `npm run e2e` 26/26; browser frames. **Next task:** Phase 7 slice 2: fighter-specific interactions by data, more throwables (REQ-PHY-9), a throw aim indicator; then Phase 8 (first polished fighter, which the 2.5D style decision TD-043 feeds).

### 11/11/2026: CI stabilised
CI e2e had become intermittent: every test renders WebGL in software, and two in parallel on the GitHub runner ran the game slower than real time, so real-time waits timed out across unrelated tests. CI now runs browser tests one at a time (`playwright.config.ts`), and automated browsers skip background music unless `?music=` asks for it. Run on a3268f4: **success**.

### 11/11/2026: Office furnished (owner request)
New prop kinds (`src/data/objects/props.ts`, drawings in `src/rendering/prop-view.ts`): kitchen counter, coffee machine, microwave, snack shelf, vending machine, phone booth, sofa. The office walls now hold file cabinets, bookshelves, two print stations, a kitchenette, a two-booth calling room and a lounge, with both combat aisles clear (REQ-ENV-14). **Evidence:** lint clean; typecheck 0; `npm test` 248/248; `npm run e2e` 26/26; screenshot.

### 11/11/2026: 2.5D isometric look (owner approved the mockups)
The whole game is now drawn in the approved 2.5D style over the unchanged top-down simulation (TD-045, REQ-VIS-11): isometric light-wood floors, lit bevelled furniture with shadows, tall back walls with windows, low front ledges, Inferno's living flame head and firelight. Controls move along the screen; fighters face any direction and attacks soft-lock. **Files (new):** `src/rendering/projection.ts`, `src/rendering/iso-draw.ts`, `tests/unit/rendering/projection.test.ts`. **Changed:** `arena-view.ts`, `prop-view.ts` (all 28 kinds redrawn), `door-view.ts`, `debris-view.ts`, `stickman-view.ts` (shadow, flame head), `occlusion-fader.ts` (cached shapes), `ability-vfx.ts`, `fight-arena-scene.ts`, `fighter-entity.ts` (aim, faceToward), `scene-clash.ts`, `scene-abilities.ts`, `attacks.ts`, `arena-props.ts`, `intents.ts`, `keyboard.ts`, `touch-controls.ts`, `bootstrap.ts`, character schema/validation (`head`), Inferno effects, office palette, tests. **Evidence:** lint clean; typecheck 0; `npm test` 253/253; `npm run e2e` 26/26 (movement suites ×3); screenshots; performance measured (see TD-045). **Known issues:** office renders at about 70% of the old speed in software WebGL (real phones not measured); sliding furniture does not spin. **Next task:** owner phone check; then Phase 7 slice 2.

### 11/11/2026: Dodge button, character dodges, tough metal (owner request)
Touch DODGE button with a refilling cooldown; cooldown by body weight; the default stickman rolls backwards and Inferno bursts into a flame (data: Animation Profile `Dodge`); metal takes 45% damage (TD-046, REQ-CTL-16, REQ-PHY-6c). **Evidence:** lint clean; typecheck 0; `npm test` 256/256; `npm run e2e` 27/27; frames. One touch-ultimate e2e wait got more headroom (it flaked only under full parallel load; passes ×3 alone).

### 11/11/2026: Phase 7 slice 2 — throwables, aim indicator, fighter object styles
Books, staplers, bottles and paper stacks on every desk; fire extinguishers (foam burst); a throw arc and landing ring while carrying; per-fighter lifting limit, throw power and fire throws (Inferno) as Stats Profile data (TD-047, REQ-PHY-9b). **Evidence:** lint clean; typecheck 0; `npm test` 261/261; `npm run e2e` 27/27; screenshots. **Phase 7 status:** objects can be picked up, carried, aimed, thrown, collide, bounce, break by material, and fighters handle them their own way; AI object use waits for Phase 10. **Next task:** Phase 8 (first polished fighter: Inferno to the full quality bar), or the owner's phone check first.

### 11/11/2026: Furniture facing, tall glass-door wall, breakable wall (owner request)
Wall-side furniture faces into the room and chairs face their desks; the curved wall is full height with a glass door; its 24 sections can be chipped through one at a time (TD-048, REQ-ENV-15, SUP-08). Also: CI for e024ef0 failed installing the browser's system packages (an apt download error on the runner, not our code) and was re-run. **Evidence:** lint clean; typecheck 0; `npm test` 263/263; `npm run e2e` 27/27; screenshots. **Next task:** Phase 8 (first polished fighter).

### 11/11/2026: Dodge roll on the ground (owner)
The default stickman's roll now turns about the tucked body's centre while its lowest point stays on the floor every frame (no floating). Frames: `docs/screenshots/dodge-roll-grounded.png`. Evidence: lint, typecheck, `npm test`, `npm run e2e` green.

### 11/11/2026: Desktop controls, Settings, four-hit combo, quick dodge, mouse-aimed ultimate (owner request)
- **Controls (REQ-CTL-17, TD-049):** W/A/S/D move, hold Shift sprint, Space jump, left click attack (hold block), right click dodge toward the held direction, Q/E/R abilities, F ultimate, G grab/throw. One rebindable layout replaces the two presets (SUP-09, SUP-10). The browser's right-click menu is disabled over the game.
- **Settings:** gear button or Esc (pauses). Audio: separate music and sound-effect sliders, live. Controls: rebind any action to a key or mouse button; conflicts refused with "X is already assigned to Y"; reset to defaults; saved in localStorage.
- **Inferno ultimate (REQ-CTL-18):** F aims, the ring follows the hovered mouse, left click jumps (rebindable "Launch aimed ultimate"; may share only with attack or ultimate).
- **Combo (REQ-CMB-26, SUP-12):** three punches then a kick: base jab → cross → hook → roundhouse kick; Inferno jab → straight → hook → fire roundhouse. Same total damage.
- **Quick dodge (REQ-ANI-12, SUP-11):** `proc.dodge.quick` replaces the roll as the default: forward lunge, back-step or side shuffle with speed lines. Inferno keeps its flame.
- **Files:** `src/input/bindings.ts`, `src/input/settings-store.ts`, `src/interface/settings-panel.ts` (new); `src/input/keyboard.ts` (rewritten as `DesktopInput`), `src/input/intents.ts`, `src/app/bootstrap.ts`, `src/app/scenes/fight-arena-scene.ts`, `src/app/scenes/fighter-entity.ts`, `src/physics/movement.ts`, `src/audio/{sound-board,music}.ts`, `src/animation/{reaction-poses,clips}.ts`, `src/rendering/stickman-view.ts`, both movesets, shared animation profile, `index.html`.
- **Tests changed and why:** combo tests now expect four strikes (owner changed the combo); door e2e expects `brokenBy: 'kick'` (the finisher is a kick); key-preset tests (K/L/O/I, U, J, arrows, Shift dodge) rewritten for the new single layout; the default dodge clip test expects `proc.dodge.quick`. New: `tests/unit/input/bindings.test.ts` (defaults, conflicts, reserved keys, persistence, repair), three ultimate/sprint integration tests, `tests/e2e/controls.spec.ts` (right-click dodge and no menu, directional dodge, mouse-aimed ultimate, settings flow with reload).
- **Evidence:** lint clean; typecheck 0; `npm test` 280/280; `npm run e2e` 31 passed (25 skipped by project); screenshots `docs/screenshots/quick-dodge-forward-back-side.png`, `docs/screenshots/settings-controls-conflict.png`.
- **Limitation:** there is no main menu yet, so Settings opens in game only. Not checked on a real phone or with a physical mouse (headless Chromium only).
- **Next task:** owner playtest of the new controls, then Phase 8 (first polished fighter).

### 11/11/2026: Real running and sprinting (owner request)
The run was the walk's sine stride made bigger. It is now its own cycle (`runningPose` in `src/animation/greybox-motion.ts`): foot strike ahead, push-off behind, a flight phase (new optional `Pose.liftM` keeps the body up while both feet are off the floor), heel kick, knee drive, a lean that pushes at each drive, and an elbows-bent arm pump set by joint angles. A sprint style blends in from 5.3 to 6.8 m/s (sprint reaches 7.25 m/s), with stride 3.0 m. **Tests:** new flight, heel-kick, knee-drive, arm-pump, no-locked-knee and sprint-blend checks. The stride-timing test now steps exactly one stride's time instead of whole frames: the frame rounding error was larger than its tolerance once the run's legs moved faster. **Evidence:** lint clean; typecheck 0; `npm test` 282/282; in-game sprint at 7.25 m/s with no console errors; `docs/screenshots/run-sprint-cycle.png`, `docs/screenshots/sprint-in-game.png`. **Next task:** finish the Fireball (TD-050).

### 11/11/2026: Doorway no longer clips the curved wall (owner)
The frame posts were placed 0.16 m beyond the doorway (inside the wall ends), drawn wider and taller than the wall, and the wall pieces beside the door overlapped 0.1 m into the doorway. Now the wall stops 0.14 m short of the glass leaf on each side, its door-side ends are not padded, and each post (`DoorSpec.posts`) is a quad that exactly fills the gap from the leaf's straight end to the wall piece's angled end face, at wall thickness and wall height; posts are solid (colliders, navigation) and stay when the leaf opens or breaks. **Tests:** two geometry tests (posts flush with leaf and wall; no wall in the doorway). **Evidence:** `npm test` 284/284; door e2e passes; checked from the office side, the boss-room side and at 3× zoom (`docs/screenshots/doorway-office-side.png`, `doorway-boss-side.png`).

### 11/11/2026: Inferno redesign, Fireball, Magic Attack VFX Standard (owner)
- **Abilities:**
  - Fire Beam replaces the ring-of-fire Eruption: 2 s charge, then a continuous 6.5 m beam that walls stop.
  - Meteor Fist is renamed Eruption: a squat-and-charge, a flaming jump and a 3.2 m blast.
  - Distance-based damage applies to both.
  - The Fireball has its full sequence: charge, core, trail, impact, white flash, charge/whoosh/boom sounds, burning aftermath and death by fire.
- **Look:** a living-flame body and a fiery face (the blue base is removed); the flame dodge is smaller and has no grey.
- **Standard:** `docs/design/MAGIC_VFX_STANDARD.md` (TD-050, REQ-ABL-11..13, REQ-ANI-14).
- **Tests:** Fire Beam (charge, ticks, push, burn, sounds, falloff, range), the falloff rule, Inferno's numbers, beam duration and walls stopping it. The old ring-of-fire tests were replaced because that ability no longer exists.
- **Evidence:**
  - lint clean; typecheck 0; `npm test` 289/289; no browser errors;
  - stills of every stage: `docs/screenshots/inferno-fx-sheet-1.png` and `inferno-fx-sheet-2.png`.
- **Limitation:** the reference image of Inferno did not come through, so the look was designed from his in-game appearance.

### 12/11/2026: Single-pane door, fire that looks like fire, burn-away death (owner)
- **Door:** the glass leaf is still three pieces for depth sorting, but each piece now draws only its share of the pane's outer faces and edges, so it reads as one door.
- **Fire:** the root cause was Pixi cutting curves and circles by their size in drawing units, and the world is drawn in metres:
  - 5 cm embers had 4 corners (diamonds);
  - flame tongues were subdivided only to within 0.5 m, so they came out as triangles and boxes.
- **Fire fix:**
  - `src/rendering/metre-scale-curves.ts` sets curve smoothness to about 1 cm and cuts circles, ellipses and rounded corners as if they were 60× larger;
  - flame tongues are now layered teardrops;
  - embers are small glowing sparks that cool from white to red;
  - smoke is thinner, and body fires are wider and shorter.
- **Death by fire:** its own ending instead of the usual dust fade. A burning edge moves up the charred body (a mask on the figure), with flames on the edge and only embers, ash and smoke. There is no transparency fade and no grey dust.
- **Evidence:**
  - lint clean; typecheck 0; `npm test` 289/289; `npm run e2e` 30 passed;
  - one dodge test failed once while the full suite ran in parallel, then passed 18 of 18 when repeated.
- **Performance:** in the headless software renderer, a Fire Beam in the office went from 7 to 6 fps. Software rendering is far slower than a GPU, so check on a real device (OQ-10).
- **Screenshots:** `docs/screenshots/doorway-single-pane.png`, `fire-shapes.png`, `death-by-fire-burn-away.png`.

### 12/11/2026: Silent in the background; 1 s Fire Beam charge (owner)
- **Background audio:** when the game's tab is hidden (or the page is left), `pauseAudioWhenHidden` (`src/audio/pause-when-hidden.ts`) suspends the shared audio context at once, so music and effects stop. It resumes only what it paused when the tab is shown again, and the music carries on from the same spot.
- **Fire Beam:** the charge is now 1 s (was 2 s), and its charge sound is shortened to match.
- **Evidence:**
  - lint clean; typecheck 0; `npm test` 291/291, including two new tests for the background pause;
  - in Chromium the audio context went from running to suspended when hidden, and back to running when shown.

### 12/11/2026: Ambience instead of music (owner)
- **Soundscapes:**
  - the office is an empty office after hours;
  - the training yard is a Colosseum tournament crowd that reacts to big hits and KOs;
  - the menu is the crowd, muffled, heard from the tunnel.
- **No music:** the sequencer and tracks are removed (TD-051, REQ-AUD-1, SUP-15). The settings slider is now "Ambience volume".
- **Evidence:**
  - lint clean; typecheck 0; `npm test` 292/292 (ambience data tests: no crowd in the office, a full crowd in the Colosseum, reactions, irregular timing);
  - offline renders measured and attached as `docs/audio-previews/*.mp3`.
- **Limitation:** the sounds were checked by measurement, not by ear.

### 12/11/2026: Phase 8 slice 1: presentation targets complete for Inferno
- **New presentation features:**
  - **Combo and MISS callouts (PRS-4):** "N HIT COMBO" for chained hits; MISS for a swing that reaches nobody while an opponent is close.
  - **Shield (PRS-5):** shown while guarding, flaring on a block.
  - **Status (PRS-6):** stars over a stunned head, and status chips on the HUD.
  - **Ultimate showcase (PRS-8):** a flash with speed lines when an ultimate lands.
  - **Top HUD (PRS-10):** portraits, health and stamina for both sides, a match clock and the last action used.
- **Layout:** the controls hint moved under the HUD, and is hidden on touch screens unless it shows an error.
- **QA record:** `docs/qa/PHASE8_INFERNO_QA.md` (self-review; an independent QA review is recommended).
- **Tests:** a presentation integration suite (combo, MISS, HUD, showcase, shield, stun) and a complete-animation-set test for the kit.
- **Evidence:** lint clean; typecheck 0; `npm test` 297/297; `npm run e2e` 31 passed; `docs/screenshots/phase8-top-hud.png`.
- **Next task:** an independent QA review of Phase 8 (`qa-specialist`, if the owner agrees), then Phase 9 (the full initial roster).

### 12/11/2026: Rampage, main menu, Leave game, phone layout (owner)
- **Rampage** (REQ-ABL-14, TD-052), the second fighter. Fighters are now added one at a time; Necro comes next, once you have reviewed Rampage.
  - **Look:** a rhino head and an armoured body.
  - **Movement:** slow (3.9 m/s top speed, low acceleration).
  - **Combo:** three punches ending in a knockdown.
  - **Abilities:** Ground Smash, Rhino Charge (smashes breakable walls and furniture, keeps its line), Crushing Strike (stun), and Rampage Mode (8 s, +15% speed, 15% less damage taken, rage aura). Heavy Throw is his grab: furniture up to 60 kg, ×1.8 throw power.
  - **Sounds:** new grunts, snort, stampede, ground smash, crushing impact, roar, heavy steps and landing.
- **Menu and Settings:** a main menu with fighter and arena; Settings has Leave game and Fullscreen.
- **Phones:** fullscreen on the first tap, and a compact HUD and touch cluster for short landscape screens (REQ-CTL-19).
- **Tests:** a Rampage integration suite (speed, 3-hit combo, smash, stun, wall-smashing charge, heavy throw, buff) and a menu e2e test.
- **Evidence:**
  - lint clean; typecheck 0; `npm test` 304/304; `npm run e2e` 33 passed;
  - screenshots `docs/screenshots/rampage-abilities.png`, `main-menu.png`, `mobile-landscape-hud.png` (emulated 800×360 landscape phone).
- **Limitations:** fullscreen cannot be tested headless, so check it on your phone. The menu reloads the page to switch fighter.

### 12/11/2026: Real fighter portraits; Rampage's look raised to Inferno's level; CI lint fix (owner)
- **Portraits** (`src/rendering/portraits.ts`): each fighter is drawn by the game's own renderer, framed on its head, and used in the menu cards and the top HUD (the CSS icons were only placeholders).
- **Rampage's look:**
  - shaded, muscular limbs;
  - bronze bracers, knee guards, pauldron and chest strap;
  - red fist wraps and sash;
  - a sculpted rhino head with an ivory horn and a glowing amber eye;
  - a warmer hide, and dust puffs at his footsteps (effect `dust-steps`).
- **Ability bar:** wider slots, so long ability names wrap instead of being cut.
- **CI:** the CI lint failed on a duplicate `height` in `index.html`; it is now an `@supports` rule. Run `npm run lint` (the whole repository) before pushing, not just `src` and `tests`.
- **Evidence:** `npm run lint` clean (1 info, in an old mockup); typecheck 0; `npm test` 304/304; `npm run e2e` 33 passed; `docs/screenshots/portraits-and-rampage-look.png`.

### 12/11/2026: Ability pictures and button text that always fits (owner requests)
- **Ability icons:** the ability bar and the touch ability buttons show a picture per ability instead of its name ("change the text to ability images so it can fit the buttons"). The name stays as the tooltip and screen-reader label.
  - The icons are original inline SVGs in `src/interface/ability-icons.ts`: Fireball, Flame Dash, Fire Beam, Eruption, Ground Smash, Rhino Charge, Crushing Strike and Rampage Mode.
  - Each ability names its icon in its data (`AbilityDef.icon`); if an icon is missing, the label shows instead.
  - Each copy gets its own gradient ids, so a hidden copy cannot break the visible one.
  - When the ultimate is full, its touch button shows a small READY.
- **Button text fit** ("text must not be outside of the button"):
  - On a sideways phone, DODGE and THROW spilled past the edge of their 52 px buttons.
  - Touch buttons are now centred, with no padding and a single line, and the compact layout uses 10 px text.
  - The new `tests/e2e/button-fit.spec.ts` checks that every visible button's text fits inside its box, for both fighters, on desktop, a portrait phone and a sideways phone. The longest utility label is THROW.
  - The test failed before the fix ("THROW 46.3px in 46.0px") and passes after it.
- **Evidence:** `npm run lint` clean (1 info, in an old mockup); typecheck 0; `npm test` 304/304; full e2e 38 passed.
  - `phase4` (the door) failed once in the full run. It passed when run alone, both with and without this change (3/3 and 9/9), so it is timing under load and unrelated to this change.

### 12/11/2026: Rampage Buffer redesign, size, lift time, quicker charge, steerable Fire Beam (owner requests)
- **Rampage Buffer:** now a heavily muscular grey human stickman, drawn twice Inferno's size (`rig.scale` 2) in the same line style as Inferno.
  - He has a much broader chest, massive shoulders, thick arms, powerful legs and defined pecs, abs, biceps and quads.
  - His head is round with narrow glowing red eyes under a scowling brow. The rhino head, horns and bronze gear are gone, and the display name is "Rampage Buffer".
  - Wider body (foot radius 0.55 m) and longer reach (+0.35 m).
  - The new icons are grey.
- **Rampage Charge** (renamed from Rhino Charge):
  - Wind-up: 0.5 s standing on two legs. He leans in with his shoulders lowered and arms pulled back, trembling while dust gathers.
  - Charge: an 11 m run on two legs at 15 m/s, shoulder first, with a dust trail.
  - Stop: he stops dead in the first fighter he hits, or in a solid wall, with a big collision burst and screen shake, then a follow-through pose. Breakable walls, doors and furniture are still smashed through.
- **Lifting:** heavier objects take longer to heave up: about 0.3 s for a chair, 0.85 s for a desk and 1.25 s at 60 kg. You are rooted while lifting and cannot throw until the object is overhead.
- **Fire Beam:** while it pours, it follows the mouse on desktop, or a swipe on the empty right side of the screen on touch, turning at up to 3.5 rad/s. Inferno stays rooted.
- **Fix:** an arc that started without `moveTo` drew a stray line across the figure. Each arc now starts at its own point.
- **Tests:**
  - New: size and bulk; the charge stops in the target with a large burst; the charge stops at a solid wall; lift time and rooting; beam steering (unit); swipe tracking (unit).
  - The throw tests now wait out the lift, because throwing during the lift is no longer allowed.
- **Evidence:** typecheck 0; `npm test` 311/311; `npm run lint` clean (1 info, in an old mockup); browser screenshots of the redesign, the wind-up, the two-legged run, the impact, and the steered beam.

### 12/11/2026: Rampage Buffer smaller and in pants; admin opponent picker (owner requests)
- **Rampage Buffer:**
  - Drawn 1.6× Inferno's size (was 2×).
  - Bodybuilder V-taper: a tighter waist and a wider chest.
  - Dark fighting pants (`rig.pants`, data) with folds and bare feet.
- **Admin editor:** an **Opponent** selector next to "Try in game" opens the draft against any built-in character (`?opponent=`). It exists only in the admin preview; the public menu still pairs you with the training dummy.
- **Evidence:** typecheck 0; `npm test` passes; screenshots checked in the browser.

### 12/11/2026: Rampage Buffer leaner, real-looking muscles, heavyweight movement (owner requests)
- **Leaner** ("it looks fat"): limbs at 0.115 m (were 0.13), and every muscle mass about 15% slimmer.
- **Muscles** ("the abs look like they're drawn and not real"): the abs and pecs are now soft light on each bulge and soft shadow in the grooves, with no hard lines.
- **Black spot removed:** it was the belt, a zero-length round-capped stroke in the outline colour. The pants' edge now marks the waist.
- **Heavyweight movement** (`proc.idle.heavyweight`, chosen by Rampage's Animation Profile):
  - Idle: a wide, planted stance leaning forward, with no bounce, only a slow breath.
  - Walk: low, steady hips; the chest forward; shorter deliberate steps with low feet that plant hard (the hips sink at each heel strike); the weight shifting with each step; clenched fists swinging firmly opposite the legs.
  - Run and sprint: grounded with little flight, lower knees, a hard lean and a compact pump. The charge uses the same sprint, so idle, walk, run and charge blend smoothly.
- **Code:** `idleStyleFor` replaces the copy in the fighter and the admin preview.
- **Tests:** `tests/unit/animation/heavyweight-motion.test.ts` (5).
- **Evidence:** `npm test` 316/316; e2e 39 passed; lint clean (1 info, in an old mockup); browser screenshots of the idle and walk.
- **Known limitation:** real-device checks (swipe steering, heavyweight gait on a phone) are still manual.

### 12/11/2026: Rampage Buffer resized to just a bit taller than Inferno (owner request)
- `rig.scale` is now 1.1 (was 1.6), with a body radius of 0.38 m (was 0.55; Inferno's is 0.32). His reach is 0.1 m over his original moves (was +0.35), and Rampage Charge's hit radius is 0.85 m.
- **Evidence:** `npm test` 316/316; a phone-landscape screenshot of him next to Inferno.

### 12/11/2026: back-dodge, Rampage walk, Inferno wall breaking, mobile beam aiming, Colosseum ambience, styled characters (owner requests)
- **Dodge:** always straight back from the facing, whatever the movement input. The facing is kept, and the speed falls over the dodge, so every dodge covers about 2.4 m (REQ-CTL-20, SUP-17).
- **Rampage walk:** straighter legs. The hips ride near full leg length, so the planted leg is nearly straight and the swing leg peaks around 40°. Steps are grounded and smooth.
- **Inferno and walls:**
  - `objects.wallBreakPower` (stats data) is 3 for Inferno, applied to melee and abilities.
  - Damage accumulates on exactly the section struck. Each chip redraws that section's damage (`src/rendering/wall-damage.ts`): spreading, branching cracks; spalls past 40%; a caved cavity with brick past 75%; soot and glowing cracks from fire hits. More dust, chips and embers as it weakens.
- **Mobile Fire Beam:** while the beam pours, the joystick aims it (it turns orange and reads AIM). Movement returns when the beam ends.
- **Colosseum ambience:** redesigned from the new brief, not modelled on the audio supplied earlier.
  - Sound: a murmuring crowd with slow, irregular swells; distant cheers; nervous murmur rises; applause; whistles; gasps; near cheers; rare roars; a 5.5 s stone reverb plus slapback echoes (`AmbienceDef.echo`).
  - Preview: re-rendered offline as `docs/audio-previews/colosseum.mp3`, holding a steady level around -16 dB.
- **Styled characters (after the owner's reference art):**
  - Shapes: tapered limbs (thick at the shoulder and thigh, slim at the wrist and ankle) and V-shaped torsos.
  - Shading: cel shading with a lit band toward the light, a shadow band and a pale rim on the torso.
  - Edges and faces: edges in a deep shade of each body's colour instead of black ink; angular eyes (white-hot slits on Inferno, dark slits on the Dummy).
  - Limbs are slightly thicker on Inferno, the Dummy and the Base Stickman. Heights, scale (Rampage is still 1.1× Inferno), abilities, animations and controls are unchanged.
- **Fix:** the CSS order of the joystick aim style and a `forEach` that returned a value failed the whole-repo lint.
- **Evidence:** `npm test` 321/321; e2e 39 passed; lint clean (1 info, in an old mockup); browser screenshots of each change.

### 12/11/2026: eyes removed, Braxon, Necro (third fighter) with summons, Necro design pass (owner requests)
- **No eyes** on any stickman (SUP-18). Rampage Buffer is renamed **Braxon**.
- **Necro** (REQ-ABL-15, TD-054):
  - Kit: Soul Drain (heals), Death Eruption (bone spikes and hands, trap), Undead Army (3 skeletons, 10 s, capped at 4) and Death's Dominion (8 s, ×1.5 ability damage, 2 more skeletons). Zombie Summon was dropped by the owner's choice.
  - Teams and summons are built on the shared combat engine.
- **Design pass:** a straight mage idle with the bone staff planted in his left hand, a skull on the staff whose eyes glow purple during magic, a levitating summon with the free arm raised, subtle purple energy, a peaked hood and a robe to the ankles.
- **Fix:** a crumbled summon stayed in the depth-sort layer and crashed rendering. It now leaves the layer first.
- **Tests:** `necro.test.ts` (6) and `necro-motion.test.ts` (2). The menu e2e now expects three fighters.
- **Evidence:** `npm test` 329/329; e2e 39 passed; lint clean (1 info, in an old mockup); browser screenshots (slow motion for the summon wind-up).
- **Known limits:**
  - The opponent AI does not cast abilities, so Necro as an admin-chosen opponent only uses melee.
  - Summon numbers are provisional (OQ-05).

### 12/11/2026: Clean restyle of Necro's staff and the skeletons; style QA checklist (owner request)
- **New standard:** `docs/design/CHARACTER_STYLE_QA.md` (S1–S10) sets out the style of the owner's reference art. Every character change must pass it, using screenshots at gameplay zoom, 3× zoom and in slow motion, in every pose and facing, before it is called done.
- **Skeletons:**
  - Bones: clean tapered bones with rounded joints and two-tone shading, and a single ribcage shape with two rib gaps and a rounded pelvis.
  - Skull: one cranium-and-jaw silhouette with a single mouth line (no eye sockets).
  - Blades: dark violet obsidian with a pale edge, so they read against the bones.
- **Necro's staff:** one smooth tapered bone shaft with two violet grip wraps, topped by a clean skull in two curved prongs, its sockets glowing while he casts. The knobs and teeth are gone.
- **Magic:** all of Necro's magic is in the violet soul palette.
  - The summoning casts have no busy charge streaks.
  - Death's Dominion uses a quiet aura (a floor ring only, new `MagicLook.aura`), because his own glow and circling motes show the power.
- **QA run (this change):** S1–S10 pass in the idle (both facings), the walk, Undead Army and Death's Dominion (slow motion), Death Eruption, and with skeletons at 1× in the office.
  - Earlier failures found by this QA and fixed: pale stripes on the robe hem from the bone-white charge effect; flame spikes at his feet from the fury aura; blades that blended into the bones; a ribcage too thin to read.
- **Evidence:** `npm test` 329/329; e2e 39 passed; lint clean (1 info, in an old mockup).

## Decisions requiring owner attention



Full list in spec §21. Still open:

1. **OQ-10:** performance targets and minimum devices. Needed before Phase 1 ends; I can propose defaults if you prefer.
2. **OQ-04, OQ-05:** ultimate rule; stat, stamina and cooldown baselines (Phase 5–6). I can propose balanced defaults for approval.
3. **OQ-06, OQ-07, OQ-08, OQ-09:** match rules, 3v3/ladder/story details, economy numbers, real-money purchases (Phase 13–14).
4. **OQ-12:** sand in the office? **OQ-16:** 2D stickman art direction (TD-022 proposes code-drawn vector stick figures with 2D bone animation). **OQ-17:** audio source (original sound effects in the Stickman Kombat 2D style).
5. **TD-017:** game hosting is GitHub Pages (decided). To publish, enable Pages in the repository settings and run the deploy workflow (or ask me to). Pages is free only for **public** repositories. The Supabase data backend needs approval by Phase 14.

## Known issues
- **Flaky e2e under heavy load (older than 12/11/2026's changes):** `phase7.spec.ts` ("G picks up the chair, G throws it") can fail when the software-rendered browser freezes for seconds. This happened on CI for ced57b2 and 279c1b3. Running it 12 times with 4 parallel workers failed 4/12 on both a611e01 (before today's changes) and HEAD. CI passed on e9ad821, d220067 and bb40f63. Next step: profile the office scene's frame time under software WebGL; do not loosen the test.
- None open in code. Stats are provisional (OQ-05).
- Documentation limitation: numeric gameplay and economy values are absent from the source material (spec §21).

## Outstanding tasks (next)
1. Check GitHub CI and the Pages redeploy for this push.
2. Owner playtest of Phase 5 and approval or changes to the provisional stats (OQ-05, TD-030).
3. **Phase 6:** shared ability framework, three abilities and an ultimate for the greybox fighter, stamina costs and cooldowns (needs OQ-04).
3. Owner: OQ-10 (performance targets), OQ-16 (art direction), when convenient.

### 18/11/2026 Phase 1 Batch B: B11 movement stability
Coyote time and sprint momentum in jumps (TD-084). Gate: lint no errors (1 warning, 1 info baseline), typecheck clean, 613 tests pass. Next: B13 fifth ability per fighter and four-of-five loadout.

### 18/11/2026 Phase 1 Batch B: B13 fifth abilities and loadout (engine side)
Fifth ability per fighter, `applyLoadout`, fight option `loadouts`, AI tactics for the fifth (TD-085). Gate: lint no errors, typecheck clean, 633 tests pass. Not done in B13: the player-facing loadout screen and saving the choice (B14). Next: B14 ability information and loadout screen.

### 18/11/2026 Phase 1 Batch B: B14 loadout screen
Loadout store, sheet with the alternative, Equip/Swap and drag and drop, carried into the fight (TD-086). Gate: lint no errors, typecheck clean, 641 unit/integration tests, front-end e2e passes on desktop and phone. Open: HUD cast-name notice and info control. Next: B15 Shroud five-hit combo, then B16 dodge, B17 fight length, B18 audio.

### 18/11/2026 Phase 1 Batch B: B15 Shroud five-hit combo
TD-087. Next: B16 dodge responsiveness.

### 18/11/2026 Phase 1 Batch B: B16 dodge responsiveness
Input buffer added (TD-088); the other dodge rules reviewed unchanged. Next: B17 fight length baseline and tuning, then B18 audio.

### 18/11/2026 Phase 1 Batch B: B17 longer fights
Baseline recorded and tuned (TD-089): median +30%, mean +28%. Next: B18 unique audio (synthesised; Pixabay unreachable), then hand Phase 1 over for owner review.

### 18/11/2026 Phase 1 Batch B: B18 unique audio (end of Batch B)
Per-move and per-ability sounds, synthesised (TD-090). All of B1 to B18 done; remaining Phase 1 items are owner checks, the HUD info control and cast-name notice, premium icons (#51) and CI and preview redeploy. Next: full gate, CI check, redeploy, Phase 1 hand-off for owner review. No Phase 2 without approval.

### 18/11/2026 CI fix
CI browser jobs were red since B10 (read on 18/11/2026). Fixed Eruption's aimed leap on a normal slot and three stale browser tests (TD-091). Lesson: run the affected Playwright specs locally before pushing, not only unit tests.

### 18/11/2026 Owner feedback batch (loadout swap, details board, ability balance)
Done: swap any ability (TD-092), details only on a closable board, one balance pass (TD-093), CI browser fixes (TD-091, deadlines). Open: Necro's Soul Drain dominates his kit (owner decision on blind or lifesteal), Pages deploy blocked by a repo setting (owner must enable Pages with source GitHub Actions), HUD cast-name notice and info control, premium icons (#51). Phase 1 awaits owner review; no Phase 2 without approval.

### 18/11/2026 Phase 2 started (owner approved; no further balancing)
P2-1 done: house data, two-floor world, stairs, doors, routing, rules, player movement, the isometric house view, the mode page and the Game Modes entry (TD-095, TD-096). Next: P2-2 room visibility, lighting and peeking.

### 18/11/2026 Phase 2 P2-4 (hunter) and the roomier house
Done: perception and hunter brain with search memory (TD-099), hunter figure and vision cone in the scene; owner feedback applied: house scaled 1.45 times, palette toward the reference, only the current room visible (TD-100). Tests: 71 hide-seek unit tests (hunter 14, house-scale 5). Known limits: no windows or reference-level art yet; hunter balance untested by a human; CI full run not yet read for the latest pushes. Next: P2-5 (Game Over and Victory screens with Restart and Menu, kill animation, restart resetting visibility, horror audio and positional footsteps, e2e for a full round), then owner review of Phase 2.

### 18/11/2026 Phase 2 P2-5 (flow, result screens, kill animation, audio)
Done: Game Over and Victory screens with Restart and Return to Menu, the one-time kill animation (collapse and red flash), restart resetting everything, procedural horror audio with positional sound and heartbeat (TD-101), checklist items 14 to 17 ticked. Tests: 97 hide-seek and audio unit tests, 12 hide-seek browser tests (desktop and phone). Known limits: sounds not auditioned by a human; the supplied ambience file unwired pending licence; the hunter is untuned by play; no windows or reference-level art. Phase 2 is ready for the owner's consolidated review; Phase 3 waits for approval.

### 18/11/2026 Nightmare House art pass (TD-102)
Done: modelled and aged furniture (office style), aged walls and floors with horror dressing, dark cold lighting with falloff and flickering lamps, a vignette, stronger wall fading (walls, doors and tall furniture; player always clear), floating HIDE bubbles, and a fix for the wall classification after the house scale. Tests: 89 hide-seek and rendering unit tests, 14 browser tests. Known limits: no owner judgement of the look yet; windows only implied; lighting is a tint per object, not true shadows.

### 18/11/2026 House follow-up (TD-102)
Done: armchairs and sofa closer to the table, a better-made bed (blanket under the pillows), textured doors with frames and lintels, 27 hiding places (5 added), furniture fade limited to tall pieces. Tests: 99 hide-seek and rendering unit tests.

### 18/11/2026 Bigger house, doors, four-legged beds (TD-102)
Done: rooms scaled 1.9 with furniture at its natural size, doors two thirds as wide, about 40 more pieces and nine more hiding places (36), beds on four legs with clearance and a fully hidden player. Known limits: the stairs are now wide (scaled with the rooms); the hunter was sped up and not human-tested.

### 18/11/2026 Hunter search animations (TD-103)
Done: ten keyframed search actions, doors/lids/curtains/bushes that react, thorough-versus-glance checking driven by suspicion, listening and knife-scrape beats, rechecks, positional noises, the strike at the catch; fixed the long-furniture depth order against the hunter. Known limits: wardrobe doors whose front faces away from the camera cannot show opening; the hunter's difficulty is untested by a person.

### 18/11/2026 House made smaller (TD-105)
Done: `HOUSE_SCALE` 1.9 to 1.6. Tests: 599 unit tests pass.

### 18/11/2026 Fewer rooms and hiding places (TD-106)
Done: storage room and landing nook removed (walled solid), their doorway and furniture removed, the can moved, hiding places 36 to 32, rooms 19 to 17. Tests: 599 unit tests pass.

### 18/11/2026 Indoors only, thinner stairs (TD-107)
Done: the player cannot leave the house, outdoor hiding places and throwables removed, the hunter skips the yards, narrower and steeper stairs. Tests: 601 unit tests pass.

### 18/11/2026 Stairs against the wall, tighter hall (TD-108)
Done: hall 5 to 4 m wide, stairs along the east wall and clear of all doors, furniture rearranged, new stair and hall tests. Tests: 604 unit tests pass.


### 18/11/2026 Hiding view and peek risk (TD-109)
Done: blind view while hidden, a small dim peek circle, 3x detection while peeking from a hiding place; 5 new tests.

### 18/11/2026 Compact house, smooth stairs, Shroud's memory, settings and fullscreen (TD-110)
- **Changed.** `src/data/arenas/house.ts` (compact plan, `HOUSE_SCALE` 1.35, locked front door, indoor starts, upstairs patrol), `house-types.ts`/`world.ts`/`game.ts` (locked doors, floor change in place, nav shortcuts need a body's width), `ai/nav-grid.ts` (`lineOk`), `hunter.ts` (22 s memory), `rendering/house-view.ts` (tread sort, `wallFades`), `app/scenes/hide-seek-scene.ts` (figure over both floors while climbing, no fading of stair barrier), `app/hide-seek-page.ts` (settings gear, fullscreen, pause), `input/settings-store.ts` (`browserStorage`), new `modes/hide-seek/house-validate.ts`.
- **Tests.** New: `house-validate.test.ts`, `stair-barrier.test.ts`, AI knowledge tests, stairs continuity, snag regression, e2e for the gear, fit and locked door. Old layout tests were moved to the new coordinates (not loosened: the hiding-place minimum is now 15 and the furniture minimum 60 because the owner asked for a much smaller house).
- **Commands.** `npx biome check --write .`, `npm run lint` (baseline: 1 warning, 1 info), `npm run typecheck`, `npx vitest run`, `npm run build`, `npx playwright test tests/e2e/hide-seek.spec.ts --trace off`.
- **Known issues.** See TD-110 (diagonal screen "up" vs the stairs' foot). Phone check by the owner pending.
- **Next.** Owner reviews the compact house on the phone; Phase 2 review; no Phase 3 without approval.
- **Follow-up (same day).** Fixed the floating dining table (long-piece draw key only moves as far as a person needs) and the floating wall at the head of the stairs (landing block collision only; hall back wall behind the flight drawn as a low ledge). Browser screenshots checked at the start, mid-climb and the top.
- **Leave fix.** Leave in the Hide and Seek Settings panel now opens the main menu's title (`?home`, as the fights do) instead of starting a practice fight. e2e test added.

### 19/11/2026 The execution, automatic peek view, Phase 3 order (TD-111, TD-112)
- **Changed.** New `modes/hide-seek/kill-sequence.ts`, `rendering/kill-effects.ts`; `game.ts` (execution, automatic view, no lean while hiding), `rules.ts` (kill length), `perception.ts` (peek giveaway removed), `visibility.ts`, `hunter`-side tests, scene, HUD, page, audio (`killEvent`).
- **Tests.** New kill-sequence, kill-game, e2e; stealth tests rewritten for the new view rule. Full gate run before commit.
- **Known issues.** Pacing and sounds not yet judged by the owner. The cause of the earlier fighter-outside-the-map report is still unknown (guard in place).
- **Next.** Owner names the four fighters for the new Phase 3 order; Phase 2 review first.


## 20/11/2026: Vexoris karate taps and jar-smash heavy
Done: separate tap karate and heavy jar smash (see TD-120 addendum). Gate: biome (fixed an old forEach lint error), typecheck, full vitest 952 + 3 new passing. Next: Vexoris ability rework (landmine Chemical Trap, thrown-jar Toxic Jar, 10 s fog ultimate).

## 20/11/2026: Vexoris abilities rework (TD-121)
Done: landmine Chemical Trap, thrown-jar Toxic Jar, 10 s poison-fog Plague Bloom with enemy haze and Vexoris green sight. Gate: biome, typecheck, vitest 964 passed. Screenshots checked: jar throw and shatter, planted mine, fog bank, Vexoris green view, forced haze overlay. Next: deploy, owner review, then Arcstrike.

## 21/11/2026: Vexoris Grenade, Vapour Step, fog sight 1.2 m (TD-122)
Gate: biome, typecheck, vitest. Screenshots checked: grenade arc, stick, explosion; Vapour Step mist. Next: deploy, owner review, then Arcstrike.

## 21/11/2026: Aerion (TD-123)
Done: Aerion playable (winged skin, hover, combo, heavy, passive, five abilities, ultimate, AI, stance, icons, sounds). Gate: biome, typecheck, vitest 987, menu and front-end e2e 18 passed. Next: deploy, owner review, then Arcstrike.

## 21/11/2026: Kenshiro (TD-124)
Done: Kenshiro playable (samurai skin, two katana, combo, overhead heavy, Sword Mastery, Perfect Parry, Twin Fang, Blade Tempest, Focus Stance, Iaido Draw, Final Judgement). Gate: biome, typecheck, vitest 1009, menu and front-end e2e 18 passed. Next: deploy, owner review, then Psion, Geargrind, Reson, Chronos.

## 21/11/2026: Aerion rework (TD-125)
Done: Sky Dive flight arc, Tornado Surge, spinning Wind Blade, description wording rule and test. Gate: biome, typecheck, vitest. Next: deploy, owner review, then Psion, Geargrind, Reson, Chronos.

## 21/11/2026: Kenshiro single katana and combo, unique idles and attacks (TD-126)
Done: one two-handed katana, samurai idle/walk/run, new three slashes plus downward finisher, thrust/aerial/plunge, new idle styles for Kenshiro/Vexoris/Aerion/Inferno, unique clips for all, uniqueness test. Gate: biome, typecheck, vitest 1054, menu and front-end e2e 18 passed. Next: deploy, owner review, then Psion.

## 21/11/2026: Portraits, picker, Kenshiro rework (TD-127)
Done: batched portrait read-back, four-per-row scrollable picker, Kenshiro slash-only tap, Sliding Slice, charging Iaido. Gate: biome, typecheck, vitest 1058, front-end and menu e2e. Next: deploy, owner review, then Psion.

## 21/11/2026: Select layout and Kenshiro slow strikes (TD-128)
Done: stickman/picker layout, larger stance frames, three-slash slower heavier tap, slow overhead heavy. Gate: biome, typecheck, vitest 1058, front-end and menu e2e. Next: deploy, owner review, then Psion.

## 21/11/2026: Prismor, stance guard pass, Sonic Boom
Done: Prismor fighter (TD-137); guard stances and Kenshiro grip, Sonic Boom from the mouth (TD-138). Tests: typecheck clean, vitest 1187 passed. Limits: Sovereign sword is a visual (disclosed); Prismor weapons verified by unit tests and only partly in the browser; in-game idle poses for Aerion/Reson/Chronos not changed beyond the select screen. Next: Arcstrike, then Frostweld, Solstice, Tidebreaker, Quakor; Colosseum after all.

## 21/11/2026: offline play (TD-139)
Service worker emitted by the build, registered in production only. Verified in headless Chromium with the server stopped and the page offline (reload reaches the fight screen). Not yet checked on a phone: install or open once online, then try flight mode.

## 22/11/2026: Prismor rework (TD-141)
Crystal Arsenal with five weapon movesets, Crystal Slide, Shard Volley, Crystal Prison, Crystal Groundstrike, plain unarmed taps, new Sovereign armour. Crystal Breakout dropped (owner choice, five abilities rule). Tests: typecheck clean, vitest 1209 passed, new `tests/unit/abilities/prismor.test.ts` covers the verification list; browser checks of each weapon, the slide, volley, prison, groundstrike and the ultimate. Limits: see TD-141. Next: Arcstrike.

## 22/11/2026: contact moves, buffed taps, Crystal Fists (TD-142)
Prismor taps and heavy need body contact (fist-end test and fist-only environment checks); taps buffed to 16/18/20; Crystal Arsenal is now 8 s Crystal Fists (heavy punches, hits don't end them). Removed the five-weapon table and Crystal Guard from Arsenal. Tests: typecheck clean, vitest 1208 passed, production build OK. Browser: fists visible at 3, 6, 9 s and gone by 12 s. Contact hit-rule covered by unit tests; the scene-level "hit does not end fists" is code-verified, not played through. Next: commit, then deploy when asked.

## 22/11/2026: thorns shortened
Crystal Slide thorn spikes drawn at half their former height (`crystal-thorns` h 1.2 → 0.6 m). Hit area unchanged. Typecheck clean, vitest 1208 passed, production build OK.

## 22/11/2026: volley damage up, thorns faster
Shard Volley per-shard damage 8 → 14. Crystal Slide thorns warn 0.45 s → 0.12 s, so they erupt right as the slide stops. Tests: typecheck clean, vitest 1208 passed, build OK.

## 24/11/2026: Batch 0 stabilise (R0.1, R0.2, N1)
Done: tree repaired and compiling. Crystal Monster path removed; Prismor ultimate stays Crystal Sovereign (armour absorbs blows until it breaks; owner 24/11). Shard Blade kept as the Arsenal replacement (moveset rework in Batch 2). Crystal Prison host methods (`trap`, `legTrapState`, `standable`) restored in `SceneAbilities`; new real-scene test `tests/integration/scenes/crystal-prison.test.ts` so a fake host cannot hide the regression again. Necro: 4 skeletons, Soul Drain 0.15 (actual-damage basis comes in Batch 1); necro test now expects 3 survivors after one dies. `depenetrate` runs up to three more passes only while more than 2 cm is left (a fighter squeezed between a fixed prop and shoving bodies, found by furniture-collision necro vs shroud with four skeletons); plain six passes shifted statistical balance tests, so the extra passes are conditional. Created `UI_REFERENCE_GUIDE.md`; `CLAUDE.md` gained the batch, traceability and pixel-art rules.
Known: premium model does not yet draw the Shard Blade swords or finale/hammer forms (Batch 2). Non-Prismor characters log "animation fallback" warnings for the Blade* states (Batch 2 to resolve). Push needs the owner to reconnect GitHub (403 earlier). Next: Batch 1 (combat correctness: HD, HL, N2, C1).

## 24/11/2026: Batch 1 combat correctness (HD, HL, N2, C1; TD-151)
Done: universal contact melee, swept thrown-prop hits, AI closes to the real touch reach, `Combatant.heal` single gate + no bench regen, Soul Drain 15 % of actual removal, Clash banner names the winner. Tests: typecheck clean, vitest 1217 passed, build OK. Re-spaced tests (office-door, presentation, props, necro decay) because they encoded the old over-generous reach; ai-furniture now accepts any of three seeded matchups (one chaotic fight ended before the Titan reached a chair). Not done: browser check of punching at a gap; ability-delivery radii left as volumes. Auto-deploy on push is now on (workflow + CLAUDE.md). Next: Batch 2 (ability updates).

## 24/11/2026: Crystal Prison v2 (PR5)
Done: hold 6 s, activation window 0.4 s, grounded targets only (real height > 0.25 m at the window or at the lock misses; cosmetic hover counts as grounded, D3; the flier-dragged-down rule is gone from the world), two leg formations with holes drawn per leg, new description. Tests: prismor unit tests updated, real-scene test, typecheck clean. Browser: formations visible. Not checked: the shatter at the end in the browser, phone feel.

## 24/11/2026: Psion Toss and Slam (PS1-PS3, TD-152)
Done: Telekinetic Toss (E) and Psychic Slam (F) replace Throw and Barrier; refusals, HUD text, AI brain, icons, poses, tests. Tests: typecheck clean, vitest 1219 passed. Browser: filing cabinet lifted, slam knocked the dummy down. Not done: bespoke VFX (reuses Psion's palette effects), sounds reuse existing psi sounds.

## 24/11/2026: Batch 2 remainder (RS1, IF1, VX1-3, CH1/CH2, PR4)
Done: Sonic Boom 4.5 m wide, 8.5 m, steerable, no pin; Fire Beam falloff full within 1 m to 35 % at the tip; Toxic Jar splashes on the floor at range end, 3 stacks (jar and trap), toxicity cap 40 with +4 % tick damage per extra stack (max x2.5), Plague Bloom chip damage ramps +15 %/s up to x3 and resets after 1 s outside; Time Stop held blows stack +12 % each up to x2; Chronos AI casts Time Stop in melee reach. Tests: typecheck clean, unit and fire-beam tests green; last full suite had 1 failure (fire-beam damage threshold), fixed by a 35 % falloff floor. Not browser-checked: Sonic Boom steering, jar splash, fog ramp, Time Stop stacking.

## 24/11/2026: Batch 3 natural walks (W1)
Done: crystal (Prismor), temporal (Chronos), sonic (Reson), mechanic (Geargrind) walks now hold fists within reach so the elbows bend 25-105 degrees and swing against the legs; Aerion/Psion hover drift gets bent, gently moving elbows. New `tests/unit/animation/natural-walk.test.ts` guards elbow bends and that the original four (pyro, heavyweight, mage, stalker) are numerically unchanged. Browser: Prismor and Geargrind walking show bent elbows. Not checked: Chronos/Reson/Kenshiro walks on screen, phone.

## 24/11/2026: ability uniqueness audit (TD-153)
Redesigned Gravity Well (Psion), Dissonance and line-shaped Shatterwave (Reson), standing quick-draw Iaido (Kenshiro). Tests updated; typecheck clean; full suite green before the last damage tweak, unit tests green after. Browser: Shatterwave's line of fractures ran away from Reson and hit the dummy (multiple zones can overlap one target; zone damage set to 45). Not checked in the browser: Gravity Well, Dissonance wobble, Iaido.

## 24/11/2026: Batch 4 intelligent AI (A1-A6, CH2, TD-154)
Done: posture reading (stats, health, phase), recovery punishing, rhythm reads, ability hit-chance, Time Stop aggression, boxed-in escape, status-effects crash fix. Tests: typecheck clean, vitest 1246 passed. Not done: watching AI fights in the browser, measuring AI frame cost with four AI fighters (the evaluation is cached at 0.15 s), per-decision logging in the balance harness. Next: Batch 5 (balance framework and rebalance).

## 24/11/2026: difficulty capability tiers (A7, TD-155)
Done: hazard sense, cast awareness, ultimate patience and moment, movement skill and furniture use now differ clearly by tier; the scene passes the opponent's rings, clouds, mines, beams, shots and cast to the brain. Tests: typecheck clean, vitest 1252 passed. Not checked: watching Easy and Expert fights in the browser; the tuning numbers are first values and may need a pass after the Batch 5 matrix.

## 25/11/2026: Batch 5 balance framework and rebalance (B1-B3, TD-156)
Done: matrix harness for all 12 fighters, `BALANCE_FRAMEWORK.md`, `balance-framework.test.ts`, five tuning rounds (every change in `FIGHTER_SYSTEM_CHANGELOG.md`), final matrix 35-63 % for everyone including Inferno (60 %). The matrix also found and fixed two engine crashes (Time Stop ending with a removed frozen body; status list shrinking under a fatal damage tick, with regression tests). Not done: other difficulties and arenas, per-ability hit rates, AI decision logging. Next: Batch 6 (tournament overtime, Skip Battle, spectate).

## 25/11/2026: bottom-five kit improvements (TD-157)
Done: Temporal Echo, Harmonic Shield, Gravity Well, two drones, Prismor and passives tuned; new tests including a real-scene test. Tests: typecheck clean, vitest 1259 passed. Light sanity run of 100 fights against the five strongest. Not done: a fresh full matrix (not requested), browser check of the Echo and Shield visuals (the Echo reuses Chronos's clock field, the shield its sonic bubble; their icons: Echo is new, Shield keeps the barrier icon).

## 25/11/2026: Owner "Requested Updates" (TD-162)
Done: Ink Monster 450 HP; Ink Slash brush swipe with 3 s blind and 40 % slow; Ink Dragon lunge and bite with ink splat veil (1.5 s, 40 % slow); orange stray line fixed (`arcPath`); Battle Skip instant (`skipToEnd`); draw Skip settles only the shown stage (test); Psion Toss rises in place then throws, Psychic Rupture replaces Slam; per-portrait move display with ultimate banner; curved wall patch fixed; info button top-left and the controls hint moved to a tutorial-only Keys button. Checks: typecheck, biome, full vitest (1289 passed), production build, e2e tournament/menu/front-end (desktop) green; screenshots for Geargrind mine, Psion, move HUD, wall, info/Keys. Not verified: dragon lunge screenshot and a Reson/Monster-ultimate line check in the browser, phone layout of the Keys button. Next: Batch 8 (select-screen performance S1, Open Zone character switch O1).

## 25/11/2026: Batch 8 (S1, O1; TD-163)
Done: select-screen strip cache and incremental drawing (before/after numbers in docs/qa); Open Zone Change Character (picker, `replacePlayerFighter`, integration test, browser check with three switches). Next: Batch 9 (pixel renderer, UI design system, loading screen), then Batch 10.

## 25/11/2026: Colosseum (TD-164)
Done: round Colosseum arena (data, view, nine prop kinds, crowd, banners, torches), menu default, tests (arena layout, real-scene containment). Fixed while building: straight chords drawn across the wall (lines followed the run, not the curve), sand spilling past the rim (clipped). Batch 9 (pixel pipeline, UI design system, loading screen) is last, after this.


## 25/11/2026 — prop collision and depth transparency
- Removed the Colosseum no-fade exemption in `fight-arena-scene.ts`; props fade only when obstructing a fighter (TD-167). Added `tests/integration/scenes/prop-fade.test.ts`.
- Checks: tsc clean, biome clean (warnings pre-existing), vitest 156 files / 1298 tests pass. Browser screenshot of the fix not yet taken.

## 25/11/2026 — ink creature visuals (TD-168)
- Files: `src/rendering/ink-creature.ts` (new), `ink-parts.ts`, `premium-model.ts`, `src/app/scenes/fight-arena-scene.ts`, `fighter-entity.ts`.
- Checks: tsc and biome clean, vitest 1298 passing. Screenshots of monster and clone taken; the serpent and dragon effects in `ink-vfx.ts` were not changed in this pass.

## 25/11/2026 — background music centralised (TD-169)
- Files: `src/audio/music-director.ts` (new), `music.ts`, `src/app/bootstrap.ts`, `src/app/hide-seek-page.ts`, tests above.
- Fixed a start-up error found by the e2e run (debug object used before it existed). Ambience beds are unchanged and not covered by the director.
- Not verified: real-device audio on Android Chrome; Hide and Seek music has unit coverage through the director only (no browser audio probe).

## 25/11/2026 — Ink Bull and Ink Serpent bind (TD-170)
- Files: `src/abilities/ink-world.ts`, `ability-def.ts`, `ability-world.ts`, `src/vfx/ink-vfx.ts`, `src/data/abilities/inkmaster.ts`, `src/combat/{combatant,status-effects}.ts`, `src/app/scenes/{fight-arena-scene,scene-abilities}.ts`, `src/rendering/stickman-view.ts`, icons, sounds, poses, AI text, tests.
- Checks: tsc and biome clean for the changed code; vitest 1311 passing. Browser: bull and serpent screenshots against the training dummy (bull rammed and knocked the dummy down; snake coil, seal and unwind seen).
- Not verified: the AI Inkmaster's use of the Bull against a moving player in a long fight; real-device play; balance only reasoned (not matrix-run); the new bull sounds are synthesised and not heard by me.

## 25/11/2026 — Colosseum solidity and carriable ruins (TD-171)
- Files: `src/rendering/colosseum-view.ts`, `src/data/arenas/colosseum.ts`, `src/app/scenes/fight-arena-scene.ts`, `src/data/objects/props.ts`, `src/environment/arena-props.ts`, tests (`colosseum-solid.test.ts`, `prop-fade.test.ts`).
- Checks: tsc and biome clean; vitest 1327 passing. Screenshots with the physical radii overlaid confirmed the floor now meets the wall.
- Not verified: a phone, long AI-vs-AI fights, and the look of the cut ends where the tall back wall meets the low near wall (a flat end face is visible).

## 25/11/2026 — Reson Vibration Punch field
- Files: `src/data/abilities/reson.ts` (reach, `look.field: 'vibration'`), `src/abilities/ability-def.ts`, `src/vfx/ability-vfx.ts` (`fields`), `src/app/scenes/fight-arena-scene.ts`. Full vitest 1328 passing; slow-motion screenshots of the wind-up and release taken.
- Not verified: a hit on a moving opponent at the new 2.4 m reach in a long fight, or balance by matrix.

## 25/11/2026 — batch 1 of the Magix request (TD-173)
- Done: Psion Gravity Vortex (replacing Hypnosis, removed), Ink Spear (replacing Ink Cyclone), Bull ink splat, Serpent no-run. Tests 1328 passing; screenshots of spear and vortex.
- Next (batches 2+): the new fighter Magix (renamed from Mystario): model, Disappearing Act, A Rabbit, Card Barrage, Wand of Misfortune, Lucky Hat, Mirror Act ultimate, AI, roster and select screen.

## 25/11/2026 — batch 2 of the Magix request: the fighter Magix (TD-173)
- Files: `src/data/characters/magix/*`, `src/data/characters/rabbit/*`, `src/data/abilities/magix.ts`, `src/abilities/{magix-world,ability-caster,ability-def,ability-world,kits,ultimate-charge}.ts`, `src/app/scenes/{fight-arena-scene,scene-abilities,scene-summons,fighter-entity,invisible}.ts`, `src/rendering/{magix-parts,premium-model,stickman-view,fighter-bars}.ts`, `src/vfx/{magix-vfx,ability-vfx}.ts`, `src/animation/{clips,greybox-motion}.ts`, `src/audio/sound-board.ts`, `src/interface/{ability-hud,ability-icons}.ts`, `src/combat/combatant.ts`, `src/data/ai/brains.ts`, `src/data/presentation/select-stances.ts`, `src/characters/{library,schema}.ts`; tests `tests/integration/scenes/magix.test.ts` plus roster, loadout, ability-balance and e2e menu counts.
- Checks: tsc clean, biome no errors (warnings pre-existing), vitest all passing, browser screenshots of idle, cards, vanish, wand, rabbit, mirror dust and copy (dev server, slow motion).
- Not verified: AI Magix in a long fight against varied opponents (unusual movers and ultimates), mirror against every kit, real-device play, balance by matrix run (stats only fit to the ratings budget), the synthesised sounds by ear.

## 25/11/2026 — Colosseum cheer from the owner's recording
- Files: `assets/audio/sfx-crowd-cheer.*`, `src/audio/ambience.ts`, `src/data/audio/music.ts`, registers. Unit audio tests pass (39); production build includes the clip.
- Not verified: the sound by ear in the browser (no audio device here), and the level relative to the crowd beds.

## 25/11/2026 — all crowd cheering removed (owner)
- Deleted `assets/audio/sfx-crowd-cheer.*` and the recorded-sample code; removed the synthesised `cheer`, `distant-cheer` and `roar` events and the KO roar reaction from the Colosseum ambience; tests updated. Not verified by ear.

## 25/11/2026 — Colosseum ambience removed (owner)
- `src/data/arenas/colosseum.ts` no longer sets an ambience: the Colosseum plays only its battle music. The ambience definitions stay in `src/data/audio/ambiences.ts` (the menu's tunnel still derives from them). Test added. Not verified by ear.
