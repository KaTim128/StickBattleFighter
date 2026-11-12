# Asset Register

Every runtime asset must be listed here before it is committed (`.claude/rules/asset-management.md`).

| Path | Type | Owner | Source / author | Licence | Status (greybox/wip/final) | Spec ID | Added (DD/MM/YYYY) |
|---|---|---|---|---|---|---|---|
| `src/rendering/prop-view.ts` (code-drawn) | Office and test props: desks, cubicle walls, chairs, executive desk, boss and visitor chairs, bookshelf, rug, plants, cabinets, glass, dispenser, bin, printer, computer, keyboard, mouse, cup, pillar | Rendering | Master Developer (original) | Project | greybox | REQ-ENV-3, REQ-ENV-8..9 | 11/11/2026 |
| `src/rendering/door-view.ts` (code-drawn) | Wooden door and splinters | Rendering | Master Developer (original) | Project | greybox | REQ-ENV-11 | 11/11/2026 |
| `src/rendering/stickman-view.ts` (code-drawn) | Jointed greybox stickman and dummy | Rendering and Animation | Master Developer (original) | Project | greybox | REQ-ANI-6 | 11/11/2026 |
| `assets/audio/music-battle-japanese-boss.ogg`, `.mp3` | Music: Japanese gaming boss-battle track, loop-prepared (166.66 s; loop 43.69-166.63 s from first sound) | Audio | Owner-supplied (12/11/2026). The file name indicates Pixabay, author "openmindaudio", item 624650; edits: fade-out cut, end crossfaded into the loop start, re-encoded | Third-party: **owner to confirm** (if from Pixabay: Pixabay Content License, free use in games without attribution) | final | REQ-AUD-10 | 12/11/2026 |
| `assets/audio/sfx-fight-stinger.ogg`, `.mp3` | SFX: READY... FIGHT! stinger (5.8 s) | Audio | Master Developer (original, rendered by `tools/audio/fight_stinger.py`) | Project | wip | REQ-AUD-10, REQ-AUD-9 | 12/11/2026 |
| `src/rendering/magma-model.ts` (code-drawn) | Inferno premium model (body style `magma`) and premium portrait finish (`src/rendering/portraits.ts`) | Rendering | Master Developer (original) | Project | wip (prototype, awaiting approval) | REQ-VIS-10 | 13/11/2026 |
| `src/rendering/bookshelf-view.ts` (code-drawn) | Bookshelf premium redesign | Rendering | Master Developer (original) | Project | wip (prototype, awaiting approval) | REQ-VIS-10 | 13/11/2026 |
