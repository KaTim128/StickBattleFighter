# Stickman Arena: consolidated implementation plan (owner requests 19–22/11/2026 + master update)

> Written by the planning/review model for the implementation model (handoff 24/11/2026). Role labels only (CLAUDE.md: no model names in committed files).

## Context

Since the last completed work (`7f05960`), the owner sent eleven requests. Several sessions were interrupted by worker restarts, so the work is either not started or half-done:

1. Prismor Shard Blade + Necro + universal hit detection (19/11 15:13).
2. Revert Prismor's ultimate to the armour, Prismor animation variety, balance the new fighters against the original four, natural walks (19/11 15:53).
3. Psion Telekinetic Toss (19/11 16:04).
4. The **STICKMAN_ARENA_MASTER_DEVELOPMENT_UPDATE.md** spec, 19 parts and 81 acceptance items (19/11 16:51 and 17:47). It comes with four reference images and a planning→implementation workflow.
5. Tournament: spectate from the start (20/11).
6. Reson, Inferno, Vexoris and Chronos ability changes (20/11).
7. Arena order and the Tutorial Zone rename (21/11).
8. Crystal Prison v2 (21/11).
9. No passive healing (22/11).
10. A game-wide 16-bit pixel-art redesign (22/11).
11. "Create a plan so the implementation model can implement it" (24/11).

**Current repository state:**

- The tree is **uncommitted and does not type-check** (4 errors). It holds the half-done Shard Blade / Crystal Monster conversion and the Necro edits.
- **Live bug: Crystal Prison does nothing in the real game.** Commit `2a2034a` removed `trap()`, `legTrapState()` and `standable()` from `src/app/scenes/scene-abilities.ts`. The prisons are deleted on their first update, and Groundstrike ignores walls. The unit tests use a fake host, so they stayed green.

**Intended outcome:**

- Every request is implemented in the order below and verified in the browser.
- Each batch is committed, pushed and deployed to the preview, with an honest report.
- Requirements are traced end to end.

## Owner decisions (recorded 24/11/2026; record as TD-143 to TD-150)

| ID | Decision |
|---|---|
| D1 | **Arenas.** Rename the training yard, shown as "Colosseum", to **Tutorial Zone**. Office becomes the default arena. The real Colosseum is built later, after the remaining fighters, and must be **round** (a circular arena). When built it goes first in the list, then Office, then Tutorial Zone. |
| D2 | **Pixel art.** Use a global pixel renderer: low internal resolution with nearest-neighbour integer upscaling, plus pixel shading, dither, outlines, a pixel font and pixel UI. Do not hand-draw sprite sheets. This becomes the mandatory baseline for all future work. |
| D3 | **Crystal Prison and hover.** Cosmetic hover (Aerion, Psion `hoverM`) counts as **grounded**. Only a real jump, leap or launch at activation makes the Prison miss. |
| D4 | **Delivery.** Work batch by batch. After each batch: checks, commit, push, deploy the preview, then a short report. |
| D5 | **Shard Blade is timed** (8 s, like the old Arsenal). During it: dual swords, a 5-hit sword combo whose 5th hit is the crystal piercing punch, and the crystal-hammer heavy. Outside it: plain punches. |
| D6 | **House of Nightmare Fight mode covers the ground floor first**, with the stairs closed. Upstairs fighting is a later task. |
| D7 | **Practice KO respawn stays** (it is a reset, not healing). All other automatic healing is removed. |
| D8 | **Tournament "spectate from start"** means the player backs a picked fighter, the AI plays it, every match is watchable, and Skip Battle is available. |

### Conflicts resolved

The latest instruction wins. Each superseded rule goes to spec §22.

| Topic | Superseded | Now |
|---|---|---|
| Prismor ultimate | Crystal Monster summon | Crystal Armour (owner 19/11 15:53 and spec §10.4) |
| Prismor Arsenal | Crystal Fists (TD-142) | Shard Blade (spec §10) |
| Crystal Prison | 4 s hold, fliers dragged down | 6 s hold, grounded only, jumpers escape (21/11) |
| Visual style | Vector cel-shaded style guide | Pixel-art mandate (22/11) |
| UI references (images 3–4) | Smooth gradients | Their **layout, hierarchy, palette and framing** are kept, rendered in **pixel technique** (stepped gradients, dither, pixel borders, pixel font) |

## Handoff protocol and traceability

### Handoff and setup

