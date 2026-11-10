# SYSTEM OWNERSHIP REGISTRY

Maintained by the Master Developer. **One owner per system.** Owners make the changes in their system. Contributors may only change it through an interface agreed with the owner and approved by the Master Developer. Read-only specialists (Architecture, QA) own no source paths.

## Specialists

| Agent file | Role | Write access |
|---|---|---|
| `stickman-architect` | Architecture Specialist | **Read only** |
| `rendering-specialist` | Rendering Specialist (2D) | Implementation |
| `physics-specialist` | Physics Specialist | Implementation |
| `combat-systems-specialist` | Combat Systems Specialist | Implementation |
| `character-specialist` | Character Development Specialist | Implementation |
| `animation-specialist` | Animation Specialist | Implementation |
| `ai-specialist` | AI Specialist | Implementation |
| `mobile-controls-specialist` | Mobile Controls Specialist (input, HUD, menus, tutorial UI) | Implementation |
| `backend-specialist` | Backend Specialist (including security) | Implementation |
| `qa-specialist` | Quality Assurance Specialist | **Read only** (may write files under `tests/` only when explicitly assigned) |

## Path ownership

| Path | Owner | Main contributors (via agreed interface) |
|---|---|---|
| `src/app/` (bootstrap, routing between screens) | Master Developer | Architecture (review) |
| `src/core/` (loop, events, shared types, utilities) | Master Developer | Architecture (review), all (request changes) |
| `src/rendering/` | Rendering | Animation (VFX hooks) |
| `src/vfx/` | Rendering | Animation (timing), Combat (impact profiles) |
| `src/camera/` | Rendering | — |
| `src/physics/` | Physics | Combat (hit query API) |
| `src/environment/` (interactable objects, pickup/throw, destruction) | Physics | Combat (damage from objects), Rendering (visuals) |
| `src/arenas/` (arena definitions, loaders, layout) | Rendering | Physics (colliders, nav data) |
| `src/combat/` | Combat | Animation (events), Physics (queries) |
| `src/abilities/` | Combat | Character (fighter kits), Animation |
| `src/characters/` (fighter runtime, stats application) | Character | Combat, Animation |
| `src/animation/` | Animation | Character (rig contract) |
| `src/ai/` | AI | Combat, Physics (nav) |
| `src/modes/` (match flow, game modes, Practice Zone) | AI | Backend (rewards API), Mobile Controls (screens) |
| `src/input/` | Mobile Controls | — |
| `src/interface/` (HUD, menus, settings, callouts) | Mobile Controls | Rendering (overlay rendering), Combat (state feed) |
| `src/tutorial/` | Mobile Controls | Backend (completion API), AI (dummy behaviour) |
| `src/progression/` (client-side view of profile, achievements, unlocks) | Backend | Mobile Controls (UI) |
| `src/services/` (client API layer to backend) | Backend | — |
| `src/data/fighters/` | Character | Combat (balance values) |
| `src/data/abilities/` | Combat | Character |
| `src/data/arenas/`, `src/data/objects/` | Rendering (arenas), Physics (objects) | — |
| `src/data/modes/` | AI | Backend (economy values) |
| `backend/` | Backend | — |
| `assets/models/`, `assets/textures/` | Character (fighters), Rendering (environments) | — |
| `assets/animations/` | Animation | — |
| `assets/effects/` | Rendering | Animation |
| `assets/audio/` | Animation (integration) | — (asset source: OQ-17) |
| `tests/unit/`, `tests/integration/` | Owner of the system under test | QA (review) |
| `tests/e2e/` | QA (when assigned) | all |
| `tools/` | Master Developer | any, when assigned |
| Root docs, `docs/`, `.claude/` | Master Developer | — |
| `package.json`, lockfile, `tsconfig`, build config | **Master Developer only** (single editor) | Architecture (recommend) |

## Cross-system contracts (to define before parallel work)

| Contract | Between | Defined in phase |
|---|---|---|
| Input intent API (`move`, `action1..5`, `dodge`, `block`, `jump`, `interact`; final set per OQ-02) | Mobile Controls → Combat, Physics, AI | 2 |
| Character controller API | Physics → Character, AI, Combat | 2 |
| Physics query API (raycast, shape cast, overlap, LOS) | Physics → Combat, AI, Camera | 2 |
| Combat event bus (hit, block, dodge, KO, status) | Combat → Animation, VFX, HUD, AI, Modes, Backend stats | 5 |
| Animation event contract (windup, active, impact, recovery) | Animation ↔ Combat | 5 |
| Ability definition schema | Combat ↔ Character | 6 |
| Fighter definition schema and rig contract | Character ↔ Animation ↔ Combat | 6/8 |
| Interactable object schema (mass, material, durability) | Physics ↔ Combat ↔ Rendering | 7 |
| Persistence service interface | Backend → Tutorial, Modes, Progression | 12 |

## Change log
| Date | Change |
|---|---|
| 10/11/2026 | Initial registry (TD-009 mapping). |
| 10/11/2026 | 3D Rendering Specialist renamed to Rendering Specialist (2D) (TD-021). |
