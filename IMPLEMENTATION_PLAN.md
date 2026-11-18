# Stickman Arena implementation plan

Phase 0 output, 17/11/2026. The plan follows the owner's master plan, stored in the repo with model names replaced by role labels:

`docs/references/master-plan/Stickman_Arena_Full_Master_Prompt_Updated.md`

It is grounded in the inspection recorded in:
- `docs/ARCHITECTURE_OVERVIEW.md`
- `AUDIO_ASSET_CATALOG.md`

The order is fixed by the owner:
1. Phase 1: stabilise the four fighters.
2. Phase 2: Hide and Seek Nightmare.
3. Phase 3: Roman Colosseum, the sixteen-fighter roster, then the UI redesign and tutorial.
4. Phase 4: Ancient Ruins Parkour, then release.

Model roles:
- **Planning/review model:** runs Phase 0, one consolidated review at the end of each phase, and release approval.
- **Implementation model:** does all work inside a phase, in batches, without switching.

The owner switches models by hand; the chat names the models.

## 0. Open questions for the owner (decide before the phase that needs them)

| ID | Question | What the project shows | Recommendation | Needed by |
|---|---|---|---|---|
| OQ-P0-1 | Inferno's "orange-to-blue flame transformation" ultimate | It **does not exist**. Inferno's ultimate is **Eruption** (a targeted leap and fire slam, `src/data/abilities/inferno.ts`). No blue-flame state is in the code. | Build the blue-flame transformation as Inferno's **fifth normal ability**: darkened body, blue flames, faster cooldowns and stronger damage, balanced as a normal ability. Keep **Eruption** as his ultimate: it is already a separate signature ultimate. The alternative is to design a brand-new ultimate and move Eruption to a normal slot, but that leaves him six normal abilities, so one would have to go. | Phase 1 (B10, B13) |
| OQ-P0-2 | Bleeding rules (B7) | Bleeding today is **damage over time**: `Combatant.bleed`, never stacking (max rate, max duration). The owner asked for it on 13/11/2026 for Bloodfade and Stalker Lunge. B7 describes a vulnerability multiplier ("deals 1.1×… not additional damage"), "must not stack beyond 1.5×" and "reapplication refreshes without multiplying again", which contradict each other. | One rule: a bleeding fighter **takes ×1.1 damage** from every source for **6 s**. Reapplying refreshes the 6 s and never raises the ×1.1. The ×1.5 cap is then moot (it only matters if stacking is wanted). Keep or drop the damage-over-time? Recommend replacing it, so bleeding is one effect. | Phase 1 (B7) |
| OQ-P0-3 | Vexoris toxicity numbers (B4) | Contradictions: (a) the table gives +1 for a completed combo, but the text says a full combo applies five stacks; (b) "maximum five stacks" against slow thresholds at 1, 5, 15, 20 and 25. | One counter, **toxicity points**, capped at **25**. Light hits add 0; a completed four-hit combo's splash adds **+1** (the table); each successful ability application adds +1; the ultimate adds up to +2. Slow follows the listed thresholds: 1→2%, 5→4%, 15→6%, 20→8%, 25→10% (cap). Tick damage is unchanged (1, 2, 3, then 4 HP every 3 s). "Five total stacks" is read as an error. "Maximum five stacks" in B7 becomes "maximum 25 toxicity". | Phase 3 (Vexoris) |
| OQ-P0-4 | "Desktop only" | The game also has full phone support: touch controls, forced landscape, the fullscreen shell, phone e2e projects. | Keep phone play working; design and polish every new screen for desktop first; don't remove touch controls or phone tests. | Phase 1 onward |
| OQ-P0-5 | "Use the existing office Parkour implementation" (Phase 4) | **No Parkour exists** (`grep -ri parkour src` is empty). Jumping, ledge grab, climbing, fall damage and landing already exist (`src/physics/climbing.ts`, `scene-climbing.ts`). | Build Parkour on those movement systems, in its own mode module and map. | Phase 4 |
| OQ-P0-6 | Pixabay sourcing | `pixabay.com` is not reachable from this environment (HTTP 000). | The owner allows `pixabay.com` and its CDN host in the environment's network settings, **or** supplies the chosen files. Without either, Phase 1 removes sound reuse with distinct synthesised sounds and records the gap. | Phase 1 (B18) |
| OQ-P0-7 | Horror ambience | Three uploads are **one identical file** (74.9 s). | Use it as the single ambience bed. The owner confirms its licence (the filename suggests a Pixabay item). | Phase 2 |
| OQ-P0-8 | Shroud's ultimate (B10) changes approved specs | Hunting Frenzy is now 8 s, with the enemy seeing a 1.6 m circle (REQ-ABL-21). | Follow B10: 4 s, the **whole arena** dark for opponents, spectators unaffected, +17% speed. Record it as a superseded rule (SUP) in the spec. | Phase 1 |

