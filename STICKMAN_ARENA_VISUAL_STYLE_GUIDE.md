# Stickman Arena visual style guide

Written in Phase 0 (17/11/2026) from the shipped game and its assets. New art must match it. Check new assets inside the running game next to existing ones before approving them.

## 1. View and projection

- **2.5D pseudo-isometric** drawing of a 2D top-down simulation (TD-045), from `src/rendering/projection.ts`:
  - screen x = (x − y) × √½;
  - screen y = (x + y) × √½ × ½ − height.
- Floors are diamonds, walls rise vertically, and props are prisms with lit tops and two shaded sides (`src/rendering/iso-draw.ts`, `prism.ts`).
- Draw order is depth-sorted (`y-sort-layer.ts`). Walls between the camera and a fighter fade (`occlusion-fader.ts`).
- Environment reference for houses and interiors: the owner's isometric office cutaway (`docs/references/master-plan/isometric-house-style-reference.png`). It shows:
  - clean stylised geometry;
  - an elevated three-quarter view;
  - cut-away walls at the front;
  - soft contact shadows;
  - warm wood and grey materials;
  - furniture grouped into readable zones.

Take the presentation from it, not the office layout.

## 2. Characters

- **Proportions:** the shared rig (`src/data/characters/<id>/character.json` bones). Head radius about 0.17–0.18 m, spine about 0.5 m. Large fighters use `rig.scale` (Titan 1.1); summons and skeletons are smaller.
- **Construction** (premium look, `src/rendering/premium-model.ts`):
  - capsule limbs and an outlined body;
  - muscle masses as outlined ovals lit toward the light;
  - joints as balls on mannequin-style fighters (Titan, the dummy);
  - heads are round shaded balls (`shaded-ball.ts`) unless the fighter has a signature head (Shroud's hood and mask, Necro's empty cowl).
- **Faces** (owner, 13/11/2026): no eyes or mouths except Shroud's mask and Titan's single white eye.
- **Shading:** cel-shaded in three tones:
  - base, a lit side and a shaded side (`skin`, `skinLit`, `skinShade`), plus a rim light on the shadow edge;
  - light comes from the upper left of the screen (`lx = −0.55 × facing`, `ly = −0.83`).
- **Outline:** a dark, saturated shade of the fighter's own colours (not pure black), about 0.3 × limb width.
- **Identity colours:**
  - Inferno: molten orange with yellow seams (`MAGMA`).
  - Titan: dark grey with a white chest panel.
  - Necro: deep violet-black with cursed violet and green.
  - Shroud: black cloak, red trim and a porcelain mask.
- **Animation:** procedural, weighty, with clear anticipation, impact and recovery (`docs/design/MAGIC_VFX_STANDARD.md`, `docs/design/CHARACTER_STYLE_QA.md`).

## 3. Environments

- Office (`src/data/arenas/office.ts`): warm wood floor, grey cubicles, glass partitions, breakable walls and doors, furniture with collision.
- Training yard: shown as the Colosseum until the real Roman Colosseum exists (Phase 3).
- Horror house (Phase 2), following the owner's 16/11/2026 direction:
  - the same isometric cutaway quality, in a dark and atmospheric version;
  - the staircase at the bottom right rising upstairs, and the entrance door at the front;
  - lit enough to navigate, with surrounding rooms dark.

## 4. Interface

- **Accent:** orange `#ff8a3d` (primary buttons, highlights), with warm golds `#ffb347` and `#ffd23f`.
- **Text:** light `#e8edf5` / `#f2f5fa` on dark panels (`#11151c`, `#0b0d12`).
- **Type:** heavy italic display lettering for titles (FIGHT, menu plates); system-ui 700–800 for labels.
- **Panels:** dark translucent cards with a thin border, rounded corners and soft shadows; the angled health bars match the stickmen (`top-hud.ts`).
- **Title art:** `assets/ui/title-menu.webp`. Its look (dark purple arena, fire and violet light) is the base for the Phase 3 redesign.
- **Owner references for Phase 3** (`docs/references/master-plan/`):
  - `tournament-draw-reference.webp`: the tournament draw screen;
  - `practice-cards-reference.png`: Practice cards with real game imagery;
  - `ability-list-reference.png`: ability list rows with round icons and an ULTIMATE tag.
- **Layout:** every screen fits one landscape screen with no scrolling and no black gaps; desktop first.

## 5. Effects

- Magic and impact effects follow `docs/design/MAGIC_VFX_STANDARD.md`: element-coloured, readable, short, never hiding the fighters.
- Blood is dark red with directional sprays (Shroud).
- Effects are presentation only and never decide hits.
