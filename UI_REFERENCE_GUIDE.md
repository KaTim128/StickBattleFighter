# UI reference guide

Owner references for menus, tournament and Practice screens (master update §8). Created 24/11/2026 (Batch 0).
Pixel-art mandate (owner 22/11/2026, TD-144): everything below is rendered in **pixel technique** (stepped gradients,
dither, square pixel borders, pixel font). The references fix layout, hierarchy, palette and framing, not smooth gradients.

## Files

| Image | Location | Shows |
|---|---|---|
| Tournament draw | `docs/references/master-plan/tournament-draw-reference.webp` | Bracket screen |
| Practice cards | `docs/references/master-plan/practice-cards-reference.png` | Practice mode cards |
| Ability list | `docs/references/master-plan/ability-list-reference.png` | Ability list layout |
| Furniture occlusion 1, 2 | `docs/references/ui/furniture-occlusion-1.png`, `-2.png` | Furniture fade bug and curved wall seam (Batch 7) |
| Pixel office 1, 2 | `docs/references/ui/pixel-art-office-1.jpg`, `-2.jpg` | 16-bit pixel-art target for environments (Batch 9) |

Limitation: UI images the owner mentioned from earlier tools are not in the workspace. The owner should add any others to `docs/references/ui/`.

## Tournament draw (observed)

- **Layout:** title "TOURNAMENT DRAW" top centre, bold italic, silver with a purple/orange glow. Bracket splits into a left (purple) half and a right (orange) half, converging on two centre slots.
- **Slots:** dark rectangles with a thick stone/metal frame (about 3 px, lighter top edge), an inner thin accent line (purple left, orange right), a small square emblem at the outer end of first-round slots (skull left, fist right).
- **Connectors:** 2 px lines in the half's accent colour, right-angled.
- **Backdrop:** dark stone arena, chains, banners, purple fire left and orange fire right.
- **Palette (approximate):** background `#1a1424`, slot `#2a2430`, frame `#4a4250`, purple `#a45be0`, orange `#f59a2c`, text silver `#e8e8f0`.

## Practice cards (observed)

- **Layout:** centred column; heading "PRACTICE" in bold italic gold; stacked cards each with a gold 2 px rounded border, dark translucent fill, bold italic card title and a one-line description; Back button below (dark, thin light border, bold white label); settings cog top right.
- **Card art:** the "FREE ZONE" card shows an arena preview with two fighters and health bars, caption bar at the bottom.
- **Palette (approximate):** background `#14100e` with faint diagonal orange streaks, card border `#e8a24a`, title `#f0b050`, body `#f4f4f4`.
- **Buttons:** dark fill, rounded in the reference, square 2 px stepped corners in pixel style; states: hover (lighter border), pressed (1 px down), disabled (50 % dither), focus (gold outline).

## Rules for new UI

1. Use the shared tokens and button classes (added in Batch 9); no ad hoc colours.
2. Smooth vector UI (the pixel direction was withdrawn on 25/11/2026): system font stack, gradients and rounded corners are fine.
3. Keep the layout and hierarchy of these references; do not copy art from other games.
4. Check at 1280×720, 1920×1080, 844×390 (phone landscape) and 1024×768.

## Design system (25/11/2026, TD-165)
Smooth vector UI, not pixel art. Tokens in `index.html` `:root`; buttons are `.ui-btn` (primary orange, secondary purple, danger red, skip gold-outline) with hover, pressed, disabled and focus states; panels `.ui-panel` (dark steel, gold border); headings bold italic uppercase (`.ui-title`). Existing screens are mapped onto these classes. Loading screen: darkened title art, spinner and "Loading..." bottom right.