1. **First action, before any code (Batch 0):**
   - Save this plan into the repo as `STICKMAN_ARENA_IMPLEMENTATION_PLAN.md`.
   - Copy the master spec to `docs/references/master-plan/STICKMAN_ARENA_MASTER_DEVELOPMENT_UPDATE.md`.
   - Copy the reference images unmodified, using byte copies, to `docs/references/ui/`:

     | Source | Destination | Shows |
     |---|---|---|
     | `69.png` | `furniture-occlusion-1.png` | furniture fading behind or around the player |
     | `70.png` | `furniture-occlusion-2.png` | the player standing on a bookshelf |
     | upload `2d83b2cb-image.jpg` | `pixel-art-office-1.jpg` | pixel-art office reference |
     | upload `192032f8-image.jpg` | `pixel-art-office-2.jpg` | pixel-art office reference |

   - Sources: `/tmp/claude-0/-home-user/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/images/` and `/root/.claude/uploads/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/`.
   - Images 3–4 (tournament draw, practice cards) are byte-identical to `docs/references/master-plan/tournament-draw-reference.webp` and `practice-cards-reference.png`; use those, no duplicates. (Done by the planning model at handoff, together with images 1–2, the pixel references and the master spec copy.)
2. **Traceability file.** Create `REQUIREMENTS_TRACEABILITY.md` with the matrix at the end of this plan:

   | ID | Requirement | Source | Batch | Files | Verification method | Status | Evidence |
   |---|---|---|---|---|---|---|---|

   - Status values: `todo`, `in-progress`, `implemented`, `build-verified`, `gameplay-verified`, `blocked`.
   - Evidence: test name, screenshot path, or commit hash.
3. **Every batch:**
   - Start by reading the traceability rows for the batch.
   - End by updating them together with the existing project records:
     - `DEVELOPMENT_PROGRESS.md`: files, commands with results, known issues, next task, commit hash;
     - `PHASE_HANDOFF.md`;
     - `TECHNICAL_DECISIONS.md`;
     - `TESTING_CHECKLIST.md`.
   - Only promote a row to `gameplay-verified` after a browser check (Playwright screenshot or measured behaviour). Code alone is never "done".
4. **Commits.** One commit per batch (or per sub-step if large), referencing the requirement IDs. Then push to `ccr-6b7ad8fe-whr1i5`, trigger `deploy-pages.yml`, and give the owner a short report: done, verified how, not verified, next.
5. **Resuming after a worker restart:** read `PHASE_HANDOFF.md`, `REQUIREMENTS_TRACEABILITY.md`, `git status` and `git log -5`, then continue at the first row that is not verified. Never redo a committed batch.
6. **Escalation.** Stop and ask the owner only for genuine decisions: a new OQ, or a spec contradiction not covered above. Do not ask about anything covered above.

## Batches (dependency order)

Each batch is one deploy. The IDs in brackets map to the matrix.

### Batch 0: Stabilise, records and references

- **[R0.1] Repair the tree.**
  - Finish the Shard Blade rename and delete the Crystal Monster path:
    - restore the HEAD crystal shield and armour code in `src/combat/combatant.ts` via `git show HEAD:…`;
    - restore the `buff.sovereign` branch in `scene-abilities.ts`;
    - restore the ultimate `crystalSovereign` in `src/data/abilities/prismor.ts`, `ultimate-charge.ts` and `ability-poses.ts`;
    - remove `'crystal-golem'` if nothing uses it.
  - Make typecheck, lint and vitest green.
  - Keep the Necro edits (count 4, lifesteal 0.15).
- **[R0.2] Restore the Prismor host methods.** Bring back `trap`, `legTrapState` and `standable` in `SceneAbilities` (the code is in commit `0d5adc5`). Add an **integration test that uses the real `FightArenaScene`**: a Prism cast traps the dummy, so the regression cannot hide behind a fake host again. Restore the `view.legTrap` update in `fight-arena-scene.ts`.
- **Records.** Do the handoff steps above, and create `UI_REFERENCE_GUIDE.md` (see Batch 9 for its contents). Add a `CLAUDE.md` rule naming:
  - `docs/references/ui/`;
  - `UI_REFERENCE_GUIDE.md`;
  - the pixel-art mandate;
  - `REQUIREMENTS_TRACEABILITY.md`.
- **Verify:** typecheck, vitest, build. In the browser, Prismor's Prison holds the dummy.

### Batch 1: Combat correctness

- **[HD] Universal hit detection (spec §15, owner 19/11).**
  - Extend `contact` (`src/combat/attacks.ts` `blowTouches`/`blowBox`) to **all fighters' melee**. Give `contact` a per-move reach tuning so no move breaks.
  - Weapon moves:
    - test the weapon segment (hand → blade tip) at the active frame against the target circle;
    - for a swept arc, sample 3–4 sub-steps of the swing during `activeS` so fast swings cannot tunnel.
  - Ability deliveries in `src/abilities/ability-world.ts`:
    - **strike, grab-start, rewindTime and dash:** replace the generous centre radii with true segment or contact tests;
    - **projectiles and fist:** already swept, keep;
    - **area (nova, eruption, blast, cloud, fog):** keep the gameplay collision volumes, but require the target circle to intersect the volume, never a VFX event.
  - **Summons** (`scene-summons.ts`) go through `resolveHit`, so they inherit the fix.
  - **Thrown props** (`checkThrownHits`, fight-arena-scene ~1443): add a swept rectangle test from last to current position.
  - One hit per attack window: keep the per-move `hitDone` and the per-blow `Set`s.
