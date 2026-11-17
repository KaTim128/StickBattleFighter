# Fighter system development guide

How to change any part of a fighter, with the real files and the tests to update. Written in Phase 0 (17/11/2026) from the code at commit `e0a78ae`. Update this guide whenever the fighter system's contract changes; Phase 1 B2, B8 and B13 will change several sections.

Commands:
- `npm run typecheck`
- `npm run lint`
- `npx vitest run` (or one file: `npx vitest run tests/integration/scenes/shroud.test.ts`)
- `npx playwright test --trace off`
- `npm run build`

## 1. Where a fighter is defined

A fighter is data resolved into a `FighterDef` (`src/characters/resolve.ts` `resolveCharacter(id, library)`):

| Piece | File | What it holds |
|---|---|---|
| Registration and identity | `src/data/characters/<id>/character.json` | `id`, `displayName`, description, `template`, profile ids, rig (bones, colours, scale), capabilities (`isPlayable`, `canJump`…), `characterType` |
| Statistics | `src/data/characters/<id>/stats.json` | `maxHp`, stamina and regen, `power`, `defence`, crit chance and multiplier, knockback and hit-stun resistance, `massKg` |
| Melee moves and combos | `src/data/characters/<id>/moveset.json` | Moves (damage, reach, timing, knockback, `next` links), `starters` (tap, heavy, air) |
| Animation profile | `src/data/characters/<id>/animation-profile.json` | Which clip plays for each state |
| Look and effects | `src/data/characters/<id>/effects.json` | Head and body style (selects the premium skin), impacts, aura, flash |
| Sounds | `src/data/characters/<id>/audio.json` | Category pools: light and heavy punch and kick, block, parry, footstep, clash, KO… |
| AI profile | `src/data/characters/<id>/ai.json` | Aggression, attack interval, reaction time |
| Abilities and ultimate | `src/data/abilities/<id>.ts`, registered in `src/abilities/kits.ts` | `AbilityKit` with slots `a1`–`a4` and `ult` |
| AI design | `src/data/ai/brains.ts` | Range band, movement style, tactics per slot, combos |
| Select stance | `src/data/presentation/select-stances.ts` | Pose, turn and scale on fighter select |
| Menu ratings | `src/characters/ratings.ts` | Stat bars shown on fighter select |
| Drawing | `src/rendering/premium-model.ts` (`PREMIUM_SKINS`, keyed by body style), `magma-model.ts` (Inferno), `stickman-view.ts` | |
| Ability poses | `src/animation/ability-poses.ts` `SHAPES` (keyed by ability id) | Wind-up and release poses |
| Ability icons | `src/interface/ability-icons.ts` | SVG icons by ability `icon` id |
| Library | `src/characters/library.ts` `BUILT_IN_LIBRARY` | Every character and profile the game knows |

Rule: shared engines never name a fighter. Behaviour differences come from data fields.

## 2. Damage, stun and recovery

- **Damage taken:** `src/combat/combatant.ts`:
  `(baseDamage × attackerPower) / (defence × defenceFactor) × damageTakenScale`
  - `defenceFactor` comes from decay (`decay`); `damageTakenScale` comes from buffs such as Rampage Mode.
  - Crits use `critChance` and `critMultiplier`.
- **Melee:** `src/combat/attacks.ts` and `moves.ts`.
- **Abilities:** `scene-abilities.ts` `hitFighter`, which applies the payload: damage, knockback, `heavy` knockdown, `stunS`, `burn`, `bleed`, `decay`, `blind`, `lifesteal`, `pull`.
- **Stun and recovery:**
  - `Combatant.stun(seconds)`, `state` (`free`, `stunned`, `knockdown`, `gettingUp`, `guarding`, `dodging`, `ko`), `collapse`, invulnerability windows.
  - **To remove stun from one attack:** delete `stunS` from that ability's `payload`, or set the move's hit-stun in `moveset.json`. Never change `Combatant.stun` for one fighter.
  - Test the change in that fighter's integration test, e.g. `tests/integration/scenes/shroud.test.ts`.

## 3. Status effects (today)

Each effect is a field and timer on `Combatant`:
- burn: `ignite`, damage over time;
- bleed: `bleed`, damage over time, never stacks (keeps the highest rate and longest time);
- decay: `decay`, attack and defence factors;
- blind: `blind`;
- dark: `darken`, sight radius;
- invulnerability and stun.

**To add a status effect today:** add a field and a tick in `Combatant`, a payload field in `src/abilities/ability-def.ts`, and its application in `scene-abilities.ts` `hitFighter`. Presentation goes in `stickman-view.ts` and the veils.

Phase 1 B8 replaces this with a registry (`src/combat/status-effects.ts`); update this section then.

## 4. Abilities

- **Types:** `src/abilities/ability-def.ts`.
  - `AbilityDef`: id, name, label, description, icon, slot, stamina cost, cooldown, cast and recovery times, aim range, move factor, interruptible, payload, delivery, VFX, sounds, look.
  - The `delivery` union: projectile, beam, dash, leap, pull, grab, assault, strike, teleport, buff or summon, zone.
- **Timing:** `src/abilities/ability-caster.ts` runs wind-up → release → recovery, plus cooldowns (`cooldownScale`), the ultimate meter (`charge` in the kit) and interruption.
- **Deliveries:** `src/abilities/ability-world.ts` runs the delivery (hits, movement, telegraphs, zones).
- **To change an attack:** edit its entry in `src/data/abilities/<id>.ts`. Values are read by the fight, the AI and the information screens.
- **To add an ability (today four normal slots):**
  1. Add the entry to the fighter's file.
  2. Add a pose in `ability-poses.ts`, an icon in `ability-icons.ts`, sounds in `sound-board.ts`, and a tactic in `src/data/ai/brains.ts`.
  3. Add VFX in `src/vfx/` if it needs any.
  4. Tests: the fighter's integration test, plus `tests/unit/abilities/*` if the delivery changes.
