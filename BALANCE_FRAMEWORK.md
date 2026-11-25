# Balance framework

How a fighter is kept fair against the rest of the roster (spec §2 and §12). Numbers are measured by tests and by the opt-in
matrix (`npm run balance:matrix`, results in `docs/qa/balance-matrix-<DD-MM-YYYY>*.md`). Updated 24/11/2026.

## The rules

1. **Equal stat budget.** The six ratings (HP, Speed, Power, Stamina, Defence, Avoidance; `src/characters/ratings.ts`) add up to
   the same total for every fighter, within 3 %. Each fighter spends it differently (`tests/unit/characters/balance.test.ts`).
2. **Ability power budget.** One cast's damage divided by its cooldown (beams, whirls, drones, volleys and eruptions counted by
   their typical hits) sits in the same band for every ability, and each fighter's whole kit sits in a wide common band
   (`ability-balance.test.ts`). The strongest hit of a kit may be 2-3 times a basic one, never 10 times.
3. **Control budget.** Seconds of enemy control a kit can deliver (stun, hold, mute, slow, blind, disrupt, lift, trap) divided by
   cooldown, summed over the kit, stay at or under 1.0 (overlaps count twice), so no fighter can lock an opponent out of the fight (`balance-framework.test.ts`).
4. **Survivability.** Effective health (max HP times the defence multiplier) stays within 35 % of the roster mean: tanks and glass cannons are
   allowed, extremes are not (`balance-framework.test.ts`).
5. **Win rate.** On Hard, in the AI-vs-AI matrix, no fighter wins above 65 % or below 35 % overall. A fighter outside the band is
   retuned in data (kit numbers first, then stats within rule 1), never with a special case in the engine.
6. **One engine.** No fighter-specific branch to balance a fighter. Everything is data.

## Class archetypes

| Archetype | Examples | Spends the budget on | Typical weakness |
|---|---|---|---|
| Melee brawler | Titan, Kenshiro, Shroud | HP, Defence, Power | Speed, ranged pressure |
| Ranged caster | Inferno, Necro, Psion, Reson | Stamina, Power | Defence, being rushed |
| Defensive / tank | Titan, Geargrind, Prismor | Defence, HP | Speed, Avoidance |
| Mobility / trickster | Aerion, Chronos, Shroud | Speed, Avoidance | HP, sustained damage |
| Summoner / zone control | Necro, Vexoris, Geargrind | Stamina, kit control | Burst damage up close |

A kit should have at least one defensive or control ability and at least one that damages directly. The ultimate is allowed to be
2-3 times the damage per second of a normal ability because it is charged, not on a timer.

## New-fighter checklist

1. Pick an archetype; spend the six ratings so the total is within 3 % of the roster mean and the fighter is top three in one stat
   and bottom three in another.
2. Give every ability a damage-per-cooldown inside the band, a unique effect (no near copies of another fighter's ability, TD-153)
   and an AI tactic with a range band.
3. Add the fighter to `ALL_PLAYABLE` in `tests/integration/balance/harness.ts`.
4. Run `npm run balance:matrix`; the fighter must sit between 35 % and 65 % and no pairing may be 0 % or 100 % over 8 or more fights
   unless the counter is intended and written in the fighter's notes.
5. Record the change and its reason in `FIGHTER_SYSTEM_CHANGELOG.md`.

## Measuring

- Matrix: `BALANCE_SEEDS=4 npm run balance:matrix` (about 10 minutes). Win rate has a sampling error of about 7 points at two seeds
  and about 5 at four; do not tune on single results.
- Not measured yet: per-ability hit rate and ultimate impact (the harness only counts attacks that reach a fighter).