- **[HL] Healing system (22/11).**
  - Centralise every HP increase in `Combatant.heal(amount, source)`. Only sources flagged `allowsHealing` on the ability definition (a new `AbilityDef.healing?: { inBattle: true }`) may heal.
  - Remove bench regen: `team-battle.ts` `benchRegenPerS` and `scene-teams.ts:57`.
  - Route Necro lifesteal (`scene-abilities.ts:295`) and Chronos Rewind (`ability-world.ts` ~2569) through the gate.
  - Keep `Combatant.reset()` for KO respawn in practice only (D7) and dummy resets.
  - Add a test that lists every HP-increase path.
- **[N2] Soul Drain heals 15 % of actual HP removed.** Measure `hpBefore − hpAfter` in `applyStrike`, as `recordDealt` already does. Missed, blocked or absorbed hits heal 0; healing is capped at max HP. **[N1]** 4 skeletons is already in the tree; add a test that one cast gives exactly 4.
- **[C1] Clash names (spec §16).** In `src/app/scenes/scene-clash.ts:329`, show `"<WINNER NAME> WON!"` using `def.displayName` of the side that won. Keep `STALEMATE!`. Update the `clash-hud.ts` data-kind and the tests.
- **Verify:**
  - unit tests per path: a miss at 0.1 m beyond the fist, a sweep through a fast target, heal gating, and lifesteal from actual damage;
  - the full suite;
  - browser: punches at a gap register nothing.

### Batch 2: Ability updates

- **[PR1–PR3] Prismor Shard Blade (D5, spec §10.1–10.3).**
  - `shard-blade.ts` moveset:
    - taps: right diagonal slash, left slash, horizontal cross, forward double thrust, then **5th: crystal piercing punch** (arm extends through crystal growth);
    - heavy: **crystal hammer** (grow, lift, ground slam, debris, retract).
  - Distinct `Blade*` clips already exist (`clips.ts`); finish the poses.
  - Draw the swords in `premium-model.ts` from both hands along the forearm angles. Reuse `crystalBlade`; the `weapon.kind 'blades'` is currently not drawn.
  - The 5th hit and the hammer use view fields `weaponStrike: 'pierce' | 'hammer'` driven by `combo.attack.id` and progress. `StickmanView` needs the field.
  - The hammer's ground VFX deals no damage; damage comes only from the move's contact test.
- **[PR4] Ultimate: Crystal Armour.** Restore it (Batch 0), then polish `crystalArmourOverlay`:
  - layered plates follow the joints with no gaps;
  - the activation growth is staged;
  - it stays aligned through walking, dodging and jumping (check screenshots at 6 poses).
- **[PR5] Crystal Prison v2 (21/11).**
  - `legTrap` with `holdS: 6` and a short activation window (~0.4 s).
  - **Grounded only, checked at activation:** `heightM > 0.25` from a real jump, leap or launch misses; cosmetic hover counts as grounded (D3). This removes the "flier dragged down" branch from `updatePrisons`.
  - Visual: **two crystal formations with leg holes** (one per leg) that rise around each shin and anchor to the floor. Rework `StickmanView.drawLegTrap` into two pillar formations with a hole outline, a rising animation and a shatter at the end.
  - While trapped: the target can still use abilities, but `MOVEMENT_DELIVERIES` (dash, leap, teleport, rewindTime, assault, judgement, plus any launch or flight abilities) are refused, and jump, dodge and hover are blocked. This already exists; extend the list.
  - Update the ability text (keep `ability-text.test.ts` green).
- **[PS1–PS3] Psion (spec §14).**
  - Replace `psychicBarrier` with **Telekinetic Toss**, a new `toss` delivery:
    - pick the best real `ArenaProps` prop in range, any mass the props system supports;
    - the props system gets a `holdByTelekinesis(propId, anchorFn)` that moves the real body to a float point by Psion's hand;
    - if there is no prop, refuse with a new `CastBlock 'noObject'` before spending stamina or cooldown, and show a HUD message.
  - Rename Telekinetic Throw to **Psychic Slam**, a `slam` delivery:
    - throws the held prop as a real physics body;
    - damage and knockback come from mass and speed via the existing `THROWING.damageFor`, capped;
    - damage only on a swept collision, from the Batch 1 thrown-prop test;
    - with no prop held: refused with `'noHeld'`, no cooldown spent.
  - Props return to normal physics on release. The AI (`brains.ts` `psion-ai`) uses Toss then Slam as a combo.
- **[RS1] Reson Sonic Boom.**
  - Raise `widthM` from 2.6 to about 4.5 and `rangeM` from 7 to about 8.5.
  - Add `turnRadPerS` so it steers exactly like Fire Beam (the same `steerBeam` / `beamSteer` and AI `aiBeam` path).
  - **Remove the pin.** In `reson.ts` set `scream` false and drop `host.pin`, but keep the first-tick flinch and the shake/VFX. Targets move freely.
