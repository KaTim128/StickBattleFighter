# src/environment
**Owner:** Physics Specialist. Runtime interactable objects: material, mass and durability; pickup, carry, aim, throw; destruction and debris management (REQ-PHY-5..13).

**Key interfaces:**
- `ArenaProps` (`arena-props.ts`): props planted until struck; `hitWhere(shapeTest, hit)` shoves or breaks them by durability; `states` for tests and the debug hook (TD-031).
- `Debris` (`debris.ts`): capped flying pieces shared by everything that breaks.
- `BreakableDoor` (`breakable-door.ts`): breaks only on a kick, heavy strike or heavy knockback (REQ-ENV-11).
