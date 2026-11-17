# Stickman Arena: architecture overview

Phase 0 inspection, 17/11/2026, against commit `e0a78ae` (branch `ccr-6b7ad8fe-whr1i5`).
Every path below was opened during the inspection. Sizes are line counts at that commit.

## Stack and commands

| Item | Value |
|---|---|
| Language and build | TypeScript (strict), Vite. `npm run dev`, `npm run build` |
| Rendering | PixiJS 8 (2.5D isometric drawing of 2D top-down simulation, TD-045) |
| Physics | Rapier2D (`src/physics/physics-world.ts`) |
| Tests | Vitest (`npm test`, 69 files, 498 tests), Playwright (`npm run e2e`, 21 specs, desktop and mobile projects) |
| Lint and types | Biome (`npm run lint`), `npm run typecheck` (both tsconfigs: app and node/tests) |
| CI | `.github/workflows/ci.yml`: lint, typecheck, unit, build, Playwright e2e, one job, `timeout-minutes: 20` |
| Deploy | `.github/workflows/deploy-pages.yml` (manual dispatch) to GitHub Pages |
| Size | 34,887 lines in `src`, 90 test files |

## Page and scene flow

- `src/main.ts`: mounts the fullscreen shell (`src/app/shell.ts`, TD-070) on a player visit, otherwise runs `bootstrap`.
- `src/app/bootstrap.ts` (1,050 lines): reads URL parameters, builds one scene per page (each fight, tournament step or practice session is its own page), wires the front end, settings, music, audio, HUD, tutorial and tournament page.
- `src/app/scenes/fight-arena-scene.ts` (3,213 lines): the fight. It owns fighters, physics, the combat step, AI control (`controlAi`), the player controller, abilities host, summons, clash, climbing, teams, the intro countdown and all rendering of the fight.
  - Helpers split out of it: `scene-abilities.ts` (ability host), `scene-summons.ts`, `scene-clash.ts`, `scene-climbing.ts`, `scene-teams.ts`, `fighter-entity.ts`.
  - Risk: the scene file is the largest and most coupled file; Hide and Seek must not be added into it (see the implementation plan).

## Systems and where they live

