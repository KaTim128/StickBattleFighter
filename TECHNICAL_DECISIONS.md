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

### TD-032: Shared ability framework and Inferno's kit — ACCEPTED (values PROVISIONAL, OQ-05)
- **Abilities are data** (`src/abilities/ability-def.ts`, `src/data/abilities/inferno.ts`): slot, stamina cost, cooldown, wind-up, recovery, aim range, move factor, interruptible, payload (damage, knockback, heavy, strength, burn, ignites), delivery, VFX id and three SFX ids (cast, release, impact).
- **`AbilityCaster`** (pure, per fighter): check → spend stamina → start; wind-up then release event then recovery; cooldowns; the **ultimate charge meter** (owner, OQ-04): 0.25 per damage dealt, 0.15 per damage taken, 1 per second, max 100, emptied on use. A hit during an interruptible wind-up cancels the cast (the cooldown is still spent).
- **`AbilityWorld`** (deliveries): projectile (stopped by fighters, walls, doors and furniture via a Rapier ray query on WORLD colliders), dash (drives the caster's body, hits once per fighter, lays fire-trail zones), nova (telegraphed ring that follows the caster, then erupts), leap (telegraphed landing spot clamped short of walls; the caster is invulnerable in the air; area slam on landing). It talks to the game only through `AbilityHost`, implemented by `SceneAbilities`.
- **One hit path (INV-5):** melee and abilities both go through `FightArenaScene.applyStrike` (rules, floating text, parry, interruption, meter charge, burn, knockback, hit-stop).
- **Burn:** `Combatant.ignite` (damage over time, can KO); flammable props (wood, fabric, paper, plant) burn for 5 s at 14 durability/s.
- **Presentation:** cast poses (`ability-poses.ts`); fire VFX (`src/vfx/ability-vfx.ts`: two Graphics layers redrawn per frame, pooled particles, shockwave rings, scorch marks, telegraph rings); HUD bar and touch buttons (`src/interface/ability-hud.ts`). Sound hooks are emitted as ids (`sfxLog`); audio playback depends on OQ-17.
- **Provisional numbers:** Fire Bolt 20 ST, 2.5 s, 70 dmg + burn 12/s for 2 s; Flame Dash 30 ST, 5 s, 4.5 m, 60 dmg, trail burn 18/s; Eruption 35 ST, 7 s, radius 2.3 m after 0.5 s warning, 110 dmg, knockdown; Meteor Fist meter, radius 3 m, 260 dmg, knockdown.
- **Alternatives:** per-ability classes (rejected: data plus four delivery types covers the kit and scales to 100 fighters); Rapier sensors for projectiles (rejected: a ray per step is simpler, deterministic and cannot tunnel).

### TD-033: Impact feel and synthesised sound — ACCEPTED (owner request 11/11/2026)
- **Impact profiles** (`src/data/combat/impacts.ts`): per contact type (`knuckle-light`, `knuckle-heavy`, `kick`, `fire`, `fire-heavy`, `blocked`) a sound id, white-flash time, sparks (count, speed, colour), burst size, attacker recoil, hit-stop and shake. Attacks and ability payloads name a profile; weapons add their own later. `applyStrike` applies it on every contact (melee and abilities share it, INV-5); hit-stop takes the larger of the profile's and the KO's (0.18 s).
- **Flash:** `StickmanView.draw(..., flash)` blends limb and outline colours to white. **Recoil:** the striker loses `recoilMps` along the blow plus a 0.14 s visual bounce. **Sparks and contact flash:** new particle kinds in `AbilityVfx` (sparks arc and streak; a white star shrinks away in 0.09 s).
- **KO dissolve:** respawn moved to 3 s; from 1.0 s to 2.6 s after the KO the figure fades (smoothstep) while dust rises from points along the tilted body and drifts on a light breeze; `ko` and `dust` sounds.
- **Sound:** `SoundBoard` (`src/audio/sound-board.ts`) synthesises every effect with Web Audio: layered pitch-dropping thumps, filtered noise bursts and crackle, with a small random pitch and level spread so repeated hits differ. A compressor prevents clipping. It unlocks on the first input (browser rule), M mutes, `?mute` starts muted, and it is silent without Web Audio.
  - *Why synthesis:* the owner wanted sound now; there are no audio assets and OQ-17 (source) was open. Synthesis is original by construction (spec §2: no reference audio may be reused), costs nothing and adds no files or licences.
  - *Alternatives:* recorded or commissioned SFX (better realism, needs sourcing and licensing, can replace recipes later without code changes elsewhere); a free SFX pack (licence review, less control).
- **Debug hook additions:** `sounds` (recently played), `setDummyHp` (see a KO quickly).

### TD-034: Punch Clash — ACCEPTED (owner request 11/11/2026)
- **Rules** (`src/combat/clash.ts`, pure): `ClashTrigger` (rolling window of melee contacts per side, range check, cooldown) and `PunchClash` (intro → mash → done; power per press; opponent mashes at a data rate with a seeded uneven rhythm, +15% in the final stretch; exchange beats speed up 4 → 9 per second, 15 in the final stretch; `decideClash` with a 5% stalemate band). Tuning in `src/data/combat/clash.ts`.
- **Scene glue** (`src/app/scenes/scene-clash.ts`, `SceneClash` behind a `ClashHost`): locks both fighters on spots 1.05 m apart and makes them untouchable from outside; Button 1 becomes the mash button; each beat spawns sparks, flashes, a sound with rising gain and shake scaled by intensity; the camera uses a new `FollowCamera` focus override (10 → 6.5 m view, 5 m in the final stretch, held 0.6 s after, then the normal smoothing glides it back); the finisher goes through the shared `applyStrike` path as an unblockable heavy with a scaled impact profile; the stalemate throws both back and stuns them. Contacts are recorded in `applyStrike` (melee only).
- **Presentation:** clash poses (striker punches with alternating jab/hook looks, the other blocks; both swing on a collision); `ClashHud` (tug-of-war bar, both scores, timer, device-specific prompt, red final stretch, result banner); new synthesised sounds `clash-start`, `clash-collide`, `clash-break`; sound cues now carry a gain.
- **Alternatives:** a separate mini-game scene (rejected: breaks continuity; the owner wanted one cinematic gameplay event); random winner on ties (rejected by the owner: stalemate).
- **Practice/test hooks:** `startClash()` on the scene and the debug hook.

### TD-035: Wall transparency by drawn bounds and depth order — ACCEPTED (owner request 11/11/2026)
- `OcclusionFader` (`src/rendering/occlusion-fader.ts`) checks every interior-wall section, door section and prop each frame: if it depth-sorts after a fighter (its zIndex, the feet y, is larger, so it is drawn in front) and its drawn bounds overlap the fighter's (slightly inset), it fades linearly toward 30% opacity (full range in 0.2 s); otherwise back to 100%. Using real drawn bounds handles tall props, moving furniture and every arena without per-object geometry.
- *Alternatives:* ray casts from a virtual 3D camera (no 3D camera exists in 2D top-down); hiding objects outright (rejected by the owner: smooth fade, not disappearing).
- Cost: about 110 bounds checks per frame in the office; measured no visible frame-time change in the browser runs.

### TD-036: Aimed leaping ultimate — ACCEPTED (owner request 11/11/2026)
- The ultimate press is a toggle for leap ultimates: the first press (if the meter is full) enters aiming; the second launches. Aiming state lives in the scene (`ultAimPoint`); `SceneAbilities.tryCast(f, slot, aimAt)` passes the spot to the release instead of the soft lock. Touch sends a press on ULT down and another on up, with `PlayerIntents.setUltDrag` (a vector of length ≤ 1 × max range) while dragging, so both devices share one flow (INV-6).
- While aiming the fighter is rooted, faces the spot and holds the Meteor Fist wind-up crouch with a bounce; the indicator (range ring, dotted arc, landing zone) uses the same wall clamp as the leap, so it is honest.
- **Bug found and fixed:** ending a dash or leap left the body's velocity, so the fighter slid on about 1.2 m after landing; releasing the drive now stops the body.
- Keys: I = ultimate (owner); in the keyboard-only preset A3 moved to O.

### TD-037: Walk/run gait with arm IK — ACCEPTED (owner request 11/11/2026)
- `gaitPose` (`src/animation/greybox-motion.ts`): legs in opposition with leg IK (swing foot lifted while it moves forward), pelvis bob, lean; arms placed by a new **arm IK** (`armIk` in `skeleton.ts`) from fist targets in the torso frame, so each fist really moves opposite its leg whatever the elbow bend and lean (angle-driven swings were found to move the fist up instead of forward). Walk and run share the cycle; `runAmount(speed)` blends them (2.6 → 4.2 m/s) and `strideAt(speed)` keeps the feet in pace (1.2 m walk, 2.2 m run per cycle).
- Animator: walk weight rises sooner (starts stepping almost at once), run weight eases in.
- Movement: acceleration 32 → 50 m/s², deceleration 40 → 55 m/s² (snappier starts, stops and turns).

### TD-038: Centre cubicle block and material destruction — ACCEPTED (owner request 11/11/2026)
- Office: six back-to-back pairs (`cubiclePair` in `src/data/arenas/office.ts`) in one row in the centre; walkways 1 m wide; main room 25 m (the row needs about 22 m plus an open area before the door); office 33 × 12 m. Reachability tests found two cubicles too tight to step into and 0.85 m walkways barely passable, so chairs moved and walkways widened.
- New prop `drawer-unit` (steel, 260). Desk 320, cabinet 450 (was indestructible), executive desk 450, computer is glass (the screen).
- `ArenaProps`: desk items on a standing desk are hittable (they shatter, or are knocked off if they survive); a `BREAKUP` table per material sets piece count, size, speed and shape (rect or triangular shard); `PropEvent`s (hit/break with material, position, size) drive sounds and particles in the scene (steel/glass: sparks or glints; wood/fabric/plant: dust); new synthesised sounds `hit-wood`, `break-wood`, `hit-metal`, `break-metal`, `break-glass`, `hit-plastic`, `break-plastic`, `hit-soft`, `break-soft`.
- `?dummyAt=x,y` joins `?playerAt=` for tests and practice.

### TD-039: Data-driven character configuration — ACCEPTED (owner request 11/11/2026)
- **Engine-native form:** this is a web game, so characters are **JSON** (`src/data/characters/`) validated at load, plus a **local admin editor** page (`admin.html`) rather than an external tool.
- **Schema** (`src/characters/schema.ts`): Character Definition (identity, element, combat style, profile ids, rig, capabilities, unlock, ability kit, optional `template`), Animation Profile (state → clip ids, `extends`), Moveset Profile (moves with seconds-based timing, hit area, damage, knockback, impact, routes, requirements, effects, status; starters per input), Stats, Effects, Audio, AI profiles; `LIMITS`.
- **Resolution** (`resolve.ts`): template merge; capability filtering of moves and routes; stat multipliers; the 4-tier animation fallback with warnings. `FighterDef` is now the resolved character.
- **Clip library** (`src/animation/clips.ts`): strike clips (keyframed shapes; the old attack shapes moved here unchanged, so the Base Stickman plays exactly as before) and procedural clips (stances, gait, jumps, guard, reactions, falls). New: standard and taekwondo kicks, Inferno's clips, a taekwondo stance, and safe fallbacks.
- **MoveController** (`src/combat/moves.ts`) replaces the hard-coded 1-2-3 ComboController with data routes and four Button 1 inputs (tap, forward tap, air, falling), keeping INV-9 (five combat buttons).
- **Profiles wired into shared systems:** impact visuals by punch/kick/heavy/block and limb trails or auras (Effects), sounds per event with variations (Audio), Practice AI (AI), capabilities (jump, double jump, block, parry, Punch Clash, wall and ground bounce, disintegration, elemental effects), flash colour, effect and hit-stop scaling. New sounds: punch-light-b, kick-light, parry, footstep, jump, land, wall-thud.
- **Safety:** `loadCharacter` validates first; invalid data falls back to the Base Stickman with the report in the status bar. A unit test fails if shared code mentions a character name.
- **Alternatives:** TypeScript-only configs (rejected: the owner wants admin-editable files); a server CMS (later, with Phase 14 admin auth).
- **Limits today:** new clip *shapes* need a code addition in `clips.ts`; several mapped states (StartRun, Turn, HardLand, BlockMid/Low, AirborneHit, ClashEntry/Win/Lose/Stalemate…) share procedural motions until art (Phase 8); unlock data is display-only (server-validated in Phase 14); voice lines not yet supported.

### TD-040: Confident gait — ACCEPTED (owner request 11/11/2026)
- **Context:** the owner said the walk and run looked "not confident ... like it needs to go to the bathroom". Cause: the gait reused the boxer crouch (hips 0.63–0.67 m on 0.8 m legs, 13–24° hunch, chin tucked, fists clutched at the chin, feet stepping in a narrow stagger).
- **Decision:** `walkPose`/`runPose` in `src/animation/greybox-motion.ts` get their own upright shape: walk hips 0.735 m, lean −3° with a 2.5° chest roll per step, head level, 0.52 m foot sweep, fists swinging freely (arm IK) between hip and chest; run hips 0.71 m, lean −13°, high knees (0.24 m lift), 0.70 m sweep, elbows-bent arm drive. A `sway` gait parameter adds the chest roll. Walk stride per cycle 1.2 → 1.1 m so planted feet keep pace with the shorter, upright legs. Idle stances and attacks are unchanged (guard still up when standing or fighting).
- **Alternatives:** keep the guard up while walking (rejected: the owner's newest instruction; SUP-06); angle-driven arm swing (rejected earlier, TD-037: fists rise instead of swinging forward).
- **Trade-offs:** the guard drops while walking; the idle↔walk blend (already eased) covers the change. Per-fighter gaits remain possible via the procedural clip ids (REQ-ANI-7).

### TD-041: Turned walls and doors, swinging door, cut-away interior walls — ACCEPTED (owner request 11/11/2026)
- **Context:** the owner could not find the office door. In the top-down view height is drawn up the screen, so the 2.4 m wall south of the doorway covered the opening and showed the door about 2 m above where you walk through. The owner sketched a diagonal wall and asked for a smaller door that can also be walked through.
- **Decision:** `Rect` gains an optional `angleRad`; `src/core/oriented-rect.ts` holds the box-frame transforms, the circle/point distance and `segmentBox` (a wall along a segment). Physics (`addStaticBox` rotation), navigation, strike capsules, ability blasts, door contact and drawing (`src/rendering/prism.ts`: any footprint raised as a block, camera-facing sides only) all use it, so a turned wall blocks, is hit and is drawn in the same place. `BreakableDoor` adds an open state: a firm push (0.12 s, cos > 0.4 into the door, feet on the floor) removes its collider and swings the leaf away from the pusher; 1.4 s with nobody within 0.6 m swings it shut and restores the collider. Interior walls draw cut away at 0.8 m. Floor zones may have a polygon outline (the wooden boss floor).
- **Update (same day, owner sketches):** the wall became an arc built from 24 short turned pieces (`arcPieces` in `office.ts`) with the door at its apex; props beside it use `besideWall`; walls draw seamless (outlines only along their long sides) with a skirting board; the boss floor zone takes a polygon outline.
- **Alternatives:** keep the straight wall and only lower it (tried; the owner preferred a diagonal, then a curve); a stepped wall of axis-aligned boxes (rejected: jagged look, more colliders).
- **Trade-offs:** the closed door no longer seals the boss room during play (it opens on contact), so "fight in the main room" depends on AI behaviour later (Phase 10). Props are still axis-aligned.

### TD-042: Fire sound design and procedural background music — ACCEPTED (owner request 11/11/2026)
- **Context:** the owner wants fire-type sounds for Inferno's punches, kicks and abilities ("Fire Bolt sounds like a wooden plank", "Meteor Fist has no fire or excitement"), fight music per map and a menu theme. Three reference clips (fireball whooshes, fire magic) were supplied as references.
- **Decision:** the references were analysed for shape only (loudness over time and frequency balance: a swell over 0.3–0.5 s, energy at 150–400 Hz, a soft tail) and are **not** used or committed. The synthesiser gains flame `flutter` (amplitude tremble) and `drive` (overdrive) on layers; new original recipes: `fireball-cast`, `fireball-impact`, `fire-punch-light(-b)`, `fire-kick-light`, `fire-punch-heavy`, `fire-kick-heavy`, and reworked `fire-hit`, `fire-whoosh`, `fire-rush`, `fire-burst-small`, `fire-roar`, `leap-whoosh`, `meteor-impact` (a double explosion with a long crackle and sizzle). Inferno's audio profile uses the fire punches and kicks. Music: `src/audio/music.ts` is a lookahead sequencer on the Web Audio clock (no game-loop work) playing data tracks (`src/data/audio/music-tracks.ts`: tempo, scale, chord loop, drum patterns, bass, lead, pad, arpeggio). Each arena names its track (`music`): office "Overtime Brawl" (146 BPM), training yard "Sparring Grounds" (124 BPM); the menu theme "Before the Bell" (84 BPM) is ready for the menu screen (Phase 11) and previews with `?music=menu-theme`. Music shares the mute (M).
- **Alternatives:** licensed audio files (rejected for now: licence register, bundle size; still possible later through the asset register); copying the reference clips (rejected: not ours to ship).
- **Trade-offs:** synthesised music is simpler than produced tracks; the sounds are designed by measurement and cannot be listened to in the build environment, so the owner's ear on real speakers is the acceptance test.

### TD-043: 2.5D pseudo-isometric look — APPROVED by the owner ("Do it", 11/11/2026); implemented as TD-045
- **Context:** the owner asked for a high-end 2.5D pseudo-isometric style (light-wood plank floors on an isometric grid, detailed bevelled furniture, soft shadows from a top-left light, ambient occlusion, a volumetric stickman and a procedural fire head that lights the room) and asked for mockups first, to approve before anything is rebuilt.
- **Proposal:** mockups in `docs/mockups/` (`style-2-5d.html`, animated; PNG stills). If approved: keep PixiJS 8 and the 2D simulation unchanged (physics stays top-down in metres); change only the presentation: an isometric projection in the camera/world transform, props drawn as bevelled prisms with baked gradients, a shadow layer (blurred, pooled), the y-sort key moved to the isometric depth (x + y), and the fire head as a pooled particle/shape emitter with an additive light sprite. Collision, combat and data stay as they are.
- **Approval needed:** changing the approved rendering approach (TD-022, REQ-ARC-12) needs the owner's sign-off, so nothing in the game changes until the mockups are approved. Performance on phones must be measured (OQ-10).

### TD-044: Pickup, carry and throw, first slice (Phase 7) — ACCEPTED (11/11/2026)
- **Decision:** the contextual interact (TD-016): desktop **G or U**; the touch utility button is GRAB near a throwable, THROW while carrying, otherwise JUMP. Press near a throwable (within 0.85 m of the feet, not behind) to lift it overhead; a short press throws it at the locked target when it is roughly ahead and within 12 m, otherwise the way the fighter faces or moves; holding 0.6 s puts it down. While carrying, melee and abilities are off, walking slows by weight (×0.6–1), and a hit makes you drop it. A thrown object is a physical body (bounces off walls) under a height arc; above 0.95 m it flies **over furniture** (new collision group FURNITURE, separate from walls), lower it collides with furniture again. It hits each fighter once while faster than 2 m/s and below 1.9 m, through the shared strike path (damage and knockback by mass and speed, heavy at 8 kg+), then takes damage itself; glass and ceramic shatter on a hard landing; thrown furniture is planted again where it comes to rest. Tuning: `src/data/combat/throwing.ts`. Carry and throw poses; carried objects never fade (occlusion exemption).
- **Not yet (next slices):** AI using objects (Phase 10), fighter-specific interactions via data (Titan heavy lifts, Shadowfang rapid light throws, spec §8), an aim indicator for throws, rolling objects and more throwables (staplers, books, folders, bottles, extinguishers; REQ-PHY-9), debris cleanup budget review.

### TD-045: 2.5D isometric presentation over a top-down simulation — ACCEPTED (owner approval 11/11/2026)
- **Decision:** keep PixiJS 8, Rapier and the whole simulation in top-down metres; change the presentation only. `src/rendering/projection.ts`: X = (x − y)·C, Y = (x + y)·C·T − z (C = √½, T = ½). Floors (floor zones, planks, rugs, door mats, scorch marks, rings, telegraphs, aim rings, firelight, debug colliders) live in a floor layer with the affine `FLOOR_MATRIX`, drawn in world metres. Standing things are placed at their projected feet: walls and doors as prisms from projected footprints, furniture as bevelled isometric blocks (`src/rendering/iso-draw.ts`: lit left face, shaded right face, bevel highlight, base ambient occlusion, layered soft shadow), fighters as upright billboards. Y-sorting on projected Y (= x + y). VFX particles and flashes are drawn at projected 3D points. The camera, its bounds and the overview fit work in view units. Back walls are tall with windows; front walls are 0.3 m ledges. Office palette: light-wood planks, warm white walls.
- **Controls and combat:** devices report screen directions; `PlayerIntents.screenToWorld` maps them so W walks up the screen. Fighters gained a free facing direction (`aim`); attacks, lunges, knockback, block-from-front, pickup, throws, ability aim and the Punch Clash all use it, and starting an attack soft-locks toward an opponent within 2.8 m unless well behind (TD-016). The drawn figure flips by the screen side of `aim`.
- **Fire head:** Effects Profile `head: "flame"` (validated; Inferno uses it): layered additive tongues, a glowing core with a blue base, embers and eyes, streaming back with speed; a flickering pool of firelight on the floor.
- **Performance:** measured in software WebGL (SwiftShader, the CI/test renderer): training yard 53 simulation steps per second (was 48), office 25–29 (was 37) because of the much richer furniture; a full-floor "window sheen" overdraw was removed after measuring (it halved the yard's speed). Occlusion now caches each target's shape. Real phones (GPU) are not measured yet (OQ-10).
- **Alternatives:** a skew of the whole world container (rejected: heights would skew); keeping axis-aligned combat (rejected: in this view you rarely line up on a world axis).
- **Trade-offs:** sliding furniture keeps its upright drawing (no spin), small loose items still tumble; prop drawings are greybox-quality in the final style until the art pass (Phase 8).

### TD-046: Dodge button, weight-based cooldown, data-driven dodge clips; material toughness — ACCEPTED (owner request 11/11/2026)
- **Dodge:** `dodgeCooldownFor(massKg)` in `src/combat/combatant.ts` (base 0.15 s + 0.0055 s/kg, clamped 0.3–1.5 s); `CombatStats.massKg` comes from the Stats Profile's body. New animation state `Dodge` with procedural clips `proc.dodge.roll` (shared default: a tucked ball turning a full circle backwards about its centre) and `proc.dodge.flame` (Inferno: the body fades into a forward-trailing flame with an ember trail, then reforms). A touch `.dodge-button` (non-combat, like UTIL) fills as the cooldown recovers; debug state `dodgeReady`.
- **Toughness:** `MATERIAL_TOUGHNESS` in `src/data/objects/props.ts` scales the durability damage a prop takes (metal 0.45, stone 0.6, others 1). Durability values are unchanged; metal simply resists.
- **Alternatives:** raising every metal durability (rejected: easy to miss new metal props; toughness applies to all of them).

### TD-047: Phase 7 slice 2 — throwables, aim indicator, per-fighter object handling — ACCEPTED (11/11/2026)
- **Data:** new prop kinds `book`, `stapler`, `water-bottle`, `paper-stack` (desk items) and `fire-extinguisher` (floor, solid, metal). Stats Profile `objects?: { maxLiftKg, throwPower, ignitesThrown }` (defaults 15 kg, ×1, false; limits validated); resolved into `FighterDef.objects`. Inferno: 15 kg, ×1.1, fire.
- **Behaviour:** pickup skips objects heavier than the fighter can lift; throw speed × √power, impact damage × power; a fire throw sets the object burning (flames drawn on the object in the air), its hits burn the target (12 dps for 2 s) and ignite flammable props. A broken extinguisher plays `foam-burst` and releases a white foam cloud.
- **Aim indicator:** `FightArenaScene.throwAim` predicts the landing point from the launch arc and throw speed, cut short only by walls and doors (`castWorldRay(…, furniture = false)`), drawn with the ultimate's arc renderer (no range ring).
- **Not yet:** AI using objects (Phase 10); further roster styles (Titan heavy lifts, Shadowfang rapid light throws) arrive with those fighters (Phase 9) through the same `objects` data.

### TD-048: Prop facing; full-height glass-door wall; breakable wall sections — ACCEPTED (owner request 11/11/2026)
- **Facing:** `PropPlacement.facing` (n/s/e/w). Fronts facing the camera (s, e) show their details; fronts facing away (n, w) leave the plain back; chairs put the backrest opposite their facing; the sofa's back follows. Office data sets facings for the bottom-wall pieces, the boss room's wall cabinets, cubicle chairs on the south side, the meeting table's south chairs, and the visitor and boss chairs.
- **Wall:** interior walls 2.2 m again (SUP-08); door leaf glass (alpha prisms) in a dark metal frame.
- **Breakable sections:** `WallRect.durability`; `src/environment/breakable-wall.ts` gives each section its own collider and hit points (stone toughness 0.6). A hit with an impact point chips only the nearest section touched (melee uses the capsule tip, slams the body, blasts their centre), so damage digs one hole. Blasts deal ×3. Breaking removes the collider, hides that section's blocks, throws rubble and plaster dust, plays `break-wall`; chips thud and add crack lines at 66% and 33%. Debug hook `damageWall(index, damage)`.
- **Trade-offs:** navigation still treats sections as solid (AI pathing through holes comes with Phase 10).

### TD-049: Rebindable desktop controls, Settings, sprint, right-click dodge, mouse-aimed leap, four-hit combo, quick dodge — ACCEPTED (owner request 11/11/2026)
- **Bindings:** `src/input/bindings.ts` holds one code per action (`KeyboardEvent.code` or `Mouse0..4`), the owner's defaults, `checkBinding`/`rebind` (conflicts and reserved keys refused with a message) and `sanitiseBindings`. The aimed-ultimate launch (`ultimateLaunch`) is the one action allowed to share a code, and only with `attack` or `ultimate`, because it only acts while aiming.
- **Devices:** `DesktopInput` (`src/input/keyboard.ts`) turns bound key and mouse codes into intents for both devices, reading the live bindings on every event; `attachMouse` also reports the cursor (`PlayerIntents.setPointer`) and cancels `contextmenu` over the game. New intents: `sprint` (held), `pressUltLaunch`, `pointer`/`pointerMoves`.
- **Settings:** `src/input/settings-store.ts` (`SettingsState`, localStorage key `stickman-arena.settings.v1`, repaired on load, survives refused writes); `src/interface/settings-panel.ts` (gear button and Esc; Audio and Controls tabs). While open the game loop's time scale is 0 and desktop input is ignored. `SoundBoard.setVolume` and `MusicPlayer.setVolume` apply volumes live.
- **Scene:** sprint multiplies max speed by `SPRINT.speedFactor` (1.45) while moving freely on the ground. While a leap ultimate is aimed, attack edges are swallowed, the cursor (when it moves) places the spot through the inverse of `worldToScreen`, and the launch or the ultimate key jumps.
- **Combo:** movesets gain a third punch (base `cross`, Inferno `hook`); the finisher is a kick (base `heavy` is now a roundhouse kick, category kick). Total damage unchanged.
- **Quick dodge:** clip `proc.dodge.quick` (shared default) blends `quickDodgePose` (forward/back/side by the dash's screen direction relative to facing) and draws speed lines (`DodgeLook.dash`). The roll clip stays available to profiles.
- **Alternatives:** keeping both desktop presets with secondary keys (rejected: ambiguous conflicts when rebinding); a separate pause system (rejected for now: time scale 0 already freezes the fixed step; a proper pause menu arrives with menus).
- **Limitation:** there is no main menu yet, so Settings opens in game only; the store is ready for the menu to reuse.

### TD-050: Magic Attack VFX Standard; beam delivery; distance falloff; flame body style — ACCEPTED (owner request 11/11/2026)
- **Look as data:** `AbilityDef.look` (`MagicLook`: palette, charge, flight, impact, hitFlash) drives the shared `AbilityVfx` (gathering motes, swelling cores, projectile tails, beams, flash-first impacts, flame rings, delayed smoke). FX events carry the look. Abilities without a look keep the earlier default fire effects.
- **Beam delivery:** `BeamDelivery` in the shared ability world. A beam is re-aimed from the caster every step, cut short by `host.blocked`, and hits on a fixed tick. It is cancelled with the caster.
- **Falloff:** `DamageFalloff`, `falloffFactor` and `payloadAt` are pure functions applied by the world before the shared hit path, so the combat rules (block, dodge, crit) still apply.
- **Hit flash:** an optional colour on the hit path (white for magic).
- **Fire KO:** `FighterEntity.koByFire` (set by fire hits) and `Combatant.koByBurn` select the ember-ash dissolve, charring and flames.
- **Body style:** Effects Profile `body: 'solid' | 'flame'`, validated; `StickmanView` draws the flame body.
- **Alternatives:** an animated sprite sheet per ability (rejected: no art pipeline yet, and procedural effects stay consistent with the vector style); per-ability effect classes (rejected: duplicated logic, against the data-driven rule).
- **Trade-off:** the 1 s beam charge (2 s until the owner shortened it, 12/11/2026) and the 0.4 s Fireball charge make both easier to interrupt. That is intended (the wind-up is the counterplay).

### TD-051: Procedural ambience engine replaces the music sequencer — ACCEPTED (owner request 12/11/2026)
- **Decision:**
  - `src/audio/ambience.ts` (`AmbiencePlayer`) plays `AmbienceDef` data (`src/data/audio/ambiences.ts`) through a generated reverb, optionally muffled. The data has:
    - beds: looping coloured noise through filters, sine hums, and a crowd made of noise bands whose levels chatter independently;
    - slow random swells;
    - random one-off events: creak, thump, tick, knock, flicker, vent click, cheer, applause, whistle, ooh, roar.
  - `react('heavy-hit' | 'ko')` lets a crowd answer the fight; bootstrap sends a cue on KOs and on hits of 100 damage or more.
  - Same API as the old player (attach, play, setMuted, setVolume, stop), and it obeys the hidden-tab pause.
  - The music sequencer and its track data are removed (SUP-15). Arenas name an `ambience`; preview any one with `?ambience=<id>`.
- **Reference:** the owner's suspense track was analysed by spectrum and loudness only and is not used or committed. What carried over is its shape: dense, low-heavy, constant, with swells about every 5 s and occasional large surges.
- **Verification:** 30 s clips were rendered offline through the real engine (an `OfflineAudioContext`, with a `lookaheadS` constructor option) and measured. The office holds steady around -18 dB with sparse events; the Colosseum surges by about 4 dB and lifts at a KO. Previews are in `docs/audio-previews/`.
- **Trade-offs:** synthesised crowds are less realistic than recordings. Recorded or licensed ambiences can replace beds later without changing the API. The build environment cannot play audio, so the owner's ear is the acceptance test.

### TD-052: Rampage's building blocks; main menu and fullscreen — ACCEPTED (owner request 12/11/2026)
- **New delivery types:**
  - `strike`: one close blow straight ahead, hitting fighters, furniture and doors in reach;
  - `buff`: a timed self-buff with speed and damage-taken factors, through `host.buff`, `FighterEntity.buff` and `Combatant.damageTakenScale`.
- **New payload fields:**
  - `stunS`: the hit path stuns the target;
  - `wallDamage`: breakable wall sections take this instead of the payload damage, so a charge smashes them while solid walls still stop the body.
- **Magic look additions:** `impact.groundFire` (off for dust and debris) and `impact.smokeColour`.
- **Effects:** a fury aura (motes, steam, a floor glow) and a dash dust trail are drawn by the shared effects layer from the ability's look.
- **Object handling:** `objects.liftsFurniture` lets a fighter pick up movable furniture up to `maxLiftKg`.
- **Looks:** head style `brute` (round, with glowing eyes) and body style `muscle` (TD-053; replaced the first `rhino`/`armour` styles), plus a `rage` tint on the view. The flame head and body styles still need the fire-effects capability; other styles always show.
- **Menu:** `MainMenu` lists every built-in playable fighter made from a template. Play reloads with `?character`, `?scene` and `?play`; the same choice just resumes. Settings and the menu share one pause mechanism.
- **Fullscreen:** `enterFullscreen` runs from a tap: on Play, on the first tap of a game on touch devices, and from the Settings button.
- **Alternatives:**
  - a fourth ability slot (rejected by the owner);
  - an in-place scene swap on Play (deferred: a reload is simpler and resets cleanly; fullscreen comes back on the first tap).

### TD-053: Fighter size scale, muscle body style, body-charge collisions, steerable beams, lift time — ACCEPTED (owner requests 12/11/2026)
- **Context:** the owner asked for Rampage to be twice Inferno's size and far more muscular, then redesigned him as Rampage Buffer (a grey, muscular human stickman with a round head) with a powerful two-legged charge; heavier furniture should take longer to lift; Inferno's Fire Beam should be steerable.
- **Decisions:**
  - `rig.scale` (character data, validated 0.5–2.5) draws a fighter bigger. `StickmanView` scales an inner container about the feet. The hop height, limb tips, the bar and number positions above the head, and the carry height follow it. Collision size and reach stay in the stats and moves (Rampage: foot radius 0.55 m, reach +0.35 m).
  - Body style `muscle`: the muscle masses of each limb are drawn in two passes (all outlines, then all fills), so they merge into one smooth silhouette in the house line style. Definition lines, highlights and a pale rim light go on top. Head style `brute`: a round head with glowing slit eyes. The rhino head and armour styles are removed (SUP-16).
  - `DashDelivery.collision`: a body charge stops dead in the first fighter it hits, or when it barely moves although driven at full speed (a solid wall). It then emits a collision burst of the given radius; 2 m or more shakes the screen.
  - Ability animations: a `run` upper-body pose is held while a charge drives the body, and the legs keep the gait's sprint cycle, so the fighter runs on two legs. An `after` pose plays once the drive stops, and a `tremble` makes the wind-up shudder.
  - `BeamDelivery.turnRadPerS` with optional host hooks `steer` and `face`. The scene steers the player's beam by touch swipe, or by the mouse once it moves; the AI tracks the nearest opponent. The beam turns at a limited rate, and the caster turns with it while staying rooted.
  - `THROWING.liftTimeFor(massKg)`: lifting is a timed phase. The fighter is rooted, the object rises from the hands to overhead, and it cannot be thrown until it is up. A hit drops it.
- **Alternatives:**
  - scaling bone lengths instead of drawing at a scale (more knock-on changes to poses and anchors);
  - a separate quadruped charge rig (rejected by the owner: two legs).
- **Trade-offs:**
  - Hit sparks from other fighters' blows still appear at standard heights on the big fighter.
  - The charge now hits only one fighter (it stops in the first). This is fine for 1v1; revisit for 3v3.

### TD-054: Teams, summoned minions and Necro's building blocks — ACCEPTED (owner request 12/11/2026)
- **Context:** Necro raises skeleton warriors that need independent AI, targeting, attacks and deaths; they must not spawn inside walls or furniture, must expire, and must not pile up without limit.
- **Decisions:**
  - Every `FighterEntity` has a `team`. Melee, throws and abilities skip their own side; `AbilityTarget.team` lets the ability world skip friendly fighters.
  - Summons are real fighters on the summoner's team (`src/app/scenes/scene-summons.ts`), so the shared combat engine (INV-5) gives them movement, attacks, hit reactions, KO and the crumble for free.
    - Their AI goes for the nearest enemy in sight, attacks in reach, and otherwise follows the summoner.
    - They have a lifetime, crumble when it runs out or their summoner falls, and are capped per summoner (the oldest goes first).
    - Spawn spots are ray-checked from the summoner, and `PhysicsWorld.isFree` rejects overlaps.
    - A summon leaves the depth sort before its view is destroyed.
  - Ability framework additions:
    - payload `lifesteal`;
    - nova `atTarget`;
    - a `summon` delivery;
    - buff `abilityDamageFactor` and `summon`;
    - `Combatant.expire()`.
  - Character data additions:
    - the character type `summon` (never playable or listed);
    - head styles `hood` and `skull`;
    - body styles `robe` and `bones`;
    - effects `held` (`staff`, `bone-sword`);
    - the idle style `proc.idle.mage`.
  - View states: `StickmanView.magic` (glowing skull eyes and violet energy) and `heldSwing` (the staff follows a swinging arm, otherwise it stands upright, planted when the hand is low). Ability poses can levitate through `liftM`.
- **Alternatives:** a separate lightweight minion system with its own hit detection (rejected: it duplicates the combat engine).
- **Trade-offs:** summons add bodies to the physics world (at most 6 per summoner).

## Unresolved technical questions
- Performance budgets (OQ-10).
- Final backend sign-off at Phase 14 (TD-008, TD-017).

## Dependencies
Installed (see `package.json`): pixi.js 8.22, @dimforge/rapier2d 0.21 (TD-023); dev: typescript, vite, vite-plugin-wasm, vitest, @playwright/test, @biomejs/biome, @types/node. `npm audit`: 0 vulnerabilities (10/11/2026).

### TD-055: Point-aimed abilities, blindness, permanent summons, ratings and the fighter sheet — ACCEPTED (owner request 12/11/2026)
- **Context:** Necro's Teleport needs a chosen spot; Soul Drain blinds; the ultimate's skeletons never expire; the menu shows comparable stats and device-specific how-to text.
- **Decisions:**
  - A `teleport` delivery; the scene keeps one point-aim state for abilities that pick a spot, and `teleportTo` lands on the nearest free spot (rings of candidates) with a 0.3 s fade-in.
  - Payload `blindS`; `Combatant.blind()`. A blinded fighter cannot lock on; summons and the dummy treat every target as missing; the player sees a vignette (`BlindVeil`).
  - `SummonSpec.lifeS: null` means no timer; `near: 'enemy'` spawns around the nearest enemy; `persistent` summons outlive their summoner.
  - `fighterRatings()` maps raw stats to 0–100 ratings on fixed scales; a unit test enforces the balance rule (REQ-ABL-16).
  - `fighterSheet()` builds the details screen from data (pure), so ability text never drifts from the numbers.
- **Alternatives:** hand-written stat bars (drift from data); per-ability scene branches for teleport (rejected: data-driven delivery instead).
- **Status:** ACCEPTED.

### TD-056: Targeting, a fourth slot, grabs and pulls, walk/run split, climbing — ACCEPTED (owner requests 12/11/2026)
- **Targeting:** one targeting state in the scene for aimed abilities; the move input (keys or joystick) slides the target at the delivery's `aimSpeedMps`; the ability's own key confirms; an `aimCancel` intent (Escape, touch ✕) cancels. The `ultimateLaunch` binding is removed so no key is shared; settings storage moves to v2 (volumes carried over, keys reset to the new defaults).
- **Fourth slot:** `AbilitySlot` gains `a4` (kit field required); HUD, touch, bindings and the fighter sheet iterate the slots. New framework pieces: payload `pull` (the world drags the target with `drive`), delivery `grab` (hold, hoist with `drive` lift, slam), host `hold`; dashes with `untilBlocked` run until a solid stop, and the caster's recovery waits while it is still driven.
- **Animation:** the animator walks unless `sprinting` (or a charge drives the body) and blends a relaxed stand after 3 s calm; jump height is measured from the floor the feet stand on.
- **Climbing:** `HopState.floorM` (surfaces you stand on); `PropKind.climbable`; `src/physics/climbing.ts` pure rules (grab reach, fall damage by drop and mass); `SceneClimbing` toggles a fighter's furniture collisions above furniture height and blocks taller pieces itself.
- **Braxon:** muscle bodies draw both legs before the torso so the pelvis covers the hip joints, and the head before the near arm.
- **Alternatives:** per-prop Rapier filters (too fine-grained for 2D top-down); mouse aiming kept alongside keys (rejected: the owner asked for keyboard targeting and K conflicts).
- **Status:** ACCEPTED.

### TD-057: Heavy Attack input, bleed, buff effects, beam ramp and sweep, target lock, fight intro, tumbling props — ACCEPTED (owner requests 12/11/2026)
- `MoveInput` gains `heavy` (`MoveController.pressHeavy`, never chained); animation state `HeavyAttack` is a strike state. Moves may carry `status.bleed`.
- `Combatant.bleed()` (damage over time beside burn); payload `bleed`; `BuffEffect` adds attack speed, melee damage and melee bleed (applied in melee resolution and combo timing). Teleport delivery `behindTargetM` lands behind the nearest enemy.
- Beam `ramp` (per-target contact time, reset on a missed tick). Beam keys `beamLeft`/`beamRight` may share keys with normal actions only.
- Target lock in `stepFighter` (sight range, wall ray, not blinded); pickup accepts pieces behind (front preferred).
- Fight intro: a fixed scene timeline locks control; presentation (DOM overlay, speech synthesis, synthesised impacts) keys off the same phases. Speech is the browser engine's: quality varies by device.
- Props carry `roll`/`rollVel`; landing settles to the nearest quarter turn; replanting keeps roll and yaw.
- **Status:** ACCEPTED.


### TD-058: Status effects in the shared combatant, recorded audio assets, offline audio tooling — ACCEPTED (owner requests 12/11/2026)
**Context.** The owner asked for a debuff (Curse of Decay), a vision limit (Hunting Frenzy's lights out), battle music and a recorded fight stinger modelled on supplied references, and stable throws.
**Decision.**
- *Statuses:* decay (attack and defence factors) and darkness (sight radius) live in `Combatant` next to blind and bleed, so the one damage path applies them to every blow, ability and throw, and every system that looks for targets (player lock, dummy AI, summons) reads `sightM`. Presentation reads them; it never changes them.
- *Audio assets:* the first recorded runtime audio, in `assets/audio/` as Ogg Vorbis plus MP3, imported with Vite `?url` (hashed). The battle music is the owner's supplied track (an original "Steel Rain" was rendered first, then replaced at the owner's instruction the same day); it was prepared once for looping (fade-out cut, end crossfaded 0.35 s on the beat into 43.7 s, loop points found by onset and spectral matching, seam checked in the browser). The stinger is rendered by `tools/audio/fight_stinger.py` (numpy synthesis). `MusicLoop` plays the intro once, then loops [startS, endS) on the Web Audio clock, times measured from the first sound so encoder padding never shifts them. Automated browsers skip music unless `?music=` asks for it (as with the ambience).
- *The announcer voice* stays the browser's speech engine: no offline voice engine or voice model could be reached from the build environment; the stinger carries the drama around it.
- *Throws:* no scripted yaw spin; the pitch is a pure function of the throw (`throwRollRadPs`).
- The Teleport double-press form framework (TD-057 era, `doubleTap`) was removed with Teleport; it is in history (af0d35e) if a later ability needs it.
**Alternatives.** Procedural Web Audio music (rejected: the owner asked for real assets); using the supplied reference files (rejected: references are guides only, spec §2); a status-effect component system (premature with four statuses).
**Trade-offs.** About 8.5 MB of audio (both formats; a browser downloads one, about 4 MB); the music cannot be heard in CI, so its checks are measured (loop points, seam continuity, decode in the browser) and the owner's listening is the final judge. The supplied track is third-party: its licence must be confirmed by the owner (see the asset register).

### TD-059: Premium redesign inside the code-drawn 2D renderer — ACCEPTED (owner approved the prototypes 13/11/2026)
**Context.** The owner asked for a full visual redesign toward painted, muscular fighters and detailed furniture (reference images 2 and 3), starting with two prototypes for approval: Inferno with a portrait, and a bookshelf.
**Decision.** Stay inside the approved renderer (TD-022, TD-045: PixiJS vector drawing, no change to the rendering or physics architecture). A premium look is a **body style** with its own model module drawn on the shared rig (`magma`: `src/rendering/magma-model.ts`), so every animation, ability and reaction drives it unchanged and shared code still never names a character. Painted volume comes from layered fills (outline, mid tone, shadow side, lit side, warm rim), muscle masses, armour plates and an additive glow layer. Portraits stay rendered from the in-game model (no second painting to drift out of step); premium ones add a lit backdrop, vignette and frame and render at twice the resolution. Furniture redesigns replace only the prop's drawing (`src/rendering/bookshelf-view.ts`); size, collision, climbing and damage come from the prop data as before.
**Alternatives.** Hand-painted sprite sheets (rejected for now: every animation would need painting, and it changes the asset pipeline and the rendering approach, which needs owner approval); a 3D renderer (rejected: architecture change).
**Trade-offs.** More draw calls per redesigned fighter (still well within budget for a few fighters); quality is limited to what vector drawing can do, so it reads as polished cel-painted art rather than airbrushed illustration.
**Status.** ACCEPTED: the owner approved the Inferno and bookshelf prototypes ("I prefer this styling a lot more"), asking for slimmer boots (done). This style is the standard for the rest of the redesign.

### TD-060: Redesign made the default, melee-to-object damage scale, rising outer walls — ACCEPTED (owner requests 13/11/2026)
**Context.** The owner approved the redesign for every fighter and asked to replace the old look, to cut melee damage below abilities, and for taller arena walls seen only when a fighter is in the air.
**Decision.**
- *Redesign:* the `?redesign` preview gate is removed; `PremiumModel` skins (by body style) and premium portraits are the only look for every fighter with a skin. No second, competing look is kept (integration rule); the old look is in git history (before this change).
- *Damage:* taps, heavies and air attacks are cut in each moveset's data (light opening hits, a moderate finisher, every melee blow below the fighter's damaging abilities). Objects keep their tuned feel through `MELEE_OBJECT_DAMAGE_SCALE` (1.7) on melee's damage to props and walls, so durabilities did not change.
- *Walls:* the outer walls' extra height (to 4.5 m) is a static presentation layer in `buildArenaView`: solid back walls, front walls as faint glass with a faint top edge. Colliders and arena bounds are untouched. (A first version raised them only while a fighter was airborne; the owner asked for them always visible, SUP-28.)
**Alternatives.** Keeping `?classic` as a fallback (rejected: two looks to maintain); retuning every prop's durability (rejected: more data churn, same result); fully opaque tall front walls (rejected: they hide the fight in the 2.5D view).
**Trade-offs.** The back walls' raised tops sit mostly above the usual camera framing; the front glass is kept faint so it never hides the fight.
**Status.** ACCEPTED.

### TD-061: Fighter AI as a pure brain in `src/ai/` driving the shared action paths — ACCEPTED (owner request 13/11/2026)
**Context.** The owner asked for AI opponents that use abilities, heavy attacks and climbing, and to pick the opponent (the training dummy by default, or any fighter).
**Decision.** `src/ai/fighter-brain.ts` holds `FighterBrain` (pure decisions from a `BrainView`: positions, what each foot stands on, whether it can act, ability readiness and distance bands, its AI profile) and `abilityBand` (each ability's useful range from its delivery data, no character names). The fight scene builds the view each step (`controlAi`) and turns the output into the player's own paths: `tryCast` with the target as the aim point, `pressHeavy`, `press`, and `stepFighter` movement and jumps (the climbing rules then land on or grab furniture). An opponent with an ability kit is run by the brain; the training dummy keeps `controlDummy`. The main menu adds an Opponent row that sets `?opponent=`.
**Alternatives.** A behaviour-tree library (rejected: a dependency for a small state set); scripting each fighter's AI (rejected: fighter-specific branches in shared code).
**Trade-offs.** Tactics are simple (range bands, timers, aggression); no path-finding round furniture yet (REQ-AI-5), so an AI can get stuck behind a desk until the player moves.
**Status.** ACCEPTED.

### TD-062: Tournament as pure bracket rules, page-per-match flow with saved state; AI path-finding grid — ACCEPTED (owner request 13/11/2026)
**Context.** The owner asked for a knockout Tournament mode (4 to 16 fighters, expandable, watch or skip AI battles, bracket and champion screens), plus AI path-finding and difficulty levels.
**Decision.**
- *Rules:* `src/modes/tournament/tournament.ts` is pure (no engine, storage or randomness of its own): bracket creation with byes for any size, result recording with validation (only the two fighters in an undecided current-stage match), rating-weighted simulation, stage names, placement. `tournament-flow.ts` holds the stage-to-stage rules; `tournament-store.ts` saves the tournament and history in localStorage (display only; nothing pays out client-side).
- *Matches:* `FightArenaScene` gains a `match` option: no respawn, first KO wins, a 150 s limit decided on health share, `onMatchEnd` once, `endMatchNow` for Skip battle, and spectator mode where the AI also plays the player side. `src/app/tournament-page.ts` runs the bracket page (`?mode=tournament`) and match pages (`&match=<id>`, `&watch`), reusing the existing page-per-fight model.
- *AI:* `src/ai/nav-grid.ts` (A* on a 0.5 m grid built from physics free-space queries, string-pulled) gives `FighterBrain` a waypoint when the straight line is blocked; `src/data/ai/difficulty.ts` scales its timing and boldness.
- *Tests in production builds:* the live scene is exposed to browser tests through a storage flag (`stickman-arena.test-hooks`), since e2e runs against the production preview.
**Alternatives.** One long-lived page with an in-app router (rejected: more state to tear down between fights; the page-per-fight model already works); simulating every AI match in real time off-screen (rejected: cost); navmesh polygons (rejected: overkill for these arenas).
**Trade-offs.** Each match reloads the page (a few seconds on slow phones); the tournament lives in one browser; only 4 fighter types exist, so bigger fields repeat fighters (numbered).
**Status.** ACCEPTED.

### TD-063: Per-fighter brain designs as data, one interpreting brain; difficulty as intelligence — ACCEPTED (owner request 13/11/2026)
**Context.** The owner asked that every fighter have its own AI brain built around its personality and kit, that difficulty raise intelligence rather than damage, and that every fighter use its whole kit at every level (Necro on Easy only used his ultimate: the old brain always closed to punching range, where his ranged spells never fitted).
**Decision.** Each fighter gets its own AI profile and a `BrainDesign` in `src/data/ai/brains.ts` (range, movement style, defence, retreat, hit-and-run, a tactic per ability, combo chains). `FighterBrain` interprets any design; difficulty (`src/data/ai/difficulty.ts`, now with Expert) sets reaction, mistakes, combos, punishing, defending, aim lead, cooldown planning and adaptation. Abilities and basic attacks rotate (weights grow with time since last use; a basic attack unused for 12 s is due; a planner never holds an ability for more than 20 s), so the whole kit appears at every level.
**Alternatives.** A hand-written brain class per fighter (rejected: duplicated engine logic and fighter branches in shared code); behaviour trees (rejected: heavier for these needs).
**Trade-offs.** Personality is expressed through parameters, so very unusual fighters may need new design fields; tests use seeded 45 s fights and assert the kit is used, not exact tactics.
**Status.** ACCEPTED.

### TD-064: Upright phones get a turned landscape layout; layout sizes published as CSS variables — ACCEPTED (owner request 13/11/2026)
**Context.** The owner wants landscape fullscreen at launch without asking players to rotate. Browsers only grant fullscreen and orientation lock after a tap, and iPhone Safari has no orientation lock at all.
**Decision.** On touch devices held upright, `src/interface/landscape.ts` lays the page out at landscape size and turns the body a quarter turn (`html.force-landscape`); the transform makes the body the frame for every fixed overlay and the renderer sizes to its container as before. Touch positions are mapped back into the layout by `src/input/screen-space.ts` (input stays the only code reading pointer positions). Because `vw`/`vh` and size media queries would describe the upright screen, the stylesheet uses `--vw`/`--vh` and the `short`/`narrow` classes instead. The first tap still requests fullscreen plus a landscape lock; once the screen is really landscape the turn is dropped.
**Alternatives.** Keep the turn-your-phone screen (rejected by the owner); rotate only the canvas (rejected: every HTML overlay would also need turning).
**Trade-offs.** New CSS must use `--vw`/`--vh` and the size classes, not raw viewport units or size media queries; the browser's own UI (address bar) stays upright until fullscreen.
**Status.** ACCEPTED.

### TD-065: Admin Screen chosen by the registered name, on the device only — ACCEPTED WITH A FLAGGED RISK (owner request 13/11/2026)
**Context.** The owner asked that the player name `addmen1280` grant the Admin Screen and every other name the User Screen. The project's security rules say a username is **never** proof of admin privilege; roles must come from verified server-side identity (REQ-BE-4). No server exists yet.
**Decision.** Implemented as asked, as a **screen choice only**: `src/admin/local-access.ts` (`isAdminName`, exact match). The Admin Panel holds tools that only change this browser's own copy of the game (fighter overrides in localStorage, practice set-up). Nothing valuable, shared or published is reachable from it.
**Risk (flagged to the owner).** Anyone can type the name or edit the page, so this hides the tools; it does not protect them. Before any admin action affects other players or published data, it must move behind a server-verified role with an audit log (REQ-BE-4); the name gate must then be removed.
**Alternatives.** A password (rejected: still client-side, gives a false sense of security); refusing (rejected: the owner's explicit instruction, and the tools are local-only today).
**Status.** ACCEPTED for local tools only.

### TD-066: Front end as one screen module; title art with painted plates; select stances as data — ACCEPTED (owner request 13/11/2026)
**Decision.** `src/interface/front-end.ts` owns title, name, Game Modes, fighter select and quit screens; the old main menu is kept intact as the Admin Panel (no functionality removed). The title is the owner's supplied art covering the screen (cover fit, centred) with invisible buttons positioned in picture percentages over its painted plates. Select stances are data (`src/data/presentation/select-stances.ts`), turned into poses by `src/animation/stance.ts` (IK, so any build fits) and rendered by the game's own rig and view into breathing frame strips (`renderIdleStrips`), drawn only the first time the front end opens. Music rules live in `musicFor` (pure, tested).
**Trade-offs.** Painted plates cannot un-highlight (Story Mode is lit in the art); hovering another plate adds a glow. The rig is a 2D side-view rig, so the "2.5D" stance is suggested by pose, a slight foreshortening, rim light and floor shadow, not a true three-quarter turn; true turned art would need new character artwork.
**Status.** ACCEPTED.

### TD-067: Dodge direction from incoming shots; dodge fatigue in the combatant; select turn as a skeleton offset — ACCEPTED (owner request 13/11/2026)
**Decision.** `dodgeDirection` (pure, `src/combat/dodge-direction.ts`) picks the sidestep from the nearest shot whose path would hit the fighter within 9 m (ability projectiles and thrown objects), else the back-step. Dodge fatigue lives in `Combatant.tryDodge` so the player and the AI share it. For the select screen, `StickmanView.turn` spreads the limbs' roots apart (`turnSkeleton`) and widens the premium torso and garment (`bodyWidthK`); the arena never uses it.
**Trade-offs.** The quarter turn is suggested on the side-view rig (heads and faces stay in profile); a true three-quarter look would need new turned art per fighter.
**Status.** ACCEPTED.

### TD-068: 3 vs 3 as tag team inside one fight scene — ACCEPTED (owner decision 13/11/2026)
**Context.** OQ-07 left the 3v3 rules open; the owner chose tag team. Tags happen mid-fight, so a page per bout (as in Tournament) would be too slow.
**Decision.** Pure rules in `src/modes/team/team-battle.ts` (pool of five, AI team, next standing teammate, bench recovery, AI tag choice, team health). `SceneTeams` (`src/app/scenes/scene-teams.ts`) holds each side's three fighter entities; the scene's `playerFighter` / `dummyFighter` become the side's active fighter and `swapIn` moves fighters in and out of the arena (body, view and bars), the way summons already come and go. The Punch Clash reads the active fighters through getters. Tag is a rebindable action (`tag`, default H) and a touch TAG button shown only in team fights; it is not one of the five combat actions (INV-9), like Jump or Grab.
**Alternatives.** Relay between pages (rejected by the owner's choice of tag); six fighters at once (rejected: the engine is built for one fighter per side).
**Trade-offs.** Bench fighters keep their state frozen (cooldowns do not tick while resting); a swap clears the outgoing fighter's attack and cast.
**Status.** ACCEPTED.

### TD-069: Knife assault delivery and buff cooldown cut — ACCEPTED (owner request 13/11/2026)
**Context.** Bloodfade (stab then retreat) and the three-stab Stalker Lunge need an approach, several separately timed hits and an optional spring back. A dash hits once on contact and passes through; chaining three separate abilities would break the five-action layout (INV-9). Rampage Mode must also shorten Titan's other cooldowns.
**Decision.** A new data-driven `assault` delivery in the shared ability world (`AssaultDelivery`: approach speed and time, reach, radius, stab count and interval, optional retreat, per-stab sounds). Each stab is a full hit through the normal combat rules, so bleeding uses the existing non-stacking `Combatant.bleed`. Impacts carry the stab index and direction for presentation; `AbilityWorld.assaultOf` exposes the phase for `assaultPose`, which overlays three distinct stab motions and a retreat pose. Buffs gain `cooldownFactor`; `AbilityCaster.cooldownScale` applies it to new non-ultimate cooldowns and `scaleCooldowns` cuts the running ones, reset when the buff ends.
**Alternatives.** A multi-hit dash (no planted stabs, no retreat); scripted per-fighter code (rejected: no character branches in shared engines).
**Trade-offs.** The retreat steers by physics only, so a wall shortens it. The retreating blink (`retreatM` teleport) remains in the framework, unused for now.
**Status.** ACCEPTED.

### TD-070: Fullscreen shell around the game's pages — ACCEPTED (owner request 13/11/2026)
**Context.** Every fight, tournament step and practice session is its own page (URL parameters build the scene). Browsers always leave fullscreen when the page in fullscreen unloads, and only a tap may enter it again, so fullscreen dropped on every mode change (owner report).
**Decision.** On a player's visit the top window becomes a thin shell (`src/app/shell.ts`) holding the game in a full-window, same-origin iframe. The game asks for fullscreen on the shell's document (`topWindow()`); a tap inside the frame counts as activation for the shell. When the frame navigates, only its own document unloads, so the shell stays fullscreen. The shell keeps its address in step with the frame (a reload returns to the same page). Automated browsers run unwrapped unless `?shell`; `?noshell` or the session flag `stickman-arena.no-shell` turn it off.
**Alternatives.** Turning the multi-page flow into one page (rejected for now: a large rewrite of bootstrap and every mode); re-requesting fullscreen on the next tap (rejected by the owner: no extra interaction).
**Trade-offs.** The shell loads the game bundle twice from cache (one parse is wasted); browsers that refuse fullscreen (iPhone Safari) are unchanged and still rely on the home-screen app.
**Status.** ACCEPTED.

### TD-071: Master development plan and phase structure — ACCEPTED (owner, 16/11/2026)
**Context.** The owner supplied a master plan with a fixed order (Phase 0 inspection, then Phases 1–4) and a model workflow (one model plans and reviews; another implements a whole phase).
**Decision.**
- Adopt the plan as the requirements source for this cycle (spec §20A). Work follows `IMPLEMENTATION_PLAN.md`.
- Each phase is implemented in batches and reviewed once.
- Phase handoffs are recorded in `PHASE_HANDOFF.md`.
- Model names are kept out of committed files: the documents use role labels ("planning/review model", "implementation model"), and the chat names the models.
- New modes get their own scene and mode modules rather than growing `fight-arena-scene.ts`:
  - Hide and Seek: `src/app/scenes/hide-seek-scene.ts`, `src/modes/hide-seek/`;
  - Parkour: `src/modes/parkour/`.
- Phase 1 introduces a status-effect registry before bleeding, poison or new fighters are built on it.
**Alternatives.** Building Hide and Seek inside the fight scene (rejected: the fight scene is 3,213 lines and owns combat); adding fifth abilities before the status framework (rejected: B7, B8 and the roster depend on it).
**Trade-offs.** A separate scene duplicates some set-up (physics, views, camera), which shared helpers keep small.
**Status.** ACCEPTED.

### TD-072: Phase 0 approved; recommended answers to the Phase 1 open questions adopted — ACCEPTED (owner, 17/11/2026)
**Context.** Phase 0 listed open questions OQ-P0-1, 2, 4, 6 and 8 as needed before Phase 1, each with a recommendation. The owner replied "Ok start" after the recommendations were presented, without choosing otherwise. This is recorded as approval of Phase 0 and of those recommendations. It was an inference from a short reply, so the owner can overrule any item.
**Decision.**
- OQ-P0-1: Inferno's blue-flame transformation is built as his fifth normal ability. Eruption stays his ultimate.
- OQ-P0-2: bleeding becomes a ×1.1 damage-taken effect for 6 s, refreshed on reapplication and never stacking. It replaces the damage over time.
- OQ-P0-4: phone play is kept; new screens are designed for desktop first.
- OQ-P0-6: Pixabay is still unreachable. Phase 1 audio removes sound reuse with distinct synthesised recipes and records the gap in `AUDIO_ASSET_CATALOG.md`. No Pixabay sourcing is claimed.
- OQ-P0-8: Shroud's ultimate follows the master plan (4 s, whole arena dark for opponents, spectators unaffected, +17% speed).
**Still open:** OQ-P0-3 (Vexoris, Phase 3), OQ-P0-5 (Parkour, Phase 4), OQ-P0-7 (ambience licence, Phase 2).
**Status.** ACCEPTED.


### TD-073: Status-effect registry (`src/combat/status-effects.ts`); bleeding is a x1.1 vulnerability — ACCEPTED (Phase 1 B8 and B7, 17/11/2026)
**Context.** Burn, bleed, blind, Curse of Decay and darkness each kept their own timer fields in `Combatant`. The master plan needs more effects (poison in Phase 3, slows, vulnerability) and a consistent way to stack, refresh, cleanse and show them. TD-072 turned bleeding into a damage-taken multiplier.
**Decision.**
- `StatusEffects` holds every timed effect: duration, damage over time (continuous or at a tick interval), multipliers for damage dealt, defence, damage taken and speed, a sight limit, a stacking policy (`strongest` refreshes to the longer time and stronger values; `stack` adds stacks up to a cap), immunity, cleanse (`clear`, `clearAll`) and `active` for indicators. Its tick allocates nothing.
- `Combatant` owns one registry (`combatant.status`) and keeps its entry points (`ignite`, `bleed`, `blind`, `decay`, `darken` and their getters), so no ability, AI or scene code changed shape.
- Bleeding: `BLEED = { damageTakenFactor: 1.1, durationS: 6 }`; `bleed()` takes no numbers; a new cut refreshes the 6 s and never raises the 10%; it deals no damage itself. The factor also applies to burn damage over time ("every source"). Data uses `bleed: true` / `meleeBleed: true`; the Admin Panel no longer edits bleed numbers.
**Alternatives.** Keep the old damage over time beside the multiplier (rejected: two effects under one name). A free-form effect list in data (deferred until a second fighter needs data-defined effects).
**Trade-offs.** Shroud's total damage falls by the old bleed damage; the 10% only pays off if he keeps hitting, so his balance is re-measured in B17.
**Status.** ACCEPTED.

### TD-074: One stat pipeline (`src/characters/final-stats.ts`) — ACCEPTED (Phase 1 B1-B2, 17/11/2026)
**Context.** The audit found a fighter's final numbers assembled in five separate places: the buff speed and attack speed in the scene, the melee damage factor at the strike, the buff's damage-taken scale on `Combatant`, and status factors (Curse of Decay) read ad hoc. The status registry (TD-073) can carry slows, but movement never read them, and the select screen and ratings read the base data on their own.
**Decision.** Layers apply in one fixed order: base (character data) → ability buff → status registry → situation (sprint). Pure functions with plain parameters (`finalMaxSpeedMps`, `finalAttackSpeed`, `finalPower`, `finalMeleeDamageFactor`, `finalDefence`, `finalDamageTakenFactor`, plus `finalStatsSnapshot` for screens) are the only place those multiplications live. The scene's movement, attack speed, hit power and melee damage use them, and the ratings read the same base layer. With no buff or status they return the base value, so the menu shows what combat starts from. Any status carrying a `speedFactor` now slows movement with no further code.
**Stat audit (17/11/2026, base ratings 0-100).** Inferno 301, Titan (rampage) 303, Necro 304, Shroud 299 in total: within the existing balance tolerance, so no base stat was changed. Rating shapes: Inferno speed 80 / power 53; Titan HP 69 / defence 78 / speed 18; Necro stamina 75; Shroud speed 77 / HP 31.
**Alternatives.** One allocated stats object per fighter per step (rejected: per-step allocation). Moving `Combatant.damageTakenScale` into the pipeline (deferred; a test pins that the pipeline factor equals the damage really taken).
**Status.** ACCEPTED.

### TD-075: Damage relationships, HUD names and furniture depenetration — ACCEPTED (Phase 1 B3, 17/11/2026)
**Context.** The master plan asks that a heavy beats a single light hit, a full light combo's last hit sits slightly above a heavy, abilities are weighed against cooldown and range, the combat HUD names each ability beside its key, and fighters never pass through furniture.
**Decision.**
- *Melee:* already true after the 13/11/2026 balance pass (finishers 3% to 10% above the heavy); now pinned by `tests/unit/abilities/damage-relationships.test.ts`.
- *Abilities:* a damaging ability that does not mainly control the enemy is worth more than the fighter's heavy; damage per second of cooldown stays within a budget of 24 for ranged abilities (projectiles, beams) and 32 for close ones. The audit found one outlier, Inferno's Fireball (28), so its cooldown went 2.5 s to 3 s (23.3). The two budgets are constants in the test and are the one place to tune the rule.
- *HUD:* each desktop ability slot shows key, icon, name and stamina cost; names wrap onto two lines (an ellipsis would hide part of the name). Touch buttons stay icon-only.
- *Furniture:* velocity-driven movement cannot tunnel (checked at up to 120 m/s). The leaks were soft-solver overlaps: fast dashes and knocks, and a heavy fighter shoving another against a wall left grounded fighters up to 0.32 m inside walls and planted furniture. `PhysicsWorld.depenetrate` runs after every physics step, pushes a grounded, non-climbing fighter out along the contact normal (at most 0.35 m a step) and drops the velocity driving into the surface. Awake furniture is dynamic and left to the solver. `solidOverlapM` is the matching read-only query used by the soak test.
- *Found on the way:* `AbilityWorld.updateActions` assumed one action disappears per step; a step that cancels two (both casters knocked out) crashed it. The loop now skips a missing slot.
**Alternatives.** Continuous collision on a kinematic controller (rejected: a rewrite of the approved physics, REQ-ARC-12). Re-tuning every ability to one formula (rejected: one outlier).
**Status.** ACCEPTED.

### TD-076: Fire Beam: 2.4 s, +31% total damage, ends the instant Inferno is hit, AI aims it imperfectly — ACCEPTED (Phase 1 B4, 17/11/2026)
**Context.** The master plan asks for a beam that is a second longer with more damage but not excessive, that stops at once when Inferno is hit (hitbox, damage ticks, effects), and that the AI does not aim perfectly.
**Decision.**
- *Numbers (measured in `AbilityWorld` on a standing target):* duration 1.4 s to 2.4 s, tick damage unchanged at 20, ramp softened to 1 s / x1.1 / +0.2 per second / cap x1.3. Total damage rises about 31% at every range (275, 220, 149 to 360, 289, 198 at 1, 3.5 and 6.2 m) while the peak tick falls from 40 to 26; simply adding a second would have nearly doubled it (514 point-blank). The caster's recovery is now a 0.35 s tail (0.7 s, held open by the beam), so the lock after release is 2.75 s instead of 1.75 s, exactly the extra second.
- *Interruption:* a new data flag `breaksOnHit` on the ability. A hit that lands on the caster during any phase cancels the cast and the world's beam, so its hitbox, ticks and visuals go together; `AbilityWorld.driving` now holds the caster's cast open while a beam pours (as for dashes), otherwise there is nothing left to interrupt once the short recovery ended. The scene also cancels it when the caster cannot act (stunned, knocked down, grabbed) from any source, not only from a blow. A burn the beam already lit keeps burning: it is a separate status, not a beam tick.
- *AI aim:* `BeamTracker` (`src/ai/beam-tracker.ts`, pure): the AI re-reads the target's bearing only every `beamReadS` seconds and swings its aim no faster than `beamTrackRadPerS`; both are per difficulty (read 0.7, 0.45, 0.3, 0.2 s; swing 0.8, 1.3, 1.9, 2.8 rad/s). It runs from the start of the charge, so even the beam's first direction is lagged. Result against a player circling at 3 m: Easy loses a stroll (0.5 rad/s), Normal a walk (0.8), Hard a brisk circle (1.2), and even Expert mostly misses a full-speed circle (1.7); a standing player is always hit.
- *Budget:* the damage-per-cooldown test gains a "channelled beam" class (40 per second, counted before ramp and falloff) beside ranged (24) and close (32).
**Alternatives.** Leaving the 1.75 s recovery (rejected: Inferno would be free, and un-interruptible, while the beam still poured). One reaction time for everything (rejected: Expert would then lock a zig-zagging player 100%).
**Status.** ACCEPTED.

### TD-077: Necro's skeletons: hard cap of four, refusal, and damage-only hits — ACCEPTED (Phase 1 B5, 17/11/2026)
**Context.** The master plan wants exactly four skeletons, a fifth rejected, slots freed when one falls, no stun, no interruption of the target's movement, attacks or recovery, and no hit-reaction loops from several skeletons. Before: a fifth summon made the oldest crumble (a rolling cap), and a skeleton's blow stunned, pushed, interrupted and froze the fight like anyone's.
**Decision.** (1) `SceneSummons.room` counts living minions; a summon raises only the free slots (three standing: one rises; four: none, and nobody crumbles to make room). Casting the ultimate with no room is refused with the new cast block `limit` before the meter is spent. (2) A new capability `staggersTargets` (true for every fighter, false for skeletons) makes a blow damage only: no light stun or knockdown (`IncomingHit.staggers`), no combo or ability interruption, no knockback push or flight, no hit-stop and no screen shake. A KO still resolves normally. (3) Skeletons stay frail (67 health, from the 13/11/2026 balance pass). One hit per swing is pinned by a test: no two blows from one skeleton closer than 0.2 s.
**Alternatives.** Per-move flags in the skeleton moveset (rejected: one fighter-level rule is simpler and also covers anything else a summon does). Keeping the rolling cap (rejected by the plan).
**Status.** ACCEPTED.

### TD-078: Shroud's stabs never stun; no hit chain can restart a fall — ACCEPTED (Phase 1 B6, 17/11/2026)
**Context.** Repeated stabbing locked opponents: each ability stab carried its own stun (0.35, 0.22, 0.6 s) on top of the standard light flinch, and every heavy hit on a fighter already down restarted its knockdown timer, so the target could be kept down or flinching indefinitely.
**Decision.** (1) A payload flag `noFlinch` makes a blow damage (and bleed) without stun or knockdown; Bloodfade, Stalker Lunge and Rending Flurry use it and their `stunS` is gone. (2) A universal rule in `Combatant.receive`: a fighter that is knocked down or getting up is never stunned or knocked down afresh, so no sequence of hits extends or restarts the fall; it stands up on schedule. (3) Because the stabs lost their flinch, their damage is raised about 12% (78, 28 per stab, 118) to keep Shroud viable; the standing "watched AI battles are close" test (owner, 13/11/2026) failed at 40% winner health left until this was done and is unchanged. Fight length and Shroud's overall balance are re-measured in B17.
**Status.** ACCEPTED.

### TD-079: Titan's grab holds steady; AI throws furniture; Rampage Mode defence +40% — ACCEPTED (Phase 1 B9, 17/11/2026)
**Context.** The master plan: no opponent jitter in Titan's grab; a dash like Inferno's may push Titan without breaking his hold; the AI should throw furniture in battle; Titan's ultimate makes his defence 40% stronger.
**Decision.**
- *Jitter:* the held target was driven to a hold point exactly one radii-sum from Titan, so the two circles always touched, the solver pushed them apart and the drive pulled them back (measured: 10 direction reversals and a 0.5 m jump in one frame over a 30-step grab). The hold point now sits 0.12 m off his body and the target approaches it at a capped, easing speed (14 m/s cap), settling when within 2 cm. After: zero reversals, largest per-frame change 0.10 m.
- *Push:* checked, not changed: a 12 m/s shove stunned and slid Titan 1.78 m, the grab kept following him and the slam still landed. Pinned by a test.
- *AI furniture:* `src/ai/prop-plan.ts` (pure rules) decides none / approach / pickup / hold / throw; the scene acts through the same `liftProp`, `throwCarried` and `dropCarried` the player uses, and gives the AI the player's hands-full rules (rooted while heaving it up, slowed carrying). It considers furniture when the target is at least 2.6 m away and an object is within 2.5 m, throws from 2 to 11.5 m, holds at most 4 s, and waits 6 s between objects. It draws from the shared random stream only when a pickup is really possible, so fights without furniture in play are not perturbed. Appetite per second by difficulty (`propThrowPerS`): 0.1, 0.3, 0.6, 0.9. A first version at 3.5 m and half the appetite never fired in a 42 s fight because Titan rushes in; the AI ran at the player carrying the object because the lift timer only counted down in the player's step.
- *Ultimate:* Rampage Mode `damageTakenFactor` 0.85 to 1/1.4 (defence +40%).
**Status.** ACCEPTED.
**Test change (B9).** `ai-opponent.test.ts` required every ability to appear within 45 s; measured first-use times for Titan's Crushing Strike ran from 1 s to 60 s across difficulties and starts, so the window was a coin toss that a changed fight course tipped. It is now 75 s; the rule (the whole kit is used at every difficulty) is unchanged.
**Also found while testing B9 (TD-075 follow-up).** The furniture soak found a fighter standing 0.18 to 0.26 m inside a gap narrower than its body, where the two sides' pushes cancel or bounce. `PhysicsWorld.pushOut` now falls back to the deepest contact when the summed push cancels, and `depenetrate` sets a still-wedged fighter (more than 10 cm deep after three passes) down at the nearest spot that fits, within 1.5 m.

### TD-080: Blue Inferno is Inferno's ultimate; Eruption becomes his fifth normal ability — ACCEPTED (Phase 1 B10, owner 17/11/2026)
**Context.** The master plan said the blue-flame transformation must be a normal ability and Inferno must get a new ultimate. The owner then proposed the reverse: the dark-skinned, blue-flamed transformation becomes the ultimate and Eruption is nerfed into a normal damage ability. The most recent explicit instruction wins, so this supersedes the plan's wording (spec §22) and the OQ-P0-1 default of TD-072. It also removes the slot conflict: Inferno keeps four equipped normals, a fifth waiting in the loadout, and one ultimate.
**Decision.**
- *Blue Inferno (ultimate, `blueFire`):* a buff for 10 s with dark skin and blue flames (the whole magma palette is toned: red and blue swap, dim colours darken, bright ones keep glowing; eased in and out), no defence bonus. New buff flag `blueFlames`.
- *Numbers, balanced as the owner asked:* proposed +20% damage, 25% faster cooldowns, +10% speed. Measured with 36 seeded Hard AI fights (rampage, necro, shroud, both sides, six seeds), Inferno's win rate was 78% with Eruption as the ultimate and 25% with the proposed numbers; +50% damage gave 33% and +70% gave 42% (higher bonuses plateaued at about 40%). Adopted: +70% ability and melee damage, other abilities 30% sooner, +15% speed, 10 s. The remaining gap is the lost 300-damage finisher; the old 78% (Necro 12 of 12) was itself too high. The meter rates are unchanged; the general "stronger ultimate charges slower" scaling is a separate B10 step.
- *Eruption (`a5`, an optional fifth ability in `AbilityKit`):* damage 300 to 150, radius 3.2 to 2.6 m, leap 8 to 6 m, cooldown 14 s, stamina 40, interruptible. It is not selectable until the loadout screen (B13, B14); the aimed-leap ultimate mechanic stays covered in tests by a labelled fixture.
- *AI:* Blue Inferno is a `buff` tactic used when his health is under 90%; the AI casts it 1 to 3 times per fight.
- *Found on the way:* the same iterate-while-removing crash as TD-075's `updateActions` existed in `updateTelegraphs` and `updateBeams` (a blast that cancels several telegraphs); both are guarded and a test fails without it.
**Status.** ACCEPTED. The owner may re-tune the four numbers; they are in `src/data/abilities/inferno.ts`.

### TD-081: Ultimate charge by strength, AI target choice against summoners, Shroud's Hunting Frenzy — ACCEPTED (Phase 1 B10, rest, 18/11/2026)
**Context.** Master plan B10: a stronger ultimate takes longer to charge; the AI should hit skeletons or the summoner by situation; Shroud's ultimate becomes 4 s, +17% speed, whole-arena darkness that spectators do not see; and help balance Shroud.
**Decision.**
- *Charge:* `src/abilities/ultimate-charge.ts` holds one `ULTIMATE_POWER` table with the reason for each rating (Hunting Frenzy 0.9, Undead Army 1.0, Rampage Mode 1.3, Blue Inferno 1.4); every kit's meter is `chargeFor(id)`: the baseline rates divided by the power, so time to fill is proportional to power. Change a rating there and the charge follows. The kits no longer carry hand-tuned rates.
- *AI targets:* `src/ai/target-choice.ts` (pure): the summoner by default; a nearly beaten summoner within 6 m is finished; two or more minions within 3 m with the summoner out of reach are cleared first (nearest); one minion at its throat while the summoner is far is killed; otherwise the summoner. A choice is kept for 1 s so it does not flip every frame. Wired through `aiPickTarget`.
- *Hunting Frenzy:* 8 s to 4 s, speed x1.3 to x1.17, the affected fighter sees 1 m round itself (was 1.5), so the whole arena is dark. `inTheDark(darkS, spectating)` keeps the veil off for spectators of a watched AI battle (the fighter someone is playing is the one darkened).
- *Shroud balance:* base health 950 to 990, crit chance 0.12 to 0.22, crit multiplier 1.6 to 1.9. Stab damage was left at 78, 28, 118: the owner's 13/11 damage bands (a stab under 90, the lunge under 100 total) leave no room, and raising base power breaks the rating rules (his total would be 5% above average and he would stop trailing in any stat).
**Balance measurement (round-robin, all six pairings, both sides, six seeds, Hard AI, 72 fights; noisy, about +-10 points).** Before the Shroud change: Inferno 47%, Titan 78%, Necro 42%, Shroud 33%. After: Shroud about 47 to 53%. **Titan is the outlier at 72 to 92% in every variant tried:** restoring his old ultimate defence (72%), switching off AI furniture throwing (78%), cutting his base power (83 to 92%, non-monotonic) or his ability damage by 20% (81%) did not bring him down, so it is structural (health, defence, hit-stun resistance and the AI's close-range style together) and needs its own measured pass in B17. The owner's "watched AI battles are close" rule is sensitive to it.
**Status.** ACCEPTED.

### TD-082: Rampage Mode defence +25% (owner 18/11/2026) — ACCEPTED
The owner reduced Titan's ultimate defence from +40% (master plan B9, TD-079) to +25%: damage taken is now 1/1.25 (0.8). Measured in the 72-fight round-robin it did not change Titan's dominance (86% in this run, against 72 to 78% with the old 0.85 or the 1/1.4): that is structural and stays a B17 item (TD-081). Rampage Mode's description and test were updated.

### TD-083: Titan nerf (owner 18/11/2026): ability damage -30%, health 1160, heavy and finisher trimmed — ACCEPTED
**Context.** The round-robin showed Titan at 72 to 92% against the other three (TD-081). A sensitivity sweep of 72 seeded Hard AI fights per setting (Titan against Inferno, Necro and Shroud, both sides, 12 seeds) found what moves him: baseline 86%; health 900 gave 58%; base power 0.9 gave 61%; ability damage x0.7 gave 67%; defence 1.0, hit-stun resistance 0 and knockback resistance 0 gave 75 to 79%; slower speed did nothing (88%).
**Decision.** The rating rule (paper totals within 3%) limits how far health and power can fall, so the free lever is ability damage, which the ratings do not count. Ability damage x0.7 (Ground Smash 84, Rhino Charge 105, Crushing Strike 133, Grapple Slam 105), health 1250 to 1160, and his heavy (70 to 56) and combo finisher (75 to 60) trimmed in step, so the owner's 13/11 rule still holds (a heavy hits for less than any damaging ability) and the finisher stays just above the heavy. Combinations tried: x0.7 and 1160 gave 64%, x0.6 and 1160 gave 54% but broke the heavy-below-abilities rule, x0.65 and 1100 gave 58%.
**Result (final configuration, same 72 fights).** Titan 63% (14, 14 and 17 of 24 wins against Inferno, Necro and Shroud). The probe is noisy by about 6 to 10 points.
**Test changes.** `rampage.test.ts` and `fourth-abilities.test.ts` checked Titan's damage against fixed numbers (over 200, over 140, over 100); they now compare against his kit's own listed damage, so later tuning does not break them. The rule being tested is unchanged.
**Status.** ACCEPTED; B17 re-measures all four fighters together.

### TD-084: Movement stability: coyote time and running-jump momentum (master plan B11) — ACCEPTED
**Context.** Jumps felt unforgiving off edges, and a sprinting jump lost speed in the air (measured 7.61 m/s on the ground, 5.25 m/s airborne), which broke "run and jump together".
**Decision.** (1) Coyote time: a fighter that has just walked off a ledge (not rising) may still start a ground jump for 0.12 s (`COYOTE_S`, `canStartJump` in `movement.ts`); a jump never starts twice. (2) A jump begun while sprinting sets `airSprint`, so the sprint speed cap holds in the air until landing. Pure rules are unit-tested; the scene behaviour is tested in `coyote-jump.test.ts`.
**Alternatives.** Raising the walking cap in the air (rejected: would speed up falls from ledges); jump buffering (the one-step queued edge already exists).
**Status.** ACCEPTED. The "floating" report could not be reproduced beyond this; open for owner feel feedback.

### TD-085: Five abilities, four equipped: the fifth takes a named slot (master plan B13) — ACCEPTED
**Context.** Every fighter knows five normal abilities and equips four (owner 16/11/2026). The four combat buttons, the HUD, bindings, the AI's tactics, the tutorial and about 600 tests are all keyed to slots a1..a4.
**Decision.** The kit carries a fifth ability `a5` whose `slot` names the slot it takes. `applyLoadout(kit, { useFifth })` (`src/abilities/loadout.ts`) swaps it in and keeps the displaced ability as the unequipped alternative (`a5`), so everything downstream keeps seeing exactly four abilities on a1..a4. The fight takes the choice as `cast.loadouts.{player,opponent}`; the AI picks tactics through `brainDesignFor(aiId, kit)` and `ALTERNATE_TACTICS` (by ability id, cached). Fifth abilities: Inferno Eruption (slot a4, replaces Flame Detonation), Titan Bastion Anchor (a3, replaces Crushing Strike: 5 s, half damage taken, 60% speed, shoves back close enemies), Necro Soul Tether (a4, replaces Grave Chains: 50 damage, 80% lifesteal, reels the target in to 3.5 m), Shroud Umbral Feint (a2, replaces Stalker Lunge: 3 s, +30% speed, 15% less damage taken, quicker knife, cuts bleed). Inferno's transformation became his ultimate (TD-080), so his fifth is Eruption.
**Alternatives.** Free benching of any one of five (needs tactics, combos and poses keyed by ability id rather than slot; deferred, a later refactor if the owner wants any-of-five); six slots on the bar.
**Trade-off.** Each fifth ability is an alternative to one specific ability rather than to any of the four. The loadout screen (B14) offers it as the alternative for that slot, never locked.
**Limits.** The three new abilities reuse existing VFX, sound ids and icon fall-backs (greybox, labelled); unique audio is B18 and icons are task #51. Balance not yet measured (B17).
**Status.** ACCEPTED. Persistence and the drag-and-drop screen are B14.

### TD-086: Loadout screen and persistence (master plan B14) — ACCEPTED
**Decision.** The fighter-select screen lists the four equipped abilities, the ultimate and the fifth as a dashed **ALTERNATIVE** row (never locked, never greyed out). **Equip / Swap out** buttons and desktop drag and drop (drag either row onto the other) swap them; a touch screen uses the buttons because it has no native drag. The choice is saved per profile and fighter in this browser (`LoadoutStore`, key `stickman-arena.loadouts`; a preference, nothing valuable, so no server) and bootstrap hands it to the fight as `cast.loadouts.player` (TD-085), so tournaments, Open Zone and the tutorial all use it. Details are generated from the ability data (`fighter-sheet.ts`: damage, burn, stun, blind, bleed, heals, buff numbers, range, cooldown, stamina, wind-up, how to use).
**Limits.** The combat HUD already shows name, icon, key, cooldown and a name tooltip; the planned separate "info control that never casts" and a cast-name notice are not built yet (open for B14 follow-up or owner decision). AI opponents use the standard four.
**Status.** ACCEPTED.

### TD-087: Shroud's five-hit knife combo (master plan B15) — ACCEPTED
**Decision.** The tap string is now five distinct cuts with their own animations: knife slash (18), backhand slash (20), rising cut (22), cross slash (24) and the lunging stab finisher (54, knocks down). Only a full chain reaches the finisher; the four light cuts never knock down, and a target is free again moments after the last one (no stun lock). A lapsed chain starts again at the first slash. The whole string deals 138 damage, 14.5% of his target's 950 health, inside the existing rule (a string under 20% of a health bar, early hits at most 35, finisher over 1.5x any of them, `damage-balance.test.ts`). The first two cuts lost 2 damage each (20 and 22 before) to keep the longer string's total near the old feel. Per-move sounds are B18.
**Status.** ACCEPTED.

### TD-088: Dodge input buffer (master plan B16) — ACCEPTED
**Decision.** A dodge pressed up to 0.18 s too early (still recovering, the cooldown nearly over, stamina about to be enough) is remembered and fires the moment it can, instead of being dropped (`PlayerIntents.bufferedDodge`, `DODGE_BUFFER_S`). One press makes one dodge, and a press swallowed while the fighter cannot act at all (stunned, carrying) is dropped, never saved for later. The AI dodges through the same `tryDodge` rules (its decision timing already carries its own reaction delay).
**Measured, not changed.** The dodge's invulnerability (0.18 s of its 0.24 s), movement starting on the same step as the protection, hits that find an invulnerable target resolving as `dodged`, and the fatigue chain (cost, cooldown and protection worsen when spammed) were reviewed and left as they are: they already behave as B16 asks, and the existing dodge tests cover them. The attack-tracking item (a swing commits to its direction once it starts) is not changed in this step and stays open for owner feel testing.
**Status.** ACCEPTED.

### TD-089: Longer fights (master plan B17) — ACCEPTED
**Baseline** (the version before Phase 1 Batch B, commit d7fdaf4; 48 watched Hard AI fights, every pairing of the four fighters, both sides, seeds 1 to 4): median 34.9 s, mean 37.2 s, every fight a knockout, dodge rate 3.3% of attacks reaching a fighter, block rate 3.1%, longest chain 14 hits, wins Inferno 50%, Titan 46%, Necro 21%, Shroud 83%.
**Before tuning, with all of Batch B in** (Titan nerf, bleed as vulnerability, no stun-lock, Shroud changes): median 42.3 s, mean 43.8 s, dodge rate 1.6%, longest chain 20, wins Inferno 75%, Titan 46%, Necro 42%, Shroud 38%.
**Tuning.** Every fighter's defence +10% (Inferno 1.1, Necro 1.155, Titan 1.265, Shroud 1.122), which keeps their relative standing and the stat budget rule, takes about a tenth off all damage taken, and does not touch health pools, attack strength or the identity of any move. A uniform power cut (x0.9) was tried first and rejected: it broke the fixed-number damage tests of every fighter, and gave only a little more length than the defence change.
**After** (same 48 fights): median 45.4 s (+30%), mean 47.7 s (+28%), 98% knockouts, wins Inferno 42%, Titan 63%, Necro 42%, Shroud 54%, longest chain 23, dodge rate 1.5%.
**Trade-offs and limits.** Measured only with the AI (Hard), at about plus or minus 10 points of noise on win shares. The dodge rate fell from 3.3% to 1.5% of attacks reaching a fighter: the AI dodges less often against the new abilities and cuts, and the input buffer (B16) only helps the player; the rate is recorded, not tuned. Combo and ability damage are not separated in the measurement (the combat events do not say which blow dealt them). The longest chain (23 hits) is the AI chaining its string and abilities across a fight, not one unbroken lock. `tests/integration/balance/fight-length.test.ts` now guards the length (at least 15% over baseline median, 10% over mean) and that no fighter wins over 80% or under 15%; `probe.test.ts` repeats the full measurement (`BALANCE_SEEDS=4`).
**Test change.** `climbing.test.ts` expected a 20 damage blow to take at least 20 health from Inferno; with defence 1.1 it takes 18, so it now expects 20 divided by his defence. The rule it tests (a hit cancels a climb) is unchanged.
**Status.** ACCEPTED.

### TD-090: Per-move contact sounds and unique ability sounds (master plan B18) — ACCEPTED
**Decision.** A move may name its own contact sound (`sfx` in the moveset, `AttackDef.sfx`): a landing blow plays it once, instead of the Audio Profile's category sound; blocks and parries keep the shared guard sounds. Every melee move of the four fighters and the skeleton warriors has one (29 sounds). Every ability (five normal and the ultimate per fighter) has its own release and impact sound; 14 ability sounds that had been shared were given their own recipes. The player and the AI use the same path, since both go through the scene's one hit resolution.
**Source.** Synthesised (see `AUDIO_ASSET_CATALOG.md` section 8): Pixabay was not reachable and no recorded audio was downloaded or edited. A real recording can later replace any id without code changes.
**Limits.** Cast sounds stay shared within a fighter; blocks, parries and status applications are not individually voiced; the sounds have not been auditioned by a person.
**Status.** ACCEPTED.

### TD-091: Aimed leaps work from any ability slot; stale browser tests fixed (found by CI, 18/11/2026) — ACCEPTED
**Found.** CI's browser jobs had been red since B10: the aim-then-leap flow (crouch, move the landing spot, press again to jump) was tied to the ultimate slot, so Eruption, which became a normal ability in B10, cast at once when equipped and the player could not choose the landing spot. Local runs had covered unit and integration tests and the front-end spec only, so this was not seen until CI was read.
**Decision.** The aiming state remembers which slot is being aimed (`leapSlot`): any ability whose delivery is a leap is aimed first, with its own range, indicator, aim speed and pose; the key (or button) pressed again launches it. The hint reads "confirm" for a normal ability and "launch" for the ultimate.
**Test changes (reasons).** `phase6.spec.ts` and `controls.spec.ts` aimed-leap tests drove the ultimate key; the leap is now Eruption on R / A4, equipped through the saved loadout. `menu.spec.ts` counted 7 ability entries on the details screen; there are now 8 (the fifth ability is listed as an alternative, B14). The flaky `controls.spec.ts` dodge test passes on repeat locally and is unchanged.
**Status.** ACCEPTED.

### TD-092: Any ability can be swapped; details on a board, not in the list (owner 18/11/2026) — ACCEPTED
**Owner request.** After equipping the alternative only one Swap button remained; the player wants a choice of which ability gives way, and the descriptions and numbers should appear only when an ability is clicked, on a board that can be closed.
**Decision.** This supersedes TD-085's fixed pairing (the fifth took one named slot). The loadout is now the ids on the four buttons (`Loadout.equipped`, `src/abilities/loadout.ts`); the fifth ability can replace any of the four and the one it replaces goes to the bench, and the benched one can in turn replace any other. An ability moved to another button keeps its `homeSlot`, so the AI still uses it with the tactic of the slot it started in (the fifth ones have their own tactics by id). The select screen lists each ability as a short row (picture, name, key); every equipped ability has a "Swap for <alternative>" button, and the alternative row says it can be swapped in for any of them; dragging the alternative onto one (or one onto it) swaps them (desktop; a touch screen uses the buttons). Clicking a row opens a board with the description, the numbers and how to use it on this device, closed by its X or Escape. A saved arrangement that does not fit the kit leaves the standard four.
**Status.** ACCEPTED.

### TD-093: Ability balance across the five abilities of each fighter (owner 18/11/2026) — ACCEPTED, partly open
**Owner request.** "Ensure that attacks have balanced advantages instead of having one stronger than the other."
**Method.** For each fighter, the AI (Hard) played all five "which ability is benched" loadouts against the other three fighters on standard kits (3 seeds, both sides: 18 games per loadout, `tests/integration/balance/ability-balance.probe.test.ts`). A low win rate when an ability is benched means that ability carries the kit; a high one means it adds little. Balanced = the five loadouts win about equally. Each cell has about 12 points of noise.
**Before** (win % with each ability benched; spread = best minus worst): Inferno Fireball 50, Flame Dash 56, Fire Beam 72, Flame Detonation 67, Eruption 61 (spread 22). Titan Ground Smash 72, Rampage Charge 61, Crushing Strike 50, Grapple Slam 83, Bastion Anchor 50 (33). Necro Soul Drain 6, Death Eruption 28, Curse of Decay 22, Grave Chains 50, Soul Tether 50 (44). Shroud Bloodfade 61, Stalker Lunge 22, Behind You 28, Rending Flurry 39, Umbral Feint 67 (44).
**Changes (pass 1).** Flame Detonation 85 to 95; Ground Smash 84 to 92; Grapple Slam 105 to 118; Curse of Decay 35 to 40; Stalker Lunge stabs 28 to 26 each; Umbral Feint 3 s to 4 s with +15% knife damage. Not changed: Soul Drain's 3 s blind and lifesteal and Fire Beam's numbers (set by earlier owner decisions, with tests), Bloodfade (its 60 to 90 damage band is tested), and a second Necro buff (it flipped two seed-dependent AI tests).
**After** (same method): Inferno 33, 61, 67, 56, 33 (33); Titan 67, 39, 56, 39, 56 (28); Necro 6, 17, 50, 39, 22 (44); Shroud 39, 22, 39, 33, 39 (17).
**Reading.** Shroud is now level (spread 44 to 17). Titan improved a little (33 to 28). Inferno and Necro did not improve within the noise (Inferno's two 33s are a single-sample swing from 50 and 61; the next measurement should use more seeds). **Open: Necro's Soul Drain** (benched: 6% win rate) carries his kit because its blind makes the AI lose its target; fixing that means changing the owner-set blind or lifesteal, which needs an owner decision, so it is left as it is and flagged.
**Limits.** AI-only measurement; 18 games per cell; one tuning pass. The fifth abilities (Bastion Anchor, Soul Tether, Umbral Feint, Eruption) each land within the spread of the abilities they replace, none being the clear best or worst except Umbral Feint, which was the weakest and is now level.
**Status.** ACCEPTED for what is done; Necro's Soul Drain and Inferno's spread stay open for owner direction.

### TD-094: Fight HUD name notice and info panel; three new ability icons; keybinds button in the select header (owner 18/11/2026) — ACCEPTED
**Decision.** (1) The fight HUD shows the name of an ability for a moment as it is cast, and an "i" button (not focusable, so Space and Enter never reach it) opens a panel listing the equipped five with key, cooldown, stamina and description; it never casts. (2) Bastion Anchor, Soul Tether and Umbral Feint have their own pictures (a test now fails if any ability, combo or heavy icon a kit names has no picture). (3) The ability details board on fighter select is a centred overlay with a backdrop, so it is never clipped by the scrolling info panel; the Swap buttons read just "Swap" with the ability names in the tooltip. (4) "Change Fighter Keybinds" moved into the fighter-select header (the owner's marked spot), restyled as a pill tinted with the selected fighter's colour.
**Status.** ACCEPTED.

### TD-095: Phase 2 (Hide and Seek Nightmare) approved; architecture (owner 18/11/2026) — ACCEPTED
**Owner decision (18/11/2026).** Phase 1 is accepted for review; no further balancing; start Phase 2. This satisfies the "no next phase without owner approval" rule (CLAUDE.md, TD-071). Deferred, not lost: Necro's Soul Drain dominance (TD-093) and more precise ability balance.
**Architecture.** Hide and Seek is its own mode (`src/modes/hide-seek/`) with its own scene (`src/app/scenes/hide-seek-scene.ts`); it does not grow `fight-arena-scene.ts`. Rules, world, visibility, perception, hearing, hunter AI and flow are **pure, deterministic modules** (no renderer, no Rapier) so they are unit-tested; the scene only renders and feeds input. Movement uses its own circle-versus-rectangle collision (two floors, stairs as ramps with `z` by position) instead of Rapier, because the house needs per-floor worlds, door states and cheap sightline queries; the existing nav grid (A*) is reused per floor with stair links. Characters reuse the existing stickman views and animator (the training dummy as the player, Shroud as the hunter). The house is data in `src/data/arenas/house.ts`.
**Status.** ACCEPTED.

### TD-096: Hide and Seek foundations (Phase 2, P2-1) — ACCEPTED
**Built.** `src/data/arenas/house.ts` (a 20 x 12 m two-storey house on a 40 x 34 m lot: living room, dining room, kitchen, toilet, entrance hall with the staircase at the bottom right of the screen, two bedrooms each with a private bathroom, a storage room, corridor and landing nook upstairs; front yard with a gate, driveway and car, back yard with a shed, bushes, trees and garden furniture; 24 hiding places across all required kinds; 12 throwable objects), `src/modes/hide-seek/world.ts` (circle-versus-rectangle collision per floor, shut and open doors, staircase ramp with height by position and floor change at either end, rooms, sightlines, sound transmission through walls and doors, cross-floor routing on the existing nav grid), `rules.ts` (exactly 20 s of preparation, then the hunt; 2:00 to win; the killing animation starts once), `game.ts` (player movement: walk 2.4, run 4.4, crouch 1.2 m/s; footstep loudness by posture; doors opened by walking into them or the interact key; restart), `src/rendering/house-view.ts` (the isometric cutaway, one container per floor, every object tagged with floor and room for the visibility system), `actor-view.ts`, `hide-seek-scene.ts`, `hide-seek-page.ts` (its own page at `?mode=hide-seek`, reached from Game Modes) and `hide-seek-hud.ts`.
**Controls (existing intents, no new bindings).** WASD moves, Shift runs, Space toggles crouch, G is act (door, hide, pick up, throw), hold K to peek. On a phone the joystick moves and the HUD has RUN, CROUCH, PEEK and ACT buttons.
**Test evidence.** 30 unit tests (world, rules, game) including: every room reachable from the start on both floors, a body walking a route across floors and opening doors on the way, stairs climbed and descended, sight blocked by walls and shut doors, sound quieter through walls. Browser tests on desktop and phone load the house, show the countdown and walk.
**Not yet built (next batches).** Room visibility and lighting (P2-2), hiding, throwing and noise (P2-3), the hunter (P2-4), result screens, kill animation and audio (P2-5).
**Status.** ACCEPTED.

### TD-097: Room visibility, lighting and peeking (Phase 2, P2-2) — ACCEPTED
**Built.** `src/modes/hide-seek/visibility.ts`: the occupied room is lit; other rooms get light by what share of them the eyes can see through genuine sightlines (a grid of sample points, walls and shut doors block; open doors and arches pass), scaled by distance and the room's own light; furniture shows only if its room is lit and a clear line reaches its centre or a corner; rooms already seen stay as a dim memory (0.3), never-seen rooms stay black; the other floor appears only while the viewer is on the staircase, in proportion to how near the far end is. Every light eases over 0.35 s; sightlines are recomputed 10 times a second (measured under 8 ms in a test). The scene lights each drawn node by tint and hides it when black (opacity belongs to the wall fader). **Peeking:** holding K and pushing a direction leans the view origin up to 0.9 m (never through a wall: the lean is cut until the origin has a clear line from the body); the camera follows the lean; the body, its position and its sounds are untouched, and `viewer()` (the eyes) is a separate thing from the body that the hunter will read (P2-4 tests this).
**Tests.** 10 visibility tests on the real house plus a browser test: the living room lit and the bedrooms dark at the start; upstairs hidden until reached; walls and shut doors block; an open arch shows the dining room and its table; a door opened reveals the kitchen and shut again leaves a dim memory; the stairs reveal the landing progressively; peeking beside the arch shows the room and never moves the body.
**Status.** ACCEPTED.

### TD-098: Stealth, hiding places, throwables and noise events (Phase 2, P2-3) — ACCEPTED
**Built.** `hiding.ts` (22 hiding places of every kind in the brief, each with concealment, entry and exit noise, a reduced view radius and the side it opens to; an `exposure` function: in front of the opening most visible, from the side a third of that, from behind a tenth, and distance helps the occupant), `props.ts` (bottles, cans and toys: pick up, carry over the head, throw along the way the player was heading at 11 m/s up to 8 m; walls, shut doors and tall furniture stop them, low furniture does not; the landing makes an impact noise loud for glass, softer for a can, soft for a toy), and the game state: one interact key does the most specific thing at hand (leave the hiding place, throw, pick up, hide, open or close a door) and the HUD prompt says which. Hidden: the body is still, the view narrows to the place's `viewM` (the visibility system respects it) and only a 0.35 m lean is allowed; the figure shows half-transparent. Every event the hunter can hear is a `GameEvent` with a loudness, a place and a floor: footsteps by posture (run 0.9, walk 0.45, crouch 0.12), doors (outside doors louder), hiding in and out (never silent, different by kind), a throw and its impact.
**Authoring fix found by tests.** An under-the-bed point too deep inside the bed was out of reach of its own exit; the living-room curtain overlapped the sofa's hiding pocket (two places for one spot) and was removed. A test now enters and leaves every hiding place and checks the way out is free.
**Tests.** 12 stealth tests (every hiding place entered and left, noise differs by kind and is never zero, hidden stillness, narrowed view, exposure by side and distance, pickup, carry, throw, landing noise by kind, walls stop a throw, restart) and a browser test: G hides and leaves, picks up and throws a bottle.
**Status.** ACCEPTED.

### TD-099: The hunter (Phase 2, P2-4) — ACCEPTED
**Built.** `perception.ts` (a view cone per gait with a clear-line test, close sensing, an awareness rate that falls with distance and crouching and, for a hiding player, follows the hiding place's exposure; hearing by loudness, distance, walls, shut doors and floors; the vision polygon drawn on the floor is clipped by the same line-of-sight test) and `hunter.ts` (patrol, investigate, search, chase; three gaits walk, tiptoe and run; room-by-room search with a memory of rooms and hiding places already checked, expiring after 70 s; routes across floors; opens shut doors; unreachable goals are dropped rather than pushed at). `HideSeekGame` runs him only in the hunt phase and makes his steps and doors positional events marked `by: 'hunter'` for the audio in P2-5. The scene draws him only where the player could see him, with the cone.
**Fairness rule (section C).** The hunter reads the player's body only; the peeking view origin never reaches him (test: identical awareness with and without peeking).
**Found by testing.** A room-centre goal inside the dining table made him push at it forever: goals now use the nearest free point, and a goal he cannot reach counts as looked at. With no clue he patrolled for ever: after one round of his beat he now searches the house. The hunter lives in `src/modes/hide-seek/` (pure, no renderer) rather than `src/ai/`: it shares nothing with the fighter brains.
**Tuning.** Walk 2.3, tiptoe 1.1 and run 4.1 m/s against the player's 2.4, 1.2 and 4.4: a running player can outpace him but is loud. Balance beyond this waits for the owner's play-test.
**Status.** ACCEPTED.

### TD-100: A bigger, bungalow-sized house and room-only visibility (owner 18/11/2026) — ACCEPTED
**Owner decision.** The house should look like the supplied reference (light walls, wood floors, purple sofas, red rug, windows), with bigger rooms, a bungalow-sized house, and only the room the player is in visible.
**Decision.** `scaleHouse` (`house-scale.ts`) scales the authored plan (`HOUSE_PLAN`) by `HOUSE_SCALE` 1.45 (plan sizes only; heights, floor rise, body size and speeds stay), so rooms are about 2.1 times larger in area and the figures feel small beside the furniture like the reference. The rule tests keep placing bodies by coordinates on `HOUSE_PLAN`; `house-scale.test.ts` checks the real house (same rooms and hiding places, starts and patrol free, no furniture in walls, every hiding place has an exit, every room reachable, the hunter searches both floors). Visibility: remembered (explored) rooms no longer stay dimly drawn (`MEMORY_LIGHT` 0) and a room seen through an open doorway or arch is capped at `DOORWAY_GLIMPSE` 0.45, so the occupied room is the only fully visible one while doorway peeking (section C) still works. Palette moved toward the reference. The house is still two storeys (the brief's two-storey requirement), not a single-storey bungalow.
**Not done.** Windows and the exact art of the reference are not drawn yet (walls are greybox blocks); owner to say if more is wanted.
**Status.** ACCEPTED; owner to review in play.

### TD-101: Round flow, result screens, kill animation and horror audio (Phase 2, P2-5) — ACCEPTED
**Built.** Game Over and Victory overlays with Restart and Return to Menu (`hide-seek-hud.ts`, shown only when the round is over); the catch makes the player collapse and the screen redden over the 2.4 s killing animation, which the rules start exactly once; `HideSeekScene.restart` resets the game (hunter memory included), the lighting memory and the camera; Return to Menu drops `?mode` from the URL. Audio is synthesised (TD-033 style, no files): the `house-night` ambience, positional footsteps, doors, hiding and thrown-object sounds spatialised by the same transmission rule the hunter hears by, a heartbeat that follows his awareness, and stingers for the chase, the catch and the win (`hide-seek-audio.ts`, wired in the page, muted by `&mute`). The supplied ambience file stays unwired pending the owner's licence confirmation.
**Limits.** The sounds were not listened to by a person; the kill animation is a collapse, not a bespoke strike animation; phone buttons for the result screen use the same click targets (pointer-enabled overlay). Owner review of the whole phase is the next step; Phase 3 does not start without approval.
**Status.** ACCEPTED.

### TD-102: Nightmare House art pass: modelled furniture, aged horror look, wall fading, HIDE bubbles (owner 18/11/2026) — ACCEPTED
**Owner request.** Furniture modelled like the office's (not coloured blocks), walls that never hide the player, an eerie horror atmosphere, and a floating bubble over hiding places; layout, connections, stairs, doors, hiding places, interactions and mechanics unchanged.
**Furniture.** `src/rendering/house-furniture.ts` draws every house piece in the office furniture's visual language (`iso-draw`: bevelled blocks lit from the top left, wood grain, fabric weave, metal and ceramic sheen, ambient occlusion, soft shadows; drawer fronts, panelled doors, handles, cushion seams, a TV, a stove with burners, a bed with pillows, a toilet, and so on; bookshelves reuse the office's `drawBookshelf`). Every piece is then aged (colours drained and darkened, dust on the top, scratches, a damp stain, a ripped cushion, a cobweb on tall pieces, one cabinet door ajar). The data (sizes, colours, hiding spots) is untouched.
**Horror dressing.** `src/rendering/house-decor.ts`: aged plaster with damp streaks, cracks, peeling paint, a dado rail and worn skirting; floors with dark corners, grime, stains, scuffs, debris and a slant of moonlight in the rooms along the back wall; a frayed, stained rug. Lighting in the scene: the house is dim (`AMBIENT`), the far parts of a lit room sink toward black, the colour has a cold cast, the lamps dip now and then and dip oftener and deeper as the hunter closes in (`lampLevel`, a pure function of the game clock), and a vignette frames the screen. The player and hunter are never tinted, so the player stays clear.
**Wall fading.** The occlusion fader now takes options; the house uses 14 per cent opacity and a 0.22 m margin, and fades every wall, door and piece of furniture at least 0.8 m tall that stands between the camera and the player, just before the player is covered. It already depth-sorted, so only things in front fade.
**Bug found on the way.** The wall code still used the original (unscaled) plan coordinates (TD-100), so after the house was scaled the interior walls were coloured as outside walls and many stood as low ledges. The outline is now derived from the rooms (`buildingBounds`, `onBuilding`), so any layout works.
**HIDE bubbles.** `hideCues` (pure) lists the hiding places within 6 m on the player's floor, marking the one the act key would use; the scene projects them over the furniture and the HUD draws crisp DOM bubbles that bob (bigger and glowing when in reach), only for places in a lit room, and none while hidden or carrying.
**Tests.** `occlusion-fader.test.ts`, `horror-house.test.ts` (cues, building outline, lamp flicker), a browser test for the bubble. **Limits.** Not auditioned or judged by the owner; windows are only implied by the moonlight patches; art is still greybox in the final style.
**Facing (owner, 18/11/2026: furniture must not sit at one fixed rotation).** `src/rendering/furniture-facing.ts` (pure) decides which way each piece faces from the layout: seating faces the coffee table (else the television), chairs face their table or desk, a bed has its head to a wall, and storage, counters and appliances stand with their backs to the wall behind them; a front that faces away from the camera shows its plain back. The pieces are drawn in that orientation (`frameFor`, depth-sorted parts). Data change: the sofa is now 2.8 m long (was 5 m) and sits right at the coffee table (its hiding place behind it keeps its entry and exit). Tests: `furniture-facing.test.ts` on both the plan and the real house.
**Owner follow-up (18/11/2026).** The armchairs and the sofa now sit tight round the coffee table. The bed is rebuilt: pale sheet, two plump pillows at the head, and a coloured blanket tucked in under them with a folded cuff, draped sides, wrinkles and a stain. Doors are textured (`door-draw.ts`): a worn wooden leaf with raised panels, grain, scratches, hinges, a kick plate and a brass knob, in a frame with a lintel so no gap is left above the opening. Furniture only fades if it is 1.3 m or taller, and only to 30 per cent (a sofa used to vanish when the player stood behind it). Hiding places went from 22 to 27: the dining-room sideboard, a living-room wardrobe, a window chest, and two storage-room boxes; the layout and connections are unchanged.
**Spacing (owner, 18/11/2026: furniture must not stack).** A scan found a floor lamp inside a bookshelf, the sink and the stove each built into a counter (two blocks in one spot) and nightstands touching the beds. Fixed in the layout: the sink and stove are now their own units in the counter run, the lamp stands by the seating, the nightstands have a gap. `house-scale.test.ts` now fails if any two pieces overlap or come closer than 9 cm (scaled), or if any piece sits in a doorway or on the stairs.
**Front walls and draw order (owner, 18/11/2026).** While the player is in a room, that room's south and east walls and their doors (the ones facing the camera) are forced see-through (`isFrontWallOf`, `OcclusionFader.setForced`), whether or not they overlap the player, so the whole room is always visible; the back walls stay solid. The nightstands moved to the left (west) of their beds, with the beds shifted east to make room. Found while checking: long furniture was sorted by its nearest corner, which drew the player behind a bed or sofa they stood in front of; `personOrder` (`depth-sort.ts`) now orders pieces 1.6 m or longer against the player by their footprint.
**Bigger house, narrower doors, four-legged beds (owner, 18/11/2026).** The rooms are stretched to `HOUSE_SCALE` 1.9 (from 1.45) while furniture grows only to `FURNITURE_SCALE` 1.45, so every room has more floor and there is space for more pieces (`scaleHouse` in `house-scale.ts`): a piece against a wall stays against it, a piece that belongs with a larger one (chairs round a table, a nightstand by a bed, armchairs round a coffee table) keeps its place beside it, anything else is centred where the stretched plan puts it. Doors are two thirds as wide (`DOOR_FRACTION`), and the walls beside each door grow to close the rest of the opening. The layout gained about 40 pieces (extra seating, a second sitting area, chairs at the kitchen island, bookshelves, shelves, benches, bins, lamps, trees) and nine hiding places (36 in all): wardrobe and chests upstairs, a living-room cupboard, boxes in the storage room and shed, and three more bushes. Beds are now frames on four legs with the rails 0.5 m off the floor, the mattress top at 0.78 m, and a shadowed clear gap beneath; each bed is over 3 m long, the hiding point is well inside its footprint, and its concealment is 0.9. While hidden in a closed place (under a bed, a wardrobe, a cupboard, a chest, a box) the player's figure fades out as they crouch in and is not drawn at all, so no leg or foot ever shows; partial cover (a curtain, a bush) leaves it dimly there. The hunter was sped up (walk 3.0, run 4.2 m/s, shorter pauses) so he can still search the bigger house in two minutes. Tests: `horror-house.test.ts` (bed clearance, hiding point, doors, counts, furniture size) and the spacing, reachability and facing tests on both the plan and the real house.
**Performance (found by measuring).** The detailed finish made the house about 2x slower to draw (11 to 5 frames per second in the container's software renderer), which also made the browser tests flaky. Every static piece (wall block, furniture, floor, stair tread) is now baked once at load into a texture (`bakerFor` in `house-view.ts`) and drawn as one sprite inside a node that carries the lighting tint, the wall fade and visibility; the result is about 17 frames per second in the same renderer, above the old 11, and the walls are crisper. Two Pixi details cost time: a texture's size is rounded to whole units (so anything under a metre came out one pixel wide: the drawing is rendered magnified and the sprite shrunk back), and baking a node that is already tinted bakes the tint in. Doors and the actors are not baked (they change).
**Status.** ACCEPTED, owner to review in play.

