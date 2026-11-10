---
name: new-ability
description: Create one Stickman Arena ability or ultimate through the shared ability framework, including target validation, stamina, cooldown, real hit detection, animation events, VFX, sound, interruption, AI usage hints and automated tests. Use for any new or reworked ability.
---
# New ability

**Owner:** Combat (implementation), with Animation (clip and events), Rendering (VFX) and Character (fighter fit).

## Steps
1. **Spec check:** which fighter slot (Button 2, 3 or 4, or the ultimate on 5)? Confirm it fits INV-9 and that no other fighter has an equivalent ability (REQ-CHR-2).
2. **Write the exact description with numbers** (damage, range in metres, wind-up, active and recovery times in seconds, stamina cost, cooldown, effects). Concepts may draw on the Creature Clash vocabulary (`docs/references/CREATURE_CLASH_OBSERVATIONS.md` §4), but the name and design must be original.
3. **Compose from existing components** (delivery: projectile, beam, area, dash, blink, trap, shield, aura…; modifiers: knockback, stun, burn, pull…). Add a new component only with the Master's approval, generic and tested.
4. **Hit detection:** use the Physics query API. Respect facing, range, height, line of sight and obstruction. No guaranteed hits.
5. **Rules:** target validation, stamina check and spend, cooldown start, interruption and cancel behaviour, ultimate charge or cooldown rule (per OQ-04).
6. **Presentation:** animation events (windup, active, impact, recovery) drive hitboxes, VFX and SFX. Telegraph delayed areas (REQ-ABL-6 if adopted). Impact profile data (hit-stop, shake, flash, knockback).
7. **AI usage hint:** when the AI should use it (poke, close, mid, self, defend, escape, heal, hidden).
8. **Tests:** hit, miss (out of range), blocked by obstacle, blocked or dodged by the target, interruption, cooldown, insufficient stamina, ultimate gating.
9. **Verify** in Practice Zone against a dummy, and against the AI. Take screenshots and record frame-time impact.

## Acceptance checks
- [ ] Data-driven; no fighter-specific branch in the shared engine
- [ ] All listed tests pass; build passes
- [ ] Visually readable from multiple camera angles
- [ ] Progress record and testing checklist updated
