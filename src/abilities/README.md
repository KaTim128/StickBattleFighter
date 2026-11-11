# src/abilities
**Owner:** Combat Systems Specialist. The shared ability framework: delivery components, modifiers, targeting, stamina, cooldowns, ultimate gating, interruption, AI usage hints.

**Key interfaces (TD-032):**
- `ability-def.ts`: `AbilityDef`, `AbilityKit`, deliveries (`projectile`, `dash`, `nova`, `leap`), payload, ultimate charge.
- `AbilityCaster` (`ability-caster.ts`): per-fighter rules, pure and unit-tested (`check`, `start`, `update` → release/end events, `interrupt`, meter).
- `AbilityWorld` (`ability-world.ts`): runs deliveries; touches the game only through `AbilityHost` (implemented by `src/app/scenes/scene-abilities.ts`).
