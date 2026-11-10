# TECHNICAL DECISIONS

Architecture decision log. Each entry records context, decision, alternatives, trade-offs and status.
**Status values:** `ACCEPTED` (in force) · `PROPOSED` (recommended; owner approval needed before implementation depends on it) · `OPEN` (no recommendation yet) · `SUPERSEDED`.

| ID | Title | Status | Date |
|---|---|---|---|
| TD-001 | Project management foundation before any game code | ACCEPTED | 10/11/2026 |
| TD-002 | Five-action combat layout supersedes 4+4 layout | ACCEPTED | 10/11/2026 |
| TD-003 | Language and build: TypeScript + Vite | PROPOSED | 10/11/2026 |
| TD-004 | Rendering engine: Three.js (vs Babylon.js) | PROPOSED | 10/11/2026 |
| TD-005 | Physics engine: Rapier (JS/WASM) | PROPOSED | 10/11/2026 |
| TD-006 | Test stack: Vitest + Playwright | PROPOSED | 10/11/2026 |
| TD-007 | Asset pipeline: Blender → glTF 2.0 (.glb) | PROPOSED | 10/11/2026 |
| TD-008 | Backend technology | OPEN | 10/11/2026 |
| TD-009 | Ten-specialist team replaces the playbook's nine workers | ACCEPTED | 10/11/2026 |
| TD-010 | Directory structure | ACCEPTED | 10/11/2026 |
| TD-011 | Creature Clash is 2D: limits on its use as a 3D reference | ACCEPTED | 10/11/2026 |
| TD-012 | Reference videos are not committed to the repository | ACCEPTED | 10/11/2026 |
| TD-013 | Fixed-timestep simulation separated from rendering | PROPOSED | 10/11/2026 |
| TD-014 | Data-driven content format | PROPOSED | 10/11/2026 |
| TD-015 | Agent Teams stay disabled | ACCEPTED | 10/11/2026 |

---

### TD-001: Project management foundation before any game code — ACCEPTED
**Context:** The owner's initialisation instruction (10/11/2026) forbids building game systems in this phase.
**Decision:** Create the specification, process documents, specialists, rules, skills and an empty but documented directory structure only. No `package.json`, no dependencies and no source code until Phase 0/1 is approved.
**Trade-off:** Nothing runnable yet. The playbook's Phase 0 exit condition ("launches a minimal 3D scene") is therefore **not** met by initialisation. It is the next milestone.

### TD-002: Five-action combat layout — ACCEPTED
**Context:** Older requirements described four basic attack buttons plus four abilities. Playbook §4.2 replaces this.
**Decision:** Exactly five combat actions: Button 1 universal melee (no stamina cost), Buttons 2–4 unique abilities, Button 5 ultimate. The old layout is recorded as SUP-01 in the spec.
**Open consequence:** inputs for dodge, block, jump, pickup and throw are undefined (OQ-02).

