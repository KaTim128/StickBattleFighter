# src/ai
**Owner:** AI Specialist. Opponent decision making, navigation, perception, personalities, difficulty, training-dummy behaviour. Uses the same movement and combat systems as players.

## Key interfaces
- `FighterBrain.think(view): BrainOutput` (`fighter-brain.ts`): pure decisions for a fighter opponent: move, jump (also pulls up ledges), melee, heavy, an ability slot with an aim point.
- `abilityBand(def)`: the distance band where an ability is worth using, from its delivery data.
- The fight scene (`controlAi`) builds the view and applies the output through the player's own action paths (TD-061).
- `NavGrid` (`nav-grid.ts`): A* path-finding round walls and furniture (REQ-AI-5); the scene rebuilds it every 2 s.
- Difficulty levels live in `src/data/ai/difficulty.ts` (REQ-AI-4).

## Every new fighter needs its own brain (REQ-AI-8, TD-063)
Give it its own AI profile (`src/data/characters/<id>/ai.json`) and a `BrainDesign` in `src/data/ai/brains.ts`, written with its kit: range, movement, defence, a tactic per ability, combo chains. Then add it to the fighter list in `tests/integration/scenes/ai-opponent.test.ts` so its whole kit is tested at every difficulty.

