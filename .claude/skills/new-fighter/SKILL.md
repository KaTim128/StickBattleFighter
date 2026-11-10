---
name: new-fighter
description: Create a new Stickman Arena fighter through the existing fighter schema, rig contract and animation set, with one universal melee, three unique abilities and one unique ultimate. Use when adding any fighter to the roster.
---
# New fighter

**Owners:** Character (lead), with Combat (abilities), Animation (clips and state machine) and Rendering (materials and VFX). The Master Developer coordinates and sequences them; never run them on overlapping files at once.

## Preconditions
- The fighter schema, rig contract, ability framework and animation event contract exist (Phase 6+). If not, stop: this skill needs them.
- The owner has approved the fighter concept (name, identity, role). Names and designs must be original (spec §2).

## Steps
1. **Read** spec §8 (characters), §9–11, `src/data/fighters/` (existing fighters), and the benchmark fighter (REQ-CHR-4).
2. **Design sheet** (in `docs/design/fighters/<id>.md`): identity, silhouette and proportions, materials, movement identity, combat role, strengths and weaknesses, the 13 stats, object interactions, three abilities and an ultimate (each with an exact description and numbers), and AI usage hints. Check uniqueness: no ability duplicates another fighter's (REQ-CHR-2).
3. **Data:** add the fighter definition in `src/data/fighters/` and abilities in `src/data/abilities/` using existing delivery and modifier components. Ask Combat for a new component only if none fits.
4. **Model:** integrate the `.glb` following the rig contract; register it in `assets/ASSET_REGISTER.md` (greybox labelled).
5. **Animation:** full required state set plus ability and ultimate clips; wire the animation events.
6. **VFX and audio hooks:** per ability, meeting presentation targets PRS-1..11 if adopted.
7. **Tests:** schema validation, asset validation (all clips, bones, materials), unit tests per ability, a pairwise matchup regression against every existing fighter.
8. **Verify** in the browser (Practice Zone): all five actions, hit reactions, knockback, pickup and throw. Take screenshots.
9. **Balance:** run the balance report; record assumptions.
10. Update the progress record, testing checklist and ownership if needed.

## Acceptance checks
- [ ] Exactly five combat actions; melee costs no stamina
- [ ] Distinct silhouette and animation set; not a recolour
- [ ] All tests pass; build passes; browser verification recorded
- [ ] QA specialist review: PASS
