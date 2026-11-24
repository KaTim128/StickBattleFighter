# Requirements traceability

Maintained by the implementation model (see the handoff protocol in `STICKMAN_ARENA_IMPLEMENTATION_PLAN.md`). Status: `todo` → `in-progress` → `implemented` → `build-verified` → `gameplay-verified` (or `blocked`). Evidence: test name, screenshot path or commit hash. A row reaches `gameplay-verified` only after a browser check.

Prompt key: P1 19/11 15:13 (Shard Blade, Necro, hit detection) · P2 19/11 15:53 (armour revert, Prismor animations, balance new fighters, walks) · P3 19/11 16:04 (Psion Toss) · MS master spec (`docs/references/master-plan/STICKMAN_ARENA_MASTER_DEVELOPMENT_UPDATE.md`) · P5 20/11 (spectate) · P6 20/11 (Reson, Inferno, Vexoris, Chronos) · P7 21/11 (arena order) · P8 21/11 (Crystal Prison v2) · P9 22/11 (healing) · P10 22/11 (pixel art).

| ID | Requirement | Source | Batch | Main files | Verification | Status | Evidence |
|---|---|---|---|---|---|---|---|
| R0.1 | Tree compiles; Monster path removed; armour restored | P2, MS10.4 | 0 | combatant.ts, prismor.ts, scene-abilities.ts | tsc, vitest | build-verified | typecheck, full vitest, build (Batch 0 commit) |
| R0.2 | Prison host methods restored; real-scene test | regression | 0 | scene-abilities.ts | integration test | gameplay-verified | crystal-prison.test.ts + browser screenshot 24/11/2026: crystals grow round the dummy legs |
| HD | Contact-only damage for all attack types | P1, MS15 | 1 | attacks.ts, ability-world.ts, fight-arena-scene.ts | unit tests + browser | implemented | melee + thrown props contact-only (attacks.ts blowTouches, swept thrown test); ability deliveries already circle-vs-volume, unchanged; contact-hits.test.ts; NOT browser-verified |
| HL | No passive or automatic healing; gated ability heals | P9 | 1 | combatant.ts, team-battle.ts, scene-teams.ts | unit tests | build-verified | Combatant.heal gate, bench regen removed; healing-paths.test.ts, team-battle tests |
| N1/N2 | 4 skeletons; 15 % of actual HP removed | P1, MS11 | 0–1 | necro.ts, scene-abilities.ts | integration tests | build-verified | necro.test.ts: 4 skeletons, heal = 15% of HP actually removed |
| C1 | Clash shows the winner's name | MS16 | 1 | scene-clash.ts, clash-hud.ts | unit + e2e | build-verified | clash.test.ts: "<NAME> WON!" banner; not browser-verified |
| PR1–3 | Shard Blade swords, 5-hit combo, piercing finale, hammer heavy | P1, MS10 | 2 | shard-blade.ts, clips.ts, premium-model.ts | tests + screenshots | implemented | swords, 5-hit chain, hammer heavy: crystal-prison.test.ts (real scene) + browser screenshots 24/11/2026; finale/hammer forms drawn; per-hit animation polish pending |
| PR4 | Crystal Armour ultimate integrated | P2, MS10.4 | 0, 2 | premium-model.ts | 6-pose screenshots | todo | |
| PR5 | Prison v2: 6 s, grounded-only, two leg formations | P8 | 2 | ability-world.ts, stickman-view.ts, prismor.ts | integration + screenshots | gameplay-verified | prismor.test.ts (6 s hold, grounded only, hover=grounded, launched misses), crystal-prison.test.ts real scene, browser screenshot 24/11/2026 (two formations with leg holes) |
| PR6 | Prismor animation variety | P2 | 2–3 | clips.ts, ability-poses.ts | screenshots | todo | |
| PS1–3 | Telekinetic Toss + Psychic Slam with real props | P3, MS14 | 2 | ability-world.ts, arena-props.ts, psion.ts | integration + browser | gameplay-verified | psion-toss.test.ts (real scene: refusals spend nothing, chair lifted then slammed), unit tests, browser 24/11/2026 (filing cabinet lifted then slam knocks the dummy down). AI: psion-ai uses Toss then Slam |
| RS1 | Sonic Boom wide, steerable, no pin | P6 | 2 | reson.ts, ability-world.ts | unit + browser | todo | |
| IF1 | Fire Beam proximity scaling | P6 | 2 | inferno.ts | unit | todo | |
| VX1–3 | Jar ground splash, heavier stacking, ramping fog | P6 | 2 | ability-world.ts, toxicity.ts, vexoris.ts | unit | todo | |
| CH1/CH2 | Time Stop stacking; AI uses the ultimate well | P6 | 2, 4 | fight-arena-scene.ts, brains.ts, fighter-brain.ts | unit + harness | todo | |
| W1 | Natural walks for new fighters; original four unchanged | P2, MS13 | 3 | greybox-motion.ts | elbow test + screenshots | todo | |
| A1–A6 | Stat-, health- and opponent-aware AI; ability purpose; adaptation; performance | MS3 | 4 | fighter-brain.ts, brains.ts | unit + harness | todo | |
| B1–B3 | Full-roster matrix, framework doc and tests, rebalance incl. Necro/Titan/Shroud | P2, MS2, MS12 | 5 | harness.ts, stats JSON, kits | matrix report | todo | |
| T1–T3 | Regulation, overtime, deterministic fallback, Skip Battle, integrity | MS1 | 6 | tournament-rules.ts, fight-arena-scene.ts, tournament-flow.ts | unit + e2e | todo | |
| T4 | Spectate from start | P5 | 6 | front-end.ts, tournament.ts | e2e | todo | |
| AR1 | Tutorial Zone rename, Office default, round Colosseum rule | P7 | 7 | bootstrap.ts, front-end.ts | unit | todo | |
| E1 | Obstruction-based furniture fade | MS7.1 | 7 | occlusion-fader.ts | unit + screenshots | todo | |
| E2 | Continuous curved wall | MS7.2 | 7 | office.ts, arena-view.ts | screenshots | todo | |
| H1–H5 | House Fight (ground floor), admin toggle and picks, destruction, Hide and Seek intact | MS6 | 7 | new house-arena.ts, main-menu.ts | e2e | todo | |
| S1 | Select screen performance (measured) | MS4 | 8 | portraits.ts, front-end.ts, bootstrap.ts | timings | todo | |
| O1 | Open Zone in-game character switch | MS5 | 8 | fight-arena-scene.ts, settings-panel.ts | e2e | todo | |
| PX1–PX7 | Pixel pipeline, environment, lighting, fighters, VFX, UI, mandate | P10 | 9 | renderer.ts, new pixel-pipeline.ts, index.html | screenshots + tests | todo | |
| U1–U4 | UI reference guide, design system, buttons, consistency | MS8 | 0, 9 | UI_REFERENCE_GUIDE.md, index.html | screenshots | todo | |
| L1 | Loading screen (darkened menu art, bottom-right text) | MS9 | 9 | index.html, bootstrap.ts | e2e | todo | |
| QA | Final report, all checks | MS17–19 | 10 | docs/qa/ | report | todo | |

## Master spec acceptance items (Part 18) → rows

| Spec items | Row |
|---|---|
| 1–7 Tournament | T1–T4 |
| 8–14 Balance | B1–B3 |
| 15–24 AI | A1–A6, CH2 |
| 25–28 Selection screen | S1 |
| 29–32 Open Zone | O1 |
| 33–40 House of Nightmare | H1–H5 |
| 41–42 Furniture | E1 |
| 43–44 Curved wall | E2 |
| 45–50 UI | U1–U4, PX6 |
| 51–54 Loading | L1 |
| 55–61 Prismor | PR1–PR6, R0.1 |
| 62–64 Necro and balance | N1/N2, B3 |
| 65–66 Walks | W1 |
| 67–73 Psion | PS1–3 |
| 74–77 Combat and Clash | HD, C1 |
| 78–81 Integrity | QA |