- **[IF1] Fire Beam proximity.** Damage already falls off with distance (`falloff {fullWithinM 1.5, minFactor 0.45}`). Make the gradient clearly proximity-driven by measuring from the beam origin to the **target's contact point**: `minFactor ~0.3`, `fullWithinM ~1`. Add a test that damage rises as distance falls.
- **[VX1–VX3] Vexoris.**
  - **Jar on the ground:** on reaching `maxRangeM` or the aimed point, burst into a splash cloud instead of fizzling. Change `updateProjectiles` to `impact` at the end of range when `d.cloud`. The splash's damage and poison apply once per target.
  - **Poison stacking:** jar and trap apply 3 stacks, the Toxicity cap rises from 25 to 40, and the damage sequence scales with stacks. Bounded so it cannot be permanent; it still clears on KO.
  - **Ultimate fog:** chip dps ramps with continuous exposure. Track the time inside per target and multiply `chipDps` by 1 + 0.15/s, capped at ×3. The ramp resets after leaving the fog for 1 s.
- **[CH1] Chronos ultimate stacking.** During Time Stop, each held blow on a target adds an escalating factor: blow n deals ×(1 + 0.12·(n−1)), capped at ×2. It is applied when the queued blows resolve in `endTimeStop`, with the 26 m/s knockback cap kept. It resets per ultimate. The AI part is in Batch 4.
- **Verify:** a unit test per ability, `ability-balance` bands, `unique-attacks` and `ability-text`. Screenshots for Shard Blade (each hit), hammer, armour, Prison, Toss/Slam, Sonic Boom steering and the Jar splash.

### Batch 3: Animation

- **[W1] Natural walks for the new fighters** (spec §13, owner 19/11): Prismor, Chronos, Reson, Geargrind, Kenshiro, Vexoris, Psion and Aerion.
  - In `src/animation/greybox-motion.ts` each style's walk/run gets real elbow bends (target 25–60° walk, 60–100° run). The explorer measured Prismor at about 2° (straight).
  - Add opposite arm/leg swing, torso counter-rotation and weight shift.
  - Hover styles (Psion, Aerion) get subtle arm drift with bent elbows.
  - The original four (Inferno, Titan, Necro, Shroud) stay untouched; a test asserts their walk poses are byte-identical.
- **[PR6] Prismor animation variety** (owner 19/11): distinct anticipation, impact and recovery on all Prismor clips. This overlaps PR1–PR3.
- **Verify:** a test that elbow bend is ≥ 20° throughout each new fighter's walk cycle. Screenshots of each walk at 4 phases.

### Batch 4: Intelligent AI (spec §3, Chronos AI 20/11)

All changes in `src/ai/fighter-brain.ts` and `src/data/ai/brains.ts`.

- **[A1] Stat awareness.** A `profile` derived from `fighterRatings` (`src/characters/ratings.ts`) and the kit: hp, speed, range class, defence, mobility. It sets preferred range, aggression and retreat thresholds. Low-max-HP fighters start cautious.
- **[A2] Health awareness.** Use `hpFrac` combined with natural survivability for tactics such as defend, dodge, spacing, saving abilities and punishing. Each archetype adapts differently.
- **[A3] Opponent awareness.**
  - Use the target's `attacking`, `recovering` (new: the attack's recovery phase) and hpFrac, plus a short history of its recent moves, to spot repeats.
  - Information limits: no hidden info, only observable state, and no reading of the opponent's cooldowns unless they are visible on the HUD.
- **[A4] Ability purpose.** Each tactic gets an expected hit probability: range band, the target's mobility, and `targetHelpless` / trapped bonuses. Skip casts that cannot connect, and save the ultimate.
- **[CH2] Chronos.** The ultimate tactic gets `when: { targetInRange, targetNotFleeing }`, then a scripted follow-up: chain melee and abilities into the frozen target to stack the CH1 factor.
- **[A5] Adaptation.** A phase state (opening, even, ahead, behind, critical) shifts weights. The anti-repeat penalty stays.
- **[A6] Performance.** Expensive evaluation runs every 0.1–0.2 s (per tier), with cheap per-step steering. Measure with 4 AI fighters.
- **Verify:** unit tests per rule (low start HP is cautious at t=0; skips an ultimate out of range; Chronos casts the ultimate with the target in range and lands follow-ups). Extend the harness (`tests/integration/balance/harness.ts`) to log decisions.

### Batch 5: Balance framework and roster rebalance (spec §2, §12; owner 19/11)

- **[B1] Harness.**
  - Extend `tests/integration/balance/harness.ts` (`roundRobin`, about 1 s per fight) from 4 fighters to **all 12 playable**.
  - Add an opt-in full matrix script (`npm run balance:matrix`, 12×12×N seeds) that writes `docs/qa/balance-matrix-<date>.md` with win rate, average duration, damage dealt and taken, ability hit rate and ultimate impact.
