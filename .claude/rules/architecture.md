---
paths:
  - "src/**"
  - "backend/**"
---
# Architecture rules

- **Dependency direction:** feature systems depend on `src/core/`; `src/core/` never imports feature systems. No circular imports between feature folders; communicate through `src/core` events or explicit interfaces.
- **One shared combat engine** (`src/combat/`) and **one ability framework** (`src/abilities/`) for every fighter and mode. Modes in `src/modes/` orchestrate; they never re-implement combat (INV-5, REQ-MOD-6).
- **Input isolation:** only `src/input/` touches keyboard, pointer or touch APIs. Everything else consumes intents (INV-6).
- **Simulation vs presentation:** gameplay state updates on the fixed simulation step; rendering, VFX and UI read state and never mutate gameplay state.
- **Data-driven content:** fighter, ability, arena, object and mode values live in `src/data/` and are validated by schema. No magic numbers in systems; no fighter-specific `if (fighter === ...)` branches in shared engines where a component or data field fits.
- **Server trust boundary:** anything valuable (currency, rewards, unlocks, tutorial completion, admin role, published config) is decided server-side. Client code may display it, never authorise it.
- Avoid premature abstraction. Introduce a generic layer only when two concrete uses exist or the spec requires it (e.g. 100-fighter scalability).
- Changing an ACCEPTED technical decision requires a new TD entry approved by the Master Developer (and by the owner for rendering or physics changes, REQ-ARC-12).