- **Five normal abilities and a four-slot loadout** don't exist yet (Phase 1 B13): the plan adds slot `a5` and a loadout mapping the four ability keys to the equipped four.
- **Ultimate:** the `ult` slot with its own key and meter. The charge rate is `charge` in the kit (`perDamageDealt`, `perDamageTaken`, `perSecond`).

## 5. Summons

- `src/app/scenes/scene-summons.ts`:
  - spawning (`spawnSpot`/`spotInFront`);
  - the cap (`maxAlive`: the oldest crumbles when over the cap);
  - minion AI;
  - lifetime.
- The spec is in the summoning ability (`summon: { character, count, lifeS, maxAlive, near }`).
- **To change the maximum active summons:** change `maxAlive` in that ability (Necro: `src/data/abilities/necro.ts`).
- Summon stats are in `src/data/characters/skeleton-warrior/`.
- Tests: `tests/integration/scenes/necro.test.ts`.

## 6. AI

- `src/ai/fighter-brain.ts` decides every step from a `BrainView`: self, the target (or null when it can't see), abilities ready, design, difficulty.
- `src/data/ai/brains.ts` holds each fighter's design (range band, movement, tactics per slot, combos).
- `src/data/ai/difficulty.ts` holds the tiers.
- The scene's `controlAi` feeds it and applies the output: facing, guard, abilities, melee, movement, stuck recovery.
- Rules that must hold (tests in `tests/integration/ai/`):
  - an AI never stands idle (`engagement.test.ts`);
  - blinded or in the dark, it never tracks its target (`blindness.test.ts`);
  - every fighter uses its whole kit at every difficulty (`tests/integration/scenes/ai-opponent.test.ts`).
- **New fighter:** add a design to `brains.ts`. Playable fighters may not fall back to the generic design (tested).

## 7. Animation

- Procedural poses on the jointed skeleton: `src/animation/` (`skeleton.ts`, `animator.ts`, `clips.ts`, `greybox-motion.ts`, `reaction-poses.ts`, `ability-poses.ts`, `stance.ts`).
- Each fighter's animation profile picks the clips.
- **A new move needs a clip** (`clips.ts`) or an ability pose (`ability-poses.ts`).

## 8. Hit detection

- Melee hit volumes and timing come from the move data, resolved in `attacks.ts`.
- Ability hits come from the delivery in `ability-world.ts`. One hit per target per event: projectiles end on a hit; dashes keep a hit list; zones hit on a tick.
- Dodge and invulnerability are checked in `Combatant`.

## 9. Audio for attacks

See `AUDIO_ASSET_CATALOG.md`:
- Recipes are in `src/audio/sound-board.ts`.
- Melee sounds come from category pools in `audio.json`; per-move sounds arrive in Phase 1 B18.
- Ability sounds are `sfx.cast`, `sfx.release` and `sfx.impact`, plus `stabSfx`.
- Impact sounds play only on confirmed hits.
- Tests: `tests/unit/audio/*`.

## 10. Registering, removing and testing fighters

**To introduce a new fighter:**
1. Add the data folder and the ability file.
2. Register them in `library.ts` and `kits.ts`.
3. Add the AI design, select stance, skin, icons and sounds.
4. Add the fighter to the roster tests:
   - `tests/integration/scenes/characters.test.ts`;
   - `tests/integration/scenes/ai-opponent.test.ts` (the `for (const id of […])` lists);
   - `tests/integration/ai/engagement.test.ts` (`ROSTER`).
5. Run the full suite.

**To remove a fighter safely:**
1. Unset `isPlayable` first (it then leaves menus and tournaments).
2. Remove it from the tests' rosters.
3. Then delete its data, kit and skin.
4. Search for its id across `src` and `tests`.
5. Check the tournament store and saved settings tolerate the missing id: `tournament-store.ts` loads saved draws.

**To remove an unwanted mechanic:**
1. Find its data field (payload or delivery) and remove the use.
2. Delete the engine branch only when no data uses it any more.
3. Update the integration test that covered it, noting the owner decision in the commit.

**Tests to update for each kind of change:**

| Change | Tests |
|---|---|
| Statistics | `tests/unit/characters/*` (ratings, validation), the fighter's integration test |
| A move | `tests/unit/combat/*`, the fighter's integration test, `tests/e2e/combo.ts` users |
| An ability | The fighter's integration test, `tests/unit/abilities/*` if a delivery changed |
| A status effect | `tests/unit/combat/combatant*`, the fighters that apply it |
| AI | `tests/integration/scenes/ai-opponent.test.ts`, `tests/integration/ai/*`, `tests/unit/ai/*` |
| UI | `tests/e2e/front-end.spec.ts`, `menu.spec.ts`, `phase6.spec.ts` |

## Per-fighter controls (17/11/2026)

Key layouts belong to the fighter, not the player: `FighterControlsStore` keeps `{bindings, holds}` per profile and fighter id, and `SettingsState.activate(profile, fighterId)` makes one live. A new fighter needs no controls work: it starts from `DEFAULT_CONTROLS` and the Fighter Controls panel lists its actions (the Fire Beam keys only when the fighter has a beam). Hold rules apply only to actions in `HOLDABLE`.