- **[B2] Framework.**
  - `BALANCE_FRAMEWORK.md` with class archetypes (melee, ranged, defensive, mobility, summoner): stat budgets, ability power budget (damage per cooldown, control seconds), and a new-fighter checklist.
  - Encode it as tests that extend `balance.test.ts` and `ability-balance.test.ts`, including control-time and survivability budgets.
- **[B3] Rebalance.** Iterate data only (stats JSON, kit numbers) until no fighter is above 65 % or below 35 % overall win rate on Normal difficulty. Pay special attention to Necro, Titan and Shroud against all others (§12); Necro keeps 4 skeletons and 15 %. Record every change with its reason in `FIGHTER_SYSTEM_CHANGELOG.md`.
- **Verify:** the matrix report committed, and the framework tests green. State honestly which matchups or seeds were run.

### Batch 6: Tournament (spec §1, owner 20/11)

- **[T1] Rules.**
  - `src/data/modes/tournament-rules.ts` holds `regulationS` (default 120), `overtimeS`, `overtimeDamageRampPerS`, `overtimeAiAggression` and `fallbackAfterS`.
  - Replace `MATCH_TIME_LIMIT_S` (`fight-arena-scene.ts:247`) and `decideMatch` (2199):
    - **Overtime:** a banner, a damage ramp for both sides, AI forced to engage (retreat disabled, aggression up), no healing (Batch 1).
    - **Fallback:** a performance score (hp %, damage dealt, landed hits, knockdowns, then time of first hit). **Never random and never "player wins ties".**
  - The timer starts after the intro.
  - Replace the watched-battle Leave coin toss (`tournament-page.ts`) with the same score.
- **[T2] Skip Battle.**
  - A button in watched fights fast-forwards the real simulation: run `scene.update(step)` in a time-budgeted loop (≤ 12 ms per frame) with rendering paused and a "Skipping…" state, until `matchResult`.
  - Guards: a single activation (disabled after the click), `onMatchEnd` idempotent, and bracket advance once (a match-id guard in `recordResult`).
  - The bracket "Skip rest of stage" (`tournament-flow.ts` `skipBattles`, currently a random `simulateMatch`) uses a headless real simulation in chunks with progress. This is the same core: a new `simulateFightHeadless(seed, a, b, arena)` built from the harness code.
- **[T3] Integrity.** Tests for init, assignment, completion, elimination, advance, next match, completion and announcement. Include double-skip, Leave during a skip, and reload during a stage.
- **[T4] Spectate from start (D8).** A "Spectate" toggle on the tournament select. The picked fighter is entrant `'p'` with `ai: true`, the player's matches open as watched (`&watch`), and Skip Battle is available. Copy changes: "Following <name>".
- **Verify:** unit tests on overtime and fallback determinism; Playwright for a full 4-fighter spectate tournament with skips. Check that results equal the simulation's outcome.

### Batch 7: Arenas and environment

- **[AR1] Arena order (D1).**
  - In `MENU_ARENAS` (`bootstrap.ts:190`), rename to **Tutorial Zone**, put Office first, and make Office the default (`front-end.ts:140`).
  - Add an `arena-order` comment and a test that the Colosseum (when added) is first and must be round.
  - Spec note: the future Colosseum must be **round**.
- **[E1] Occlusion (spec §7.1, images 1–2).**
  - **Root cause:** `OcclusionFader.update` (`src/rendering/occlusion-fader.ts` ~115) fades when the bounding box overlaps **and** `depth > fighter depth`. Furniture is registered without a `rect` (`fight-arena-scene.ts:856-874`), and the prop key is its nearest corner while a raised fighter keeps its floor key. So a fighter standing on or behind a shelf, or beside a corner, fades it.
  - **Fix:**
    - register every prop with its footprint rect and top height;
    - a fighter standing on a prop (`hop.floorM ≥ top − ε`) or behind-or-beside it by footprint never fades it;
    - a fade needs ≥ 2 of the fighter's projected body points (feet at floor height, pelvis, chest, head; raised by `drawnHeight`) to lie **inside the prop's projected silhouette polygon** (top plus visible faces) while the prop is nearer the camera by footprint order;
    - keep the smooth ramp and restore;
    - the whole prop fades (per-portion fading is not supported by the Graphics architecture; documented).
- **[E2] Curved wall (spec §7.2, image 2).**
  - In `src/data/arenas/office.ts`, end the arc exactly at the outer walls' inner faces; remove the 0.02 rad overrun.
  - Add a matching end cap so the 0.4 m thickness and top trim run continuously into the north and south wall trims.
  - Draw the top trim of the curve and the adjoining straight span as one path (`arena-view.ts` `wallBlocks` plus the outer wall `isoBlock`).
  - Collision boxes follow the same pieces.