| System | Files | Notes |
|---|---|---|
| Fighter data and registration | `src/data/characters/<id>/` (`character.json`, `stats.json`, `moveset.json`, `animation-profile.json`, `effects.json`, `audio.json`, `ai.json`), `src/characters/library.ts` (`BUILT_IN_LIBRARY`), `resolve.ts`, `schema.ts`, `validate.ts`, `overrides.ts`, `draft.ts` | Data-driven profiles resolved into a `FighterDef`. Playable: `inferno`, `rampage` (shown as Titan), `necro`, `shroud`. Others: `training-dummy`, `skeleton-warrior`, `base-stickman`. |
| Fighter statistics | `src/data/characters/<id>/stats.json`, `src/characters/ratings.ts` (menu ratings), `src/combat/combatant.ts` | `maxHp`, stamina, `power`, `defence`, crit, knockback and hit-stun resistance, mass. |
| Melee moves and combos | `src/data/characters/<id>/moveset.json`, `src/combat/moves.ts`, `src/combat/attacks.ts` | Combos are move chains with `starters` (tap, heavy, air). Shroud's combo is three hits today. |
| Abilities | `src/abilities/ability-def.ts` (types), `ability-caster.ts` (wind-up, recovery, cooldowns, meter), `ability-world.ts` (deliveries: projectile, beam, dash, leap, pull, grab, assault, strike, teleport, summon, buff), `kits.ts`, data in `src/data/abilities/<fighter>.ts` | Slots `a1`–`a4` and `ult`: **four normal abilities and one ultimate per fighter today**. No loadout system, no fifth slot. |
| Status effects | `src/combat/combatant.ts`: burn (`ignite`), bleed (`bleed`, damage over time, never stacks), decay (`decay`, attack and defence factors), blind (`blind`), dark (`darken`, sight radius), stun, invulnerability | No shared status-effect registry; each effect is its own field and timer on `Combatant`. Poison will need the framework planned in Phase 1 B8. |
| Summons | `src/app/scenes/scene-summons.ts`; Necro's `undeadArmy` summon spec in `src/data/abilities/necro.ts` (`count`, `lifeS`, `maxAlive: 4`, `near: 'enemy'`) | Minion AI is inside `scene-summons.ts`. |
| AI | `src/ai/fighter-brain.ts` (decisions), `src/ai/nav-grid.ts` (pathing), `src/ai/showmanship.ts` (close watched fights), `src/data/ai/brains.ts` (per-fighter designs), `src/data/ai/difficulty.ts` | `controlAi` in the scene feeds the brain and applies its output, including stuck detection (16/11/2026). |
| Movement, jumping, climbing | `src/physics/movement.ts`, `src/physics/climbing.ts`, `src/app/scenes/scene-climbing.ts` | Jump, ledge grab and climb exist. No coyote time (`grep coyote` finds nothing). |
| Grab and throw | Titan's `grab` delivery in `ability-world.ts`; furniture pickup and throw in the scene (`carrying`, `throwFollowS`) | |
| Animation | `src/animation/` (`skeleton.ts`, `animator.ts`, `clips.ts`, `greybox-motion.ts`, `ability-poses.ts`, `reaction-poses.ts`, `stance.ts`) | Procedural poses on a jointed skeleton. |
| Character drawing | `src/rendering/stickman-view.ts` (1,831), `premium-model.ts` (1,355, skins by body style), `magma-model.ts` (Inferno), `shaded-ball.ts`, `portraits.ts` (portraits and select-screen strips) | |
| VFX | `src/vfx/ability-vfx.ts` and siblings | Presentation only. |
| Camera and environment | `src/camera/`, `src/rendering/arena-view.ts`, `iso-draw.ts`, `occlusion-fader.ts` (wall transparency), `y-sort-layer.ts`, `src/environment/` (props, breakable doors and walls, debris) | Single floor; no rooms, floors, ceilings or line-of-sight visibility system. |
| Maps | `src/data/arenas/office.ts`, `training-yard.ts` (shown as Colosseum), `engine-check.ts`, `greybox-arena.ts`, `src/arenas/` (colliders, navigation) | No Roman Colosseum yet: "Colosseum" is the training yard. No house. |
| Game modes | `src/modes/tournament/` (`tournament.ts`, `tournament-flow.ts`, `tournament-store.ts`), `src/modes/team/team-battle.ts` (Tag Team), `src/app/tournament-page.ts`, practice via URL flags | No Hide and Seek, no Parkour, no "Other Games". |
| Tutorial | `src/tutorial/tutorial.ts` (8 steps), `src/interface/tutorial-overlay.ts` | Generic steps, not per fighter. |
| Front end | `src/interface/front-end.ts` (title, name, Game Modes, Practice, fighter select, Tag Team pick), `main-menu.ts` (Admin Panel), `settings-panel.ts`, `tournament-screen.ts`, `top-hud.ts`, `ability-hud.ts`, `fighter-sheet.ts`, `fighter-info.ts`, `ability-icons.ts` | Title menu: Story Mode (locked), Game Modes, Practice, Settings, Quit Game. |
| Input | `src/input/bindings.ts` (one global binding set), `keyboard.ts`, `intents.ts`, `settings-store.ts`, `touch-controls.ts`, `typing.ts` | **Keybinds are global, not per fighter.** No tap/hold distinction in bindings. |
| Settings storage | `src/input/settings-store.ts` (local storage), `src/progression/player-name.ts` | Local only; no server. |
| Admin Panel | `src/interface/main-menu.ts`, `src/admin/` (`editor.ts`, `local-access.ts`, `preview.ts`), `src/app/fighter-settings.ts` | Gate is a client-side name check (TD-065). |
| Audio | `src/audio/sound-board.ts` (91 synthesised recipes), `music.ts`, `ambience.ts`, `pause-when-hidden.ts`, `src/data/audio/music.ts` | See `AUDIO_ASSET_CATALOG.md`. |
| Loading and assets | `src/rendering/pixi-assets.ts`, `#status` element in `index.html` | No dedicated loading screen. |

## Tests

- Unit tests mirror `src/` under `tests/unit/`.
- Integration tests in `tests/integration/scenes/` and `tests/integration/ai/` run the real scene headless with physics.
- Browser tests in `tests/e2e/` run against a production build (`playwright.config.ts` starts `vite build && vite preview`).
- Long AI fights are covered by `tests/integration/ai/engagement.test.ts` (90 s per pairing).
