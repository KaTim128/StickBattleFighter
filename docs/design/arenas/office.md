# Arena design sheet: Office

**Status:** greybox, playable (11/11/2026). **Data:** `src/data/arenas/office.ts`. **Owner layout request:** 11/11/2026.

## Layout (29 m × 12 m; tightened 11/11/2026, was 36 m × 18 m)

```
┌──────────────── main office (carpet tiles) ─────────────────┬──── boss room (wood) ────┐
│ [C1] [C2] [C3] [C4] [C5] [C6]    6 cubicles along the top    │ bookshelves              │
│                                                              │                          │
│        open central aisle: the main combat zone            DOOR  visitor ▸DESK◂ boss   │
│        (water dispenser, printer, plants, cabinets)          │        (rug)             │
│ [C7] [C8] [C9] [C10][C11][C12] 6 cubicles along the bottom   │ plants, cabinet          │
└──────────────────────────────────────────────────────────────┴──────────────────────────┘
```

- **Cubicles (12):** 3 m × 2.7 m, low fabric walls on three sides, open to the aisle. Each has a desk, office chair, monitor, keyboard and mouse; some have a coffee cup.
- **Main aisle:** about 6.6 m deep and 19 m long (owner: "tighter, less space in the centre, a little shorter"). Tests require a clear 14 m × 4 m area and at most 7.5 m between the cubicle rows.
- **Boss room (7.6 m × 12 m):** dark wood plank floor, darker panelled walls, a red-and-gold rug, bookshelves, plants and a cabinet. The **executive desk** faces the door; the **boss chair** is behind it and the **visitor chair** opposite.
- **Interior wall** at x 21–21.4 m with a 2 m doorway (y 5–7 m).
- **Door:** wooden, closed at the start, blocks the way. Breaks only from a kick, a heavy strike (combo finisher) or a heavy knockback at ≥ 500 strength; walking or pushing never opens it. When broken it bursts into 7 splinters that do not block fighters.
- **Spawns:** player (8, 6); training dummy (13, 6), between the player and the door, so you can knock it through.
- **Furniture reacts (owner, 11/11/2026):** every solid prop is planted until struck; a blow shoves it by its mass, or breaks it at 0 durability into material-coloured pieces; items on a desk ride along and fall when it breaks. Metal cabinets never break; cubicle walls and bookshelves break but never slide (TD-031).

## Routes and camera
- One continuous space: the follow camera glides between rooms with no cuts (tested).
- Tight routes: inside each cubicle (about 1.1 m beside the chair); the doorway (2 m).
- The tallest props (bookshelves 2 m, interior wall 2.4 m) are covered by the camera's top margin.

## Objects (Phase 7 data already recorded)
Material, mass and durability for every prop are in `src/data/objects/props.ts`: glass is fragile, cabinets cannot be destroyed, and chairs, cups, bins, keyboards and mice are throwable.

## Verification
- `tests/unit/arenas/office.test.ts`: 12 cubicles (6 per side); boss-room arrangement; distinct looks; inside walls; no overlapping solids; spawns on open floor; the closed door seals the boss room (2 regions) and a broken door joins them (1 region); every cubicle reachable; open aisle.
- `tests/integration/scenes/office-door.test.ts`: walking never opens the door; jab and hook do not; the finisher, the flying kick and a knocked-back dummy do; splinters do not block; the camera follows into the boss room smoothly.
- `tests/e2e/phase4.spec.ts`: the same in a real browser.