- **[H1–H5] House of Nightmare Fight (spec §6, D6).**
  - Add `houseToArena(HOUSE, floor 0)` that builds an `ArenaLayout`:
    - rooms → `floorZones`;
    - walls → solid `interiorWalls`;
    - doors → `DoorSpec`;
    - furniture → props, using the matching prop kinds with mass, durability and breakage, or wall rects for fixed pieces;
    - stairs → blocked rect;
    - starts.
  - Render with the house look: reuse `house-view.ts` floor and wall bakes for floor 0 as the static layer, with props from `prop-view`.
  - Admin menu (`main-menu.ts`, admin only via `isAdminName`): a **Fight | Hide and Seek** toggle plus fighter and opponent pickers. Fight → `?scene=house`; Hide and Seek → the existing path, unchanged.
  - Furniture breaks only through the existing impact and durability paths (no proximity). Broken pieces remove their colliders.
  - Hide and Seek stays untouched; its existing tests must pass.
- **Verify:**
  - occlusion unit tests (behind, on top, beside, in front);
  - screenshots matching images 1–2 (the fixed versions);
  - curved wall screenshots from 3 camera positions;
  - house Fight in Playwright: move, fight, break a chair;
  - Hide and Seek e2e still green.

### Batch 8: Select screen performance and Open Zone switching (spec §4, §5)

- **[S1] Measure first** with `performance.mark` around `show('select')`, `drawPortraits` and `drawStances`, plus a Playwright trace. Record the before and after numbers. Then:
  - Cache portraits and idle strips in **IndexedDB**, keyed by fighter id + def hash + renderer version, so they survive the per-navigation page reloads.
  - Render the selected fighter's strip first; render the others lazily in idle chunks with yielding.
  - Stop rebuilding the whole select DOM on a tile click: update only the panel and stage.
  - Memoise `loadCharacter` / `fighterSheet` (`bootstrap.ts:817`).
- **[O1] Open Zone switch.**
  - A "Change Character" action in the Settings panel (practice only) pauses the simulation and opens a compact picker built from the same tile and portrait cache.
  - `FightArenaScene.replacePlayerFighter(defId)`:
    - create a new `FighterEntity` at the old position (nearest free spot: `freeSpotNear`);
    - dispose the old entity's body, view, caster and world actions;
    - rebind `playerFighter`, the camera target, `TopHud`, the ability HUD, touch buttons and the loadout.
  - Repeatable, with no reload. The dummy and props keep their state.
- **Verify:** before and after timings in `docs/qa/`; Playwright switching 5 times (camera follows, one player entity, controls work).

### Batch 9: Pixel-art renderer, UI design system and loading screen

- **[PX1] Pixel pipeline.**
  - `src/rendering/renderer.ts` sets `antialias: false`.
  - The world (`view.world`) renders into a low-resolution `RenderTexture`, sized for about 360 px of internal height (configurable), with `scaleMode 'nearest'`. It is shown as an integer-scaled sprite.
  - The camera position snaps to the texel grid.
  - A small post `Filter` adds palette quantisation (a fixed 16-bit-style palette) and ordered Bayer dither, which renders gradients, light cones and alpha as dither.
  - A 1-texel dark outline pass on the actor layer.
  - One shared module `src/rendering/pixel-pipeline.ts` is used by `FightArenaScene`, `HideSeekScene` and the admin preview, so future scenes inherit it automatically.
- **[PX2] Environment.**
  - Plank floor: a generated pixel tile texture with seams, grain and warm highlights, via `FLOOR_MATRIX` (`arena-view.ts` `floorLines`).
  - Furniture keeps its procedural shapes, but uses flat banded materials and darker outlines so it reads after quantisation (`prop-view.ts`, `bookshelf-view.ts`).
- **[PX3] Lighting.**
  - Ceiling fixtures and window shafts as dithered translucent polygons in the office.
  - Contact shadows beneath fighters and props.
- **[PX4] Fighters.** Thicker outlines (≥ 1 texel at the internal resolution) and banded shading in `premium-model.ts` and `magma-model.ts`. Silhouettes and proportions unchanged.
- **[PX5] VFX.** Particles as square texel clusters (`ability-vfx.ts`), dither instead of soft alpha.
- **[PX6] UI.**
  - Self-host an OFL pixel font from npm (`@fontsource/pixelify-sans` for body text; `@fontsource/press-start-2p` only for big titles). Check the licences and that the fonts are cached for offline play.
  - Create a **CSS design system**: tokens (`--ui-bg`, `--ui-panel`, `--ui-border-gold`, `--ui-accent-orange`, `--ui-accent-purple`, pixel border radius 0, 2 px stepped corners) in `index.html` `:root`.
  - Shared button classes (`.ui-btn`, `.ui-btn--primary`, `--secondary`, `--danger`, `--skip`) with hover, pressed, disabled and focus states.
  - Apply them to: fe-*, tn-*, settings, the top HUD, touch controls (DODGE/JUMP/GRAB/HEAVY/MELEE/abilities), clash, the intro and hide-seek.
  - Portraits and stance strips render through the pixel pipeline and show with `image-rendering: pixelated`.
  - Ability SVG icons are rasterised to 32×32 canvases, cached, and upscaled nearest.
  - **[U1–U4]:**
    - images 3–4 set the layout: dark stone/metal-framed panels, purple-versus-orange halves for the bracket, gold-bordered dark cards and bold italic headings for Practice;
    - the Skip Battle button, the Open Zone picker and the House toggle use the same components.
