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

## Active assignments

Check this table before assigning work. No two active assignments may share a path or system.

| ID | Specialist | Objective | Write paths | Started | Status |
|---|---|---|---|---|---|
| *(none)* | | | | | |

## Completed work

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
