# Inkmaster: design sheet (25/11/2026)

**Role:** versatile summoner. Strength is breadth and tactical help; his own body is modest and his stamina is low.

## Identity
A wandering calligrapher from a mountain temple. Charcoal skin with cream rim light, a long dark robe with cream trim, a topknot with a hairpin and two ribbons. He carries an oversized black brush with a dark wooden handle, gold bands and a flowing black bristle head that drips. Original design; not based on any existing character (spec §2).

## Stats (see `stats.json`; ratings total 309 against a roster mean of about 308)
| Stat | Value | Why |
|---|---|---|
| Health | 1000 | roster median |
| Defence | 1.3 | a robed painter who is hard to hurt; top three in defence |
| Speed | 4.9 m/s | average |
| Power | 1.12 | modest; the summons carry the rest |
| Stamina | 100, regen 24/s | **weakness**: bottom three, so he cannot spam abilities |

## Kit
| Slot | Ability | Delivery | Numbers |
|---|---|---|---|
| Q | Ink Slash | projectile (wide, curved wave) | 54 damage, 5.5 s, 18 stamina |
| E | Ink Serpent | `serpent` (drawn 0.8 s, then hunts, turn rate 2.4 rad/s) | 46 damage, wraps the legs 1.1 s, same target immune 5 s, 10 s |
| F | Ink Dragon | `dragon` (drawn 1.1 s, 12 s, one at a time) | breath 46 damage, one breath per 3.6 s, 1.0 s warning lane on the floor, 20 s |
| R | Ink Clone | `summon` with variants sword or bow | 14 s, one at a time; sword clone 190 health, bow clone 130 health and 20-damage arrows every 2.4 s; 18 s |
| (fifth) | Ink Cyclone | `vortex` | radius 3.4 m, 3.4 s, 11 damage per 0.5 s, pull 2.2 m/s (walking is 4.9), collapse 50 damage and a push; 14 s |
| I | The Masterpiece | `masterpiece` | 3 s drawing ritual (he is exposed), then the monster for 16 s |

### The ink monster (`ink-monster`)
620 health, 3.4 m/s, scale 1.3 (about Titan's size, a little taller), knockback resistance 0.6. Four attacks, each with a visible wind-up and its own cooldown:
claw swipe (basic, 0.7 s wind-up, 56 damage), bite (heavy, 0.55 s wind-up, 50), ground slam (0.5 s cast and 0.85 s ring warning, 48, 7 s), ink breath (0.9 s wind-up, 1.5 s stream, 13 per 0.4 s tick, no flinch, 11 s). No attack knocks down or chains, so nobody is trapped. The summon ends with a burst of ink when its time is up or its health is gone, and also if Inkmaster is knocked out.

## Counterplay and limits
- The serpent turns slowly (dodgeable), only holds the legs for 1.1 s, and the held target can still guard and use abilities.
- The dragon's breath lane is shown for a full second before it lands and is hit once per breath.
- The cyclone's pull is weaker than walking and walking or dodging out frees a fighter; its ticks never flinch.
- Control per cooldown second sums to 0.19 (limit 1.0).
- Each kind of summon has its own cap, and everything he drew ends when he falls.

## Animation
Own idle (`proc.idle.calligrapher`) and walk; own clips `inkmaster.*` (brush sweep, flick, heavy stroke, plunge, grand sweep), `inkclone.*` and `inkbeast.*`.

## AI
`inkmaster-ai`: holds 3 to 6 m, waves at range, serpent to control, dragon to zone, clone as a summon, Masterpiece once the fight is on.