- **[L1] Loading screen (spec §9).** A full-screen overlay using the existing `assets/ui/title-menu.webp` with a dark overlay (CSS; the file is unchanged), "Loading…" at bottom-right with a pixel spinner. Show it only during real boot, scene builds and page navigations (hooks in `bootstrap.ts` boot and before `location.search` changes); show real progress only where the code knows it (portrait cache count).
- **[PX7] Mandate.**
  - Rewrite `STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md` around pixel art; the vector rules go to spec §22.
  - Add `CLAUDE.md` rule: "all new art and UI must use the pixel pipeline and the UI tokens".
  - Add a test that every scene class constructs via `pixel-pipeline` and `antialias` is false.
- **`UI_REFERENCE_GUIDE.md`.** Record filenames and locations, and per image: layout, palette (hex), borders, button anatomy, typography, spacing, states, and how each is rendered in pixel style.
- **Verify:**
  - screenshots at 1280×720, 1920×1080, 844×390 (phone landscape) and 1024×768 for: title, select, tournament, HUD, results, settings, Open Zone picker and house toggle;
  - frame-time check (low-res pass cost) on the office with 2 fighters;
  - e2e suite green (update selectors only where class names change).

### Batch 10: Final QA and report

- Full matrix rerun, full vitest, the e2e suite (desktop and mobile projects), build, and a Lighthouse-style load check of the select screen.
- Walk the 81 spec acceptance items plus the 11 prompts in the traceability file.
- Write the final development report (spec §19 structure) in `docs/qa/final-report-<date>.md`, separating three levels: **implemented / build-verified / gameplay-verified**.

## Requirements traceability matrix (seed; maintained in `REQUIREMENTS_TRACEABILITY.md`)

Prompt key: **P1** 19/11 15:13 · **P2** 15:53 · **P3** 16:04 · **P5** spectate · **P6** abilities · **P7** arenas · **P8** Prison · **P9** healing · **P10** pixel · **MS** master spec part. Every row starts at `todo` and needs a verification method before closing.

| ID | Requirement | Source | Batch | Main files | Verification |
|---|---|---|---|---|---|
| R0.1 | Tree compiles; Monster path removed; armour restored | P2, MS10.4 | 0 | combatant.ts, prismor.ts, scene-abilities.ts | tsc, vitest |
| R0.2 | Prison host methods restored; real-scene test | regression | 0 | scene-abilities.ts | integration test |
| HD | Contact-only damage for all attack types | P1, MS15 | 1 | attacks.ts, ability-world.ts, fight-arena-scene.ts | unit tests + browser |
| HL | No passive or automatic healing; gated ability heals | P9 | 1 | combatant.ts, team-battle.ts, scene-teams.ts | unit tests |
| N1/N2 | 4 skeletons; 15 % of actual HP removed | P1, MS11 | 0–1 | necro.ts, scene-abilities.ts | integration tests |
| C1 | Clash shows the winner's name | MS16 | 1 | scene-clash.ts, clash-hud.ts | unit + e2e |
| PR1–3 | Shard Blade swords, 5-hit combo, piercing finale, hammer heavy | P1, MS10 | 2 | shard-blade.ts, clips.ts, premium-model.ts | tests + screenshots |
| PR4 | Crystal Armour ultimate integrated | P2, MS10.4 | 0, 2 | premium-model.ts | 6-pose screenshots |
| PR5 | Prison v2: 6 s, grounded-only, two leg formations | P8 | 2 | ability-world.ts, stickman-view.ts, prismor.ts | integration + screenshots |
| PR6 | Prismor animation variety | P2 | 2–3 | clips.ts, ability-poses.ts | screenshots |
| PS1–3 | Telekinetic Toss + Psychic Slam with real props | P3, MS14 | 2 | ability-world.ts, arena-props.ts, psion.ts | integration + browser |
| RS1 | Sonic Boom wide, steerable, no pin | P6 | 2 | reson.ts, ability-world.ts | unit + browser |
| IF1 | Fire Beam proximity scaling | P6 | 2 | inferno.ts | unit |
| VX1–3 | Jar ground splash, heavier stacking, ramping fog | P6 | 2 | ability-world.ts, toxicity.ts, vexoris.ts | unit |
| CH1/CH2 | Time Stop stacking; AI uses the ultimate well | P6 | 2, 4 | fight-arena-scene.ts, brains.ts, fighter-brain.ts | unit + harness |
| W1 | Natural walks for new fighters; original four unchanged | P2, MS13 | 3 | greybox-motion.ts | elbow test + screenshots |
| A1–A6 | Stat-, health- and opponent-aware AI; ability purpose; adaptation; performance | MS3 | 4 | fighter-brain.ts, brains.ts | unit + harness |
| B1–B3 | Full-roster matrix, framework doc and tests, rebalance incl. Necro/Titan/Shroud | P2, MS2, MS12 | 5 | harness.ts, stats JSON, kits | matrix report |
| T1–T3 | Regulation, overtime, deterministic fallback, Skip Battle, integrity | MS1 | 6 | tournament-rules.ts, fight-arena-scene.ts, tournament-flow.ts | unit + e2e |
| T4 | Spectate from start | P5 | 6 | front-end.ts, tournament.ts | e2e |
| AR1 | Tutorial Zone rename, Office default, round Colosseum rule | P7 | 7 | bootstrap.ts, front-end.ts | unit |
| E1 | Obstruction-based furniture fade | MS7.1 | 7 | occlusion-fader.ts | unit + screenshots |
| E2 | Continuous curved wall | MS7.2 | 7 | office.ts, arena-view.ts | screenshots |
| H1–H5 | House Fight (ground floor), admin toggle and picks, destruction, Hide and Seek intact | MS6 | 7 | new house-arena.ts, main-menu.ts | e2e |
| S1 | Select screen performance (measured) | MS4 | 8 | portraits.ts, front-end.ts, bootstrap.ts | timings |
| O1 | Open Zone in-game character switch | MS5 | 8 | fight-arena-scene.ts, settings-panel.ts | e2e |
| PX1–PX7 | Pixel pipeline, environment, lighting, fighters, VFX, UI, mandate | P10 | 9 | renderer.ts, new pixel-pipeline.ts, index.html | screenshots + tests |
| U1–U4 | UI reference guide, design system, buttons, consistency | MS8 | 0, 9 | UI_REFERENCE_GUIDE.md, index.html | screenshots |
| L1 | Loading screen (darkened menu art, bottom-right text) | MS9 | 9 | index.html, bootstrap.ts | e2e |
| QA | Final report, all checks | MS17–19 | 10 | docs/qa/ | report |

