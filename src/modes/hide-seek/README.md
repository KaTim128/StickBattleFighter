# src/modes/hide-seek
**Owner:** Master Developer (Phase 2). Pure, deterministic rules for Hide and Seek Nightmare; no renderer, no Rapier.
**Key interfaces:** `HideSeekGame` (state and fixed step), `HouseWorld` (rooms, doors, walls, stairs, sight, sound, routes), `Round` (20 s preparation, 2 minute hunt, kill, result), `Visibility` (room lighting), `hiding`, `props`, `perception` (what the hunter sees and hears), `Hunter` (patrol, investigate, search, chase), `scaleHouse` (the house is the authored plan made roomier).
**Rules:** the hunter reads the player's body only, never the peeking view; shared code names no character (ids live in `src/data/arenas/house.ts`).
