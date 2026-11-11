# src/characters
**Owner:** Character Development Specialist (with Combat for movesets, Animation for profiles). The data-driven character system (TD-039).

**Key interfaces:**
- `schema.ts`: Character Definition, Animation/Moveset/Stats/Effects/Audio/AI profiles, capabilities, `ANIMATION_STATES`, `REQUIRED_STATES`, `LIMITS`.
- `library.ts`: the built-in JSON library (`BUILT_IN_LIBRARY`), `withEntries`, `DEFAULT_CAST`, `FALLBACK_CHARACTER`. Register new characters here.
- `resolve.ts`: definition + profiles → runtime `FighterDef` (template, capabilities, multipliers, animation fallback chain).
- `validate.ts`: `validateCharacter` (errors and warnings). `load.ts`: `loadCharacter` (validate, resolve, fall back safely).
- `draft.ts`: the admin editor's local draft (`?character=draft`).
Guide: `docs/characters/HOW_TO_CREATE_A_CHARACTER.md`.
