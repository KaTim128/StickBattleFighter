# DEVELOPMENT ROADMAP

Dependency-aware plan based on Playbook §12. Each phase is broken into tasks by the Master Developer, and each has **acceptance tests** that must pass (with evidence) before the next dependent phase starts. Phases marked ∥ may overlap once their dependencies are met.

**Legend:** ☐ not started · ◐ in progress · ☑ verified complete · ⛔ blocked by an open question

| Phase | Name | Depends on | Lead specialist(s) | Blocking OQs | Status |
|---|---|---|---|---|---|
| I | Project initialisation (docs, team, rules, skills, structure) | — | Master Developer | — | ☑ |
| 0 | Workspace, architecture approval, bootstrap | I | Master Developer | — (stack approved 10/11/2026) | ☑ |
| 1 | Rendering, physics, main loop, asset pipeline, scenes | 0 | Rendering, Physics | — | ☑ |
| 2 | Player character, free top-down movement (up/down/left/right), hop, collision | 1 | Physics | — | ☑ |
| 3 | Top-down camera (follow, auto-zoom framing, shake) | 2 | Rendering | — | ☑ |
| 4 | Office arena (greybox → readable) | 1, 2 ∥3 | Rendering, Physics | — | ☑ (owner layout: 12 cubicles, boss room, breakable door) |
| 5 | Shared combat engine: melee, health, damage, block, dodge, recovery | 2, 3 | Combat | OQ-05 | ◐ (code and tests done 11/11/2026: health, block, parry, dodge, stamina, reactions, TD-030; awaiting owner playtest and OQ-05 values) |
| 6 | Abilities, ultimate, stamina, cooldowns, projectiles, VFX hooks | 5 | Combat, Animation | OQ-05 (values) | ☑ (11/11/2026, Inferno kit; values provisional, TD-032) |
| 7 | Object interaction: pickup, carry, throw, material, destruction | 4, 5 | Physics, Combat | OQ-12 | ◐ (breakable door; furniture moves or breaks by durability, TD-031; pickup and throw to do) |
| 8 | First fully polished fighter + asset pipeline | 6, 7 | Character, Animation, Rendering | OQ-16 | ☐ |
| 9 | Inferno, Shadowfang, Ronin, Titan, Phantom roster | 8 | Character, Animation, Combat | OQ-05 | ☐ |
| 10 | AI opponents, personalities, navigation, Practice Zone | 5, 6, 7 ∥9 | AI | — | ☐ |
| 11 | Desktop keybinds, mobile joystick, five buttons, settings | 6 ∥(may start after 5) | Mobile Controls | — | ☐ |
| 12 | Tutorial, replay, profile persistence, admin skip | 11, 14 (interface) | Mobile Controls, Backend | — | ☐ |
| 13 | Practice, 1v1, 3v3, Ladder Run, Story Mode | 9, 10 | AI (match flow) | OQ-06, OQ-07, OQ-08 | ☐ |
| 14 | Backend, profiles, tokens, unlocks, achievements, admin | 0 (selection), 13 (data) | Backend | OQ-08, OQ-09 | ☐ |
| 15 | More arenas, objects, roster expansion toward 100 | 9, 13, 14 | All content specialists | — | ☐ |
| 16 | Performance, security, compatibility, release | all | QA + all | OQ-10 | ☐ |

> Note: Phase 12 needs a *persistence interface* before full Phase 14. The Backend specialist delivers an interface plus a local-dev implementation early, and server validation lands in Phase 14. Admin skip must never be client-trusted (REQ-TUT-6).

---

## Phase I: Project initialisation ☑ (10/11/2026)
**Scope:** spec, CLAUDE.md, progress, roadmap, decisions, testing checklist, 10 specialists, rules, skills, directory structure, reference reports.
**Acceptance:** all files exist with meaningful content; agent and skill YAML is valid; ownership has no conflicts; no game code. **Evidence:** see `DEVELOPMENT_PROGRESS.md`.

## Phase 0: Architecture approval and bootstrap
**Tasks:** owner reviews TD-003 to TD-007 and answers architecture-relevant OQs (online PvP, performance targets); Architecture specialist reviews the structure; create `package.json`, TypeScript config, Vite, lint and format, Vitest, Playwright; `npm run dev` shows a minimal 3D scene; CI-equivalent scripts (`typecheck`, `test`, `build`, `e2e`).
**Exit:** a documented project that **launches a minimal scene** `[PB §12]` (2D top-down since TD-021).
**Acceptance tests:** `npm run typecheck`, `npm test`, `npm run build` exit 0; a Playwright smoke test loads the page with zero console errors and a non-blank WebGL canvas (screenshot).

## Phase 1: Engine foundation
**Tasks:** renderer setup, lights, fixed-timestep loop (TD-013), Rapier init, scene lifecycle (load/unload), asset loader with error handling, debug overlay (FPS, physics wireframe).
**Exit:** stable 2D test environment and repeatable local build.
**Acceptance:** test scene with floor, lights, camera and collision boundaries; loop runs at a fixed step (unit test); a missing asset shows a handled error, not a crash; build reproducible.

