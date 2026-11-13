# src/ai
**Owner:** AI Specialist. Opponent decision making, navigation, perception, personalities, difficulty, training-dummy behaviour. Uses the same movement and combat systems as players.

## Key interfaces
- `FighterBrain.think(view): BrainOutput` (`fighter-brain.ts`): pure decisions for a fighter opponent: move, jump (also pulls up ledges), melee, heavy, an ability slot with an aim point.
- `abilityBand(def)`: the distance band where an ability is worth using, from its delivery data.
- The fight scene (`controlAi`) builds the view and applies the output through the player's own action paths (TD-061).
- `NavGrid` (`nav-grid.ts`): A* path-finding round walls and furniture (REQ-AI-5); the scene rebuilds it every 2 s.
- Difficulty levels live in `src/data/ai/difficulty.ts` (REQ-AI-4).

