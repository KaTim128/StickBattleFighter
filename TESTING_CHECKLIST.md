# TESTING CHECKLIST

Verification checklist for every milestone and release. Based on Playbook §15 and the master spec. **A successful build alone does not prove the game works.** Tick an item only with evidence (command output, test name, screenshot path or device log) in the Evidence column or the progress record.

**Test levels:** U = unit (Vitest) · I = integration · B = browser automation (Playwright) · V = visual inspection or screenshot · D = real device (manual, logged)

Proposed commands (exist from Phase 0): `npm run typecheck` · `npm test` · `npm run build` · `npm run e2e -- --trace off`

## 0. Initialisation (Phase I)
- [x] All required documents exist with meaningful content
- [x] 10 specialist agent files with valid YAML frontmatter
- [x] Rules and skills have valid frontmatter
- [x] No game code, fighters, arenas or assets created
- [x] Froggy repository unmodified (`git status` clean in froggy-arcade)

## 1. Build and code health (every change)
- [ ] U `npm run typecheck` exits 0
- [ ] U/I `npm test` passes; no skipped tests without a recorded reason
- [ ] `npm run build` exits 0; no bundler warnings left untriaged
- [ ] B smoke test: app loads, canvas renders, **zero console errors**, no failed network requests
- [ ] No secrets, `.env` files or credentials in the diff

## 2. Movement and physics (REQ-PHY)
- [ ] U forward, backward, lateral, diagonal movement (diagonal not faster than cardinal)
- [ ] U acceleration, deceleration, turning rate per fighter data
- [ ] U/B jump, gravity, ground detection, landing
- [ ] B slopes, steps and stairs; no getting stuck on furniture edges
- [ ] B wall collision with no tunnelling at max speed and max knockback
- [ ] U knockback scales with Knockback Resistance and weight
- [ ] I rigid bodies sleep when idle; cosmetic objects use no expensive physics

## 3. Camera (REQ-CAM)
- [ ] B orbit full 360°, zoom within limits, smoothing
- [ ] B wall obstruction and furniture obstruction (no clipping), recovery after obstruction
- [ ] B opponent framing in combat
- [ ] B stability during knockback and fast movement
- [ ] V screenshots at desktop and mobile aspect ratios

## 4. Combat (REQ-CMB)
- [ ] U hit, miss, block, dodge, interrupt, counter, recovery outcomes
- [ ] U hits depend on 3D position, facing, range, timing; obstruction blocks hits; **no guaranteed hits**
- [ ] U melee (Button 1) has **no stamina cost**
- [ ] U stamina spend and regeneration; ability refused when stamina is insufficient
- [ ] U cooldowns start, tick and reset correctly; not bypassable by input spam
- [ ] U critical chance and critical damage applied
- [ ] U knockback direction and magnitude
- [ ] U defeat state triggers exactly once
- [ ] I combo chains and windows (if adopted)
- [ ] I pairwise fighter matchup regression (Phase 9)

## 5. Abilities and ultimates (REQ-ABL)
- [ ] U each ability: target validation, stamina, cooldown, range, hit detection, interruption
- [ ] I animation events trigger hitboxes, VFX and SFX on the correct frame
- [ ] U ultimate charge or cooldown rule (per OQ-04)
- [ ] V presentation targets PRS-1 to PRS-11 (if adopted, OQ-15): readable wind-up, impact layering, callouts, trails, ultimate beat

## 6. Animation (REQ-ANI)
- [ ] I every required animation state exists for each fighter (asset validation test)
- [ ] V smooth blends: idle ↔ move ↔ attack ↔ hit reaction ↔ knockback ↔ pickup ↔ throw
- [ ] V no T-poses, foot sliding beyond tolerance, or snapping on transitions
- [ ] V each fighter's animation set is distinct (no recolour reuse)