### TD-003: TypeScript + Vite — PROPOSED
**Context:** Browser game; the playbook mentions TypeScript build gates (§15) and Vite tooling (§3.2).
**Recommendation:** TypeScript in strict mode, Vite as dev server and bundler, npm as package manager. Node ≥ 20 (the dev container has Node 22.23.4; confirm Vite's current minimum when bootstrapping).
**Alternatives:** Webpack (slower dev loop); plain JS (loses type safety across many data-driven systems).

### TD-004: Rendering engine — PROPOSED: Three.js
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

### TD-005: Physics — PROPOSED: Rapier (`@dimforge/rapier3d-compat`)
**Reasons:** WASM performance, deterministic options, a built-in **kinematic character controller** (slopes, steps, snap to ground) matching REQ-PHY-1/2, collision groups for layers, shape casts and ray casts for hit detection, line of sight and camera obstruction. Named in the playbook (§20).
**Alternatives:** cannon-es (pure JS, slower, less maintained); Ammo.js (Bullet port, large and awkward API); custom physics (too risky).
**Risk:** WASM init is asynchronous, so the bootstrap must await it. Watch mobile memory.

### TD-006: Test stack — PROPOSED: Vitest + Playwright
Vitest for unit and integration tests of deterministic rules (combat maths, cooldowns, stamina, data validation). Playwright for browser flows, screenshots and mobile emulation (`--trace off` by default). Real-device checks remain manual and logged in `TESTING_CHECKLIST.md`.

### TD-007: Asset pipeline — PROPOSED: Blender → glTF 2.0 binary (.glb)
Shared rig contract (bone names and animation clip naming) across fighters; Draco or Meshopt compression and KTX2 textures evaluated in Phase 1. Greybox assets live under `assets/**/greybox/` and are listed in `assets/ASSET_REGISTER.md`.

### TD-008: Backend — OPEN
Candidates to evaluate in Phase 14 (REQ-BE-1): managed Postgres with auth and row-level security (e.g. Supabase); Firebase (Auth + Firestore + Cloud Functions); custom Node (Fastify) API + Postgres. Requirements: server-validated ledger, verified roles, versioned config with rollback, audit log, cross-device profiles. **Owner input needed:** OQ-11 (preference and MYR budget), OQ-13 (online PvP?), OQ-09 (real-money purchases?). Until then, the client talks to an internal `services/` interface so the backend can be swapped in.

### TD-009: Ten-specialist team — ACCEPTED
**Context:** Playbook §8.1 defines nine workers. The owner's 10/11/2026 instruction defines ten different roles.
**Decision:** The owner's list governs (latest explicit instruction). Duties in the playbook that have no direct owner role are remapped:
- *environment-engineer* → split: **3D Rendering** (arena visuals, materials, layout art) + **Physics** (arena collision, destructibles, pickup and throw).
- *ai-gameplay-engineer* (game modes, match flow) → **AI Specialist** keeps match flow and mode orchestration as in the playbook.
- *ui-mobile-tutorial-engineer* → **Mobile Controls Specialist** owns all input, HUD, menus, desktop keybinds and tutorial UI ("cross-platform input consistency").
- *backend-security-engineer* → **Backend Specialist** (including security).
- *character-animation-engineer* → split: **Character Development** + **Animation**.
Architecture and QA remain **read only**, as in the playbook. Mapping detail: `docs/workflow/SYSTEM_OWNERSHIP.md`. Owner confirmation requested (OQ-18).

### TD-010: Directory structure — ACCEPTED
Follows the playbook §5 target layout, with these additions: `src/modes/` (game modes were not in the target list but are a distinct owned system), `src/data/` (data-driven definitions, REQ-ARC-3), `src/vfx/` (VFX has its own owner boundary), `backend/` (server code kept out of the browser bundle, REQ-BE-8), `tools/`, `docs/`. Each folder holds a `README.md` with purpose and owner instead of an empty placeholder. The `src/environment/` name is kept for runtime interactable-object systems; `src/arenas/` holds arena definitions and loaders.

### TD-011: Creature Clash is 2D — ACCEPTED
The playbook treats Creature Clash as the primary 3D foundation reference. Inspection showed it is a top-down 2D Phaser scene. It remains a reference for planar free movement, cover and line of sight, AI and abilities. The 3D camera, vertical movement and 3D collision are designed from engine documentation and first principles. See `docs/references/CREATURE_CLASH_OBSERVATIONS.md`.

### TD-012: Reference videos not committed — ACCEPTED
The two owner videos contain third-party franchise footage (≈ 22 MB). Committing them to a public-facing repository creates IP and size risks. Only the written observation report is committed; the owner keeps the originals. The playbook `.docx` **is** committed under `docs/references/` (owner-authored, 75 KB).

### TD-013: Fixed-timestep simulation — PROPOSED
Gameplay (physics, combat, AI) steps at a fixed rate (proposed 60 Hz) with rendering interpolated, so combat timing (wind-up, active frames, hit-stop) is frame-rate independent across desktop and mobile. This also keeps an online-PvP path possible (OQ-13).

### TD-014: Data-driven content format — PROPOSED
Fighters, abilities, arenas, objects and mode rules defined as typed TypeScript data modules validated by schema at load and in tests (e.g. with a runtime validator such as Zod). Server-published overrides (REQ-BE-5) layer on top of shipped defaults.

### TD-015: Agent Teams disabled — ACCEPTED
Playbook §2/§10: start with standard subagents. Agent Teams are experimental and more expensive. Not enabled in `.claude/settings.json`.

## Unresolved technical questions
- TD-008 backend choice; online PvP (OQ-13) would require an authoritative server and netcode, so decide **before** Phase 5 combat architecture hardens.
- Performance budgets (OQ-10).
- Whether jump exists on mobile given the five-button HUD (OQ-02).

## Dependencies
None installed. The proposed dependency list (TD-003 to TD-007) is installed only at Phase 0/1 after owner approval.
