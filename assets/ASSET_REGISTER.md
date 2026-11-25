# Asset Register

Every runtime asset must be listed here before it is committed (`.claude/rules/asset-management.md`).

| Path | Type | Owner | Source / author | Licence | Status (greybox/wip/final) | Spec ID | Added (DD/MM/YYYY) |
|---|---|---|---|---|---|---|---|
| `src/rendering/prop-view.ts` (code-drawn) | Office and test props: desks, cubicle walls, chairs, executive desk, boss and visitor chairs, bookshelf, rug, plants, cabinets, glass, dispenser, bin, printer, computer, keyboard, mouse, cup, pillar | Rendering | Master Developer (original) | Project | greybox | REQ-ENV-3, REQ-ENV-8..9 | 11/11/2026 |
| `src/rendering/door-view.ts` (code-drawn) | Wooden door and splinters | Rendering | Master Developer (original) | Project | greybox | REQ-ENV-11 | 11/11/2026 |
| `src/rendering/stickman-view.ts` (code-drawn) | Jointed greybox stickman and dummy | Rendering and Animation | Master Developer (original) | Project | greybox | REQ-ANI-6 | 11/11/2026 |
| `assets/audio/music-battle-japanese-boss.ogg`, `.mp3` | Music: Japanese gaming boss-battle track, loop-prepared (166.66 s; loop 43.69-166.63 s from first sound) | Audio | Owner-supplied (12/11/2026). The file name indicates Pixabay, author "openmindaudio", item 624650; edits: fade-out cut, end crossfaded into the loop start, re-encoded | Third-party: **owner to confirm** (if from Pixabay: Pixabay Content License, free use in games without attribution) | final | REQ-AUD-10 | 12/11/2026 |
| `assets/audio/sfx-countdown-fight.ogg`, `.mp3` | SFX: "3, 2, 1, Fight!" deep-voice countdown (4.1 s; words at 0.01, 1.12, 1.98, 2.86 s) | Audio | Owner-supplied (13/11/2026: freesound_community "three two one fight deep voice"), trimmed to start on "three" with a 0.4 s fade, re-encoded | Owner to confirm the source licence | final | REQ-AUD-12 | 13/11/2026 |
| `src/rendering/magma-model.ts` (code-drawn) | Inferno premium model (body style `magma`) and premium portrait finish (`src/rendering/portraits.ts`) | Rendering | Master Developer (original) | Project | wip (prototype approved 13/11/2026) | REQ-VIS-10 | 13/11/2026 |
| `src/rendering/bookshelf-view.ts` (code-drawn) | Bookshelf premium redesign | Rendering | Master Developer (original) | Project | wip (prototype approved 13/11/2026) | REQ-VIS-10 | 13/11/2026 |
| `assets/audio/music-menu-pulse-epic.ogg`, `.mp3` | Music: menu track, loop-prepared (trimmed to first/last sound, last 0.3 s crossfaded into its opening; loop 0.3-137.15 s) | Audio | Owner-supplied (13/11/2026). The file name indicates Pixabay, author "worldlikeall", item 305042 ("Pulse Epic Music"); re-encoded | Third-party: **owner to confirm** (if from Pixabay: Pixabay Content License) | final | REQ-AUD-11 | 13/11/2026 |
| `assets/audio/sfx-ui-click.ogg`, `.mp3` | Sound effect: interface button click (leading silence trimmed, mono) | Audio | Owner-supplied (13/11/2026). The file name indicates Pixabay, author "higuytwo", item 582158 ("classic click"); re-encoded | Third-party: **owner to confirm** (if from Pixabay: Pixabay Content License) | final | REQ-UI-32 | 13/11/2026 |
| `assets/ui/title-menu.webp` | Title screen art (1672 × 941): logo and the four fighters in an arena | Interface | Owner-supplied (13/11/2026); edited at the owner's request: the painted menu plates removed (inpainted and blended) so the game's own buttons sit there; Necro's eyes removed and his face darkened; 13/11/2026 later: Titan scaled to about 20% taller than the others (cut out, the sky behind repainted, put back behind the fire), Shroud's mask enlarged to fill a framed hood opening; Shroud given a curved porcelain mask matching his in-game mask (painted by the Master Developer) | **Owner to confirm** rights to use and publish it | final | REQ-UI-32 | 13/11/2026 |
| `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `public/manifest.webmanifest` | Home-screen app icon (Inferno's face and the logo, composed from the title art, with a maskable padded version) and web app manifest (full screen, landscape) | Interface | Derived from the owner-supplied title art (13/11/2026) | As the title art: **owner to confirm** | final | REQ-UI-31 | 13/11/2026 |

## Sound-effect sources (19/11/2026)
Each clip processed by `scripts/audio/process-sfx.sh` is recorded in `assets/audio/sfx/SOURCES.tsv`. The owner supplied these files; the source IDs come from the file names, so **the exact URLs and licences must be confirmed by the owner** before release (Pixabay: Pixabay Content License; Freesound: each sound's own Creative Commons licence, and any attribution it requires).

| File | Use | Source (from file name) | Creator | Licence | Status |
|---|---|---|---|---|---|
| `assets/audio/sfx/hide-seek/door/sfx-door-open.{ogg,mp3}` | Hide and Seek: a door opening (5 s cut) | Freesound 74662 | freesound_community | CC, to confirm | In use |
| `assets/audio/sfx/shroud/chest/sfx-chest-open.{ogg,mp3}` | Hide and Seek: the hunter lifts a lid (4 s cut) | Freesound 87569 | freesound_community | CC, to confirm | In use |
| `assets/audio/sfx/shroud/blade-slash/sfx-sword-slash.{ogg,mp3}` | Hide and Seek: the catch | Pixabay 476148 | pixabay user, to confirm | Pixabay, to confirm | In use |
| `assets/audio/sfx/hide-seek/footsteps/sfx-footsteps-concrete.{ogg,mp3}` | Footsteps: one continuous walk, not yet split into steps | Freesound 6265 | freesound_community | CC, to confirm | Processed, not wired |
| `assets/audio/sfx/shared/punch-light/sfx-punch-fist.{ogg,mp3}` | Fighting: light punch | Freesound 7171 | freesound_community | CC, to confirm | Processed, not wired |
| `assets/audio/sfx/shared/punch-light/sfx-punch-plain.{ogg,mp3}` | Fighting: light punch | Pixabay 140236 | universfield | Pixabay, to confirm | Processed, not wired |
| `assets/audio/sfx/shared/punch-heavy/sfx-punch-power.{ogg,mp3}` | Fighting: heavy punch | Pixabay 192118 | universfield | Pixabay, to confirm | Processed, not wired |
| `assets/audio/sfx/shared/punch-barrage/sfx-punch-barrage.{ogg,mp3}` | Future stickman ability, not Hide and Seek | Pixabay 542394 | chromascension | Pixabay, to confirm | Processed, not wired |

The Hide and Seek background track is `assets/audio/music-hide-seek-house.{ogg,mp3}`: the owner's "darkne scary horror atmosphere" track (Pixabay 620036, the same file as `docs/references/master-plan/`), crossfaded at its loop point (last 2 s into its start), 72.87 s. Licence: Pixabay, to confirm.
| assets/ui/mode-tournament.webp | image (static) | Katim / Claude | Still frame captured from the game's own Colosseum (original art, graded and vignetted) | project-owned | wip | Game mode card, spec section 8 |
| assets/ui/mode-tag-team.webp | image (static) | Katim / Claude | Still frame captured from the game's own Office arena | project-owned | wip | Game mode card |
| assets/ui/mode-hide-seek.webp | image (static) | Katim / Claude | Still frame captured from the game's own Hide and Seek house | project-owned | wip | Game mode card |
| assets/ui/mode-tutorial.webp | image (static) | Katim / Claude | Still frame captured from the game's own Tutorial Zone | project-owned | wip | Practice card |
| assets/ui/mode-open-zone.webp | image (static) | Katim / Claude | Still frame captured from the game's own Colosseum | project-owned | wip | Practice card |