## Phase 2: Character movement
**Exit:** one character moves naturally through a greybox arena.
**Acceptance:** up, down, left, right and diagonal movement (diagonals not faster); acceleration and deceleration; facing; jump hop with shadow (utility button / Space, TD-016); gravity;  wall collision without tunnelling; per-fighter weight and mobility from data; input layer separate (unit tests on the controller with synthetic input).

## Phase 3: Camera
**Exit:** camera stays readable and does not clip through geometry.
**Acceptance:** top-down follow, auto-zoom framing of all fighters within limits, smoothing, arena-bound clamping, shake, stability under knockback (scripted Playwright scenarios plus screenshots).

## Phase 4: Office arena
**Exit:** fully explorable office with correct collision and navigation.
**Acceptance:** every prop category in REQ-ENV-3 present (greybox allowed and labelled); open zones and tight routes; automated reachability check over the nav area; no props blocking paths incorrectly; frame-time measured.

## Phase 5: Combat foundation
**Exit:** one player and one dummy fight reliably.
**Acceptance:** unit tests for hit, miss, block, dodge, interrupt, knockback, recovery, defeat; hitbox and hurtbox positions follow animation; obstruction blocks hits (REQ-CMB-2); melee costs no stamina.

## Phase 6: Abilities and ultimate
**Exit:** one complete fighter has five functional combat actions.
**Acceptance:** shared ability framework; 3 abilities + 1 ultimate data-driven; cooldowns, stamina, targeting, range, collision, projectiles, interruption; VFX and SFX hooks fire on animation events; tests per ability.

## Phase 7: Environmental interaction
**Exit:** office props behave physically and can support combos.
**Acceptance:** pickup validity, carry, aim, throw, collisions with fighters, walls, furniture and floors; bounce, roll, break; glass shatters; wood topples or breaks; metal resists; debris cleanup; fighter-specific interactions via data (Titan, Shadowfang, Ronin, Phantom, Inferno).

## Phase 8: First polished fighter
**Exit:** one fighter proves the full production quality bar.
**Acceptance:** original 2D rig and art (TD-022); complete animation set; presentation targets PRS-1 to PRS-11 if adopted (OQ-15); asset validation test passes; QA review recorded.

## Phase 9: Full initial roster
**Exit:** five unique fighters pass matchup and ability tests.
**Acceptance:** distinct silhouettes, proportions and movement; no recolours; pairwise combat regression (all 10 pairs + mirrors); balance report.

## Phase 10: AI and Practice Zone
**Exit:** AI can fight, evade, reposition and use objects.
**Acceptance:** navigation around office furniture; approach, retreat, circle, dodge, block, counter, object use; personalities; difficulty levels; Practice Zone features (REQ-MOD-5).

## Phase 11: Input and HUD
**Exit:** both input layouts work independently (and simultaneously; see OQ-14).
**Acceptance:** desktop shows no mobile controls; mobile has a left joystick and exactly 5 right buttons; multi-touch; landscape; cooldown and stamina indicators; rebinding with conflict prevention and reset; tested on real devices.

## Phase 12: Onboarding
**Exit:** new, returning and verified-admin flows pass.
**Acceptance:** tutorial covers all REQ-TUT-2 topics; adapts to the input device; completion persists; replay from menu; Skip shown only for server-verified admins; a skip never marks an ordinary user's tutorial complete.

## Phase 13: Game modes
**Exit:** shared match systems support every mode.
**Acceptance:** Practice, 1v1, 3v3 (random pool of 5, pick 3), Ladder Run, Story Mode; win, loss, exit, draw, reward flows; no duplicated combat engine; mode integration tests.

## Phase 14: Backend and admin
**Exit:** progression persists and the server validates valuable actions.
**Acceptance:** backend selected and documented (TD-008); identity; profiles; token ledger; unlocks; achievements; stats; verified admin role (`admin128` name alone insufficient); versioned config with audit and rollback; abuse-case tests; cross-device persistence; **no deployment without approval**.

## Phase 15: Content expansion
**Exit:** content pipeline scales without rewriting core systems.
**Acceptance:** new arenas (playground, street, jungle, field) and fighters added through skills only; no core-system edits required (verified by diff review).

## Phase 16: Release readiness
**Exit:** production build tested, documented and deployable.
**Acceptance:** `/release-check` passes; performance targets (OQ-10) met on real devices; security review; known issues documented; **public deployment only with explicit owner approval**.

## Next recommended milestone
**Phase 3: camera completion (auto-zoom to frame opponents, shake), then Phase 4: office arena.** Phase 2 was verified on 11/11/2026. Earlier: Phase 2: player character and movement; Phase 1 verified on 11/11/2026. (Previously: Phase 1: engine foundation; Phase 0 verified 10/11/2026.) Already in place: the fixed-timestep loop and physics initialisation. Remaining: lint and format tooling (deferred from Phase 0), a smaller Rapier bundle, scene lifecycle, an asset loader with error handling, a debug overlay, and collision boundaries. OQ-10 (performance targets) should be answered before Phase 1 ends.
