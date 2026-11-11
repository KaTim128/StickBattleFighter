# TECHNICAL DECISIONS

Architecture decision log. Each entry records context, decision, alternatives, trade-offs and status.
**Status values:** `ACCEPTED` (in force) · `PROPOSED` (recommended; owner approval needed before implementation depends on it) · `OPEN` (no recommendation yet) · `SUPERSEDED`.

| ID | Title | Status | Date |
|---|---|---|---|
| TD-001 | Project management foundation before any game code | ACCEPTED | 10/11/2026 |
| TD-002 | Five-action combat layout supersedes 4+4 layout | ACCEPTED | 10/11/2026 |
| TD-003 | Language and build: TypeScript + Vite | ACCEPTED (owner, 10/11/2026) | 10/11/2026 |
| TD-004 | Rendering engine: Three.js (vs Babylon.js) | SUPERSEDED by TD-021 (2D) | 10/11/2026 |
| TD-005 | Physics engine: Rapier 3D (JS/WASM) | SUPERSEDED by TD-021 (Rapier 2D) | 10/11/2026 |
| TD-006 | Test stack: Vitest + Playwright | ACCEPTED (owner, 10/11/2026) | 10/11/2026 |
| TD-007 | Asset pipeline: Blender → glTF 2.0 (.glb) | SUPERSEDED by TD-022 (2D) | 10/11/2026 |
| TD-008 | Backend technology | PROPOSED: Supabase (see TD-017) | 10/11/2026 |
| TD-009 | Ten-specialist team replaces the playbook's nine workers | ACCEPTED | 10/11/2026 |
| TD-010 | Directory structure | ACCEPTED | 10/11/2026 |
| TD-011 | Creature Clash is 2D: limits on its use as a 3D reference | SUPERSEDED (game is now 2D, TD-021) | 10/11/2026 |
| TD-012 | Reference videos are not committed to the repository | ACCEPTED | 10/11/2026 |
| TD-013 | Fixed-timestep simulation separated from rendering | ACCEPTED (implemented Phase 0) | 10/11/2026 |
| TD-014 | Data-driven content format | PROPOSED | 10/11/2026 |
| TD-015 | Agent Teams stay disabled | ACCEPTED | 10/11/2026 |
| TD-016 | Control scheme (resolves OQ-02, OQ-03, OQ-14) | ACCEPTED | 10/11/2026 |
| TD-017 | Free hosting: GitHub Pages (game) + Supabase Free (Phase 14 data) | ACCEPTED (game hosting); data PROPOSED | 10/11/2026 |
| TD-018 | Single player against AI only; online deferred | ACCEPTED | 10/11/2026 |
| TD-019 | Token-economy delegation policy for specialists | ACCEPTED | 10/11/2026 |
| TD-020 | Phase 0 toolchain details | ACCEPTED (libraries updated by TD-021) | 10/11/2026 |
| TD-021 | Switch to 2D top-down: PixiJS 8 + Rapier 2D | ACCEPTED (owner direction) | 10/11/2026 |
| TD-022 | 2D art and animation pipeline | PROPOSED | 10/11/2026 |
| TD-023 | Rapier 2D non-compat build with a separate .wasm | ACCEPTED (Phase 1) | 11/11/2026 |
| TD-024 | Biome for lint and format (instead of ESLint + Prettier) | ACCEPTED (Phase 1) | 11/11/2026 |
| TD-025 | Scene lifecycle, asset loader, debug overlay, y-sorting | ACCEPTED (Phase 1) | 11/11/2026 |
| TD-026 | Fighter movement: velocity-driven dynamic body, procedural jointed animation | ACCEPTED (Phase 2) | 11/11/2026 |
| TD-027 | Camera framing, speed caps and trauma-based shake | ACCEPTED (Phase 3) | 11/11/2026 |
| TD-028 | Arenas as data: prop catalogue, rooms, interior walls, breakable doors, collision groups | ACCEPTED (Phase 4) | 11/11/2026 |
| TD-029 | Early Button 1 combat: data-driven attacks, combo controller, capsule hits | ACCEPTED (owner-requested, ahead of Phase 5) | 11/11/2026 |

---

### TD-001: Project management foundation before any game code — ACCEPTED
**Context:** The owner's initialisation instruction (10/11/2026) forbids building game systems in this phase.
**Decision:** Create the specification, process documents, specialists, rules, skills and an empty but documented directory structure only. No `package.json`, no dependencies and no source code until Phase 0/1 is approved.
**Trade-off:** Nothing runnable yet. The playbook's Phase 0 exit condition ("launches a minimal 3D scene") is therefore **not** met by initialisation. It is the next milestone.