## 1. Phase 1: existing fighter stabilisation, combat balancing and input

**Implementation model.** Two batches in one session, then one review.

### Batch A: foundations (in this order)

| # | Task | Files | Tests |
|---|---|---|---|
| A1 | Remove Story Mode from navigation (keep shared code); keep Game Modes first, above Practice; Admin Panel lists every fighter and variant (B12 too) | `src/interface/front-end.ts`, `main-menu.ts`, `src/app/bootstrap.ts` (`menuFighters`, `menuOpponents`) | `tests/e2e/front-end.spec.ts`, `menu.spec.ts` |
| A2 | CI. Causes found in Phase 0: (1) runs #154–#158 failed while balance values were changed ahead of their tests (the #158 log shows `shroud.test.ts` "Hunting Frenzy… 10% deadlier" failing with `expected 22 to be greater than 22` after `meleeDamageFactor` was set to 1): test expectations, not code defects; (2) runs #159–#160 were **cancelled at the 20-minute job limit**: lint, unit tests, build and the whole Playwright suite run in one job. Fix: split CI into jobs (lint+typecheck, unit, e2e desktop, e2e mobile) with sensible time limits; keep every assertion. Add stat-validation tests so one fighter's numbers can't silently break another's. | `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/unit/characters/` | CI green on GitHub |
| A3 | Input redesign. **General Settings**: remove Fullscreen (it's automatic, REQ-UI-39), Fire Beam controls and Touch Button Size. Esc opens Settings in-game. **Fighter Controls**: per-fighter keybinds stored per profile and fighter, with reset, conflict warnings, and tap and hold (e.g. "R (Hold)"). Reachable from Fighter Selection, Practice and Tutorial. | `src/input/bindings.ts` (today one global set), `settings-store.ts`, `keyboard.ts`, `intents.ts`, `src/interface/settings-panel.ts`, new `src/interface/fighter-controls.ts` | `tests/unit/input/*`, a new e2e for rebind, persistence, conflict, hold and Esc |

### Batch B: combat and fighters (in this order; later items depend on earlier ones)

| # | Task | Files | Depends on |
|---|---|---|---|
| B1–B2 | Stat audit of the four fighters; one stat pipeline (base, ability modifiers, temporary effects, status modifiers, final values) used by combat, AI, select screen and ratings | `src/data/characters/*/stats.json`, `src/characters/ratings.ts`, `resolve.ts`, `src/combat/combatant.ts` | n/a |
| B8 | **Status-effect framework first.** A registry for damage over time, slows, damage multipliers, stacking, refresh, duration, immunity, tick interval, cleanup and indicators. Move burn, bleed, decay, blind and dark onto it. | `src/combat/combatant.ts` (fields today), new `src/combat/status-effects.ts` | B1–B2 |
| B7 | Bleeding per OQ-P0-2 on the framework | `status-effects.ts`, `src/data/abilities/shroud.ts` | B8, OQ-P0-2 |
| B3 | Damage relationships: a heavy beats a single light; a full light combo's last hit is slightly above a heavy; abilities weighed against cooldown and range; HUD names each ability with its key. Fix fighters passing through furniture. | `moveset.json` files, `src/combat/attacks.ts`, `src/interface/ability-hud.ts`, `src/physics/movement.ts` | B1–B2 |
| B4 | Fire Beam: +1 s and more damage; stops at once when Inferno is hit (ticks, hitbox, VFX); AI aim delay and limited tracking by difficulty | `ability-world.ts` (beams, `steerBeam`), `fight-arena-scene.ts` `beamSteer`, `src/data/abilities/inferno.ts` | B3 |
| B5 | Necro: exactly 4 skeletons, no stun, one hit per swing, no hit-reaction loops, frail | `scene-summons.ts`, `src/data/characters/skeleton-warrior/*`, `necro.ts` | B8 |
| B6 | Shroud's stabs: no stun, never block getting up, no repeated reactions on a recovering target | `ability-world.ts` (`assault`), `combatant.ts` (recovery), `shroud.ts` | B8 |
| B9 | Titan's grab: no jitter; a dash still pushes Titan without breaking the grab; AI throws furniture; ultimate +40% defence | `ability-world.ts` (`stepGrab`), `scene-abilities.ts` `hold`, `src/data/abilities/rampage.ts`, AI | B3 |
| B10 | Ultimate charge cost scaled to ultimate strength; AI targets skeletons or the summoner as the situation demands; Inferno's transformation and ultimate per OQ-P0-1; Inferno AI turns smoothly to track; Shroud's ultimate per OQ-P0-8 | `src/abilities/ability-caster.ts` (meter), `fighter-brain.ts`, `inferno.ts`, `shroud.ts`, `magma-model.ts` (blue flames) | OQ-P0-1, OQ-P0-8 |
| B11 | Running jumps at edges, coyote time (none today), no double jumps or floating | `src/physics/movement.ts`, `climbing.ts`, scene jump code | n/a |
| B13 | Five normal abilities per fighter plus the ultimate. Add slot `a5` and a **loadout** (4 of 5 equipped) carried into the fight. New fifth abilities: Titan's Bastion Anchor, Necro's Soul Tether, Shroud's Umbral Feint, Inferno's transformation. | `src/abilities/ability-def.ts` (slots), `ability-caster.ts`, `kits.ts`, `src/data/abilities/*.ts`, `src/data/ai/brains.ts` (tactics for all five), `bindings.ts` (four ability keys map to the equipped four) | B8, B10 |
| B14 | Ability information and loadout screen: click a card for details generated from the ability data (damage, ticks, buffs, debuffs, status, shields, control, range, area, durations, cooldown, cost, limits). Drag-and-drop four of five into the active slots (owner, 16/11/2026). Unequipped abilities read as **available alternatives, never locked**. Combat HUD: name, icon, key, cooldown; tooltip on hover; an info control that never casts; a short name notice when cast. | `src/interface/fighter-sheet.ts`, `fighter-info.ts`, `front-end.ts` (select), `ability-hud.ts`, new `src/interface/loadout.ts`, an ability "describe" helper in `src/abilities/` | B13 |
| B15 | Shroud's five-hit combo: five distinct animations, one hit each, a finisher only on a full chain, no stun lock | `src/data/characters/shroud/moveset.json`, `src/animation/clips.ts`, `src/combat/moves.ts` | B6 |
| B16 | Dodge: responsive input buffer, synced movement, hitboxes that miss once dodged, attack tracking committed after start, invulnerability window tuned, fatigue kept, same rules for AI | `combatant.ts` (dodge), `src/combat/dodge-direction.ts`, `attacks.ts`, scene soft-lock | B3 |
| B17 | Longer fights: record a baseline first (repeated AI-vs-AI fights: mean and median duration, damage, dodge rate, win rate), tune, re-measure, write it up in `FIGHTER_SYSTEM_CHANGELOG.md` | new `tests/integration/balance/fight-length.test.ts` (measures), data files | everything above |
| B18 | Unique audio for every hit, ability (all five) and ultimate of the four fighters; Shroud's five combo sounds; per-move `sfx` on moves | `src/audio/sound-board.ts`, `moveset.json` (new per-move `sfx`), `audio.json`, `src/data/abilities/*.ts`, `AUDIO_ASSET_CATALOG.md` | B13, B15, OQ-P0-6 |

**Phase 1 acceptance:**
- every item of the master plan's Phase 1 acceptance list;
- the full unit, integration and e2e suites pass, the build passes, and CI is green on GitHub;
- `tests/integration/ai/engagement.test.ts` (AI never idle) still passes.

**Risks:**
- The B13 slot change touches abilities, HUD, bindings, AI, tutorial and many tests. Do it in one batch after B8, with the four-ability path kept working until the switch.
- `fight-arena-scene.ts` is 3,213 lines: add new logic in helper modules (like `scene-summons.ts`), not in the scene.

## 2. Phase 2: Hide and Seek Nightmare

**Implementation model.** One session, then one review. This is a **new mode with its own scene**: it must not grow `fight-arena-scene.ts`. Reuse the physics world, character views, animator, nav grid, occlusion fader, sound board and front end.

| # | Task | New or affected files |
|---|---|---|
| 1 | Mode shell: entry from Game Modes as **Hide and Seek Nightmare**; dummy as the player; Shroud as the only hunter; combat input off | `src/modes/hide-seek/` (rules, state, timers), `src/app/scenes/hide-seek-scene.ts`, `bootstrap.ts` (a `?mode=hide-seek` page), `front-end.ts` |
| 2 | **Multi-floor house** data. Ground floor: living room, dining room, kitchen, toilet, corridors, front and back doors. Upper floor: two bedrooms each with a bathroom, storage room, hallway. Front yard and backyard with grass, trees, bushes, fence, path, driveway, garden furniture, shed. Per the owner's reference (16/11/2026): the isometric architectural cutaway style of the office reference, **the staircase at the bottom right rising upstairs**, the **entrance door at the front**, dark and atmospheric. | `src/data/arenas/house.ts` (rooms, floors, doors, stairs, furniture, hiding spots), `src/arenas/` (colliders per floor), a new floor model (today one floor only) |
| 3 | Floors and stairs: a walkable staircase with collision; floor index on bodies; nav graph across floors | `src/physics/`, `src/ai/nav-grid.ts` (extended to floors) |
| 4 | **Room visibility** (not a radius): room graph, door openings, sightline rays from the player, explored-room memory, floor-aware hiding, smooth lighting fades. Independent from AI perception. | new `src/environment/visibility.ts`, `src/rendering/` (room and floor layers, a darkness overlay), reuse `occlusion-fader.ts` |
| 5 | Doorway peeking (camera only; never feeds AI) | `src/camera/`, `hide-seek-scene.ts` |
| 6 | Player stealth: run (loud), crouch (quiet, slow), hide in spots (beds, wardrobes, cupboards, chests, boxes, curtains, shower curtains, bushes), each with an enter/exit sound and noise level | `src/modes/hide-seek/hiding.ts`, input actions (crouch, interact) |
| 7 | Throwable distractions: bottles, cans, toys; impact noise draws Shroud | reuse the pickup and throw code; noise events |
| 8 | **Shroud hunter AI**: patrol, investigate, search rooms systematically, inspect hiding spots, chase, search memory; sight cone with line of sight and concealment; hearing attenuated by distance, walls and doors; three gaits (walk, run, tiptoe) | `src/ai/hunter-brain.ts` (separate from `fighter-brain.ts`), `src/modes/hide-seek/perception.ts` |
| 9 | Vision cone indicator (subtle, ground-projected) matching the real check | `src/rendering/` |
| 10 | Flow: exactly 20 s of preparation, then the hunt; survive 2:00 to win; caught triggers a one-time kill animation, then Game Over; Restart and Menu reset everything | `src/modes/hide-seek/rules.ts`, `src/interface/` result screens |
| 11 | Audio: the ambience bed (the single candidate, OQ-P0-7); positional footsteps, creaks, doors, hiding sounds; tension rising as Shroud nears | `src/audio/` (add stereo panning and distance), `AUDIO_ASSET_CATALOG.md` |

**Tests:**
- unit tests for rules, timers, perception, hearing, search memory and visibility graph;
- integration tests for hunts and floor travel;
- e2e for a full round, restart and menu;
- each of the 17 checks in the master plan's section L.

**Risks:**
- The renderer is single-floor today. Floors, ceilings and room masking are the biggest new rendering work; prototype the visibility layer before furnishing the house.
- Performance of sightline rays: update visibility on room change and at a few Hz, not every frame.

## 3. Phase 3: Colosseum, sixteen fighters, UI redesign and tutorial

> **Owner order (19/11/2026, TD-112):** four of the twelve new fighters first (to be named), then the Colosseum (part A), then the other eight fighters (B1 and B2), and only then parts C to C7 and Phase 4. Needs Phase 2 reviewed and approved first.

**Implementation model.** One session in the order A → B → C, then one review.

| Part | Tasks | Files |
|---|---|---|
| A | **Roman Colosseum** (white pillars, arena walls, uneven sand, elevation); used by Tournament and Free Zone; rename the practice option to **Free Zone**; no other new combat arena | `src/data/arenas/colosseum.ts`, `src/rendering/arena-view.ts`, `iso-draw.ts`, terrain height support in physics |
| B1 | **Vexoris** per spec and OQ-P0-3, on the Phase 1 status framework | `src/data/characters/vexoris/*`, `src/data/abilities/vexoris.ts`, poison in `status-effects.ts`, `premium-model.ts` skin (gas mask, jar), AI design |
| B2 | Eleven fighters (Aerion, Arcstrike, Frostweld, Reson, Geargrind, Psion, Solstice, Tidebreaker, Quakor, Kenshiro, Chronos): model, animations, combo, heavy, five abilities with their fifth per spec, ultimate, passive, AI, stats, audio, keybinds, Admin Panel, Tournament and Free Zone. One or two at a time; never register an unfinished fighter as playable. | `src/data/characters/<id>/*`, `src/data/abilities/<id>.ts`, new delivery types only where none fits, `src/data/ai/brains.ts`, `select-stances.ts`, `ability-icons.ts` |
| C | **UI redesign** from the title art: Main Menu, Game Modes, Practice, Settings, Fighter Selection, Tournament, **Other Games** (Hide and Seek available; Parkour shown as coming soon, launch disabled), Tutorials, Loading screen; sand-blow transitions | `src/interface/*`, `index.html` styles |
| C2 | **Game mode cards with representative images** (owner, 16/11/2026): large image cards from real game screenshots, title, description, hover preview. Practice shows Tutorial and Free Zone as in the owner's reference. | `front-end.ts`, screenshots captured from the game into `assets/ui/` |
| C4 | **Tournament draw screen** from the owner's reference (16/11/2026): the bracket art with its decoration trimmed, used as the draw screen, the real entrants placed in its slots | `src/interface/tournament-screen.ts`, `assets/ui/tournament-draw.*` (from `docs/references/master-plan/tournament-draw-reference.webp`) |
| C5 | Loading screen with art and progress | `index.html`, `bootstrap.ts`, `pixi-assets.ts` |
| C6 | Complete tutorial: generic movement and combat, plus one tutorial per fighter (all five abilities, the loadout, the ultimate, its keys, tap or hold) | `src/tutorial/` (data-driven steps per fighter), `tutorial-overlay.ts` |
| C7 | Polished loadout, ability information and HUD for all sixteen fighters (extends Phase 1 B14); **drag and drop** with clear "alternative, not locked" styling, matching the owner's ability-list reference | `loadout.ts`, `fighter-info.ts`, `ability-hud.ts` |

**Tests:**
- a roster test asserts exactly 16 main fighters, each with 5 normal abilities and 1 ultimate;
- every ability has unique sound ids, information and AI tactics;
- per-fighter integration tests, the poison maths, and e2e for every screen;
- the AI engagement test extended to the new fighters (sampled pairings).

**Risks:**
- The roster is the largest volume of work. Shared deliveries (projectile, beam, dash, zone, shield, counter, summon, tether) should cover most abilities; add new delivery types only when genuinely needed, with tests.
- Sixteen sets of per-move audio depend on OQ-P0-6.

## 4. Phase 4: Ancient Ruins Expedition Parkour, then release

| # | Task | Files |
|---|---|---|
| 1 | Parkour mode and ruins map (not a combat arena), played as the dummy; platforms, jumps, climbs, checkpoints, timer, best times, replay (OQ-P0-5) | `src/modes/parkour/`, `src/data/arenas/ruins-parkour.ts`, reuse `climbing.ts`, `movement.ts` (coyote time from Phase 1) |
| 2 | Enable its Other Games card with a real screenshot | `front-end.ts`, `assets/ui/` |
| 3 | Final integration: full regression, performance, documentation, release check | all |

## 5. Review checkpoints and model switching

| When | Switch to | Then |
|---|---|---|
| End of Phase 0 (now) | Implementation model | Begin Phase 1 once the owner approves Phase 0 and answers the open questions needed for Phase 1 (OQ-P0-1, 2, 4, 6, 8) |
| End of Phase 1, 2 and 3 | Planning/review model | One consolidated review against acceptance criteria, actual code and tests |
| After a passed review | Implementation model | Next phase |
| Critical or High findings | Implementation model | One consolidated correction batch, then one focused re-check |
| End of Phase 4 | Planning/review model | Final inspection and release approval |

## 6. Testing requirements (all phases)

- Before each handoff:
  - `npm run lint`;
  - `npm run typecheck`;
  - `npx vitest run` (full);
  - `npx playwright test --trace off` (full);
  - `npm run build`.
- CI on GitHub must be green; after A2 it must also stay under its time limits.
- Gameplay changes are checked in a real browser with screenshots.
- Never delete or weaken a test to pass. A wrong test is fixed with the reason in the commit.
- Keep `tests/integration/ai/engagement.test.ts` and `blindness.test.ts` green across every phase (owner, 16/11/2026).