## Risks and performance

- **Pixel pipeline:**
  - Readability of text and small fighters at low internal resolution: tune the internal height per device; the HUD stays DOM.
  - The touch-input mapping needs the same coordinates; the pointer → world inverse must use the scaled sprite.
  - Portrait extraction must use the same pipeline.
  - The extra cost is one low-resolution pass (cheap); measure on the phone profile.
- **Universal contact hit detection** may change every fighter's feel. Tune `reach` per move and re-run the balance matrix (Batch 5 comes after this on purpose).
- **Headless skip simulation in the browser** must be chunked to avoid jank. A bracket skip of 7 matches could take several seconds: show progress.
- **House conversion:** prop kind mapping gaps and stairs blocking. Ground floor only (D6).
- **Open Zone replacement:** stale references (abilities world actions, AI target, HUD). Write a dispose checklist and a test that the old entity has no live references.
- **Balance work is iterative and slow** (about 1 s per fight × 144 pairs × seeds). Run it opt-in, not in CI.
- **CI time limit:** keep heavy matrix and probe tests opt-in.

## Verification (every batch)

1. `npm run typecheck`, `npm run lint`, `npx vitest run`, `BASE_PATH=/StickBattleFighter/ npm run build`.
2. The relevant Playwright specs (`npx playwright test --trace off <spec>`), plus a full e2e run at Batches 6, 9 and 10.
3. Browser screenshots for every visible change (`deviceScaleFactor` 1 for self-checks), using the dev server on port 4174 and the existing `__stickmanDebug` hooks.
4. Update the traceability file, commit, push, trigger `deploy-pages.yml` (owner decision D4), and send a short report.

## Reference images and limitations

- **Images 1–2** (`images/69.png`, `70.png`, the same files as 67/68): image 1 is a bookshelf fading while Inferno is behind it, plus the gap where the curved wall meets the straight wall. Image 2 is the bookshelf fading while Inferno stands on top of it; its curved-wall end is the desired continuous look.
- **Images 3–4** (`71.webp` tournament draw, `72.png` Practice cards) are also already in `docs/references/master-plan/`.
- **Pixel references:** the two office screenshots in the uploads (`2d83b2cb-image.jpg`, `192032f8-image.jpg`).
- **UI images supplied earlier in other tools** (spec §8.1 "previous ChatGPT conversations") are not in the workspace beyond these. Record this in `UI_REFERENCE_GUIDE.md` and ask the owner to add any others to `docs/references/ui/`.
- **Limits:**
  - Per-portion furniture fading is not possible with whole-Graphics props.
  - House upstairs fighting is deferred (D6).
  - The real Colosseum is deferred (D1).