### TD-002: Five-action combat layout — ACCEPTED
**Context:** Older requirements described four basic attack buttons plus four abilities. Playbook §4.2 replaces this.
**Decision:** Exactly five combat actions: Button 1 universal melee (no stamina cost), Buttons 2–4 unique abilities, Button 5 ultimate. The old layout is recorded as SUP-01 in the spec.
**Open consequence:** inputs for dodge, block, jump, pickup and throw are undefined (OQ-02).

### TD-003: TypeScript + Vite — ACCEPTED
**Approved by the owner on 10/11/2026.**
**Context:** Browser game; the playbook mentions TypeScript build gates (§15) and Vite tooling (§3.2).
**Recommendation:** TypeScript in strict mode, Vite as dev server and bundler, npm as package manager. Node ≥ 20 (the dev container has Node 22.23.4; confirm Vite's current minimum when bootstrapping).
**Alternatives:** Webpack (slower dev loop); plain JS (loses type safety across many data-driven systems).

### TD-004: Rendering engine — SUPERSEDED by TD-021 (was: Three.js)
**Approved by the owner on 10/11/2026.**
Playbook §6 requires comparing at least two approaches.

| Criterion | Three.js | Babylon.js |
|---|---|---|
| Bundle size | Small core, tree-shakeable | Larger; more built in |
| Built-in game features | Renderer only; we compose physics, animation and UI | Engine-like: scene inspector, GUI, physics plugin, animation groups |
| glTF and skinned animation | Mature (`GLTFLoader`, `AnimationMixer`) | Mature |
| Mobile performance control | Very fine control; we own the render loop | Good; more default overhead |
| Ecosystem and docs | Largest community; in the playbook's reference list | Strong official docs |
| Team familiarity | The owner's Froggy project already uses Three.js 0.170 | None |

**Recommendation:** **Three.js**. A smaller footprint for mobile, fine control over the loop and rendering cost, familiarity, and it is named in the playbook. **Trade-off:** we must build or choose our own scene management, animation state machine and debug tooling. **Rejected for now:** Babylon.js (heavier, overlapping features), PlayCanvas (editor-centric workflow), Unity/Godot web export (large downloads, weaker browser and mobile iteration).

### TD-005: Physics — SUPERSEDED by TD-021 (was: Rapier 3D, `@dimforge/rapier3d-compat`)
**Approved by the owner on 10/11/2026.**
**Reasons:** WASM performance, deterministic options, a built-in **kinematic character controller** (slopes, steps, snap to ground) matching REQ-PHY-1/2, collision groups for layers, shape casts and ray casts for hit detection, line of sight and camera obstruction. Named in the playbook (§20).
**Alternatives:** cannon-es (pure JS, slower, less maintained); Ammo.js (Bullet port, large and awkward API); custom physics (too risky).
**Risk:** WASM init is asynchronous, so the bootstrap must await it. Watch mobile memory.

### TD-006: Test stack — ACCEPTED: Vitest + Playwright
**Approved by the owner on 10/11/2026.**
Vitest for unit and integration tests of deterministic rules (combat maths, cooldowns, stamina, data validation). Playwright for browser flows, screenshots and mobile emulation (`--trace off` by default). Real-device checks remain manual and logged in `TESTING_CHECKLIST.md`.

### TD-007: Asset pipeline — SUPERSEDED by TD-022 (was: Blender → glTF 2.0 binary (.glb))
**Approved by the owner on 10/11/2026.**
Shared rig contract (bone names and animation clip naming) across fighters; Draco or Meshopt compression and KTX2 textures evaluated in Phase 1. Greybox assets live under `assets/**/greybox/` and are listed in `assets/ASSET_REGISTER.md`.

### TD-008: Backend — PROPOSED: Supabase (Postgres + Auth + row-level security); see TD-017
Candidates to evaluate in Phase 14 (REQ-BE-1): managed Postgres with auth and row-level security (e.g. Supabase); Firebase (Auth + Firestore + Cloud Functions); custom Node (Fastify) API + Postgres. Requirements: server-validated ledger, verified roles, versioned config with rollback, audit log, cross-device profiles. **Update 10/11/2026:** online PvP is out of scope (TD-018) and hosting must be free (TD-017), which points to Supabase. Still open: OQ-09 (real-money purchases?). Until Phase 14, the client talks to an internal `services/` interface so the backend can be swapped in.

### TD-009: Ten-specialist team — ACCEPTED
**Context:** Playbook §8.1 defines nine workers. The owner's 10/11/2026 instruction defines ten different roles.
**Decision:** The owner's list governs (latest explicit instruction). Duties in the playbook that have no direct owner role are remapped:
- *environment-engineer* → split: **Rendering (2D since TD-021)** (arena visuals, materials, layout art) + **Physics** (arena collision, destructibles, pickup and throw).
- *ai-gameplay-engineer* (game modes, match flow) → **AI Specialist** keeps match flow and mode orchestration as in the playbook.
- *ui-mobile-tutorial-engineer* → **Mobile Controls Specialist** owns all input, HUD, menus, desktop keybinds and tutorial UI ("cross-platform input consistency").
- *backend-security-engineer* → **Backend Specialist** (including security).
- *character-animation-engineer* → split: **Character Development** + **Animation**.
Architecture and QA remain **read only**, as in the playbook. Mapping detail: `docs/workflow/SYSTEM_OWNERSHIP.md`. Owner confirmation requested (OQ-18).

### TD-010: Directory structure — ACCEPTED
Follows the playbook §5 target layout, with these additions: `src/modes/` (game modes were not in the target list but are a distinct owned system), `src/data/` (data-driven definitions, REQ-ARC-3), `src/vfx/` (VFX has its own owner boundary), `backend/` (server code kept out of the browser bundle, REQ-BE-8), `tools/`, `docs/`. Each folder holds a `README.md` with purpose and owner instead of an empty placeholder. The `src/environment/` name is kept for runtime interactable-object systems; `src/arenas/` holds arena definitions and loaders.

### TD-011: Creature Clash is 2D — SUPERSEDED
*Moot since TD-021: Stickman Arena is now 2D top-down too, so Creature Clash is a direct reference for movement, arena layout and camera framing.*
The playbook treats Creature Clash as the primary 3D foundation reference. Inspection showed it is a top-down 2D Phaser scene. It remains a reference for planar free movement, cover and line of sight, AI and abilities. The 3D camera, vertical movement and 3D collision are designed from engine documentation and first principles. See `docs/references/CREATURE_CLASH_OBSERVATIONS.md`.

### TD-012: Reference videos not committed — ACCEPTED
The two owner videos contain third-party franchise footage (≈ 22 MB). Committing them to a public-facing repository creates IP and size risks. Only the written observation report is committed; the owner keeps the originals. The playbook `.docx` **is** committed under `docs/references/` (owner-authored, 75 KB).

### TD-013: Fixed-timestep simulation — ACCEPTED
**Implemented in Phase 0:** `src/core/fixed-step.ts` and `src/core/game-loop.ts`; 60 Hz step, at most 5 steps per frame; render interpolation by alpha.
Gameplay (physics, combat, AI) steps at a fixed rate (proposed 60 Hz) with rendering interpolated, so combat timing (wind-up, active frames, hit-stop) is frame-rate independent across desktop and mobile. This also keeps an online-PvP path possible (OQ-13).

### TD-014: Data-driven content format — PROPOSED
Fighters, abilities, arenas, objects and mode rules defined as typed TypeScript data modules validated by schema at load and in tests (e.g. with a runtime validator such as Zod). Server-published overrides (REQ-BE-5) layer on top of shipped defaults.

### TD-015: Agent Teams disabled — ACCEPTED
Playbook §2/§10: start with standard subagents. Agent Teams are experimental and more expensive. Not enabled in `.claude/settings.json`.

### TD-016: Control scheme — ACCEPTED
**Context:** Five combat buttons only (INV-9), yet block, dodge, jump, pick up, throw and targeting are all required. The owner delegated the design (10/11/2026).
**Decision:** Hold Button 1 = block (tap = melee); flick the movement stick = dodge (Shift on desktop; optional double-tap mode); one **contextual utility button** that is not a combat button = jump / pick up / throw (hold to drop); automatic soft target lock (tap an opponent or Tab to switch). Camera is automatic (2D top-down, TD-021), so there are no camera controls. Desktop presets: keyboard + mouse (default) and keyboard only. Both layouts live in one build; the active one follows the device last used (resolves OQ-14). Full spec: `docs/design/CONTROL_SCHEME.md`.
**Alternatives rejected:** extra Dodge, Block and Jump buttons (clutter; arguably breaks INV-9); a swipe on the camera area for dodge (conflicts with camera drag); automatic block (removes skill).
**Trade-offs:** a hold-to-block threshold adds about 0.2 s before the guard rises, so the threshold is data-driven and tuned in playtests. Flicks can misfire, hence the double-tap option.

### TD-017: Free hosting — game on GitHub Pages ACCEPTED (owner, 10/11/2026); data PROPOSED
**Owner decision (10/11/2026):** host the game on **GitHub Pages** instead of Cloudflare Pages, since the code already lives on GitHub. Notes: Pages is free for **public** repositories (private repositories need a paid GitHub plan); the limits recalled from GitHub's docs (about 1 GB per site, a soft bandwidth limit of about 100 GB per month) are unverified, so confirm them when enabling Pages. The Vite `base` path is set at build time (`BASE_PATH=/StickBattleFighter/`). Deployment runs only from a **manually triggered** workflow (`.github/workflows/deploy-pages.yml`), and the owner enables Pages in the repository settings, because public deployment needs owner approval (spec §19). GitHub cannot store player data, so the Supabase proposal below remains for Phase 14.

*Original evaluation (game hosting part superseded by the decision above):*
**Owner requirement:** free hosting (MYR 0). Free-tier figures below come from third-party 2026 pricing summaries; the official pricing pages could not be opened from the development environment, so **confirm them when creating the accounts**.

| Need | Recommended | Free-tier facts (2026, unverified against official pages) | Alternatives |
|---|---|---|---|
| Game (static site: HTML, JS, 3D assets) | **Cloudflare Pages** | Unlimited static bandwidth and requests; 500 builds per month; 1 concurrent build; reportedly a 25 MB per-file cap (keep each `.glb` under it) | GitHub Pages (simple, but a soft bandwidth cap); Netlify or Vercel (metered bandwidth on free tiers) |
| Auth, profiles, ledger, admin config | **Supabase Free** | 500 MB Postgres; 1 GB file storage; 50,000 monthly active users; 2 free projects; 5 GB egress; **pauses after 7 days without activity** (data is kept; the first request after a pause is slow) | **Cloudflare Workers + D1**: 100,000 requests per day; 5 million rows read and 100,000 rows written per day; 5 GB storage; no pausing; but authentication must be built ourselves |
| Not recommended | Firebase Spark | Cloud Functions need the paid Blaze plan, so server-side validation would cost money or be impossible for free | — |

**Why Supabase:** Auth, Postgres row-level security and SQL functions let the **server** validate the ledger, rewards, unlocks, tutorial completion and admin role (REQ-BE-3/4, INV-7) with no paid compute. **Risk:** the 7-day pause matters for a small player base; the mitigation is a free scheduled ping or accepting a slow first request. If pausing becomes a problem, switch to Workers + D1 behind the same `src/services/` interface.
**Cost if outgrown:** Supabase Pro is USD 25 per month ≈ **MYR 101.50 per month** (rate used: 1 USD = 4.06 MYR, reference rate 01/11/2026). Upgrading requires owner approval.
**Not yet done:** no accounts created and nothing deployed. Deployment always needs explicit owner approval (spec §19).

### TD-018: AI-only play — ACCEPTED
**Decision (owner, 10/11/2026):** every mode is single player against AI (allies and opponents in 3v3 are AI). No netcode or matchmaking. TD-013 (fixed timestep) and input intents keep online play possible later.
**Consequence:** the AI quality bar is higher, because AI is the whole opponent experience (Phase 10 is critical). The backend only needs per-player data, not real-time servers, which fits free tiers.

### TD-019: Token-economy delegation — ACCEPTED
**Owner condition (10/11/2026):** use specialists only when needed so tokens are not wasted.
**Policy:** the Master Developer does small and medium tasks itself. Delegate only when (a) a task is large and fully inside one specialist's paths, (b) an independent read-only review is required at milestone sign-off (QA), or (c) heavy research or log reading would flood the main context. Default to **one** specialist at a time; parallel specialists only for disjoint, sizeable work. No "review everything" sweeps; reviews are scoped to the milestone diff. Recorded in `CLAUDE.md` and the workflow.

### TD-020: Phase 0 toolchain details — ACCEPTED
- **TypeScript 7.0.2** (latest at bootstrap). Two configs: `tsconfig.json` covers browser code and unit/integration tests (no Node globals); `tsconfig.node.json` covers the config files and Playwright tests (Node types).
- **Vite 8.3.7** (Rolldown bundler), **Vitest 5.1.0**. Rendering and physics libraries: see TD-021 (originally Three.js 0.187 and Rapier 3D 0.21).
- **@playwright/test pinned at 1.63.0** to match the browser build preinstalled in the cloud dev environment. On a new machine run `npx playwright install chromium` once.
- Browser tests run against the **production build** (`vite preview`) in two projects, desktop Chrome and Pixel 7 emulation, using software WebGL (SwiftShader) so headless CI can render.
- Vendor chunks are split (`vendor-pixi`, `vendor-rapier`) for caching. **Known cost:** Rapier's compat build embeds its WASM as base64 (2D: about 3.4 MB raw, 1.3 MB gzipped). Switching to the non-compat build with a separate `.wasm` file is a Phase 1 item.
- **CI** (`.github/workflows/ci.yml`) runs typecheck, tests, build and e2e on every push. **Deployment** (`deploy-pages.yml`) is manual only (`workflow_dispatch`).
- A read-only debug hook (`window.__stickmanDebug`) lets the smoke tests check physics progress and read canvas pixels. It exposes no gameplay control.
- Lint and format tooling is deferred to Phase 1, to keep Phase 0 minimal.

### TD-021: Switch to 2D top-down — ACCEPTED (owner direction, 10/11/2026)
**Owner instruction:** "Make it in 2D not 3D like Creature Clash where the creature can go front and back and left and right, everything should be in 2D."
**Decision:** the game is 2D, seen from above. Fighters move freely up/down (front/back), left/right and diagonally. Supersedes TD-004, TD-005, TD-007 and TD-011, and spec SUP-04.
**Renderer: PixiJS 8** (2D WebGL; `preference: 'webgl'`).

| Option | Verdict |
|---|---|
| **PixiJS 8** | **Chosen.** A fast 2D WebGL renderer only (about 146 kB gzipped here), so it slots into our own fixed-step loop, data-driven systems and Rapier physics without fighting a framework. Strong particle, filter and graphics support for PRS VFX. |
| Phaser 4 | Full game framework (what Creature Clash uses). Brings its own loop, scenes, physics and input, which would duplicate or override our architecture (input layer, fixed step, shared combat engine). Using it would also blur the line with Froggy's implementation. |
| Plain Canvas 2D | No dependency, but CPU-bound drawing struggles with many particles and effects on mobile. |

**Physics: Rapier 2D** (`@dimforge/rapier2d-compat` 0.21). Same engine family as before: top-down with zero gravity, kinematic character controller, collision groups, ray and shape casts for hit detection and line of sight, CCD against tunnelling.
**Conventions:** units are metres and seconds; +x = right, +y = down the screen; y-sorting for draw order; jump is a short hop shown with a ground shadow (REQ-PHY-2, REQ-VIS-9).
**Camera:** automatic follow and framing, no manual rotation (spec §5.1). The control scheme loses its camera controls (TD-016 updated).
**Ownership:** the "3D Rendering Specialist" becomes the **Rendering Specialist (2D)** (`rendering-specialist`).
**Migration done:** Phase 0 engine-check rebuilt in 2D (walled floor plus a sliding, bouncing crate); all tests rewritten and passing (see DEVELOPMENT_PROGRESS.md).

### TD-022: 2D art and animation pipeline — PROPOSED
- **Fighters:** vector stick figures drawn in code with Pixi Graphics, animated by a small **2D skeletal system** (bones and keyframes stored as data). This gives crisp lines at any zoom, tiny downloads, and easy distinct silhouettes (limb thickness, head shapes, accessories, colours) without recolours.
- **Effects:** Pixi particles, sprites and filters (glow, flash, trails).
- **Props and arenas:** 2D top-down art as SVG or PNG/WebP sprite sheets; greybox shapes until final art.
- **Tools:** no paid tools required. An in-repo pose and keyframe editor can come later if hand-authoring data is slow.
- **Rig contract (owner requirement, REQ-ANI-6):** bones = pelvis, spineLower, spineUpper, neck, head, and for each side upperArm, foreArm, hand, thigh, shin, foot. Each bone has a length and a parent; poses store joint angles. Animation interpolates joint rotations with easing curves, plus an optional two-bone IK so feet can stay planted and hands can reach targets. Fighters differ by bone lengths, limb thickness, head and accessories, never by recolour alone.
- **Style sample (10/11/2026):** outlined, coloured limbs with visible joints, standing upright on the top-down floor with a ground shadow. The owner was shown sample stills (three fighters; a five-pose kick sequence built from a jointed skeleton).
- **Pending:** further owner input on art direction (OQ-16).

### TD-023: Rapier 2D non-compat build — ACCEPTED (11/11/2026)
**Measured:** the compat build embeds the engine as base64 inside JavaScript (3.41 MB raw / 1.29 MB gzip). The non-compat `@dimforge/rapier2d` ships a real `.wasm` (2.40 MB raw / 0.92 MB gzip in our build), **about 30% smaller to download**, and the browser compiles it while it streams.
**How:** `vite-plugin-wasm` (supports Vite 8) handles the ES-module `.wasm` import. `initPhysics()` loads Rapier with a dynamic `import()`, so the renderer and physics download in parallel. Vitest resolves `@dimforge/rapier2d/rapier.js` directly and inlines it, because the package only declares a browser `module` entry.
**Verified:** unit, integration and e2e tests pass, and the GitHub Pages sub-path build loads the `.wasm` correctly.

### TD-024: Biome for lint and format — ACCEPTED (11/11/2026)
`typescript-eslint` 8.72 requires TypeScript < 6.1, so it does not support our TypeScript 7 (TD-020). **Biome 2.6** lints and formats TS, JSON and config files in one fast tool with no TypeScript dependency. Config: `biome.json` (recommended preset, `noExplicitAny` as an error, single quotes, 120 columns). Commands: `npm run lint` (check) and `npm run format` (apply). Lint runs in CI. Markdown is excluded.

### TD-025: Phase 1 engine foundation — ACCEPTED (11/11/2026)
- **Scene lifecycle** (`src/core/scene.ts`): `GameScene` (load, update, render, unload) and `SceneManager`. Switches are serialised: a scene superseded while loading is unloaded and never activated; a failed load is cleaned up and reported. Each scene owns and frees its physics world and display objects.
- **Asset loader** (`src/core/asset-loader.ts`, plus a Pixi adapter in `src/rendering/pixi-assets.ts`): loads each URL once and **never throws**. Failures become results, are logged and shown in the status line, and the scene falls back to greybox.
- **Debug overlay** (`src/rendering/debug-overlay.ts`): Rapier collider outlines plus a panel (FPS, physics steps, collider count, asset failures). Toggle with the backquote key (`src/input/debug-keys.ts`) or start with `?debug`. Hidden by default.
- **Y-sorting** (`src/rendering/y-sort-layer.ts`): objects sort by the y of their feet, so lower-on-screen draws in front (REQ-VIS-9). Demonstrated with upright greybox pillars.

### TD-026: Fighter movement and animation approach — ACCEPTED (11/11/2026)
- **Body:** a rotation-locked, frictionless **dynamic** Rapier circle at the feet. Each fixed step sets its velocity from `stepVelocity` (accelerate or turn at `accelMps2`, stop at `decelMps2`, top speed `maxSpeedMps`, diagonals clamped to length 1). Rapier resolves walls and pillars, so sliding along walls is automatic, and knockback, shoves and fighter-vs-fighter contact later use the same body. *Chosen over Rapier's kinematic character controller:* that controller is built around an "up" direction for slopes and floors, which does not fit a gravity-free top-down plane, and it would need custom code for every push and knockback. Steering reads the body's **actual** velocity, so a blocked fighter does not build hidden speed.
- **Jump hop:** a separate height value (`stepHop`) drawn by lifting the figure over a fixed ground shadow; floor collisions stay 2D. No double jump. Hopping over obstacles is not supported (decide in a later combat or arena phase).
- **Animation:** the jointed skeleton (`src/animation/skeleton.ts`) is solved with forward kinematics, then grounded so the lowest foot touches the floor (no floating or sinking). Greybox idle, walk and air motions are smooth procedural cycles; the walk phase advances by **distance travelled / stride**, so feet keep pace; weights ease between motions joint by joint. Roster fighters will replace these with their own motion sets (REQ-ANI-7). Tests lock the joint sign convention (knees bend back, elbows forward) after a sign error was caught during development.
- **Camera:** `FollowCamera` eases towards the player and clamps to the arena; zoom shows 11 m across the screen's short side. Keeping opponents in frame (REQ-CAM-2) and shake (REQ-CAM-4) come in Phase 3.
- **Input:** `PlayerIntents` merges device vectors (clamped to length 1) and latches jump presses for exactly one step. Keyboard: WASD and arrows, Space; focus loss releases keys. Touch: a floating joystick in the left 40% with a dead zone, plus the utility (JUMP) button; hidden until the first touch (REQ-CTL-2).

### TD-027: Camera framing and shake — ACCEPTED (11/11/2026)
- **Framing** (`src/camera/framing.ts`): frames the player plus other fighters within 16 m. Zoom is the metres needed to fit them with padding (2.2 m × 1.8 m), clamped to **11–17 m** across the screen's short side. It aims at the group's centre but is clamped so **the player always stays at least 1.6 m inside the screen edge**.
- **Smoothing** (`FollowCamera`): position eases at rate 6, zoom at rate 3, plus hard caps of **15 m/s pan and 6 m/s zoom**. Tests showed that easing alone moved the view up to 0.5 m and zoomed 0.22 m in a single frame when a fighter was suddenly knocked far away, which reads as a jolt.
- **Shake** (`src/camera/camera-shake.ts`): trauma 0..1 (added by impacts, decays at 1.6/s), offset = 0.45 m × trauma² along smooth layered waves (no random jumps), plus a zoom punch that settles exponentially. It returns exactly to rest. Combat will call `addTrauma` and `punch`; until then the debug key **P** (only while the debug overlay is on) fires a test impact.
- **Training dummy** (`src/data/fighters/training-dummy.ts`): a grey greybox stickman, 140 kg, which eases to a stop after being shoved and faces the player. It exists as something to frame and push; Practice Zone dummy options are Phase 10.

### TD-028: Arenas as data — ACCEPTED (11/11/2026)
- `ArenaLayout` (`src/data/arenas/arena-layout.ts`): size, walls, windows, **props**, **floor zones** (rooms with their own floor and wall colours), **interior walls** and **doors**. One scene (`FightArenaScene`) plays any layout; the training yard and the office both use it.
- **Prop catalogue** (`src/data/objects/props.ts`): size, height, solidity, material, mass, durability, movable, throwable and decal per kind. Phase 4 props are static; Phase 7 uses the recorded material data. An exhaustive `switch` in `prop-view.ts` makes a missing drawing a type error.
- **Depth:** desk items carry `elevationM` and `sortY` so they draw on top of their desk; long walls and doors are drawn in 0.5 m blocks so fighters beside them sort correctly.
- **Navigation grid** (`src/arenas/navigation.ts`): walkable cells for a fighter's radius, with doors open or closed, and connected regions. It proves reachability now and is the basis for AI navigation (Phase 10).
- **Breakable door** (`src/environment/breakable-door.ts`): `impactBreaksDoor` is the pure rule (`contact` never; `kick`, `strike` or `knockback` at ≥ breakStrength). Breaking removes the collider and spawns 7 splinters.
- **Collision groups:** WORLD, FIGHTER and DEBRIS. Splinters collide with walls and each other, never with fighters, so the doorway is truly clear.
- `respawnDummy()` puts the dummy back at rest (the Practice Zone needs this; tests use it to isolate cases).

### TD-029: Early Button 1 combat — ACCEPTED (owner-requested ahead of Phase 5)
- **Attacks are data** (`AttackDef` in each fighter's data): wind-up, active and recovery times, chain point, reach, hit radius, strength, knockback speed, movement factor, lunge, camera trauma and zoom punch.
- **`ComboController`** (`src/combat/combo.ts`): the ground string jab → hook → heavy, with presses buffered during an attack and chaining at the chain point. In the air it does one flying kick per jump. The hit fires exactly once per attack, even if a slow frame skips the active window.
- **Capsule hit area** from 0.15 m in front of the body out to full reach (`hitCapsule`). Found necessary when a longer finisher reach overshot a door the fighter stood against.
- **Tuning found in playtesting:** jab and hook only nudge (knockback 1.5 and 2.5 m/s, fast settle), so the finisher (reach 1.0 m, knockback 11 m/s) connects when standing still. Earlier values pushed the dummy out of range.
- **Attack animation** (`src/animation/attack-poses.ts`): each attack overrides only the joints it uses, moving through chamber, then snap, then return, on top of the current stance or jump pose.
- **Not yet built (Phase 5–6):** damage and health, block (hold Button 1), dodge, stamina, abilities, hit reactions.

### TD-030: Phase 5 combat engine and provisional stats — ACCEPTED (values PROVISIONAL, OQ-05)
- **`Combatant`** (`src/combat/combatant.ts`): pure rules for HP, stamina, guard, parry, guard break, dodge invulnerability, stun, knockdown, KO and respawn. `receive(hit)` returns outcome, damage, knockback scale and attacker stun, so it is unit-tested without physics or rendering. Critical hits use a **seeded** RNG (mulberry32) so tests and replays are deterministic.
- **`FighterEntity`** (`src/app/scenes/fighter-entity.ts`): the player and the dummy are the same entity type with the same combo, rules and animation; only the controller differs (intents vs simple dummy logic). This is INV-5 in practice and the base for AI fighters (Phase 10).
- **Hit-stop:** 0.05 s (light) or 0.09 s (heavy) pauses the simulation on contact. **Combat events** go to the DOM floating-text layer, so presentation never changes gameplay state.
- **Input queue (bug fix):** Button 1 edges were boolean flags, so two taps between steps (a slow frame or hit-stop) became one and the combo dropped. They are now a queue (max 3 taps), one tap consumed per step.
- **Provisional baseline (OQ-05 not yet answered):** HP 1000; stamina 100 (regen 30/s after 0.7 s); jab 40, hook 60, heavy 140, flying kick 120 damage; crit 5% × 1.5; block chip 15%, 0.6 stamina per blocked damage; parry window 0.15 s; dodge 25 stamina, 0.24 s, 0.18 s invulnerable. All values are data in `src/data/fighters/` and `DEFENCE`, so owner changes need no code edits.
- **Alternatives:** Rapier sensors for hit detection (rejected: the capsule query is simpler, deterministic and already tested); per-fighter classes (rejected: one data-driven entity scales to 100 fighters).

### TD-031: Interactive furniture, fall/get-up, combo variants — ACCEPTED (owner feedback 11/11/2026)
- **Props** (`src/environment/arena-props.ts`): every solid floor prop gets a Rapier body that starts **fixed** ("planted"). A strike or a knocked-back body **wakes** it (dynamic), applies an impulse of 0.05 N·s per unit of blow strength plus a little spin, and it is planted again after 0.3 s below 0.06 m/s. Blows deal the attack's damage (or 0.1 × mass × speed for a knocked body) against the catalogue durability; at 0 the prop shatters into 3–8 material-coloured pieces and its desk items fall loose. `movable: false` props never slide; `durability: null` props never break.
  - *Why planted until struck:* fighters are velocity-driven bodies, so free dynamic furniture would be bulldozed by simply walking, scrambling the layout and invalidating the nav grid. The owner asked for reactions to hits.
  - *Alternatives:* always-dynamic props with heavy damping (rejected: walking shoves desks); scripted animations without physics (rejected: no real collisions with walls and fighters).
- **Debris** (`src/environment/debris.ts`): one shared implementation for door splinters and prop pieces, capped at 90 pieces per owner (oldest removed, REQ-PHY-7).
- **Fall and get-up:** new `gettingUp` combat state (0.55 s, cannot act, invulnerable plus 0.2 s after). `knockdownFrame` and `getUpFrame` (`src/animation/reaction-poses.ts`) key the pose, a backwards tilt about the feet and a short lift.
- **Combo variants:** `ComboController` picks one of `COMBO_VARIANTS` (3) looks per strike from a seeded RNG, never repeating back to back; `attack-poses.ts` holds 3 shapes per attack. Attack data is unchanged, so damage, reach and timing are identical.
- **Knockback:** flying kick 10 → 7 m/s; knock-flight braking 5 → 9 m/s² (kick slides about 2–3 m, the finisher about 6 m instead of 12 m).
- **Office tightened** to 29 m × 12 m (REQ-ENV-12).
- **Debug time scale:** `GameLoop.timeScale` (`?slowmo=0.25`, debug hook `setTimeScale`, 0 freezes) for animation review and exact browser screenshots.

## Unresolved technical questions
- Performance budgets (OQ-10).
- Final backend sign-off at Phase 14 (TD-008, TD-017).

## Dependencies
Installed (see `package.json`): pixi.js 8.22, @dimforge/rapier2d 0.21 (TD-023); dev: typescript, vite, vite-plugin-wasm, vitest, @playwright/test, @biomejs/biome, @types/node. `npm audit`: 0 vulnerabilities (10/11/2026).
