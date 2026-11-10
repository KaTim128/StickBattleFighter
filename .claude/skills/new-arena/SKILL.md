---
name: new-arena
description: Create a new Stickman Arena 2D top-down arena using the shared loading, collision, navigation, interactable-object and performance conventions. Use for the office arena and every later arena (playground, street, jungle, field).
---
# New arena

**Owners:** Rendering (layout, visuals, lighting) and Physics (colliders, nav data, interactables). The Master sequences their work: layout first, then colliders and nav, then interactables, then lighting and polish.

## Steps
1. **Read** spec §5–6 and the existing arena data in `src/data/arenas/`. List the required props and the material responses for this setting (REQ-ENV-7).
2. **Layout plan** (`docs/design/arenas/<id>.md`): open combat zones, tight routes, cover placement, sightlines, spawn points, camera-hostile spots to avoid, and the throwable object list with materials, mass and durability.
3. **Greybox** the layout in data plus greybox models (labelled). Verify camera behaviour in tight spaces early.
4. **Colliders and navigation:** simplified collision shapes (not render meshes); nav data; collision groups.
5. **Interactables:** register objects with material, mass and durability using the shared object schema. Destructibles use shared destruction behaviour.
6. **Lighting and materials** within mobile budgets; LOD and instancing for repeated props.
7. **Tests:** arena data validation; reachability over all walkable zones; spawn validity; no props blocking paths; interactable behaviour tests; AI navigation smoke test.
8. **Verify** in the browser: walk every route, camera through tight routes, throw objects, break destructibles. Take screenshots and measure frame time on desktop and mobile emulation.

## Acceptance checks
- [ ] Fully explorable; nothing blocks incorrectly
- [ ] Camera does not clip in tight routes
- [ ] Interactables behave per material
- [ ] Performance measured and within budget (OQ-10)
- [ ] Greybox vs final assets recorded in `assets/ASSET_REGISTER.md`
