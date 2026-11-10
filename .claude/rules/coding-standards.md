---
paths:
  - "src/**"
  - "backend/**"
  - "tests/**"
  - "tools/**"
---
# Coding standards

- TypeScript **strict** mode. No `any` without a comment explaining why; prefer `unknown` plus narrowing.
- Naming: `camelCase` variables and functions, `PascalCase` types and classes, `SCREAMING_SNAKE_CASE` constants, `kebab-case` file names for modules (e.g. `character-controller.ts`), `PascalCase` only for files exporting a single class if the folder already uses that convention. Stay consistent within a folder.
- Units: metres, seconds, radians, kilograms in simulation code. Name the unit when ambiguous (`cooldownS`, `rangeM`).
- Small modules with one responsibility; export explicit types for every cross-system interface.
- Pure functions for rules (damage, cooldown, stamina maths) so they are unit-testable without a renderer or physics world.
- No dead code, commented-out blocks or leftover debug logging in commits. Use the debug overlay or logger in `src/core/`.
- Handle errors at boundaries (asset loading, network, storage) with user-visible fallbacks; never swallow errors silently.
- Comments explain *why*, not *what*. Reference spec IDs where a rule comes from the spec (e.g. `// REQ-CMB-4: melee has no stamina cost`).
- Formatting and linting are enforced by the tools configured in Phase 0. Do not hand-format against them.