## 7. Environment and objects (REQ-ENV, REQ-PHY-5..13)
- [ ] B all office prop categories present; greybox labelled
- [ ] I reachability: every walkable zone reachable; nothing blocks incorrectly
- [ ] U/I pickup validity (mass limits per fighter), carry, aim, throw
- [ ] I thrown objects collide with fighters, walls, furniture and floors; bounce and roll
- [ ] I glass shatters, wood topples or breaks, metal resists, indestructible movables never break
- [ ] I debris cleanup and limits; no runaway object counts
- [ ] I sand impairs visibility or accuracy temporarily (per OQ-12)
- [ ] I fighter-specific object interactions (Titan, Shadowfang, Ronin, Phantom, Inferno)

## 8. AI (REQ-AI)
- [ ] I navigation around office furniture; unstuck recovery
- [ ] I approach, retreat, circling, dodge, block, counter, object use
- [ ] I respects cooldowns and stamina (same rules as players)
- [ ] I difficulty levels differ in behaviour quality; personalities distinct
- [ ] I no single-behaviour spam over a 3-minute soak test

## 9. Controls and HUD (REQ-CTL)
- [ ] B desktop: **no** joystick and **no** mobile combat buttons visible
- [ ] B mobile/tablet emulation: left joystick + **exactly five** right buttons in order (melee, A1, A2, A3, ultimate)
- [ ] D simultaneous touch (move + attack) on a real phone and a real tablet
- [ ] D landscape layout; safe areas and notches
- [ ] B key rebinding, conflict prevention, reset defaults, persistence of bindings
- [ ] B cooldown and stamina indicators update correctly
- [ ] B multiple viewport sizes; accessibility (contrast, touch target size)

## 10. Tutorial (REQ-TUT)
- [ ] B new player: tutorial starts; covers every REQ-TUT-2 topic
- [ ] B instructions adapt to keyboard vs touch
- [ ] I completion persisted server-side; returning player not forced through it again
- [ ] B replay from menu
- [ ] I Skip visible **only** for server-verified admins; a forged client flag is rejected
- [ ] I skip does not mark an ordinary user's tutorial complete

## 11. Game modes (REQ-MOD)
- [ ] I Practice Zone: fighter select, health restore, dummy config, dummy attacks toggle, respawn, restart
- [ ] I 1v1 entry cost and rewards from config
- [ ] I 3v3: random pool of five, select exactly three
- [ ] I Ladder Run difficulty increases per step
- [ ] I Story Mode: opponents, arenas, challenges, bosses
- [ ] I win, loss, draw, exit flows; rewards settled exactly once (idempotent)

## 12. Persistence, backend and security (REQ-BE, REQ-ECO, REQ-PRG)
- [ ] I profile persists across sessions and devices
- [ ] I stats tracked: matches, wins, losses, win rate, damage, KOs, ability and ultimate usage, unlocks
- [ ] I token ledger: every change is an auditable transaction; no negative balances; no double-spend
- [ ] I rewards, purchases, unlocks, tutorial completion server-validated; tampered client requests rejected
- [ ] I admin role verified server-side; the `admin128` username alone grants nothing
- [ ] I published config: defaults, versioning, audit history, rollback
- [ ] I migrations reversible in dev; access policies tested
- [ ] Security review: no secrets client-side; dependency audit

## 13. Performance (REQ-PRF; targets pending OQ-10)
- [ ] D frame rate on target desktop and mobile devices during a 3v3 with destruction
- [ ] D memory stable over a 20-minute session (no leaks)
- [ ] B initial load time and asset sizes within budget
- [ ] D input latency acceptable on touch devices
- [ ] I particle and debris budgets enforced on mobile

## 14. Regression (every milestone)
- [ ] Full automated suite green
- [ ] Previous milestones' acceptance tests re-run
- [ ] QA specialist read-only review recorded with pass/fail
- [ ] `DEVELOPMENT_PROGRESS.md` updated with evidence, branch and commit hash
