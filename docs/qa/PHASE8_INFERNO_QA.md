# Phase 8 QA record: Inferno, the first polished fighter (12/11/2026)

**Reviewer:** Master Developer, self-review. This is **not** an independent QA specialist review: the read-only `qa-specialist` was not run, to save usage (TD-019). An independent review is recommended before final sign-off.

**Build:** branch `ccr-6b7ad8fe-whr1i5`; checks run on this commit:
- lint clean;
- typecheck 0;
- `npm test` 297 passed;
- `npm run e2e` 31 passed (25 skipped by project), browsers headless Chromium (desktop and Pixel 7 emulation).

## Phase 8 acceptance (roadmap)

| Criterion | Status | Evidence |
|---|---|---|
| Original 2D rig and art (TD-022) | PASS | Code-drawn vector skeleton with Inferno's living-flame body and flame head; no imported art (`src/rendering/stickman-view.ts`) |
| Complete animation set | PASS | Every required state has a real clip (the characters test); every kit ability has a cast animation, and the leap has an air pose (Phase 8 kit test); walk, run, sprint, the four-hit combo, quick and flame dodges, fall and get-up, KO and burn-away |
| Presentation targets PRS-1..11 | PASS with notes | See below |
| Asset validation test passes | PASS | `every built-in character validates without errors`; the body and head styles are validated |
| QA review recorded | This document (self-review) | |

## Presentation targets

| ID | Status | How |
|---|---|---|
| PRS-1 distinct actions | PASS | Fireball (core and tail), Flame Dash (trail), Fire Beam (continuous beam), Eruption (flaming jump and slam) |
| PRS-2 anticipation | PASS | Charges with motes and cores (0.4 s, 1 s, 0.55 s squat); the ultimate aims in a crouch |
| PRS-3 impact | PASS | Flash first, burst, ring, scorch, smoke, shake scaled to power, hit-stop, white body flash, flinch or knockdown |
| PRS-4 floating feedback | PASS | Damage numbers, CRIT, BLOCKED, PARRY, DODGE, KO!, **N HIT COMBO**, **MISS** (new this phase) |
| PRS-5 readable defence | PASS (new) | A shield in front while guarding that flares with ripples on a block |
| PRS-6 status | PASS (new) | Stars over a stunned head; burning flames on the body; status chips on the top HUD (BURNING, STUNNED, GUARD, DOWN, KO) |
| PRS-7 trajectory | PASS | Projectile tails and trails; beams are drawn along their full, wall-limited length |
| PRS-8 ultimate showcase | PASS (new) | A 0.42 s full-screen flash with speed lines when an ultimate lands |
| PRS-9 defeat moment | PASS | KO! callout, a long hit-stop, then the fall and the dissolve or burn-away before the respawn |
| PRS-10 HUD at a glance | PASS (new) | Top HUD: portraits, names, health (with a lagging loss bar) and stamina for both sides, match clock, last action name |
| PRS-11 readability | PASS with notes | Checked at the default zoom on a 1280×720 desktop and a Pixel 7 emulation; not checked on a real phone |

## Open items and limitations

- Stats are still provisional (OQ-05).
- Not tested on real devices: mobile feel, performance and audio on speakers. In the headless software renderer, a Fire Beam in the office ran at about 6 fps. That figure is not representative, and real-device budgets wait on OQ-10.
- Sounds and ambiences were verified by measurement, not by ear.
- Only Inferno and the base stickman exist; the roster arrives in Phase 9.
