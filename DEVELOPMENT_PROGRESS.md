# DEVELOPMENT PROGRESS

Persistent record of project state. Update after every meaningful piece of work (`/session-checkpoint`). **Never mark unverified work complete.**

## Current status

| Item | Value |
|---|---|
| Current phase | **Phase 0: bootstrap: COMPLETE** (10/11/2026) |
| Next milestone | **Phase 1:** engine foundation |
| Branch | `ccr-6b7ad8fe-whr1i5` |
| Latest commit | see `git log -1` |
| Runnable game | **2D top-down** engine-check scene only (`npm run dev`): a walled floor and a crate that slides, bounces off the walls and stops. No gameplay. |
| Installed dependencies | pixi.js 8.22, Rapier 2D compat 0.21; dev: TypeScript 7.0.2, Vite 8.3.7, Vitest 5.1, Playwright 1.63.0 |

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

## Decisions requiring owner attention

Full list in spec §21. Still open:

1. **OQ-10:** performance targets and minimum devices. Needed before Phase 1 ends; I can propose defaults if you prefer.
2. **OQ-04, OQ-05:** ultimate rule; stat, stamina and cooldown baselines (Phase 5–6). I can propose balanced defaults for approval.
3. **OQ-06, OQ-07, OQ-08, OQ-09:** match rules, 3v3/ladder/story details, economy numbers, real-money purchases (Phase 13–14).
4. **OQ-12:** sand in the office? **OQ-16:** 2D stickman art direction (TD-022 proposes code-drawn vector stick figures with 2D bone animation). **OQ-17:** audio source (original sound effects in the Stickman Kombat 2D style).
5. **TD-017:** game hosting is GitHub Pages (decided). To publish, enable Pages in the repository settings and run the deploy workflow (or ask me to). Pages is free only for **public** repositories. The Supabase data backend needs approval by Phase 14.

## Known issues
- None in code (no code exists).
- Documentation limitation: numeric gameplay and economy values are absent from the source material (spec §21).

## Outstanding tasks (next)
1. **Check CI** on GitHub after this push (typecheck, tests, build, e2e).
2. **Phase 1: engine foundation (2D).** Acceptance: lint and format tooling; Rapier 2D switched to the non-compat build with a separate `.wasm` (smaller bundle) or the size justified against OQ-10; scene lifecycle (load and unload without leaks); an asset loader with a handled-error path (test: missing asset shows an error, not a crash); a debug overlay (FPS, physics collider outlines toggle); y-sorted draw-order layer; all tests and build green; e2e plus screenshots.
3. Owner: answer OQ-10 (performance targets) before Phase 1 ends.
