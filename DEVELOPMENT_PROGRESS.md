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

## Decisions requiring owner attention

Full list in spec §21. Still open:

1. **OQ-10:** performance targets and minimum devices. Needed before Phase 1 ends; I can propose defaults if you prefer.
2. **OQ-04, OQ-05:** ultimate rule; stat, stamina and cooldown baselines (Phase 5–6). I can propose balanced defaults for approval.
3. **OQ-06, OQ-07, OQ-08, OQ-09:** match rules, 3v3/ladder/story details, economy numbers, real-money purchases (Phase 13–14).
4. **OQ-12:** sand in the office? **OQ-16:** 2D stickman art direction (TD-022 proposes code-drawn vector stick figures with 2D bone animation). **OQ-17:** audio source (original sound effects in the Stickman Kombat 2D style).
5. **TD-017:** game hosting is GitHub Pages (decided). To publish, enable Pages in the repository settings and run the deploy workflow (or ask me to). Pages is free only for **public** repositories. The Supabase data backend needs approval by Phase 14.

## Known issues
- None open in code. Stats are provisional (OQ-05).
- Documentation limitation: numeric gameplay and economy values are absent from the source material (spec §21).

## Outstanding tasks (next)
1. Check GitHub CI and the Pages redeploy for this push.
2. Owner playtest of Phase 5 and approval or changes to the provisional stats (OQ-05, TD-030).
3. **Phase 6:** shared ability framework, three abilities and an ultimate for the greybox fighter, stamina costs and cooldowns (needs OQ-04).
3. Owner: OQ-10 (performance targets), OQ-16 (art direction), when convenient.
