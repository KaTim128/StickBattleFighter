> Owner's master plan (supplied 16/11/2026), stored for later sessions. Model names in the original are replaced by role labels: [planning/review model] and [implementation model]; the owner states which model fills each role. Local upload paths in the original refer to the owner's supplied files: the horror ambience candidate is `docs/references/master-plan/` (see AUDIO_ASSET_CATALOG.md).

@"/root/.claude/uploads/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/b53eb9fc-darkne-scary-horror-atmosphere-620036.mp3" @"/root/.claude/uploads/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/5aabfd83-darkne-scary-horror-atmosphere-620036.mp3" STICKMAN ARENA MASTER DEVELOPMENT PLAN

Update the existing Stickman Arena project only.

Use the uploaded Stickman Arena Master Implementation Plan as the original reference. Maintain, reorganise and expand the existing project rather than creating a separate game or unnecessarily rebuilding working systems.

The objective is to develop a polished, cohesive, stable and fully playable Stickman Arena experience.

The development workflow must use [planning/review model] once for Phase 0 planning, then [implementation model] as the primary implementation model for complete phases, with one consolidated [planning/review model] review at the end of each phase. [light model] is optional and should not be used by default because unnecessary model switching wastes tokens and context.

I will manually switch between models in Claude Code. You must explicitly tell me when to switch models and explain what the next model needs to do.

IMPORTANT. Focus exclusively on the desktop experience. All gameplay environments, menus, interfaces and screens must be optimised for desktop viewports.

1\. GLOBAL DEVELOPMENT PRIORITIES

Follow this exact development order.

Phase 0. Complete project inspection, architecture documentation and implementation planning.

Phase 1. Stabilise existing fighters, balance combat systems, resolve GitHub errors, improve controls and establish reliable automated tests.

Phase 2. Develop the complete Hide and Seek Nightmare game mode.

Phase 3. Develop the Roman Colosseum, introduce Vexoris and the eleven additional fighters to complete the sixteen fighter roster, then complete the full UI redesign and tutorial system.

Phase 4. Develop Ancient Ruins Expedition Parkour as the final gameplay feature, then complete final integration, regression testing and release approval.

Do not change this sequence.

The existing four fighters must be stabilised before Vexoris or any of the eleven additional fighters are introduced.

Hide and Seek must be completed before the subsequent game expansions.

The complete UI redesign and tutorial system must be approved before Parkour begins.

Do not treat individual tasks within a phase as additional phases requiring separate [planning/review model] reviews. [implementation model] should complete related tasks in organised batches and only request an [planning/review model] review when the entire phase is ready.

Remove Story Mode

Completely remove Story Mode from the planned development scope and existing game navigation.

Remove its menu entries and related interfaces without deleting shared systems, assets or mechanics required by other game modes.

Do not create story chapters, missions or story progression.

Main Menu Priority

Make Game Modes the first primary button in the main menu.

Position Game Modes above Practice so players can immediately access the available game modes.

Keep the main menu navigation organised and visually consistent with the existing Stickman Arena visual identity.

Hide and Seek Nightmare

Make Hide and Seek Nightmare the first major new gameplay priority.

After Hide and Seek, complete the Roman Colosseum and the full sixteen fighter roster. The entire fighter expansion must be above Parkour in the development plan and completed before Parkour begins. Parkour is the final gameplay feature.

Prioritise its complete house environment, hiding mechanics, Shroud hunting AI, sound detection, horror atmosphere and playable gameplay loop.

The player must receive exactly 20 seconds to find a hiding location before Shroud begins hunting.

Roman Colosseum Only

Create the Roman Colosseum as the only new combat arena for this development cycle.

Include Roman architecture, white stone pillars, arena walls and uneven textured sandy terrain.

Use the Colosseum for Tournament and Free Zone.

Do not create the Ruins Forest as a separate combat arena.

The ancient ruins environment is reserved exclusively for the Parkour game mode.

Fifth Fighter Vexoris

The fifth fighter must be named Vexoris.

Redesign his identity around a World War II inspired poisonous military soldier wearing a gas mask and military jacket.

His signature equipment is a poison jar.

His gameplay must revolve around poisoning opponents, progressively increasing poison damage and slowing their movement.

Poison must be the primary source of his combat strength rather than relying on high direct attack damage.

Do not make him a reskin of Inferno, Titan, Necro or Shroud.

2\. GLOBAL DEVELOPMENT RULES

Follow these requirements throughout every phase.

1. Inspect existing code, assets, systems and architecture before modifying anything.
2. Reuse existing mechanics, animations, assets and infrastructure wherever possible.
3. Do not unnecessarily rewrite working systems or duplicate existing functionality.
4. Preserve existing fighters, combat mechanics, progression, settings and unrelated features.
5. Implement requested features fully, including their underlying gameplay logic.
6. Do not use nonfunctional placeholders for requested features.
7. Run relevant tests after implementation batches.
8. Fix regressions before requesting phase approval.
9. Update DEVELOPMENT_PROGRESS.md with completed work, modified files, test results and remaining tasks.
10. Record important architectural decisions in TECHNICAL_DECISIONS.md.
11. Do not silently skip requirements.
12. Document anything that cannot be completed and explain why.
13. Do not claim that a feature works without verifying its actual behaviour.
14. Do not claim tests or builds passed unless they were actually executed.
15. Avoid unnecessary repeated inspection of files that have already been documented unless new changes require it.

Use subagents for independent investigation, asset inspection and testing where beneficial.

Do not allow multiple agents to modify the same files or systems simultaneously.

Do not introduce unnecessary architectural changes merely to satisfy a new feature.

Preserve existing infrastructure unless there is a demonstrable technical reason to change it.

### Mandatory unique and attack-accurate audio requirement

Every playable fighter must have a distinct and recognisable audio identity. Every individual attack must have its own unique, recognisable and attack-accurate sound. This applies to all five normal ability options, the separate ultimate, every individual light-combo hit, heavy attacks, signature basic attacks, counters, throws, grabs, summons, defensive activations and other meaningful combat actions. It applies to all sixteen main roster fighters, including the fifth normal ability when it is not selected into the current four-slot loadout.

The sound must represent what the character is physically doing. Do not choose a sound merely because it is dramatic, powerful or vaguely suitable for the fighter's theme. Match the sound to the actual action, weapon, material, contact surface, movement, energy type and animation. A knife stab must sound like a blade thrust or stab with an appropriate penetration and impact texture, not a generic punch, sword swing or explosion. A sword slash must have a recognisable blade swish and suitable metallic or cutting contact. A punch must sound like a fist striking a body or solid surface. A kick must have a heavier body impact. A grab and throw should use suitable cloth, grip, movement and landing impacts. A glass poison jar should have glass breaking, liquid splashing and an appropriate chemical hiss or bubbling tail. A poison spray should sound like a pressurised aerosol release and toxic spray. A flame beam should use ignition, a sustained roaring flame stream and an appropriate burn impact. Electrical attacks should use electrical crackle and zap sounds. Crystal attacks should use brittle crystal formation, fracture and shattering sounds. Water attacks should use splashes and flowing water. Mechanical attacks should use appropriate gears, hydraulic movement and metal contact. Spectral or skeletal attacks should use suitable eerie, bone or supernatural textures. These are examples of sound matching, not permission to reuse one sample for every attack in the same category.

Do not use one generic punch, whoosh, slash, impact or explosion sound for multiple different attacks and treat that as complete audio coverage. Do not rely only on pitch shifting, speed changes or volume changes to make an otherwise identical sample appear unique. Each move must have a clearly distinguishable sound identity. Shared subtle background layers may be used only when the complete layered sound remains recognisably different for each move.

Where appropriate, give each move separate audio for activation or windup, swing or movement, projectile travel, confirmed hit or impact, sustained effect, blocked contact, shield contact, status application and cancellation or termination. Use only the layers that make sense for that attack. The correct sound must be triggered by the correct gameplay event or state transition, not simply by a looping animation. Do not trigger a successful impact sound when an attack misses. Do not trigger hit sounds every frame, repeatedly play one impact for a single hitbox event, or allow cancelled attacks to continue producing active audio. Ensure the sound timing matches the actual animation contact frame and damage registration.

Every hit in a multi-hit combo must have its own distinct attack sound synchronised with its individual animation and impact timing. Shroud's five-hit combo must have five different attack sounds as well as five different animations. Vexoris's four-hit combo must also have a different sound for each hit and a separate poison splash sound on its completed finisher. Every normal ability, including each fighter's newly added fifth option, and every ultimate must have its own unique sound identity. AI-controlled and player-controlled fighters must use the same per-move sound mappings.

### Pixabay sound sourcing and editing workflow

Use the official Pixabay Sound Effects search as the primary external source when a suitable existing project asset is not available: https://pixabay.com/sound-effects/search/ . Search for the actual sound event rather than broad mood terms. Use specific queries such as knife stab, blade thrust, sword slash, body punch impact, heavy kick impact, glass shatter, liquid splash, aerosol spray, flame ignition, flamethrower burst, electric zap, crystal shatter, hydraulic clank, bone rattle or water impact, as appropriate to the actual move.

When the Claude Code environment provides browser or website access, navigate to the individual Pixabay sound effect pages, preview candidate sounds and select the closest match to the attack. Do not assume that a search result title accurately describes its audio. Listen to the candidate and compare it with the in-game animation and impact. Download only from the official Pixabay asset page using its provided download control. Do not scrape around access controls, bypass restrictions, use unofficial mirrors or claim that an asset has been downloaded when it has not. If browser access or downloading is not available in the current Claude Code setup, document the limitation and the exact candidate links or request the user to provide the files instead of inventing completion.

Before using each external asset, inspect the current official Pixabay Content License and the relevant asset page. Confirm that the intended use is permitted, check for any additional rights concerns, and do not assume that every search result is automatically cleared for every use. Pixabay's license permits use and adaptation subject to its prohibited-use rules, but does not permit redistribution of the audio as a standalone asset. Use downloaded audio as integrated and edited game sound content, not as a separately distributed sound pack. Retain a record of the source page, title, contributor, download date, license checked and any attribution information. Attribution may not be required under the applicable Pixabay license, but preserve the contributor information and provide credit where appropriate. If a candidate has unclear rights, identifiable third-party material or unsuitable license terms, reject it and find a safer alternative.

When a suitable sound is found, retain an untouched source copy and create a separately edited game-ready clip. Use the audio editing tools actually available in the project environment, such as an installed audio editor or FFmpeg if present. Listen to the source and trim the exact portion that contains the required event. Extract separate attack, impact or tail segments from a longer recording when those segments genuinely represent different events. Remove unnecessary silence, trim cleanly around transients, apply short fades where needed to prevent clicks, adjust gain and loudness consistently, and use tasteful layering only when it improves physical accuracy. Do not destructively overwrite the downloaded original. Do not create artificial uniqueness by applying only a small pitch or speed change to the same generic clip. For sustained attacks, create a clean loop only when the actual move requires continuous audio, and stop it immediately when the ability ends or is interrupted.

Create or update AUDIO_ASSET_CATALOG.md. For every selected sound, record the fighter, move or event name, intended sound role, source page URL, asset title, contributor, license checked, download date, original file path, edited file path, trim range or edit notes, sound event mapping and verification status. Keep filenames descriptive and stable. Do not leave undocumented audio files or untracked external assets in the project.

Review the chosen audio in the actual game. Confirm that a player can recognise the type of attack from its sound, that the sound matches the animation and contact, and that it remains distinguishable in a crowded fight. Balance loudness, prevent clipping and excessive overlap, respect existing audio settings, and use positional audio where the game presentation requires it. Do not use generic explosions for every powerful move. Do not use unrelated ambience or music as attack audio.

The two supplied horror atmosphere MP3 files are candidates for Hide and Seek ambience only. Do not use them as substitutes for fighter attack, ability, combo or impact sounds.

During Phase 0, inspect and document the existing audio architecture, available tools, asset inventory, event mappings and missing coverage only. The Phase 0 audio plan may identify Pixabay search terms and candidate source pages if access is available, but must not download, trim, process, create, replace, integrate or modify gameplay audio. Actual sound sourcing, editing and integration must happen in the relevant implementation phase, with existing fighters handled in Phase 1 and the remaining roster completed in Phase 3.
3\. CLAUDE MODEL WORKFLOW AND TOKEN-EFFICIENT MODEL SWITCHING

The model workflow must minimise manual model changes, context reloading and repeated reviews. Do not switch models for every task, batch, fighter or minor correction.

Use [planning/review model] for the complete Phase 0 inspection and planning task, difficult architectural decisions that [implementation model] cannot resolve, one independent review at the end of each completed implementation phase, and final release approval.

Use [implementation model] as the primary model for all implementation work. [implementation model] should complete every task and batch within the current approved phase, including ordinary coding, documentation, tests, audio asset preparation and integration. Do not switch to another model between batches.

[light model] is optional and should not be used by default. Do not switch to [light model] for a small wording change, simple code edit or repetitive task when [implementation model] can complete it in the current session. Use [light model] only when there is a substantial, clearly isolated batch of repetitive low-risk work and the expected savings genuinely outweigh the cost of switching models and transferring context. [light model] must not handle architecture, combat balancing, AI, audio architecture, multi-system integration or difficult debugging.

I will manually switch models in Claude Code. Never claim to switch models automatically. Tell me only when a genuine phase handoff or exceptional escalation requires a switch.

A. [planning/review model] responsibilities

[planning/review model] must lead the entire Phase 0 project inspection, documentation review and implementation planning. Complete the inspection, create the required documents, produce the roadmap and perform the final consistency check in the same Phase 0 [planning/review model] run. Do not ask me to switch to [planning/review model] again merely so [planning/review model] can review the plan it has just created. The Phase 0 self-audit must verify that the plan is grounded in actual project files and that all requirements are represented.

[planning/review model] is also responsible for resolving difficult architectural decisions, investigating complex unresolved problems, conducting one independent review after each entire implementation phase, and conducting final release approval. [planning/review model] must not take over routine implementation or request a review after every small task.

B. [implementation model] implementation responsibilities

For each approved implementation phase, [implementation model] must read the approved phase requirements, the latest PHASE_HANDOFF.md and relevant project documentation, then inspect only the actual files and dependencies affected by that phase. [implementation model] must prepare one concise phase plan and complete the entire phase in logical batches without requesting model changes between those batches.

[implementation model] must self-review its changes, run targeted tests after related implementation batches, run the complete relevant regression suite before the phase handoff, verify gameplay where possible, correct implementation defects, and update DEVELOPMENT_PROGRESS.md, TECHNICAL_DECISIONS.md, PHASE_HANDOFF.md, AUDIO_ASSET_CATALOG.md and other relevant documents. Record exact modified files, commands actually executed, test results and unresolved issues.

[implementation model] must not silently skip requirements, modify unrelated systems, begin the next phase without approval or claim that unverified features work. [implementation model] must stop after the current phase is implemented and its initial verification is complete.

C. One review per completed phase

After [implementation model] completes the entire phase and its self-review, switch to [planning/review model] once for one consolidated independent phase review. Do not request separate [planning/review model] reviews after individual batches, individual fighters, audio asset groups or sub-tasks. Phase 3 must receive one review after the full sixteen-fighter roster, Colosseum, UI redesign and tutorial system are complete, not one review per fighter.

[planning/review model] must inspect the actual changed files, relevant tests, gameplay and documentation rather than relying solely on [implementation model]'s report. Review architecture, functional completeness, combat balance, AI behaviour, animation, audio accuracy, asset licensing records, performance, regressions, test coverage and acceptance criteria. Classify findings as Critical, High, Medium or Low. Do not block phase approval for unrelated Medium or Low findings unless they undermine an acceptance criterion or create a material risk. Do not repeat a full project inspection when the targeted phase evidence is sufficient.

D. Consolidated correction workflow

Before [planning/review model] review, [implementation model] must attempt to resolve all defects found during its own testing. If [planning/review model] finds remaining Critical or High priority defects, [planning/review model] must provide one consolidated correction list grouped by affected system. Switch to [implementation model] once to implement that complete correction batch, run the relevant regression tests and update the documentation. Then perform one focused [planning/review model] verification of the correction batch.

Do not create a separate model-switch cycle for each defect. Do not send [implementation model] back and forth for isolated small fixes. If only Medium or Low findings remain, record them in the backlog and proceed only when the phase acceptance criteria are still satisfied. Repeat a further correction cycle only when Critical or High priority issues remain or a genuine architectural risk requires it.

E. Exceptional escalation

If [implementation model] encounters a blocker that cannot be resolved safely through normal implementation, collect the reproduction steps, relevant files, logs, failed tests and attempted fixes into one concise escalation report. Switch to [planning/review model] only for that consolidated blocker. [planning/review model] should recommend a targeted resolution, then [implementation model] should implement it in the existing phase. Do not escalate routine questions or ask [planning/review model] to re-explain requirements already documented in the master plan.

F. Token efficiency and context preservation

1. Keep the current model for the entire phase's work. Do not switch between [implementation model] and [light model] for small tasks.
2. Complete related implementation tasks in planned batches, but keep all batches inside the same phase and model session.
3. Do not request [planning/review model] approval after every batch, fighter, ability or sound asset. Use one phase review.
4. Do not reread or reproduce the entire master prompt in every continuation. Use the master prompt as the source of truth and consult the relevant sections, project documents and PHASE_HANDOFF.md.
5. Do not repeatedly inspect files already documented unless a new code change or test result requires it.
6. Use targeted tests during development and one complete relevant regression run before handoff.
7. Avoid spawning multiple agents for tasks that overlap or require repeated cross-agent context. Use agents only for independent read-only research, audit or non-overlapping work where the benefit outweighs the coordination cost.
8. Keep handoffs concise and factual. Include current phase, completed work, modified files, actual test results, unresolved issues and the exact next action.
9. Do not perform unnecessary model changes merely to save a few tokens on an isolated task. [implementation model] is the default implementation model.

G. Manual model switching points

Phase 0 begins and ends in [planning/review model]. [planning/review model] performs its own final plan audit in the same run. At the end of Phase 0, display:

PHASE 0 IS COMPLETE AND SELF-REVIEWED BY [PLANNING/REVIEW MODEL]. SWITCH TO [IMPLEMENTATION MODEL] ONCE TO BEGIN PHASE 1 IMPLEMENTATION.

At the end of Phase 1, Phase 2 and Phase 3, after [implementation model] has completed the full phase and its regression checks, display:

SWITCH TO [PLANNING/REVIEW MODEL] ONCE FOR THE CONSOLIDATED INDEPENDENT PHASE REVIEW.

After [planning/review model] approves the phase, display:

SWITCH TO [IMPLEMENTATION MODEL] ONCE TO BEGIN THE NEXT APPROVED PHASE.

If a consolidated correction batch is genuinely required, display:

SWITCH TO [IMPLEMENTATION MODEL] ONCE TO IMPLEMENT THE CONSOLIDATED CORRECTION BATCH.

After the final Parkour phase and full regression testing, display:

SWITCH TO [PLANNING/REVIEW MODEL] FOR FINAL PROJECT INSPECTION AND RELEASE APPROVAL.

Do not ask for a switch to [planning/review model] at the end of Phase 0 because [planning/review model] is already the active model. Do not ask for [light model] model changes by default. Wait for my manual model selection at each genuine handoff.
4\. VISUAL STYLE GUIDE AND ART DIRECTION

Before creating new assets, inspect the existing Stickman Arena characters, environments, furniture, textures, lighting, UI and screenshots.

Create STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md.

Use actual project assets and screenshots as the primary reference.

All new assets must maintain consistent:

1. Character proportions.
2. Materials and textures.
3. Lighting and shading.
4. Environmental detail.
5. Rendering quality.
6. Animation quality.
7. Colour treatment.
8. Overall artistic direction.

Isometric 3D environmental style

Use the supplied isometric office reference image as a visual reference for the architectural presentation of the Hide and Seek house.

The desired aesthetic includes clean stylised 3D geometry, elevated three quarter isometric viewing angles, detailed furniture, visible architectural cutaway sections, soft shadows, cohesive materials and carefully organised interiors.

Apply the same overall presentation quality to the living room, dining room, kitchen, bedrooms, bathrooms and other house interiors.

The living room should feel like a believable furnished home rather than an office environment.

The existing reference is a guide for visual styling and 3D presentation, not a requirement to reproduce its office furniture or layout.

The house should have a slightly unsettling atmosphere while remaining sufficiently illuminated and detailed for players to navigate.

The Ancient Ruins Parkour environment must maintain the same game's visual quality without looking like a separate game.

Do not introduce generic placeholders, unrelated art styles or photorealistic assets that clash with the existing stylised appearance.

Render new assets inside the actual game and compare them with existing assets before approving them.

Visual consistency is mandatory throughout every development phase.

5\. PROJECT DOCUMENTATION

Create or update the following documents.

1. STICKMAN_ARENA_MASTER_SPEC.md
2. CLAUDE.md
3. IMPLEMENTATION_PLAN.md
4. DEVELOPMENT_PROGRESS.md
5. TECHNICAL_DECISIONS.md
6. STICKMAN_ARENA_VISUAL_STYLE_GUIDE.md
7. FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md
8. FIGHTER_SYSTEM_CHANGELOG.md
9. PHASE_HANDOFF.md
10. AUDIO_ASSET_CATALOG.md

AUDIO_ASSET_CATALOG.md

Maintain a complete catalogue of existing, sourced, edited and integrated audio assets. For every combat and ambience sound, record its event mapping, source page, asset title, contributor, license review, download date, original and edited file paths, trim or processing notes and verification status. Separate fighter combat audio from Hide and Seek ambience. Never claim an asset is licensed, downloaded or integrated unless this has been checked.

FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md

This guide must explain how to modify the entire fighter system, not just statistics.

Cover:

1. Fighter statistics.
2. Ability configurations.
3. Damage calculations.
4. Combat mechanics.
5. Stun and recovery.
6. Animations.
7. Hit detection.
8. Status effects.
9. Summoned entities.
10. Fighter AI.
11. Fighter registration.
12. Five normal ability definitions, four-slot loadouts and ultimate registration.
13. Ability descriptions, damage metadata, buff and debuff data, cooldowns and the combat HUD.
14. Attack audio event configuration, unique per-move sound mapping, audio timing, mixing and audio regression tests.
15. Removing unwanted mechanics.
16. Introducing new fighters.
17. Automated tests.

Include actual project file paths and commands discovered during inspection.

Explain how to change a fighter's attack, add a new ability, remove stun from one specific attack, introduce a new status effect, change maximum summoned entities or safely remove a fighter.

Document which files need modification and which tests must be updated for each type of change.

FIGHTER_SYSTEM_CHANGELOG.md

Record modifications to fighter statistics, abilities, combat mechanics, status effects and fighter configurations.

PHASE_HANDOFF.md

Maintain a concise record for the current development phase.

Include:

1. Current phase.
2. Completed requirements.
3. Modified files.
4. Important implementation decisions.
5. Tests performed.
6. Test results.
7. Known problems.
8. Outstanding tasks.
9. [planning/review model] approval status.
10. Exact next action.

This document must allow a new Claude Code session to resume development without unnecessarily reviewing the entire previous conversation.

6\. PHASE 0. PROJECT INSPECTION AND IMPLEMENTATION PLANNING

USE CLAUDE [PLANNING/REVIEW MODEL] FOR THIS PHASE.

DO NOT IMPLEMENT GAMEPLAY CHANGES YET.

[planning/review model] must independently inspect the entire existing project and understand its architecture.

Investigate:

1. Fighter systems and character registration.
2. Fighter configurations, normal ability counts, ultimate assignments and loadout rules.
3. Fighter statistics.
4. Combat, damage, hit detection and attack recovery.
5. Ability configurations, five-slot normal ability architecture, loadout selection, descriptions, cooldowns and stamina consumption.
6. Status effects and stacking behaviour.
7. AI targeting, navigation and decision making.
8. Movement, jumping, sprinting, climbing and physics.
9. Grab, throw and ground interaction mechanics.
10. Animation and visual effects systems.
11. Camera and environment rendering.
12. Map architecture and environmental objects.
13. Game mode and tournament systems.
14. Player profiles and local settings storage.
15. Keybind registration and input handling.
16. Admin panel and fighter registration.
17. Audio asset inventory and sound management, including fighter-specific attack audio, ability audio, combo-hit sounds, sound event mapping, event timing, audio mixing, positional audio and volume settings.
18. Main menu, settings, tutorials and screen transitions.
19. Loading screen and asset management.
20. Automated tests and GitHub Actions workflows.

For each existing fighter, inventory the audio used by every light-combo hit, heavy attack, normal ability, ultimate, defensive move and relevant status or impact event. Record which attacks already have distinct sounds, which sounds are reused, which sounds are missing, and how sound events are triggered. Inspect the two supplied horror MP3 candidates separately from the fighter combat audio.

Prepare a planned audio coverage matrix for all sixteen fighters. It must map each fighter and each attack to its intended unique sound event and required audio layers. Use the actual current ability names after inspecting the project and the approved fighter specifications. Do not invent project paths or claim that audio assets exist without confirming them.

Pay particular attention to Inferno, Titan, Necro and Shroud.

Inspect their actual statistics, abilities, damage output, strengths, weaknesses and combat performance.

Investigate existing GitHub failures and identify their underlying causes.

Determine whether errors are caused by genuine implementation defects, outdated test expectations, inconsistent fighter configurations, incorrect formulas or other dependencies.

Hide and Seek architecture inspection

Investigate:

1. House environment architecture.
2. Room registration and room boundaries.
3. Camera perspective and field of view.
4. Lighting and shadow systems.
5. Progressive room visibility.
6. Floor separation and ceiling occlusion.
7. Doorway visibility and line of sight.
8. Camera peeking implementation.
9. Hiding locations.
10. AI perception.
11. Sound detection.
12. Multi-floor pathfinding.
13. Environmental collision.
14. Player movement.

Determine how to prevent unexplored upstairs rooms and inaccessible areas from becoming visible prematurely.

Ensure player camera visibility and Shroud AI perception are independent systems.

Parkour architecture inspection

Inspect the existing Parkour implementation.

Determine how movement, platforms, jumping, climbing, physics, checkpoints, timers and course generation can be reused.

Identify all relevant files, dependencies and potential conflicts.

Phase 0 deliverables

Create or update all required documentation.

IMPLEMENTATION_PLAN.md must include:

1. The four implementation phases after Phase 0.
2. The exact task order within each phase.
3. Affected files and systems where discoverable.
4. Dependencies between features.
5. Technical risks.
6. Testing requirements.
7. Acceptance criteria.
8. Required [planning/review model] review checkpoints.
9. Model switching instructions.

Create a project architecture overview and record the actual locations of the relevant source files.

Include an audio architecture and asset audit covering every existing fighter attack and ability. The roadmap must specify how unique sound assets and event mappings will be completed for the four existing fighters in Phase 1 and all sixteen fighters in Phase 3. Include Shroud's five separate combo attack sounds and the separate Hide and Seek ambience candidates. This is inspection and planning only. Do not browse to download, download, trim, process, create or integrate sound assets during Phase 0. The actual Pixabay search, listening, downloading, editing and integration work belongs in the implementation phase that owns the relevant fighters. Record the available browser and audio-editing tools discovered in the environment, and plan around tools that are actually installed. Do not claim a tool is available without checking.

Do not invent file paths or assume how systems work without inspecting them.

Do not begin gameplay implementation during Phase 0.

At the end, [planning/review model] must perform a final self-audit in this same Phase 0 run and verify that the plan is grounded in actual project files, all required features are represented and the development order has no unresolved contradiction. Do not request a second [planning/review model] session or an [planning/review model]-to-[planning/review model] model switch for this approval.

STOP after the Phase 0 report and display:

PHASE 0 IS COMPLETE AND SELF-REVIEWED BY [PLANNING/REVIEW MODEL]. SWITCH TO [IMPLEMENTATION MODEL] ONCE TO BEGIN PHASE 1 IMPLEMENTATION.

Wait for my manual model selection. Do not automatically begin Phase 1.

7\. PHASE 1. EXISTING FIGHTER STABILISATION, COMBAT BALANCING AND INPUT SYSTEM

USE CLAUDE [IMPLEMENTATION MODEL] FOR IMPLEMENTATION.

This is the first implementation priority.

Organise Phase 1 into two implementation batches.

Complete the smaller, straightforward tasks first. Then proceed to the more complicated combat and architecture work.

Do not request an [planning/review model] review between these batches. Complete the entire phase before requesting approval.

BATCH A. SMALLER TASKS AND FOUNDATION FIXES

Complete these tasks first.

A1. Project and documentation housekeeping

Review the existing project documentation and update it where necessary.

Remove Story Mode from existing game navigation without deleting shared dependencies.

Ensure Game Modes is positioned above Practice in the main menu.

Inspect the Admin Panel and identify missing fighter registrations.

Correct straightforward configuration inconsistencies and clearly identified minor errors.

Do not perform a full UI redesign in this phase.

A2. GitHub errors and automated tests

Investigate and resolve existing GitHub errors related to fighter systems and combat changes.

Inspect:

1. Fighter stat configuration files.
2. Default stat values and overrides.
3. Stat calculation and scaling formulas.
4. Ability damage calculations.
5. Fighter selection and combat initialization.
6. Unit tests and integration tests.
7. GitHub Actions workflows and build validation.

Identify tests with hardcoded expectations that are no longer consistent with intended behaviour.

Update tests based on verified implementation requirements.

Do not delete failing tests or weaken assertions simply to make GitHub pass.

Ensure changing one fighter's statistics does not unexpectedly break other fighters.

Create or update tests for stat validation, damage calculations, ability interactions and combat edge cases.

A3. Input system and fighter specific keybinds

Redesign the input configuration architecture before creating the complete tutorial.

General Settings

General Settings must contain only global game settings.

Remove the Full Screen button.

Remove Fire Beam controls and Touch Button Size from General Settings.

The ESC key should open the in-game Settings menu rather than triggering unwanted browser behaviour.

Handle this through the game's keyboard event system without interfering with normal browser operation outside the game.

Fighter Controls

Create a separate Fighter Controls interface.

Each fighter must have independent keybind configurations.

When selecting Inferno, provide an option called Change Fighter Keybinds.

Provide independent fighter-specific keybinds for all sixteen combat fighters as they are introduced. Changing one fighter's controls must never change another fighter's controls.

Allow access through Fighter Selection, Practice and Tutorial screens.

Keybind Customisation

Allow players to reassign keys to individual fighter abilities and actions.

Save customised controls locally and associate them with the appropriate user profile and fighter.

Changing Inferno's controls must not change Titan's controls.

Provide reset to default functionality.

Prevent conflicting key assignments and clearly notify the player.

Hold and Tap Inputs

Support both tap and hold actions.

For example, a control requiring a one second hold should display R (Hold).

Accurately distinguish between tapping and holding.

Make hold duration configurable where appropriate and display the correct input type in the keybind interface.

Test key rebinding, persistence, conflicting keys, hold detection and ESC navigation.

BATCH B. COMPLEX FIGHTER AND COMBAT IMPROVEMENTS

B1. Complete existing fighter stat audit

Inspect Inferno, Titan, Necro and Shroud.

Review all existing attributes, including:

1. Attack.
2. Defence.
3. Speed.
4. HP.
5. Stamina.
6. Recovery.
7. Ability damage.
8. Ultimate damage.
9. Attack speed.
10. Range.
11. Special ability modifiers.
12. Other existing combat attributes.

Determine how each statistic affects actual gameplay.

Evaluate each fighter according to strengths, weaknesses, ability effectiveness and intended combat role.

A fighter with exceptionally powerful abilities should not automatically have equally powerful base statistics.

If a fighter has outstanding abilities and strong crowd control, compensate through more moderate base statistics where appropriate.

Likewise, a fighter with weaker abilities may need stronger base attributes to remain competitive.

Avoid making every fighter equally strong in every category.

Each fighter should have meaningful advantages and disadvantages.

B2. Consistent stat configuration system

Centralise fighter statistics wherever practical.

Separate:

1. Base fighter statistics.
2. Ability specific damage modifiers.
3. Temporary combat effects.
4. Status effect modifiers.
5. Final calculated combat statistics.

Avoid duplicating stat values throughout multiple files.

Ensure the fighter selection screen, combat system, AI and other relevant systems use consistent configurations.

Document the correct process for changing statistics in FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md.

B3. Damage balancing

Establish consistent attack damage relationships.

Individual heavy attacks should deal more damage than individual light attacks.

However, successfully completing the entire light attack combo should allow its final hit to deal slightly more damage than one individual heavy attack.

Ensure abilities, ultimate attacks and basic attacks are balanced relative to cooldowns, range, interruption properties and damage output.

Avoid balancing fighters exclusively by looking at their attack statistic.

Evaluate the total combat package.

Ensure the in-combat interface clearly identifies every equipped ability, its assigned keybind and its current cooldown so players know what each control does instead of blindly pressing keys.

Ensure fighters cannot pass through furniture or solid environmental objects. Inspect collision bounds and movement resolution so characters are correctly blocked by objects without becoming stuck or jittering.

B4. Inferno Fire Beam

Improve Inferno's Fire Beam ability.

1. Increase Fire Beam's damage to make it more effective as well as the time by a second longer.
2. Balance its continuous damage, range and duration.
3. Improve its effectiveness without making it excessively powerful.
4. If Inferno is hit by an opponent during Fire Beam, immediately interrupt and stop the beam.
5. Cancel its damage detection, hitbox and continuous damage ticks immediately.
6. Prevent the beam from continuing to damage opponents after Inferno has been interrupted.
7. Prevent the beam from remaining active through knockbacks, hit reactions or other interrupted states.
8. The AI should not have unrealistically perfect accuracy when targeting the player. It should not instantly lock onto the player's current position or continuously aim directly at them with perfect precision. Instead, its attacks should have natural aiming delays, reasonable tracking limitations and some room for the player to dodge depending on the difficulty level.

Make Fire Beam feel powerful while maintaining fair counterplay.

B5. Necro skeleton mechanics

Necro must be able to summon a maximum of exactly FOUR active skeletons.

1. Allow four active skeletons.
2. Reject a fifth summon while four are active.
3. Release an active slot when a skeleton is defeated or despawned.
4. Skeletons must NEVER stun opponents.
5. Skeleton attacks must not interrupt opponent movement, attacks or recovery animations.
6. Skeletons can independently pursue and damage opponents.
7. Prevent duplicate hit registration within one attack animation.
8. Prevent multiple skeletons from creating continuous hit reaction loops.
9. Eac skeleton's health should be frail and easy to kill.

Four skeletons should provide additional offensive pressure without creating an unfair stun lock.

B6. Shroud stabbing and recovery

Fix the continuous stabbing exploit.

1. Shroud's stabbing ability must not stun opponents.
2. Repeated stabbing must not interrupt or reset opponent recovery indefinitely.
3. Opponents must retain the ability to stand up normally.
4. Do not repeatedly trigger hit reactions against opponents who are already recovering.
5. Maintain the intended stabbing damage, animations and visual effects.
6. Implement proper attack state management and hit registration.
7. Ensure a grounded opponent can complete recovery even when Shroud continues attacking.

An opponent must always be able to recover.

B7. Bleeding status effect

Implement or rebalance bleeding using a central damage calculation system.

1. An affected opponent deals 1.1 times their normal outgoing attack damage while bleeding.
2. Bleeding is a damage vulnerability effect, not additional damage dealt by the opponent applying it.
3. The multiplier applies consistently to applicable attacks.
4. Multiple applications must not stack beyond 1.5 times.
5. Duration is six seconds.
6. Reapplication refreshes duration without multiplying damage again.
7. Bleeding expires correctly.

B8. Poison status framework

Ensure the status effect framework can support future effects, including Vexoris's poison.

Support damage over time, movement slowing, damage multipliers, stacking rules, refresh behaviour, effect duration, immunities, visual indicators, damage tick intervals, effect expiration and combat cleanup.

Avoid creating separate poison timers for every attack.

Poison must be manageable through a consistent status effect architecture.

Do not implement Vexoris's complete poison ability set during this phase.

B9. Titan grab stability

Fix opponent jitter during Titan's grab animation. but for abilities like inferno's dash for example it should be able to push titan but titan will still grab hold of the stickman, AI should also be able to throw furniture during battle.

for his ultimate titan's defence is 40 percent stronger

Keep the opponent correctly attached throughout the complete grab sequence.

Synchronise position, rotation and animation while preventing physics and movement systems from interfering.

Restore normal movement and physics when the opponent is released.

B10. Improve AI and update ultimates

Ensure for all stickman, the max out percentage to get the ult depends on how good the ult is, if it is strong or provides a strong advaantage then it should take a longer time to charge up.

for necro's ultimate, the skeletons should be 4 but they are easily killed and do not stun opponents, ensure that the opponent AI knows to hit the skeletons first or the player or both, it should be dependant on the situation

Reclassify Inferno's existing orange-to-blue flame transformation as one of his normal abilities rather than an ultimate. Preserve its recognisable darkened appearance and blue flames. The existing design proposes 25% faster ability cooldowns and 15% stronger damage during the transformation, but inspect the actual implementation and rebalance the values, duration and cooldown so the effect is fair as a normal ability. When the effect ends, restore Inferno's original appearance, orange flames and normal combat values. This transformation must no longer charge or occupy the ultimate slot. Create a separate, entirely new signature ultimate for Inferno. The new ultimate must be distinct from the transformation, have suitable counterplay and be balanced according to its actual power and the ultimate charge system.

Improve Inferno AI targeting.

The AI must turn towards moving opponents, adjust its aim and reposition when necessary.

Prevent unnatural snapping or the beam remaining permanently fixed in one direction.

Update Shroud's ultimate

1. Instead of a dark radius, make the whole arena dark, but it should allow spectators to not have that effect.
2. make it a 4 second ultimate.
3. Increase speed of Shroud by 17%
4. Help balance Shroud's stats

B11. Movement stability

Fix running and jumping at platform edges.

Players must be able to run and jump together naturally.

Implement appropriate coyote time so jumping still registers immediately after leaving a ledge.

Prevent unintended double jumps, floating and inconsistent movement.

B12. Admin Panel

Ensure all available fighters are displayed, including every skeleton variant and special fighter.

Keep existing administrative functionality working.

B13. Five normal abilities and one ultimate for the existing four fighters

Update the ability architecture for Inferno, Titan, Necro and Shroud.

Every main roster fighter must have exactly five distinct normal abilities and one separate ultimate ability.

Players may equip and use only four of the five normal abilities during a match. The fifth ability is an alternative option that can be selected before entering combat. The ultimate occupies its own separate slot and does not count toward the four equipped normal abilities.

For the four existing fighters, inspect the actual ability configuration and implementation before changing anything.

Inferno's current ultimate transformation must become a normal ability as specified in B10. Retain its identity and rebalance it as a normal ability. Create a completely new ultimate for Inferno.

For Titan, Necro and Shroud, preserve their existing abilities where appropriate and create an additional fifth normal ability if they do not already have five. Each new ability must fit that fighter's identity and offer a genuinely different tactical option rather than duplicating an existing move.

Do not remove existing abilities simply to meet the new count. Do not create filler abilities that only change damage values. The five normal abilities should offer distinct combinations of offence, defence, mobility, buffs, debuffs, shields, counters, crowd control or utility according to the fighter's role.

Keep each fighter's original strengths and weaknesses. Balance all five normal abilities and the ultimate together with the fighter's statistics, passive mechanics and existing combat systems.

B14. Ability information, selection and in-combat identification

When a player selects or clicks an ability in Fighter Selection, the pre-match loadout screen or another ability selection interface, display a clear ability information panel.

The panel must show the ability name and a practical description of what the ability does. It must also display the actual damage or damage range, damage per hit or tick where relevant, buffs and their effects and durations, debuffs or curses and their effects and durations, poison or other status applications, shield or defensive values, mobility or crowd-control effects, range, area of effect, active duration, cooldown, resource cost if applicable, activation requirements and important limitations or counterplay.

Only display values that apply to that ability. Clearly state when an effect such as a buff, debuff, shield, curse or status effect is not part of the ability. Do not show misleading or invented statistics.

The information panel must use the same configuration and calculation data as the actual ability implementation. Displayed damage, cooldowns, durations, status values and other details must always match the current in-game values after balance changes.

In the pre-match loadout interface, show all five normal abilities and allow the player to select exactly four. Clearly distinguish selected and unselected abilities. Prevent starting a match with fewer or more than four equipped normal abilities unless an existing game mode has a documented exception. Keep the ultimate in its own clearly marked slot.

During combat, visibly identify all four equipped abilities and the ultimate. Each HUD slot must show its ability name or an unmistakable shortened name, icon, assigned keybind and cooldown or availability state. Hovering over or clicking an information control must reveal the ability description and key details. Inspecting an ability must not accidentally activate it. Pressing its assigned key must continue to perform the actual ability.

Provide a brief, readable on-screen ability name notification when an ability is activated where this helps communicate what happened. Ensure that the HUD remains readable and does not obscure the fighters or important combat actions.

The immediate Phase 1 implementation must cover the four existing fighters using the current interface. The complete polished version for all sixteen fighters must be delivered as part of the Phase 3 UI redesign.

B15. Shroud five-hit basic attack combo

Upgrade Shroud's basic light attack combo to a five-hit sequence.

Each of the five hits must use a visibly different animation. Do not reuse the same punch or stab animation with only a different timing or damage value.

Give each hit a distinct body movement, attack direction, pose, timing, impact and recovery. The sequence should flow naturally from one hit to the next while remaining responsive to player input.

The fifth hit must be a more impactful finishing move with its own distinctive animation and clear impact feedback.

Ensure that every hit has correctly timed hit detection and can only register its intended damage once. Combo input windows, interruption rules and recovery must work consistently. Missing, being interrupted or failing to continue the sequence must not trigger the fifth-hit finisher.

Preserve Shroud's established identity and existing stabbing restrictions. The five-hit basic combo must not reintroduce stun locking, repeated ground hit reactions or the existing continuous stabbing exploit. Opponents must retain a fair opportunity to dodge, defend and recover.

This five-hit combo is a specific Shroud exception. Other fighters may retain their existing four-hit basic light attack combo unless their individual specifications explicitly state otherwise.

B16. Dodge responsiveness and attack counterplay

Make incoming attacks easier to read and evade while preserving meaningful combat risk.

Inspect and improve dodge input responsiveness, input buffering, startup time, movement distance, direction, active frames, recovery time, collision and interaction with attack hitboxes.

Ensure the player can dodge promptly in the intended direction and that the dodge animation and actual movement remain synchronised. Correct hitboxes that continue to register after an opponent has clearly moved outside the attack's effective area.

Review attack tracking. Once an attack has committed to its execution, it should not excessively rotate or follow a target that has already dodged or moved away. Different attacks may have different tracking behaviour according to their design, but tracking must be deliberate and fair.

Improve attack telegraphs and commitment where necessary so players have a reasonable reaction window. Do not make every attack slow or predictable. Fast attacks may have shorter reaction windows, while large or high-damage attacks should communicate their danger appropriately.

Do not grant universal or unlimited invulnerability during dodges. If the existing design includes dodge invulnerability, inspect its active window and tune it carefully. Preserve appropriate recovery, stamina or cooldown costs where supported by the existing architecture so dodging cannot be spammed without consequence.

Apply the same combat rules consistently to player-controlled and AI-controlled fighters. AI must be able to recognise and respond to attacks without receiving unfair hidden dodge advantages.

B17. Longer and more engaging fights

Increase the average duration of combat compared with the current version. The current fights end too quickly, so rebalance overall combat pacing to create more opportunities to attack, defend, dodge, reposition and counterattack.

Before tuning, record a baseline using repeated comparable matches. Record average and median fight duration, damage dealt, damage received, time to defeat, successful dodge rate, combo damage, ability damage and win rate where the existing game can measure them.

Use those results to make targeted adjustments to damage output, attack frequency, recovery, defensive options, dodge responsiveness, hit reactions, crowd control and ability combinations.

Do not solve the problem by simply giving every fighter an excessively large health pool. Do not make attacks feel weak or battles unnecessarily slow. Preserve meaningful damage, readable impact and the identity of each fighter.

Prevent high-damage ability chains, repeated hit reactions, stun loops or unavoidable combos from removing most of an opponent's health before they have a reasonable opportunity to respond.

After adjustments, repeat the same or equivalent tests under comparable conditions. Confirm that average and median fights are measurably longer than the recorded baseline while remaining engaging and competitive. Record the before-and-after results and explain any balance trade-offs in FIGHTER_SYSTEM_CHANGELOG.md.

B18. Unique and attack-accurate audio for the four existing fighters

Implement and verify distinct attack audio for Inferno, Titan, Necro and Shroud. Inspect the existing audio assets and sound event system first, then reuse suitable assets only when they accurately match the move. Where coverage is missing, source and edit appropriate sounds using the global Pixabay sound sourcing and editing workflow.

Use https://pixabay.com/sound-effects/search/ as the primary external sound-effect search source when suitable project audio does not exist. Search and listen for the actual physical event of each move. For Shroud's stabbing attacks, select convincing knife or blade thrust and penetration sounds rather than generic punches or sword slashes. Match all other attacks to their actual actions, such as Inferno's flame ignition and sustained fire, Titan's heavy body impacts and grabs, and Necro's skeletal or spectral attacks. Search and preview candidate assets individually. Check the current official Pixabay Content License and individual asset details before use. Keep a record in AUDIO_ASSET_CATALOG.md of the source URL, asset title, contributor, license checked, download date, original file, edited clip, trim range, event mapping and in-game verification.

Use available browser access to open the official asset pages and download suitable files through the site's own download controls. Use the installed audio-editing tools, such as FFmpeg or an audio editor if available, to extract the useful sound portion from a longer recording, create clean one-shot clips, trim silence, apply short fades, set balanced gain and create separate attack and impact layers where needed. Preserve the untouched source copy. Do not pretend that a website, tool, download or edit succeeded if it did not. If browsing, downloading or editing tools are unavailable, document the exact blocker and candidate URLs for the user instead of inventing assets. Never bypass website restrictions or redistribute Pixabay audio as a standalone sound pack; integrate edited audio into the game and retain its source record.

Every individual attack must have a unique, recognisable sound. This includes each individual light-combo hit, heavy attack, all five normal ability options, the ultimate, and any signature counter, summon attack, grab, throw, defensive action or status application that produces a meaningful combat event. The four normal abilities equipped for a match and the fifth alternative ability must all have complete sound coverage.

Do not use the same complete sound asset for multiple different attacks or fighters. Do not treat slight pitch changes to the same generic sample as unique attack audio. A subtle shared layer is acceptable only when the complete sound remains clearly distinguishable. Design activation, swing or travel, confirmed impact, sustained effect, block or shield contact and cancellation sounds separately where appropriate.

Shroud's five-hit basic combo must have five distinct attack sounds, each synchronised to its corresponding unique animation and hit timing. Each sound must play once for its associated attack event. Do not allow a miss, interruption, repeated hitbox overlap or recovery animation to trigger false or repeated impact sounds.

Ensure the sound event system works consistently for both player-controlled and AI-controlled fighters. Honour existing sound settings and volume controls. Prevent clipping, excessive overlap, delayed sounds, duplicate playback and audio continuing after an attack has been cancelled or its effect has ended. Preserve the distinction between fighter combat audio and Hide and Seek horror ambience.

Phase 1 acceptance criteria

All four existing fighters must have been audited and balanced.

Each of the four existing fighters must have five distinct normal abilities and one separate ultimate. Players must be able to equip exactly four of the five normal abilities before a match. Inferno's former transformation ultimate must function as a normal ability, and his new ultimate must be implemented.

Ability details must accurately display damage, buffs, debuffs, curses, status effects, shields, special mechanics, cooldowns and relevant conditions. The in-combat HUD must identify each equipped ability and its keybind.

Shroud must have a distinctive five-hit basic attack combo with five different animations and a proper finisher.

Dodging must be more responsive and attacks must provide fair counterplay.

Repeated comparable fights must be measurably longer than the original baseline without relying only on excessive health increases.

Every attack, combo hit, normal ability and ultimate across Inferno, Titan, Necro and Shroud must have its own recognisable audio. Shroud's five combo hits must each play a different sound at the correct timing. AI and player attacks must use the same correct per-move audio mappings without duplicate or lingering playback.

Statistics must be consistent.

Fire Beam must correctly interrupt.

Necro must support four skeletons without stun behaviour.

Shroud must not abuse repeated ground stabbing.

Titan's grab must work without jitter.

Damage relationships must be consistent.

Bleeding must work as specified.

The poison status framework must be ready for future extension.

General Settings and fighter specific keybindings must work correctly.

GitHub errors must have been investigated and corrected.

Relevant tests and production builds must pass.

Update FIGHTER_SYSTEM_DEVELOPMENT_GUIDE.md and FIGHTER_SYSTEM_CHANGELOG.md.

After completing both batches, stop and prepare the phase handoff.

SWITCH TO [PLANNING/REVIEW MODEL] FOR INDEPENDENT PHASE REVIEW.

8\. PHASE 2. HIDE AND SEEK NIGHTMARE

USE CLAUDE [IMPLEMENTATION MODEL] FOR IMPLEMENTATION.

Master development specification

Implement the first major new game mode in the existing Stickman Arena project.

Create a complete, playable horror themed Hide and Seek experience featuring the standard dummy training character as the player and Shroud as the hunter.

Important requirements:

1. Use the existing dummy training character as the playable character.
2. Shroud is the only hunter.
3. Disable combat fighter selection, combat abilities and fighting mechanics in this mode.
4. Reuse existing systems and assets wherever possible.
5. Focus exclusively on delivering a polished Hide and Seek experience.

A. Two storey house environment

Create a detailed, fully explorable residential house with realistic proportions and functional interiors. Use image 3 as reference as well as the office arena, but it should be a house not an office or a workplace.

Ground floor must include a living room, dining room, kitchen, small toilet, connecting corridors, front entrance and back entrance.

Upper floor must include two bedrooms, each with a private bathroom, a small storage room and an upstairs hallway.

Connect both floors with a functional staircase accessible to the player and Shroud.

Create a front yard and backyard featuring grass, trees, bushes, fences, pathways, driveway, garden furniture and a storage shed.

Include multiple functional entrances and exits connecting the house and outdoor areas.

Furnish the entire environment with detailed furniture, environmental objects, lighting, shadows and proper collision.

Living room reference

Use the supplied living room reference image as the primary visual guide for the house interior's isometric 3D presentation.

The living room should feature a sofa, armchairs, coffee table, TV console, rug, side tables, floor lamp, bookshelves, framed artwork and suitable decorative objects.

Include a clearly visible staircase rising from the living room or adjoining hallway to the upper floor.

The staircase should have believable dimensions, walkable steps, proper collision and an accessible landing.

Include useful hiding opportunities around furniture and underneath suitable structures.

The living room should connect naturally to the dining room, kitchen and connecting corridors.

Maintain a polished, stylised architectural presentation rather than photorealistic rendering.

Do not reproduce the reference image's office layout or furniture. Use only its isometric camera, geometric styling, 3D quality and presentation approach.

B. Functional hiding system

Implement interactive hiding locations.

Examples include:

1. Underneath beds and suitable furniture.
2. Inside wardrobes, cupboards, chests and cardboard boxes.
3. Behind sofas, cabinets, curtains and other furniture.
4. Under suitable covers and shower curtains.
5. Behind bushes and outdoor environmental objects.

Hiding locations must be functional gameplay objects rather than decorative props.

Allow players to enter and exit naturally.

Hiding must affect Shroud's visibility and ability to discover the player.

Use the existing camera perspective.

When hiding, reduce the player's visible viewing radius while retaining limited camera movement.

C. Dynamic room visibility and doorway peeking

Implement a dynamic room based visibility system with atmospheric lighting.

Only reveal rooms and areas that the player has entered or can directly see from their current position.

Do not reveal unexplored rooms, furniture, hiding locations or other environmental objects prematurely.

For example, when the player is downstairs, the upstairs floor must remain hidden and dark until the player climbs the stairs, unless part of it is genuinely visible from the player's current viewpoint.

Apply the same principle to rooms around corners, corridors, closed doors and other areas outside the player's actual visibility.

The visibility system must respect the house's physical layout and the player's current position.

Direct sightlines through doorways

When the player is outside a room, its interior must be visible through open doorways and other genuine direct sightlines.

The player should be able to see furniture, hiding locations and environmental objects inside a room when their current position provides a clear view.

Visibility must respect walls, closed doors, furniture and other physical obstructions.

Do not reveal the entire interior simply because a doorway is nearby.

Occupied room lighting

When the player enters a room, keep the occupied room sufficiently illuminated for navigation.

Gradually darken surrounding rooms and restrict visibility into unexplored areas.

Previously explored rooms may retain appropriate visibility where their interiors can still be seen from the player's current position.

Use smooth lighting transitions and atmospheric shadows to distinguish explored areas from unexplored areas.

Do not abruptly switch entire floors or rooms between fully visible and invisible without considering actual sightlines.

Upstairs and downstairs visibility

Implement floor aware visibility.

When the player is downstairs, the upstairs floor, rooms, furniture and hiding locations must remain hidden unless they are genuinely visible from the player's current position.

When the player approaches and climbs the staircase, progressively reveal the upstairs landing and surrounding environment according to the camera's actual field of view and physical sightlines.

Apply the same behaviour when descending from upstairs to downstairs.

Prevent the camera from revealing unexplored areas through walls, ceilings or floor structures.

Doorway peeking

Allow players to peek through doorways to inspect nearby areas before entering or leaving.

Peeking should provide a limited view of the area beyond the doorway without requiring the player to fully enter the room.

The player must be able to gather visual information naturally while maintaining the existing camera perspective.

Peeking must not reveal the player's position to Shroud, trigger detection or influence his subsequent search decisions.

The camera's peeking behaviour must remain separate from Shroud's AI perception and detection calculations.

Do not allow Shroud to detect the player simply because the player moves the camera or looks through a doorway.

Actual player body visibility, physical movement and sound should continue to determine detection according to the normal hunting mechanics.

Transition quality and technical implementation

Ensure smooth visibility and lighting transitions without sudden changes, flickering, incorrectly hidden objects or visible rendering artefacts.

Avoid revealing objects before their associated rooms become visible.

Prevent objects from disappearing unexpectedly while the player has a legitimate direct sightline into their location.

Ensure shadows, lighting, furniture and hiding locations respond correctly to visibility changes.

Inspect the existing camera, rendering, lighting, room layout and visibility systems before implementation.

Use an appropriate room visibility and field of view approach supported by the existing engine.

Do not simply implement visibility as a distance based radius.

The system must consider room boundaries, floor separation, walls, door openings, camera direction and physical obstructions.

Optimise visibility updates to avoid unnecessary rendering or performance costs.

Preserve actual gameplay geometry and collision even when unexplored rooms are visually concealed.

Acceptance criteria

1. Upstairs remains hidden while the player is downstairs unless genuinely visible.
2. Rooms progressively reveal as the player explores.
3. Open doorways provide natural interior visibility.
4. Walls and closed doors correctly block visibility.
5. Furniture and hiding locations are revealed only when legitimately visible.
6. The occupied room remains sufficiently illuminated.
7. Surrounding unexplored rooms remain atmospheric and dark.
8. Moving between floors updates visibility correctly.
9. Doorway peeking works without revealing the player's position to Shroud.
10. Camera movement does not independently trigger AI detection.
11. Visibility transitions are smooth and free from flickering.
12. Previously explored and visible areas behave consistently.

D. Player movement and stealth

Implement three primary player behaviours.

Running allows faster movement but generates louder footsteps that Shroud can detect from further away.

Crouching reduces movement speed and footsteps, making the player harder to detect.

Hiding conceals the player according to the hiding location, surrounding environment and Shroud's viewing angle.

Movement sounds must respond dynamically to the player's movement speed and state.

E. Throwable distractions

Allow players to pick up and throw small environmental objects such as bottles, cans and toys.

Objects must have appropriate throwing physics, collision and impact sounds.

Shroud should investigate the actual impact location, allowing players to redirect his attention and create opportunities to escape.

F. Hiding interaction sounds

Every hiding location must produce appropriate sounds when the player enters or exits.

Examples include:

1. Shower curtains producing soft fabric movement sounds.
2. Wardrobes producing door opening and closing sounds.
3. Cardboard boxes producing subtle rustling sounds.
4. Chests producing lid movement sounds.
5. Beds producing mattress and floor creaking sounds.
6. Cupboards producing subtle wooden door sounds.

Use positional audio so Shroud can identify the approximate location of each sound.

Different hiding locations should have different sound intensities.

Hiding must not make the player completely silent.

G. Shroud vision radius and detection

Implement a visible vision radius for Shroud so the player can understand his detection range.

The vision indicator must:

1. Follow Shroud's position and facing direction.
2. Update dynamically when he turns, walks or runs.
3. Respect walls, doors, furniture and other environmental obstacles.
4. Clearly communicate his potential visual detection area.
5. Use a subtle horror themed transparent vision cone or ground indicator rather than an arcade targeting effect.

The vision radius must accurately reflect Shroud's actual visual detection system.

Shroud must require a clear line of sight to visually detect the player.

Hiding behind furniture, inside suitable hiding locations or behind environmental objects should affect visibility according to their physical obstruction and concealment properties.

Ensure camera peeking does not affect the actual visibility calculation for Shroud.

H. Gameplay sequence and objectives

Preparation phase

Give the player exactly 20 seconds to explore the environment and find somewhere to hide.

Display a clear countdown beginning at 20 seconds.

When the countdown reaches zero, Shroud begins actively hunting.

Do not start Shroud's hunting behaviour before the preparation period finishes.

Hunting phase

Shroud actively searches for the player using visual detection, sound detection, environmental awareness and previous observations.

Survival objective

The player must survive for two minutes without being discovered.

Victory condition

If the player survives the entire two minute timer, display a dedicated Victory screen.

Defeat condition

If Shroud discovers the player, trigger a dedicated killing animation followed by the Game Over screen.

The killing animation must only trigger once, preventing repeated animations or conflicting game state transitions.

Post game options

Provide functional Restart and Return to Menu buttons.

Restart must restore the entire mode, reset the countdown, clear previous AI knowledge and return the player to the starting state.

I. Intelligent Shroud hunting AI

Develop an intelligent hunter AI that searches the environment naturally instead of randomly wandering or automatically knowing the player's position.

Shroud must be able to:

1. Enter and leave the house naturally.
2. Search individual rooms systematically.
3. Navigate between ground and upper floors.
4. Investigate bedrooms, bathrooms and storage areas.
5. Inspect underneath beds and behind furniture.
6. Search the front yard and backyard.
7. Investigate suspicious sounds and thrown objects.
8. React to previously observed player movements.
9. Chase the player when visual detection is confirmed.

Implement a search memory system so Shroud remembers previously investigated locations and avoids repeatedly checking the same hiding place without a new reason.

His decisions must be based on visual detection, sound clues, previous observations and environmental awareness.

Implement believable searching behaviour with appropriate investigation, suspicion and pursuit states.

Sound based investigation

If Shroud hears the player entering or leaving a hiding location, he should investigate the sound source.

If Shroud is inside the same room and the player exits a hiding location within his clear line of sight, he should notice the movement and potentially discover the player immediately.

If Shroud hears a sound from another room, he should investigate its approximate source rather than automatically knowing the player's exact location.

Sound detection must account for distance, walls, closed doors and environmental noise.

Do not automatically trigger player detection from every sound.

Distinguish between suspicious sounds, investigation and confirmed visual detection.

J. Shroud movement and audio

Shroud must have three movement styles.

Walking is used for normal patrols and room searches.

Running is used when chasing the player or investigating stronger clues.

Tiptoeing is used when searching quietly or approaching suspicious locations.

Provide appropriate footsteps for each movement style.

The player must be able to hear Shroud approaching even when their camera visibility is restricted.

Use positional audio so footsteps communicate Shroud's approximate direction and distance.

Ensure Shroud's movement sounds reflect his actual movement speed and surface type.

K. Horror atmosphere and sound design

Inspect both supplied horror audio candidates before integrating them. The files are supplied with this master prompt and their paths are:

First audio candidate

`/root/.claude/uploads/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/b53eb9fc-darkne-scary-horror-atmosphere-620036.mp3`

Second audio candidate

`/root/.claude/uploads/57a82b9d-fe4d-5a22-95ad-025c9a5928cc/5aabfd83-darkne-scary-horror-atmosphere-620036.mp3`

Compare both candidates for suitability as Hide and Seek background horror atmosphere. Use them only for suitable ambience or background atmosphere in Hide and Seek. They must not replace or be reused as fighter-specific attack, ability, combo or impact sounds. Preserve the supplied original files and do not rename or overwrite them.

Create an unsettling horror atmosphere using environmental audio, including floor creaking, footsteps, doors opening and closing, distant noises, furniture interaction and hiding location sounds.

Increase suspense through audio intensity and appropriate sound cues when Shroud approaches the player's hiding location.

Do not use upbeat arcade music.

Keep background audio balanced so important gameplay sounds remain clearly audible.

L. Technical requirements and acceptance testing

Ensure the entire environment has proper collision, navigation, lighting, interaction systems and functional hiding locations.

Test:

1. Player movement and exact 20 second preparation countdown.
2. Running, crouching and hiding.
3. Progressive room visibility.
4. Upstairs and downstairs visibility.
5. Direct sightlines through open doorways.
6. Visibility blocked by walls and closed doors.
7. Doorway peeking and camera behaviour.
8. Throwable distractions and sound detection.
9. Hiding entry and exit sounds.
10. Shroud vision radius and obstacle detection.
11. Shroud navigation across both floors and outdoor areas.
12. Intelligent room searches and hiding inspections.
13. Visual detection, sound investigation and pursuit.
14. Positional footsteps and horror audio.
15. Killing animation and Game Over conditions.
16. Two minute survival timer and Victory conditions.
17. Restart and Return to Menu functionality.

Fix critical gameplay, collision, navigation, visibility, lighting, animation, audio and state management issues.

Phase 2 acceptance

Deliver a complete, polished and fully playable horror Hide and Seek mode from beginning to end.

Prioritise intelligent Shroud behaviour, believable sound detection, functional hiding locations, accurate vision radius, progressive room visibility, atmospheric lighting and immersive horror audio.

Do not approve the phase until [planning/review model] has reviewed the actual implementation and verified all acceptance criteria.

At completion, update DEVELOPMENT_PROGRESS.md and PHASE_HANDOFF.md.

STOP and display:

SWITCH TO [PLANNING/REVIEW MODEL] FOR INDEPENDENT PHASE REVIEW.

9\. PHASE 3. ROMAN COLOSSEUM, COMPLETE SIXTEEN FIGHTER ROSTER AND UI REDESIGN

USE CLAUDE [IMPLEMENTATION MODEL] FOR IMPLEMENTATION.

Complete this phase in the following order.

First, create and verify the Roman Colosseum.

Second, implement Vexoris and the eleven additional fighters as one complete roster expansion, bringing the main combat roster to exactly sixteen fighters. Complete their abilities, animations, AI, registration, statistics and comparative balancing.

Third, complete the full UI redesign and tutorial system for the sixteen fighter roster.

Do not begin Parkour until the entire Phase 3 scope has passed [planning/review model] review.

PART A. ROMAN COLOSSEUM ARENA

Create the Roman Colosseum as the only new combat arena for this development cycle.

Do not create the Ruins Forest or any other new combat arena.

The ancient ruins environment is reserved for Parkour and must not be registered as a combat arena.

Environment design

Create a premium Roman style tournament arena.

Include:

1. Large white stone pillars.
2. Ancient Roman architecture.
3. Detailed arena walls.
4. Textured uneven sandy terrain.
5. Natural variations in ground elevation.
6. Appropriate arena lighting and environmental details.

The arena must match the existing Stickman Arena visual identity.

Ensure proper collision, movement, jumping and combat interactions.

Free Zone

Rename the existing Colosseum practice option to Free Zone.

Free Zone must use the new Roman Colosseum map.

Keep Colosseum as the official arena name for Tournament.

Test the arena at different camera positions and character elevations.

Do not introduce another combat arena during this phase.

PART B1. Vexoris, THE FIFTH FIGHTER

Create a completely original fifth fighter named Vexoris.

Vexoris must have a distinctive poisonous military soldier identity.

His entire combat design must revolve around chemical poison, accumulating toxicity and progressively slowing opponents.

His poison effects are the main attraction of this fighter.

B1. Character design

Use a World War II era inspired soldier aesthetic.

Create a distinctive stickman wearing:

1. A dark olive or military green soldier jacket.
2. A recognisable gas mask covering the face.
3. Two distinctive circular mask lenses.
4. A visible breathing filter and connected breathing tubes.
5. Military equipment straps and utility pouches.
6. Worn gloves and military boots where appropriate.
7. Glowing poisonous green details integrated into the equipment.
8. A signature glass poison jar.

The gas mask should be the most recognisable feature of Vexoris.

His jacket should look worn and militaristic while retaining existing Stickman Arena character proportions.

The poison jar should be visually distinctive, containing glowing toxic green liquid.

Vexoris should have his own unique silhouette, stance, idle animation and personality.

For the fighter selection screen, give him a threatening stance with one hand holding the poison jar and the other hand preparing to attack.

His animations should convey a calculating, dangerous chemical warfare soldier.

Maintain the existing game's stylised appearance and rendering quality.

Do not use actual historical military insignia or turn him into a generic realistic human soldier.

B2. Combat identity and balancing philosophy

Vexoris's primary strength must be poison.

His normal direct attacks should deliberately deal less damage than comparable fighters.

Do not compensate for weaker physical attacks by giving him excessive HP, defence or speed.

His effectiveness comes from repeatedly applying poison and building toxicity throughout the fight.

His combat should reward players who successfully complete combos, land abilities and maintain pressure.

The opponent should gradually become more vulnerable to poison rather than being defeated immediately by powerful individual attacks.

Ensure he remains competitive without making poison unavoidable or excessively powerful.

B3. Four hit light attack combo

Create a unique four hit light attack combo for Vexoris.

1. Vexoris has four consecutive light attacks.
2. Each attack has its own distinct animation.
3. The attacks flow naturally into one another.
4. The fourth hit is a signature poison splash attack.
5. If the complete four hit combo successfully connects, the fourth hit splashes poison onto the opponent.
6. The poison splash adds one additional toxicity stack.
7. Each successful hit must have its own valid hit registration.
8. Missing an attack or being interrupted must not trigger the final poison splash.
9. The combo must have appropriate recovery and input timing.
10. Prevent repeated hit registration and infinite combo exploits.

The fourth hit should visibly splash toxic liquid using the signature poison jar or an appropriate integrated poison effect.

The final hit should feel visually satisfying without dealing excessive direct damage.

The reward for completing the combo should primarily be increased poison accumulation.

B4. Poison accumulation system

Create a configurable Poison Toxicity system specifically designed for Vexoris.

Successful attacks increase the opponent's poison accumulation.

The poison mechanic must have two distinct components.

First, Poison Damage Over Time.

Second, Progressive Movement Slow.

Poison accumulation

Use the following starting configuration.

\| Attack | Poison increase |

\| First light hit | 0 stack |

\| Second light hit | 0 stack |

\| Third light hit | 0 stack |

\| Fourth light hit | 0 stack |

\| Completed combo poison splash | Additional 1 stack |

\| Other successful abilities | 1 stack per application |

\| Powerful ultimate application | Up to 2 stacks per target |

A completed four hit combo can apply five total stacks through the four successful hits and its additional final poison splash.

These values must be configurable.

Each attack may only apply its intended poison increase once per target per attack event.

Do not increase poison repeatedly while an opponent remains inside a hitbox or lingering cloud.

Progressive movement slow

Use the following starting balance.

\| Toxicity stacks | Movement speed reduction |

\| 1 | 2% |

\| 5 | 4% |

\| 15 | 6% |

\| 20 | 8% |

\| 25 | 10% |

Maximum movement reduction is 10%.

Poison slow must not stack beyond this limit.

Do not directly reduce attack speed, ability cooldowns, dodge recovery or input responsiveness.

Movement should remain responsive even at maximum toxicity.

Do not apply stun or forced knockdown through poison.

Poison damage over time

When poison is first successfully applied, start the poison damage sequence.

1. Initial poison damage is 1 HP per tick.
2. Poison damage occurs every 3 seconds.
3. Damage increases by 1 HP after each interval.
4. Maximum poison tick damage is 4 HP.
5. Once the maximum is reached, damage remains at 4 HP per tick.
6. Poison remains active until the affected opponent is defeated or the combat session ends.

Example progression.

First tick. 1 HP.

Second tick. 2 HP.

Third tick. 3 HP.

Fourth and subsequent ticks. 4 HP.

Poison applications must not create independent timers.

Reapplying poison must not reset existing poison progression.

Manage toxicity stacks and poison damage progression consistently through the status effect system.

Keep values configurable so future balance adjustments do not require rewriting the combat system.

B5. Poison applications through other abilities

Vexoris's other abilities must contribute to poison accumulation.

Do not make poison dependent entirely on the four hit combo.

Every successful ability should have an appropriate poison application value.

Each ability must have a different purpose.

Avoid excessive poison application from large area attacks.

Use the existing poison accumulation limits.

B6. Unique abilities

Create original poison themed abilities that complement his military gas mask design.

Venom Spray

Vexoris uses a pressurised toxic sprayer connected to his equipment to release a short ranged poison attack.

It deals modest direct damage and applies one toxicity stack to targets successfully hit.

The attack should have a distinctive spray animation and green toxic particles.

Toxic Jar

Vexoris throws his signature poison jar towards the opponent.

When it hits the ground or an opponent, it shatters and releases a poisonous cloud.

Opponents exposed to the cloud receive one poison application.

Each target can only receive one application from the same cloud event.

The cloud must have clearly defined range, duration and damage.

Do not apply additional poison every frame.

Chemical Trap

Vexoris releases a pressurised chemical canister that produces a temporary toxic hazard area.

Opponents entering the area become poisoned.

The ability should create area denial without completely preventing movement.

Do not introduce an unavoidable stun or permanent trapping effect.

Vapor Step

Vexoris releases a short toxic smoke burst and rapidly repositions.

Use the gas cloud as a visual distraction.

The movement should be an evasive repositioning ability rather than an invulnerability exploit.

Nearby opponents may receive a limited poison application.

**Ability 5. Create an additional signature poison ability.**

Design a fifth normal ability after inspecting Vexoris's complete kit and the existing poison framework. It must add a distinct tactical option that complements Venom Spray, Toxic Jar, Chemical Trap and Vapor Step without duplicating them or bypassing the established poison limits. It may introduce a carefully balanced buff, counter, defensive tool or specialised poison interaction. Fully define its damage, poison application, duration, cooldown, range, counterplay, animation and visual effects. It must not heal Vexoris.

Plague Bloom Ultimate

Vexoris releases a large amount of concentrated poison from his equipment.

The attack spreads a large toxic cloud across a defined area.

It should create a visually impressive chemical explosion, spreading green fumes and toxic particles.

Opponents caught inside receive poison buildup and progressive slow.

The ability should have meaningful counterplay, including a windup and appropriate recovery.

Its strength must come from widespread poison accumulation rather than excessive initial burst damage.

B7. Poison balance and counterplay

Implement:

1. Maximum five toxicity stacks.
2. Maximum 10% movement slow.
3. Maximum four HP poison damage per tick.
4. No duplicate poison timers.
5. No repeated damage registration from continuous hitboxes.
6. No stun or forced recovery interruption from poison.
7. No additional poison application from the same attack event.
8. Proper cleanup when a fighter is defeated or a match ends.

Allow opponents to continue attacking, dodging and using abilities while poisoned.

Poison should create sustained pressure without removing meaningful counterplay.

B8. Animation and visual effects

Create unique animations for idle, walking, running, jumping, climbing, all four light attack combo hits, fourth hit poison splash, heavy attack, blocking, dodging, Venom Spray, Toxic Jar, Chemical Trap, Vapor Step, Plague Bloom Ultimate, hit reactions and death.

Create appropriate poison effects, liquid splashes, gas clouds, particle trails, toxic particles and sound effects.

Visual effects must remain separate from actual gameplay damage calculations and hit detection.

B9. AI and roster integration

Create intelligent Vexoris AI.

The AI should understand poison accumulation and use its abilities strategically.

It should recognise when an opponent has low toxicity and use attacks to build accumulation.

It should avoid unnecessarily wasting powerful abilities against opponents already at maximum toxicity.

Register Vexoris throughout Fighter Selection, Practice, Tutorials, Tournament, Free Zone and Admin Panel. Apply the same integration requirements to all eleven additional fighters.

Ensure all existing fighters, skeleton fighters and special variants remain available.

Vexoris acceptance criteria

Vexoris must feel like a poison specialist.

His individual physical attacks should be relatively weak.

His main strength should come from successfully building poison through attacks and abilities.

His four hit combo must be satisfying and reward successful completion.

His poison must gradually become threatening without becoming an unavoidable defeat mechanic.

Verify appearance, animations, abilities, poison calculations, balancing and AI behaviour.

PART B2. ELEVEN ADDITIONAL ORIGINAL FIGHTERS

After stabilising the original four fighters and completing Vexoris, expand the roster with the following eleven original fighters.

The original roster contains Inferno, Necro, Shroud and Titan. Vexoris is the fifth fighter. Add the eleven fighters below to create a total roster of exactly SIXTEEN playable combat fighters.

Do not count skeleton variants, summoned entities, training dummies or cosmetic variants as additional main roster fighters. Preserve existing special variants and Admin Panel access.

These eleven fighters must be implemented as part of the same full roster expansion as Vexoris. Do not postpone them until after Parkour. The complete sixteen fighter roster, including Vexoris and all eleven additional fighters, must be implemented, integrated, balanced and reviewed before Phase 4 Parkour begins.

The following design specifications are mandatory starting points. Inspect the existing project and adapt implementation details to its actual architecture without changing the defining character identity or intended mechanics.

## 3. FIGHTER ROSTER

Create the following eleven fighters.

1. AERION, aerial warrior and wind manipulator.
2. ARCSTRIKE, electric speed fighter.
3. FROSTWELD, crystal manipulator.
4. RESON, sonic and vibration specialist.
5. GEARGRIND, mechanical engineer and gadget fighter.
6. PSION, telekinetic specialist.
7. SOLSTICE, radiant spear warrior.
8. TIDEBREAKER, water manipulator and trident warrior.
9. QUAKOR, earth and seismic bruiser.
10. KENSHIRO, samurai sword duelist.
11. CHRONOS, temporal manipulation specialist.

All eleven must have five unique normal abilities and one unique ultimate ability. Players may equip only four of the five normal abilities for each match. The ultimate is a separate sixth ability and does not use a normal ability slot.

The individual fighter descriptions below currently specify four named normal abilities and one ultimate. Preserve those four named abilities as the foundation of each fighter's kit, then design one additional fifth normal ability for each fighter. The fifth ability must be fully specified, implemented, animated, balanced and integrated. It must add a meaningful tactical option rather than duplicate one of the other four abilities.

Each fighter must also have a unique passive mechanic, four-hit light attack combo, heavy attack, defensive mechanics, movement animations and complete combat animation set. Shroud's separate five-hit combo requirement remains specific to Shroud.

The abilities must reflect the character's individual identity and must not feel interchangeable. Ensure that the five normal abilities allow different combinations of offensive, defensive, mobility, buff, debuff, shield, counter, crowd-control and utility approaches where appropriate.

# 4. INDIVIDUAL FIGHTER DESIGNS AND ABILITIES

## FIGHTER 1. AERION

<escape>Role</escape> Aerial combat specialist.

### Character appearance

Create an elegant silver and white winged stickman warrior.

Use a pale blue and silver energy palette with layered feather structures, streamlined armour and large, distinctive wings.

His silhouette should be recognisable even from a distance.

His wings must be properly integrated into his body and movement animations.

Avoid making him look like a generic angel or simply giving him decorative wings.

### Five normal abilities

**Ability 1. Sky Dive**

Aerion launches into the air before diving rapidly towards the selected target.

On impact, release a concentrated wind burst that damages and pushes nearby opponents.

**Ability 2. Wind Blade**

Aerion creates multiple compressed air blades and launches them towards opponents.

Each blade should have its own visible projectile trail and impact effect.

**Ability 3. Cyclone Lift**

Aerion creates a miniature tornado that lifts an opponent before throwing them away.

Keep the crowd control duration limited and provide reasonable counterplay.

**Ability 4. Tailwind**

Aerion surrounds himself with concentrated wind energy.

Temporarily increases movement speed, aerial mobility and turning responsiveness.

His wings spread as the wind gathers around his body.

This is a mobility buff rather than a direct damage ability.

### Ultimate. Celestial Tempest

Aerion rises into the air and summons a powerful aerial storm.

Multiple wind blades travel across the battlefield before Aerion performs a powerful final dive.

The ultimate must feature a distinctive aerial animation and a large wind impact.

### Light attack combo

Create a unique four hit combo.

1. Wing assisted palm strike.
2. Spinning kick.
3. Horizontal wing slash.
4. Upward launching strike.

### Heavy attack

Aerion spreads both wings before delivering a powerful downward wing smash.

Create a visible wind shockwave on impact.

### Passive. Aerial Momentum

Consecutive successful attacks build aerial momentum.

This temporarily improves Aerion's aerial movement and repositioning.

### Unique animations

Create original flying, hovering, gliding, wing folding, wing spreading, aerial turning, diving, dodging, landing and recovery animations.

Aerion must visibly move like an aerial fighter even when he is not using abilities.

## FIGHTER 2. ARCSTRIKE

<escape>Role</escape> Electric speed fighter.

### Character appearance

Create a dark navy and black stickman with bright electric blue armour details.

Include lightning patterns, electrical conductors and distinctive forearm gauntlets.

His body should have a forward leaning athletic silhouette that communicates speed.

Avoid making him resemble a generic robot.

### Five normal abilities

**Ability 1. Thunder Dash**

Arcstrike charges electricity through his body before performing a very fast forward dash.

Opponents caught in the path receive electrical damage.

**Ability 2. Volt Punch**

Arcstrike concentrates electricity into one fist before delivering a powerful charged punch.

The impact creates a concentrated electrical burst.

**Ability 3. Chain Lightning**

Arcstrike launches an electrical projectile that can jump between nearby opponents.

Damage should decrease with each additional target.

**Ability 4. Voltage Surge**

Arcstrike channels electricity throughout his body.

Temporarily increases movement speed and attack speed.

Electricity travels across his armour and gauntlets during the buff.

Ensure that increased speed does not break combo timing, animation synchronisation or hit detection.

### Ultimate. Stormbreaker

Arcstrike summons a massive lightning strike onto the battlefield.

Additional lightning bolts spread around the impact area.

The final attack should create a powerful electrical explosion.

### Light attack combo

1. Fast electrical jab.
2. Charged cross punch.
3. Electrified body hook.
4. Spinning electric uppercut.

### Heavy attack

Arcstrike charges electricity into his fist before delivering a powerful straight punch.

### Passive. Electrical Charge

Successful attacks build electrical charge.

At defined thresholds, the next eligible ability receives a controlled enhancement.

### Unique animations

Create individual electrical charging, sprinting, rapid direction changes, electric punches, dodging, hit reactions and victory animations.

His movement should feel significantly faster and more aggressive than other fighters.

## FIGHTER 3. FROSTWELD

<escape>Role</escape> Crystal manipulation specialist.

IMPORTANT. Frostweld is a CRYSTAL fighter, not an ice fighter.

### Character appearance

Create a dark stickman with large translucent crystalline formations growing from his shoulders, forearms, chest and back.

Use a combination of violet, turquoise, cyan and reflective crystal materials.

Give him a distinctive crystal crown or helmet and one particularly large crystalline arm.

The crystals should have sharp geometric structures, reflective surfaces and visible internal energy.

Do not use snowflakes, frozen breath, ice effects or conventional ice magic.

His identity must be based entirely on crystal formation and manipulation.

### Five normal abilities

**Ability 1. Crystal Shards**

Frostweld forms several sharp crystal projectiles and launches them towards opponents.

**Ability 2. Geode Shield**

Frostweld creates a large crystalline defensive barrier around his body.

The shield absorbs a limited amount of incoming damage.

Visible cracks develop as the shield takes damage before eventually shattering.

The shield must have independent durability and a defined duration.

**Ability 3. Prism Cage**

Frostweld summons crystalline pillars around an opponent.

The opponent is temporarily restricted until the cage expires or is destroyed.

Ensure reasonable counterplay and prevent permanent trapping.

**Ability 4. Crystal Spike**

Frostweld strikes the ground, causing a sharp crystal formation to erupt beneath the selected target area.

### Ultimate. Crystal Cataclysm

Frostweld causes massive crystalline formations to erupt across the battlefield.

A central crystal forms before violently shattering into multiple fragments.

Create an impressive crystal formation and destruction sequence.

### Light attack combo

1. Crystal reinforced jab.
2. Forearm crystal slash.
3. Spinning crystal elbow.
4. Double arm crystal smash.

### Heavy attack

Frostweld forms a large crystal blade around one arm before delivering a powerful downward slash.

### Passive. Crystal Growth

Successful attacks accumulate crystal energy.

At specific thresholds, crystal energy can enhance an eligible crystal ability.

### Unique animations

Create original crystal growth, formation, shattering, shield construction, projectile launching, heavy crystal attacks, movement and recovery animations.

Crystals must visibly form and disappear rather than simply appearing without animation.

## FIGHTER 4. RESON

<escape>Role</escape> Sonic and vibration specialist.

### Character appearance

Create a dark charcoal stickman with glowing cyan soundwave patterns.

Include circular resonance devices on both forearms and distinctive geometric sound amplification equipment.

His design should communicate vibration, frequency and sound manipulation.

Do not make him look like Geargrind or a generic robot.

### Five normal abilities

**Ability 1. Sonic Boom**

Reson releases a powerful forward facing sonic shockwave.

The wave travels through the battlefield and damages opponents in its path.

**Ability 2. Vibration Punch**

Reson concentrates high frequency vibrations into one fist.

The resulting punch produces a powerful close range impact.

**Ability 3. Resonance Barrier**

Reson generates a circular sonic barrier around his body.

The barrier absorbs a limited amount of incoming damage.

Whenever an attack strikes it, visible soundwave distortions spread across its surface.

The barrier breaks apart through a distinctive sonic shattering effect when its durability is exhausted.

**Ability 4. Resonance Dash**

Reson compresses sound energy around himself and performs a rapid forward dash.

The dash creates a visible distortion trail.

### Ultimate. Shatterwave

Reson generates an expanding circular sonic explosion.

The shockwave damages and pushes opponents away.

Use multiple expanding soundwave rings and a distinctive final impact.

### Light attack combo

1. Sonic jab.
2. Resonance cross punch.
3. Vibrating elbow.
4. Double palm shockwave.

### Heavy attack

Reson concentrates sound energy into both gauntlets before releasing a powerful short range sonic blast.

### Passive. Resonance

Successful attacks accumulate resonance energy.

At defined thresholds, the next eligible sonic ability receives a controlled enhancement.

### Unique animations

Create individual sound charging, vibration effects, sonic shockwaves, rhythmic punching, sonic dashes, recoil and recovery animations.

## FIGHTER 5. GEARGRIND

<escape>Role</escape> Mechanical engineer and gadget fighter.

### Character appearance

Create a dark steel and orange mechanical stickman.

Include mechanical joints, visible cables, bolts, hydraulic components and an asymmetrical robotic arm.

Give him a compact mechanical backpack containing deployable equipment.

His design should resemble an inventive combat engineer rather than a generic robot.

### Five normal abilities

**Ability 1. Rocket Fist**

Geargrind launches his mechanical fist forward using a rocket powered mechanism.

The fist extends before returning to its original position.

**Ability 2. Combat Drone**

Geargrind deploys a small mechanical drone that follows him and fires controlled projectiles at nearby opponents.

The drone must have limited durability and a defined duration.

**Ability 3. Magnetic Mine**

Geargrind deploys a magnetic mine.

The mine attracts nearby eligible metallic objects and damages opponents entering its detection radius.

**Ability 4. Reinforced Plating**

Geargrind activates his mechanical backpack.

Additional armour plates extend across his shoulders, chest and arms.

Temporarily reduces incoming damage.

Show the mechanical components physically extending and locking into position.

### Ultimate. Overdrive Protocol

Geargrind activates his complete mechanical system.

Additional mechanical components extend from his body, his robotic arm becomes reinforced and he performs a sequence of powerful mechanical attacks.

Finish with a powerful hydraulic explosion.

### Light attack combo

1. Mechanical jab.
2. Reinforced cross punch.
3. Rotating mechanical elbow.
4. Hydraulic uppercut.

### Heavy attack

Geargrind compresses his hydraulic fist before delivering a powerful mechanical smash.

### Passive. Mechanical Efficiency

Successful attacks build mechanical charge.

At defined thresholds, eligible gadgets receive a controlled enhancement.

### Unique animations

Create mechanical startup, hydraulic compression, arm extension, drone deployment, gadget activation, mechanical retraction and shutdown animations.

## FIGHTER 6. PSION

<escape>Role</escape> Telekinetic specialist.

### Character appearance

Create a slim dark purple stickman with glowing violet eyes.

Include floating geometric energy fragments around his body and subtle psychic energy around his hands.

Add a distinctive circular floating structure behind his upper body.

He should look like a powerful psychic warrior.

Do not make him resemble Necro or an undead character.

### Five normal abilities

**Ability 1. Mind Crush**

Psion creates an invisible telekinetic force around an opponent.

The force compresses inward before releasing a psychic impact.

**Ability 2. Telekinetic Throw**

Psion lifts an opponent or eligible environmental object and throws it in a selected direction.

**Ability 3. Psychic Barrier**

Psion generates a telekinetic shield around his body.

The shield absorbs a limited amount of incoming damage.

When struck, visible psychic distortions spread across its surface.

The barrier eventually breaks into floating energy fragments.

**Ability 4. Floating Prison**

Psion briefly lifts an opponent into the air using telekinetic force before releasing them.

Provide counterplay and prevent stun locking.

### Ultimate. Mindstorm

Psion generates a powerful psychic field.

Nearby environmental objects float into the air before being launched towards opponents.

Finish with a large telekinetic explosion.

### Light attack combo

1. Psychic palm strike.
2. Telekinetic elbow.
3. Floating spin kick.
4. Double palm energy blast.

### Heavy attack

Psion concentrates telekinetic energy into his hands before releasing a powerful force wave.

### Passive. Mental Focus

Successful attacks build mental focus.

At defined thresholds, eligible abilities receive improvements to their range or effectiveness.

### Unique animations

Create floating idle movement, levitation, hand gestures, psychic charging, object lifting, environmental object throwing, recoil and landing animations.

## FIGHTER 7. SOLSTICE

<escape>Role</escape> Radiant spear warrior.

### Character appearance

Create an elegant gold and white stickman warrior.

Use ivory and gold armour with angular plates and a distinctive helmet.

Give him a radiant spear that acts as his primary weapon.

His silhouette should communicate precision, discipline and nobility.

### Five normal abilities

**Ability 1. Solar Spear**

Solstice throws a radiant spear towards an opponent.

The spear travels in a straight line with a bright golden trail.

**Ability 2. Radiant Burst**

Solstice strikes the ground with his spear.

A circular burst of radiant energy spreads around the impact point.

**Ability 3. Radiant Aegis**

Solstice raises his spear and surrounds himself with a golden protective barrier.

The barrier absorbs a limited amount of incoming damage.

When struck, it produces a bright golden defensive flash.

**Ability 4. Sunpiercer**

Solstice performs a forward spear charge.

The attack deals damage to opponents caught along its path.

### Ultimate. Celestial Judgement

Solstice summons a large column of golden light onto the selected battlefield area.

The light intensifies before producing a powerful radiant explosion.

### Light attack combo

1. Forward spear thrust.
2. Horizontal spear sweep.
3. Spinning spear shaft strike.
4. Powerful forward spear thrust.

### Heavy attack

Solstice raises his spear before delivering a deliberate overhead strike.

### Passive. Radiant Discipline

Successful attacks build radiant energy.

At defined thresholds, the next eligible ability receives a controlled enhancement.

### Unique animations

Create spear handling, rotations, thrusting, sweeping, charging, light gathering, radiant protection and recovery animations.

## FIGHTER 8. TIDEBREAKER

<escape>Role</escape> Water manipulation and trident specialist.

### Character appearance

Create a dark ocean blue stickman with turquoise flowing energy.

Give him a distinctive trident and flowing armour.

Use navy, teal and silver materials with an ancient underwater warrior aesthetic.

Avoid making him look like Frostweld.

### Five normal abilities

**Ability 1. Aqua Spear**

Tidebreaker launches a concentrated water projectile towards opponents.

**Ability 2. Tidal Wave**

Tidebreaker creates a travelling wave of water along the ground.

The wave damages and pushes opponents in its path.

**Ability 3. Water Prison**

Tidebreaker traps an opponent inside a rotating sphere of water.

The sphere briefly restricts movement before bursting.

Provide reasonable counterplay.

**Ability 4. Tidal Guard**

Tidebreaker creates a rotating layer of concentrated water around his body.

The water acts as a temporary protective barrier that absorbs incoming damage.

When an attack strikes the barrier, the water visibly ripples and disperses before reforming.

The shield has limited durability and a defined duration.

### Ultimate. Leviathan's Wrath

Tidebreaker summons a massive water serpent or leviathan.

The creature travels across the battlefield before crashing into the selected target area.

Make the creature visually impressive and distinctive.

### Light attack combo

1. Trident thrust.
2. Horizontal trident sweep.
3. Spinning trident shaft strike.
4. Upward trident slash.

### Heavy attack

Tidebreaker raises his trident before delivering a powerful downward strike accompanied by a water explosion.

### Passive. Flow State

Consecutive successful attacks build water momentum.

At defined thresholds, eligible abilities receive a controlled enhancement.

### Unique animations

Create flowing movement, trident handling, water charging, wave creation, water transformation, aquatic dodging and recovery animations.

## FIGHTER 9. QUAKOR

<escape>Role</escape> Earth and seismic bruiser.

### Character appearance

Create a broad and powerful stone stickman.

Use dark rocky armour with glowing orange cracks.

Give him oversized stone fists, irregular shoulder formations and heavy forearm structures.

Use brown, charcoal, bronze and orange materials.

His identity should communicate immense physical strength and earth manipulation.

Do not make him a copy of Titan.

### Five normal abilities

**Ability 1. Earth Splitter**

Quakor strikes the ground and creates a travelling crack that damages opponents along its path.

**Ability 2. Stone Wall**

Quakor summons a large stone wall from the ground.

The wall has limited durability and can block attacks until destroyed or expired.

**Ability 3. Boulder Crash**

Quakor tears a large boulder from the ground and throws it towards opponents.

**Ability 4. Stoneguard**

Quakor draws additional stone formations across his shoulders, chest and arms.

Temporarily increases damage resistance and reduces knockback.

His body visibly becomes heavier and more reinforced.

The stone formations gradually crack and disappear when the buff expires.

### Ultimate. Continental Rupture

Quakor creates a massive battlefield rupture.

Large stone pillars erupt from the ground before collapsing around opponents.

Finish with a powerful seismic impact.

### Light attack combo

1. Heavy body punch.
2. Stone reinforced hook.
3. Shoulder strike.
4. Double fist smash.

### Heavy attack

Quakor raises both stone fists before delivering a massive ground crushing attack.

### Passive. Stone Resilience

Successful blocks build a limited amount of defensive charge.

At defined thresholds, Quakor can enhance an eligible defensive or seismic ability.

### Unique animations

Create heavy footsteps, rocky body movement, stone growth, ground punching, boulder lifting, ground cracking, heavy landing and stone shattering animations.

## FIGHTER 10. KENSHIRO

<escape>Role</escape> Samurai sword duelist and counterattacker.

### Character appearance

Create a disciplined samurai stickman.

Use dark red and black samurai armour with a distinctive helmet or head covering.

Give him two swords and a lean, balanced silhouette.

Include a traditional waist cloth and distinctive sword details.

His identity should communicate precision, discipline and lethal swordsmanship.

### Five normal abilities

**Ability 1. Twin Fang**

Kenshiro performs two fast sword strikes.

The attacks must have distinct animations and hit registration.

**Ability 2. Perfect Parry**

Kenshiro enters a defensive stance.

If an incoming attack connects during the active parry window, he deflects it and performs an automatic counterattack.

The timing window must be limited and should reward skill.

**Ability 3. Blade Tempest**

Kenshiro performs a rapid sequence of sword cuts while moving forward.

The attack should have multiple distinct animations.

**Ability 4. Focus Stance**

Kenshiro enters a disciplined swordmaster stance and concentrates his energy.

Temporarily increases the effectiveness of his sword attacks and improves his ability to respond to incoming attacks.

Use a subtle red energy effect surrounding his blades.

This must reward careful timing rather than providing unlimited damage or automatic critical hits.

### Ultimate. Final Judgement

Kenshiro performs a rapid sequence of precise sword strikes.

He returns to his original position before the accumulated damage is applied through a distinctive finishing sequence.

Make the ultimate visually different from ordinary multi hit attacks.

### Light attack combo

1. Horizontal katana slash.
2. Reverse diagonal slash.
3. Dual blade strike.
4. Powerful finishing cut.

### Heavy attack

Kenshiro performs a deliberate overhead katana slash.

### Passive. Sword Mastery

Successful attacks and correctly timed parries build sword mastery.

At defined thresholds, the next eligible sword ability receives a controlled enhancement.

### Unique animations

Create sword drawing, sheathing, idle stance, footwork, sword cuts, parries, counters, dodge steps, recovery and victory animations.

## FIGHTER 11. CHRONOS

<escape>Role</escape> Time manipulation specialist.

### Character appearance

Create a dark silver stickman with bronze details and cyan temporal energy.

Include circular clock inspired structures and a distinctive temporal device on one arm.

Use subtle floating fragments and temporal afterimages.

His design should communicate time manipulation rather than mechanical engineering.

Do not make him look like Geargrind.

### Five normal abilities

**Ability 1. Temporal Acceleration**

Chronos activates his temporal device and briefly accelerates his personal movement through time.

Temporarily improves movement speed, dodge recovery and repositioning.

A series of temporal afterimages follow his movements.

This must not provide unlimited invulnerability or bypass attack cooldowns.

**Ability 2. Echo Strike**

Chronos performs a strike that creates a delayed temporal copy of the attack.

The delayed strike must have separate and correctly managed hit registration.

**Ability 3. Temporal Collapse**

Chronos creates a small temporal distortion field.

Opponents inside the field experience reduced movement speed for a limited duration.

Do not slow the player's input responsiveness.

**Ability 4. Rewind Step**

Chronos records his recent position.

Within a limited time window, he can return to that recorded position.

This ability must not restore health, reverse damage or reset cooldowns.

### Ultimate. End of Time

Chronos creates a large temporal distortion field.

He performs a rapid sequence of attacks while temporal afterimages follow his movements.

Finish with a powerful temporal shockwave that restores normal time.

### Light attack combo

1. Forward jab.
2. Reverse palm strike.
3. Spinning kick.
4. Delayed temporal impact with an echo.

### Heavy attack

Chronos charges temporal energy into one fist before delivering a powerful strike.

### Passive. Temporal Momentum

Successful attacks build temporal energy.

At defined thresholds, eligible abilities receive a controlled enhancement to their duration or effectiveness.

### Unique animations

Create temporal charging, afterimages, displacement, rewind, distortion, delayed strikes, movement and recovery animations.

# 5. UNIVERSAL COMBAT ANIMATION REQUIREMENTS

Every fighter must have a complete and distinctive animation set.

Do not reuse the same generic animation for every fighter unless it is a necessary shared foundation.

Each fighter must have appropriate animations for the following actions.

1. Idle.
2. Walking.
3. Running.
4. Sprinting.
5. Forward movement.
6. Backward movement.
7. Sideways movement.
8. Jumping.
9. Falling.
10. Landing.
11. Turning.
12. Direction changes.
13. Dodging.
14. Blocking.
15. Staggering.
16. Recovery.
17. Victory.
18. Defeat.
19. Light attack combo.
20. Heavy attack.
21. Ability activation.
22. Ability impact.
23. Ultimate activation.
24. Ultimate finishing sequence.

For fighters using a four-hit light attack combo, each of the four attacks must have its own animation, timing, hitbox positioning and recovery. Shroud is the specific exception and must use the separately specified five-hit combo with five different animations. Do not make Shroud's fifth hit reuse any of the first four animations.

The heavy attack must have a recognisable preparation, execution, impact and recovery sequence.

Each ability must include appropriate preparation, activation, main action, impact, visual effects, opponent reactions and recovery.

Ultimates must have their own signature animations.

Do not make every ultimate a generic explosion.

## Movement and combat responsiveness

Ensure that animations blend correctly with movement.

Prevent characters from sliding, floating unnaturally, teleporting unintentionally or losing their orientation during attacks.

Ensure that attacks connect with the correct opponent and that hitboxes follow the intended attack animations.

Avoid animation locking that prevents players from responding after an ability has finished.

Ensure that all fighters can transition naturally between movement, attacks, abilities, dodges and recovery.

# 6. BUFFS, SHIELDS AND DEFENSIVE MECHANICS

The eleven fighters must have a healthy mixture of offensive abilities, defensive abilities, temporary buffs and battlefield control.

Do not make all five normal abilities direct damage attacks.

The following defensive mechanics must be implemented using the existing combat architecture where possible.

### Temporary buffs

Buffs may improve movement speed, attack speed, damage resistance, ability effectiveness, aerial mobility or other appropriate statistics.

Every buff must have a defined duration and cooldown.

Each buff requires a visible activation animation, visual indicator and expiration effect.

Do not allow buffs to stack infinitely.

Ensure that attack speed improvements do not break animation timing or create unintended additional hits.

### Shields

Shields must function separately from the fighter's actual health.

Each shield must have independent durability and an expiration time.

Incoming damage must reduce shield durability before affecting health according to the shield's defined protection rules.

Show appropriate visual damage feedback such as cracks, distortions, ripples, fragments or fading energy.

When a shield expires or reaches zero durability, it must disappear correctly.

Do not allow unlimited shield stacking or permanent protection.

A shield must never restore health, reset damage or revive a defeated fighter.

### Defensive variety

Use different defensive mechanics rather than giving every fighter the same shield.

Crystal barriers, sonic barriers, psychic barriers, radiant shields, water protection and mechanical armour must each have their own visual identity and behaviour.

Damage reduction, blocking, parrying, dodging, armour reinforcement and repositioning should also be considered when designing future fighters.

# 7. STRICT HEALING RESTRICTION

IMPORTANT. NONE OF THE TWELVE NEWLY INTRODUCED FIGHTERS, INCLUDING Vexoris AND THE ELEVEN ADDITIONAL FIGHTERS, IS A DEDICATED HEALER.

Therefore, none of these twelve new fighters may restore their own health through abilities, passive effects, ultimates or combat mechanics.

Do not implement the following.

1. Self healing abilities.
2. Health regeneration over time.
3. Lifesteal from successful attacks.
4. Health restoration when dealing damage.
5. Health restoration when blocking or dodging.
6. Damage converted into health.
7. Passive health recovery through buffs.
8. Shields that convert absorbed damage into health.
9. Ultimate abilities that restore the fighter's health.
10. Hidden health recovery effects.

A shield is defensive protection, not healing.

A defensive buff may reduce incoming damage but must never restore lost health.

Only a future fighter that is explicitly designed and classified as a dedicated healing specialist may have healing abilities. None of the twelve fighters in this expansion is a healing specialist.

Even a dedicated healer must have appropriate healing limitations, cooldowns and balancing rules.

Do not make ordinary fighters heal simply to make them more durable.

Use shields, armour, blocking, dodging, movement buffs, counterattacks and damage reduction instead.

# 8. COMPLETE FIGHTER STATISTICS AND BALANCING SYSTEM

IMPORTANT. The abilities and base statistics of every fighter must be balanced together.

Do not assign arbitrary statistics without examining the actual existing game.

Before creating the eleven new fighters, inspect the complete statistics and combat configurations of Inferno, Necro, Shroud, Titan and Vexoris where implemented.

Understand how the existing game calculates and applies:

1. Health.
2. Speed.
3. Power.
4. Stamina.
5. Defence.
6. Avoid.
7. Attack damage.
8. Ability damage.
9. Cooldowns.
10. Attack speed.
11. Movement speed.
12. Damage resistance.
13. Shield durability.
14. Buff duration.
15. Recovery time.
16. Knockback.
17. Hit stun.
18. Ultimate damage.

Reuse the existing statistics and calculation systems.

Do not introduce duplicate statistics or unrelated balancing frameworks.

## 8.1 Establish the existing roster as the benchmark

The existing fighters establish the initial reference point for the new roster.

Analyse their actual statistics and abilities.

Determine which fighters are strongest in damage, defence, mobility, range, crowd control and overall combat performance.

Identify existing weaknesses and advantages.

Do not automatically assume that the current fighters are perfectly balanced.

If testing identifies existing problems, you are allowed to recommend and implement appropriate nerfs or buffs.

However, preserve their original identities and avoid unnecessary changes.

## 8.2 Balance each fighter according to their complete ability set

Every fighter's statistics must reflect the combined strength of all five normal abilities, the ultimate and the passive.

For example:

Aerion has exceptional aerial mobility, so his health, defence and damage must account for his ability to avoid opponents.

Arcstrike has strong speed enhancement and electrical burst attacks, so avoid giving him excessive base speed and damage simultaneously.

Frostweld has a powerful crystal shield, so his health and base defence must account for his additional protection.

Reson has sonic barriers and area control, so balance his durability and damage around these advantages.

Geargrind has mechanical armour and a combat drone, so account for both his additional durability and offensive utility.

Psion has psychic protection and telekinetic control, so consider his ability to control opponents when assigning damage and defence.

Solstice has a radiant shield and spear attacks, so balance his protection, range and precision together.

Tidebreaker has a water barrier and ranged attacks, so consider his defensive flexibility when assigning health and damage.

Quakor has stone reinforcement and an environmental wall, so his durability must be balanced against slower movement and appropriate attack recovery.

Kenshiro has precision attacks, parries and offensive enhancement, so his effectiveness should depend on timing rather than excessive base damage.

Chronos has temporal acceleration and repositioning, so his exceptional mobility must be considered when assigning health and defence.

These are balancing principles, not fixed numerical requirements.

Use actual gameplay tests to determine the final statistics.

## 8.3 Establish a fighter power budget

Evaluate total combat strength rather than balancing each statistic independently.

A fighter with powerful offensive abilities may need lower health or defence.

A fighter with strong shields may need lower base health or weaker offensive abilities.

A fighter with exceptional mobility may need lower damage or longer recovery.

A fighter with strong crowd control may need reduced damage to compensate for the additional control.

A fighter with exceptional range may need weaker close range defence.

A fighter with powerful passive effects may need more restricted ability cooldowns or lower statistics elsewhere.

Do not allow fighters to become exceptionally strong in every category without a meaningful weakness.

The objective is to create different but competitively viable fighters, not eleven fighters with identical statistics.

## 8.4 Ability balancing

Evaluate every ability according to its actual gameplay strength.

Consider:

1. Damage per successful hit.
2. Total potential damage.
3. Attack range.
4. Area of effect.
5. Movement distance.
6. Activation time.
7. Attack speed.
8. Buff strength.
9. Buff duration.
10. Shield durability.
11. Shield duration.
12. Crowd control.
13. Knockback strength.
14. Stun duration.
15. Cooldown.
16. Recovery time.
17. Number of opponents affected.
18. Difficulty of avoiding the ability.
19. Counterplay opportunities.
20. Potential combinations with other abilities.

A long cooldown does not automatically make an ability balanced.

Powerful abilities should have appropriate limitations such as longer preparation, shorter duration, restricted range, lower accuracy or greater recovery.

You may change damage, cooldowns, range, duration, speed, shield durability, buff strength, knockback and other relevant parameters.

Do not preserve original values simply because they were part of the initial design.

## 8.5 Buffing and nerfing

You are explicitly allowed to buff or nerf both new and existing fighters.

If an ability is too powerful, adjust it.

If an ability is underperforming, improve it.

If a fighter's statistics are too high compared with the value of their abilities, reduce them.

If a fighter has weak abilities and insufficient statistics, improve the appropriate areas.

Make targeted changes rather than randomly changing multiple unrelated values.

Possible adjustments include:

1. Reducing or increasing damage.
2. Increasing or decreasing cooldowns.
3. Adjusting movement speed.
4. Changing attack range.
5. Reducing shield durability.
6. Adjusting buff duration.
7. Changing damage resistance.
8. Adjusting knockback.
9. Changing activation time.
10. Improving or reducing recovery time.
11. Adjusting base health.
12. Adjusting power and defence.

Every adjustment must have a gameplay reason.

# 9. ULTIMATE BALANCING

Ultimates must feel significantly more powerful than ordinary abilities.

However, an ultimate must not guarantee victory.

Evaluate each ultimate based on damage, range, area, duration, activation time, vulnerability, cooldown and difficulty of avoidance.

Some ultimates should focus on area damage, while others should focus on mobility, crowd control or battlefield control.

Do not give every ultimate identical damage or effectiveness.

Provide reasonable opportunities to avoid, interrupt or defend against powerful ultimate attacks where appropriate.

Ensure that ultimate attacks do not create unavoidable damage loops or permanent crowd control.

# 10. AI AND COMBAT COMPATIBILITY

Every new fighter must function correctly with the existing AI and combat systems.

AI controlled fighters must understand their own abilities and use them appropriately.

For example, defensive fighters should use shields or armour when appropriate.

Mobility fighters should reposition rather than repeatedly attacking from unsuitable distances.

Ranged fighters should maintain appropriate distance.

Close range fighters should attempt to close the gap.

Counterattack fighters should recognise opportunities to defend and respond.

AI must not use abilities continuously without considering cooldowns, range, positioning or combat conditions.

Ensure that AI controlled fighters do not receive unfair hidden damage bonuses, unlimited stamina or automatic defensive advantages unless those are already intentional game settings.

# 11. VISUAL EFFECTS AND AUDIO

Every fighter must have their own visual and audio identity.

Do not reuse the same generic effects for all abilities.

Create appropriate effects for each character.

Aerion should use wind trails, feather movement and aerial gusts.

Arcstrike should use electrical sparks, lightning trails and electrical bursts.

Frostweld should use crystal formation, reflections, fragments and shattering.

Reson should use soundwave rings, frequency distortions and sonic impacts.

Geargrind should use mechanical movements, hydraulic pressure, sparks and gadget effects.

Psion should use psychic distortion, floating objects and telekinetic energy.

Solstice should use radiant light, golden trails and spear impacts.

Tidebreaker should use flowing water, splashes, waves and water formations.

Quakor should use ground cracks, stone fragments, dust and seismic impacts.

Kenshiro should use sword trails, metallic impacts and precise cutting effects.

Chronos should use temporal distortions, afterimages, cyan energy and time displacement.

Every fighter must have unique and recognisable attack audio for every individual attack. This is mandatory across all sixteen fighters, not merely a general requirement to include sound effects.

Give each individual light-combo hit its own attack sound. Give every heavy attack, each of the five normal ability options, and the separate ultimate its own unique sound signature. Also provide distinct sounds for signature counters, throws, summons, defensive activations, shield interactions, status applications and other meaningful combat actions where appropriate. The fifth alternative ability must have complete audio even when it is not selected into the current four-slot loadout.

Do not reuse the same complete sound file for different attacks or fighters. Do not satisfy uniqueness by applying only a small pitch change to the same generic sample. A shared subtle layer may be used only when the final layered sound is unmistakably different. Each sound must fit the fighter's visual identity, material, weapon, movement, energy type and impact.

Where appropriate, create separate audio for activation or windup, swing or projectile travel, confirmed hit or impact, sustained effects, shield or blocked contact, and effect termination. Ensure the sound is triggered by the correct gameplay event and not merely by an animation looping. A single hit must not produce repeated impact sounds. Missed, interrupted or cancelled attacks must not continue playing successful hit or sustained-effect sounds.

Shroud's five-hit combo must have five separate attack sounds synchronised to the five different animations, with a distinct and more impactful fifth-hit finisher sound. Vexoris's four-hit combo must also have a unique sound for each hit and a distinct poison splash sound on its completed finisher.

Each fighter's fifth normal ability must have its own sound identity in addition to the four originally specified abilities. Every ultimate must also have a unique signature sound sequence. Ensure that player-controlled and AI-controlled fighters use the same correct sound mappings.

Create or source original distinct audio assets where suitable project assets do not exist. Use the global Pixabay workflow for asset search, preview, license checking, downloading, trimming and cataloguing. Select effects based on the actual physical action and the animation, not merely on each fighter's theme. For example, a Kenshiro blade attack must sound like a sword being drawn or swung and making blade contact; a Vexoris poison jar must sound like glass breaking with liquid splashing and chemical release; a Vexoris spray must sound like pressurised aerosol; Geargrind must use mechanical clanks and hydraulic movement where those occur; Tidebreaker must use water impacts; Quakor must use stone and seismic impacts; Arcstrike must use electrical discharge; and Frostweld must use crystalline formation and fracture. These examples must be adapted to the actual final attack design. Do not assign an inaccurate stock sound just to fill an audio slot.

For every sourced clip, retain the original download and create a separate edited game-ready version. Extract the exact event from longer recordings where useful. Trim cleanly, remove excess silence, add short fades to avoid clicks, balance loudness and test the edited clip against the corresponding animation and impact frame. Record the source page, title, contributor, license review, download date, source file path, edited file path, trim notes and in-game event mapping in AUDIO_ASSET_CATALOG.md. Confirm that the intended use follows the current official Pixabay license and any additional rights requirements. Do not redistribute source audio as a standalone pack. Do not leave placeholders, reuse unrelated ambience or use the supplied Hide and Seek horror atmosphere tracks as attack sounds. Keep combat audio clear and balanced, respect existing volume settings, prevent clipping and excessive overlap, and use positional audio where appropriate.

Include suitable activation, movement, impact, defence, shield damage, shield destruction, heavy attack and ultimate audio. Do not use generic explosion sounds for every ability.

Ensure that visual effects do not obscure the player or make combat unnecessarily difficult to read.

# 12. COMBAT TESTING AND BALANCING PROCESS

Do not assume that an ability is balanced simply because its numerical values appear reasonable.

Test actual gameplay.

Conduct repeated fights between each new fighter and the existing roster.

Test new fighters against one another.

Where possible, test using equivalent player skill and AI difficulty.

Evaluate the following.

1. Damage dealt.
2. Damage received.
3. Successful attack rate.
4. Effectiveness of different four-of-five normal ability loadouts.
5. Ability description accuracy compared with actual gameplay.
6. Ability effectiveness.
7. Shield damage absorbed.
8. Buff effectiveness.
9. Average and median fight duration.
10. Cooldown availability.
11. Crowd control effectiveness.
12. Movement and repositioning advantages.
13. Dodge success rate and attack counterplay.
14. Ultimate effectiveness.
15. Overall win rate.

Test each fighter in close range, medium range and long range combat.

Test defensive abilities against different types of attacks.

Test whether shields correctly absorb damage.

Test whether buffs expire correctly.

Test whether cooldowns reset only when intended.

Test whether multiple abilities interact correctly.

Test whether combos can be interrupted and whether opponents can recover normally.

Test player controlled and AI controlled combat.

Do not conclude that a fighter is overpowered or underpowered based on one match.

Use repeated tests to identify consistent imbalances.

After every significant balance adjustment, repeat the relevant tests.

# 13. TECHNICAL IMPLEMENTATION REQUIREMENTS

Before implementing each fighter, inspect the existing fighter registration, asset loading, model configuration, animation framework, combat architecture, ability execution, statistics, AI and UI integration.

Use the existing architecture wherever possible.

Ensure that every fighter is correctly registered across the entire game.

This includes:

1. Fighter selection.
2. Character previews.
3. Character models.
4. Animation loading.
5. Combat statistics.
6. Light attacks.
7. Heavy attacks.
8. Five normal abilities, with four equipped for each match.
9. Ultimate.
10. Passive mechanics.
11. AI behaviour.
12. Damage calculations.
13. Cooldowns.
14. Hit reactions.
15. Audio and visual effects.
16. Victory and defeat states.
17. Existing combat modes.

Do not create partially implemented fighters that appear selectable but have missing animations or broken abilities.

Do not allow one fighter's abilities, buffs, shields or passive effects to accidentally affect another fighter's statistics.

Ensure that all temporary effects are correctly cleaned up when they expire, the fighter is defeated, the round ends or the game resets.

Avoid memory leaks, duplicate event listeners, repeated damage registration and animation state conflicts.

## B3. FULL ROSTER IMPLEMENTATION ORDER AND ACCEPTANCE

Implement Vexoris and the eleven additional fighters in manageable individual tasks or small batches. Do not create all twelve as unfinished selectable placeholders.

For each fighter, complete the model and equipment, individual animations, movement, the specified light attack combo with distinct audio for every hit, heavy attack with its own sound, five distinct normal abilities with exactly four equippable for each match and unique audio for all five options, a separate ultimate with unique signature audio, passive mechanic, defensive interactions, ability descriptions and HUD integration, visual effects, AI behaviour, statistics, registration and testing before treating that fighter as complete.

After each individual fighter or small batch, run targeted tests and fix integration problems. Do not request a separate [planning/review model] phase review after every fighter. Complete the full Phase 3 scope and then request one independent [planning/review model] review for the completed phase, unless a serious architectural issue requires earlier escalation.

The full roster must contain exactly sixteen main combat fighters: Inferno, Necro, Shroud, Titan, Vexoris, Aerion, Arcstrike, Frostweld, Reson, Geargrind, Psion, Solstice, Tidebreaker, Quakor, Kenshiro and Chronos.

All sixteen must be supported by Fighter Selection, Practice, Tutorial, Tournament, Free Zone, AI and Admin Panel wherever those systems apply. Ensure fighter-specific keybinds and tutorial content exist for all sixteen.

Do not let a new fighter break the abilities, animations, statistics, AI or progression of existing fighters. Do not register unfinished fighters as fully playable. Keep all special skeleton variants accessible in the Admin Panel without counting them as additional main roster fighters.

## B4. Vexoris POISON SPECIFICATION CONSISTENCY CHECK

The supplied Vexoris specification contains conflicting descriptions of toxicity stacking. It states that the completed four-hit combo adds one stack in the application table, but elsewhere describes the combo as applying five total stacks. It also states a maximum of five stacks while movement-slow thresholds are listed at 1, 5, 15, 20 and 25.

During Phase 0, identify this discrepancy and document a single consistent interpretation for user approval before implementing Vexoris's poison numbers. Do not silently invent a conversion between stacks and toxicity points. Preserve the supplied poison tick progression, maximum movement slow and damage restrictions unless an approved balance change is documented.

PART C. COMPLETE TUTORIAL SYSTEM AND UI REDESIGN

This work must be completed and approved BEFORE Parkour begins.

Deliver a consistent premium visual identity across the entire desktop experience.

Use the existing main game menu background as the main visual reference.

Inspect existing project images and assets before creating new visuals.

C1. Screens to redesign

1. Main Menu.
2. Game Modes.
3. Practice.
4. Settings.
5. Fighter Selection.
6. Tournament.
7. Other Games.
8. Tutorials.
9. Loading Screens.

Redesign buttons, cards, text fields, panels, typography, icons, hover effects and navigation.

The interface must fill the desktop viewport without unnecessary empty spaces, stretched elements or black gaps.

Maintain a consistent visual language based on the main menu background.

Game Modes must appear above Practice as the first primary main menu button.

C2. Game Mode and Practice Cards

Create large interactive image cards with clear titles and descriptions.

When the player hovers over a card, show a polished image preview and additional information.

Use actual Stickman Arena screenshots or game assets.

Game Mode cards must represent the actual gameplay experience.

Practice must display Tutorial Arena and Free Zone.

Other Games must display Hide and Seek Nightmare as an available mode. It may also display the Ancient Ruins Expedition Parkour card as locked or coming soon until Phase 4 is complete. The Parkour launch control must remain disabled until the actual Parkour mode is implemented and verified. After Phase 4 approval, enable the card and replace its preview with a screenshot captured from the completed playable environment.

Story Mode must not appear anywhere.

Do not display unavailable or unfinished game modes as fully playable features.

C3. Screen transitions

Create fast cinematic transitions using an effect inspired by sand blowing across the screen, with particles and smooth movement.

Transitions must not delay navigation unnecessarily.

C4. Tournament screen

Give the Tournament screen a premium tournament atmosphere consistent with the main menu.

It should feel like entering a major fighting championship.&#x20;

Use the 1st image as the tournament draw, remove any unnecessary parts for this image and use it as the main tournament draw screen.

C5. Loading screen

Create a polished loading screen with suitable artwork, animations and a loading indicator.

Avoid blank screens and unnecessary loading delays.

C6. Complete tutorial

Create a comprehensive gameplay tutorial.

Explain:

1. Movement.
2. Walking and running.
3. Sprinting.
4. Jumping.
5. Climbing.
6. Blocking.
7. Dodging.
8. Grabbing.
9. Throwing.
10. Light attacks.
11. Heavy attacks.
12. Abilities.
13. Ultimate attacks.
14. Other available combat actions.

Show corresponding keyboard and mouse controls.

Display fighter specific ability controls according to the selected fighter.

Explain whether each action requires a tap or held key.

Use actual gameplay screenshots and clear visual demonstrations.

Every fighter must have a tutorial covering all five normal abilities, the four-slot loadout selection, the separate ultimate and their individual keybinds.

Include every fighter's unique abilities and controls. Explain the purpose of all five normal options, how the player equips four and how to identify the selected abilities during combat. Include Vexoris's poison accumulation, four hit combo and status effect mechanics, plus individual tutorials for all eleven additional fighters.

Do not omit important movement or combat mechanics.

C7. Five-ability loadouts, detailed ability information and combat HUD

Deliver the complete polished version of the ability selection and information system for all sixteen main combat fighters.

Fighter ability selection

When a player selects a fighter, display all five of that fighter's normal abilities and the separate ultimate. Allow the player to equip exactly four normal abilities for the upcoming match. Make selected and unselected abilities visually distinct, clearly show the remaining available slot count and prevent invalid loadouts.

Players must be able to inspect all five normal abilities before making their selection. Do not hide the fifth ability or make it appear locked unless an existing progression system genuinely requires an unlock and the user has explicitly approved that progression design.

Ability information panel

When a player clicks or selects an ability card, display a detailed information panel containing:

1. Ability name and ability category.
2. A clear description of what the ability does and how it is used.
3. Damage dealt, including damage per hit, damage range, damage over time or tick progression where applicable.
4. Buffs applied, their numerical effects and duration.
5. Debuffs, curses, poison or other negative effects applied to opponents, including strength, stacks and duration where applicable.
6. Shield strength, defence changes, damage reduction or other protective effects.
7. Crowd-control effects, interruption, knockback or movement restrictions where applicable.
8. Mobility, repositioning, range and area of effect.
9. Activation time, active duration, recovery and cooldown.
10. Resource costs, hold requirements, targeting rules or other activation conditions where applicable.
11. Important limitations and available counterplay.

Only show properties relevant to the selected ability. Clearly identify when an ability does not apply a buff, debuff, curse, shield or status effect instead of leaving players to guess.

All displayed information must be generated from the same ability configuration and calculation sources used by gameplay. Never maintain separate hardcoded descriptions or damage numbers that can become outdated after balancing changes. Update the displayed information whenever an ability is buffed, nerfed or otherwise modified.

In-combat ability identification

During combat, display the four equipped normal abilities and the ultimate in a clear desktop-friendly HUD. Every ability slot must show its icon, name or recognisable short name, assigned keybind and cooldown or availability state.

Hovering over an ability slot must provide a concise tooltip. Clicking its separate information control must open the full ability description without accidentally activating the move. The actual assigned keyboard key must remain responsible for activating the ability.

When an ability is activated, show a brief on-screen ability name notification where appropriate. Clearly communicate cooldowns, unavailable states and relevant temporary effects. Do not rely on icons alone because players must be able to recognise which ability each key activates.

Keep the HUD readable and compact. It must not cover the fighters, important attack telegraphs, hit effects or essential gameplay information.

The tutorial must use the same names, keybinds and descriptions as the live ability configuration. Changing a fighter's ability or keybind must update the relevant selection screen, HUD and tutorial information consistently.

C8. UI functionality and validation

Ensure every button, menu item, card, hover interaction and navigation control works.

Do not introduce purely decorative buttons that do not perform their advertised functions.

Ensure all existing settings and player configurations remain functional.

Phase 3 acceptance criteria

The Roman Colosseum must be complete and functional.

Vexoris and all eleven additional fighters must be fully integrated into the existing fighter system, creating exactly sixteen main combat fighters.

Poison calculations, effects and abilities must work correctly. All sixteen fighters must have five normal abilities and one ultimate, complete animations, AI, statistics and registration. Players must be able to equip four of the five normal abilities for each match.

Every fighter's ability information panel must accurately describe damage, buffs, debuffs, curses, poison, shields, special effects, cooldowns and activation requirements. The in-combat HUD must clearly identify every equipped ability and its keybind.

Every attack, each individual light-combo hit, every heavy attack, all five normal abilities and every ultimate across all sixteen fighters must have unique, recognisable and correctly triggered audio. Shroud's five combo hits and Vexoris's four combo hits must each have separate sounds for every hit. Verify all audio is distinct, synchronised, correctly mixed and free from duplicate or lingering playback.

The fifth normal ability for each fighter must be a meaningful, fully implemented option and must not be a placeholder or duplicate. It must also have its own unique sound identity.

All requested screens must be redesigned.

The desktop viewport must be properly utilised.

Visual consistency must be maintained.

Game mode cards must use actual assets or screenshots.

Tutorial screens must explain every important control.

Fighter specific keybinds must appear correctly.

All sixteen fighters must have complete fighter-specific tutorials.

Story Mode must be absent.

Navigation and transitions must work correctly.

[planning/review model] must approve the complete sixteen fighter roster, Roman Colosseum, visual redesign and tutorial system before Parkour begins.

At completion, update DEVELOPMENT_PROGRESS.md and PHASE_HANDOFF.md.

STOP and display:

SWITCH TO [PLANNING/REVIEW MODEL] FOR INDEPENDENT PHASE REVIEW.

10\. PHASE 4. ANCIENT RUINS EXPEDITION PARKOUR AND FINAL INTEGRATION

USE CLAUDE [IMPLEMENTATION MODEL] FOR IMPLEMENTATION.

This is the final gameplay development phase. The complete sixteen fighter roster, Hide and Seek, Roman Colosseum, UI redesign and tutorial system must already be implemented and approved.

First, develop and verify Ancient Ruins Expedition Parkour.

Second, perform final integration and regression testing across the entire project.

Do not begin any additional game mode or gameplay feature after Parkour. Once Parkour is complete, only final integration, bug fixing, regression testing, documentation and release approval may follow.

[planning/review model] must review the completed Phase 4 and the entire project before final release approval.

PART A. ANCIENT RUINS EXPEDITION PARKOUR

Replace the previously planned Jungle Expedition environment entirely.

Develop a fully playable and replayable Ancient Ruins Expedition Parkour mode.

Use the standard dummy training character exclusively.

Combat fighters must never be selectable or usable in this activity.

This mode must begin only after the complete UI redesign and tutorial system have been approved.

IMPORTANT. The ancient ruins environment is exclusively for Parkour. It must not be registered as a combat arena.

The Roman Colosseum remains the only new combat arena in this development cycle.

A1. Other Games integration

Create a dedicated Other Games section using the redesigned main menu interface.

Add a Parkour game card featuring the Ancient Ruins Expedition theme. During Phase 3, the card may appear as locked or coming soon, but it must not launch an unfinished mode or imply that the activity is playable. Keep its launch control disabled until Phase 4 is complete.

After implementing Parkour in Phase 4, capture an actual screenshot from the playable game and use it as the card preview. Add a suitable description and relevant game information, then enable the launch button so it opens the actual verified Parkour mode.

Never use fictional screenshots, unrelated artwork or placeholder images.

A2. Ancient ruins environment

Replace the existing office Parkour environment with a detailed ancient ruins expedition.

Use the existing office Parkour implementation as a reference for working movement, climbing, physics and progression systems.

Reuse reliable mechanics while creating a completely new environment and visual identity.

Build an interconnected ancient ruins environment featuring:

1. Massive ruined stone temples.
2. Broken ancient pillars.
3. Crumbling stone walls.
4. Collapsed staircases.
5. Narrow stone bridges.
6. Suspended and floating stone platforms.
7. Ancient towers and elevated structures.
8. Broken walkways and missing floor sections.
9. Unstable wooden bridges.
10. Ancient mechanical traps.
11. Falling and breakable stone platforms.
12. Moving platforms.
13. Swinging ropes and chains.
14. Climbing walls and ancient structures.
15. Deep gaps and dangerous falls.
16. Forgotten chambers and hidden passageways.
17. Ancient symbols, carvings and decorative details.
18. Overgrown moss and limited vegetation appropriate for abandoned ruins.

Include multiple elevations and interconnected routes so the course feels like an immersive ancient expedition rather than disconnected floating platforms.

Use weathered stone, cracked surfaces, moss, dust, debris and environmental wear to create an abandoned civilisation atmosphere.

Do not turn the environment into a dense jungle or forest.

Do not introduce a separate Ruins combat arena.

A3. Randomised obstacle generation

Make every run different through procedural generation or controlled randomisation.

Randomise platform positions, distances, elevations, breakable stone platforms, collapsing bridges, moving platforms, disappearing platforms, suspended structures, climbing routes, ancient traps, gaps, hazards and alternative pathways.

Randomisation must produce meaningful variation without compromising gameplay fairness.

Every generated course must have a valid starting point, physically reachable routes, appropriate checkpoints and a reachable final destination.

Validate platform distances, jump heights and climbing requirements against the dummy character's actual movement capabilities.

Do not generate impossible jumps, disconnected routes or unavoidable hazards.

Every generated route must have a valid progression from beginning to end.

A4. Parkour mechanics

Reuse and adapt the existing movement, jumping, sprinting, climbing and physics systems.

Support natural running, jumping, climbing, balancing, landing and navigating narrow platforms.

Introduce ruins specific interactions such as swinging from ropes, jumping between ancient platforms, crossing unstable stone bridges, climbing ruined structures and avoiding moving or collapsing platforms.

Breakable and unstable objects must respond naturally to player movement and interaction.

Implement reliable collision detection, platform detection, landing behaviour and climbing interactions.

Prevent unintended shortcuts, out of bounds movement and exploits that allow players to bypass the intended course.

A5. Course progression

Create a clear starting area, progressively challenging obstacle sections and a final destination.

The objective is to complete the expedition by reaching the finish point.

Include functional checkpoints, a visible timer, progress indicators and restart functionality.

The timer must start when the run begins and stop when the player successfully finishes.

When the player fails, respawn them at the latest valid checkpoint without unnecessarily restarting the entire course.

Ensure randomly generated obstacles maintain logical progression towards the finish.

Display a proper completion screen with finishing time and relevant run information.

A6. Visuals and atmosphere

Create a polished ancient ruins environment with detailed stone textures, weathered materials, natural lighting, shadows, atmospheric fog, environmental depth and cohesive scenery.

Include environmental animations and effects for falling debris, moving platforms, collapsing structures, dust clouds, swinging ropes and ancient mechanisms.

Include immersive environmental ambience such as wind passing through ruins, distant stone movement, mechanical sounds, echoes and footsteps.

Maintain consistent visual quality throughout the environment.

Avoid unfinished scenery, placeholder objects and visibly disconnected platforms.

A7. Testing and verification

Test the complete Parkour experience using the actual dummy training character.

Verify that every randomly generated course is reachable and completable, all platforms have correct collision, movement and climbing work naturally, breakable objects behave correctly, checkpoints preserve progress, the timer starts and stops properly, the finish triggers the completion screen and restarting generates a fresh playable course.

Verify that players cannot bypass the intended route through unintended shortcuts or movement exploits.

Confirm that the Other Games interface displays the correct Ancient Ruins Expedition Parkour card and that its launch button opens the functional ruins Parkour mode.

Capture the Parkour preview screenshot directly from the completed playable environment.

A8. Development and preservation requirements

Inspect the existing project structure, gameplay systems, movement implementation, physics, UI and available assets before making changes.

Reuse existing working systems wherever practical.

Do not unnecessarily rebuild or modify unrelated features.

Preserve the redesigned main menu, tutorial system, existing game modes, fighter systems and unrelated functionality.

Do not consider the Parkour mode complete based solely on code implementation or screenshots.

Verify actual gameplay and course completion.

PART B. FINAL INTEGRATION AND REGRESSION TESTING

Conduct a complete testing pass across the project.

Existing combat testing

Verify:

1. All four original fighters have correct statistics.
2. Fighter configurations are consistent.
3. Individual heavy attacks deal more damage than individual light attacks.
4. Completed light combos have the intended final hit damage.
5. Titan's grab stability.
6. Inferno's Fire Beam damage and interruption.
7. Shroud's ground attack recovery.
8. Necro's four skeleton limit and stun removal.
9. Bleeding damage multiplier.
10. Poison damage progression and status effect calculations.

Movement testing

Verify running, jumping, coyote time, climbing and edge interactions.

Fighter testing

Verify all sixteen main fighters, their animations, abilities, AI, statistics, keybinds, tutorials and roster registration.

Ensure skeleton variants remain available in the Admin Panel.

Combat audio testing

Verify that every fighter has unique attack sounds for every individual light-combo hit, heavy attack, all five normal ability options and the separate ultimate. Test the fifth alternative ability even when it is not equipped in the current loadout. Verify signature counters, throws, summons, shields and other relevant combat actions.

Confirm that Shroud's five combo hits and Vexoris's four combo hits each trigger their own distinct sound at the correct animation and hit timing. Confirm sounds are triggered once per valid attack event, do not play as successful impacts on a miss, and stop correctly when an attack or sustained effect is interrupted or cancelled.

Test both player-controlled and AI-controlled fighters, concurrent sound playback, audio volume settings, positional audio, mixing, sound priority and clipping. Confirm the two supplied horror atmosphere MP3 files remain separate from fighter combat sound assets.

Game mode testing

Verify all retained existing game modes and Parkour.

Hide and Seek testing

Verify the dummy character, exact 20 second countdown, hiding locations, restricted view radius, progressive room visibility, hidden upstairs areas, direct sightlines, doorway peeking, sound detection, Shroud's search AI, house navigation, killing animation and two minute survival condition.

Verify Shroud does not begin hunting before the preparation countdown finishes.

Verify camera peeking does not expose the player's location to Shroud.

Parkour testing

Verify the ancient ruins environment, randomised platforms, climbing, jumping, checkpoints, timer, progress and completion.

Test multiple generated courses and ensure all routes are physically achievable.

Controls testing

Verify fighter specific keybinds, local persistence, hold detection, conflicting key warnings and ESC navigation.

Map testing

Verify Roman Colosseum collision, movement, jumping, camera behaviour and environmental interactions.

Ensure the ancient ruins Parkour environment is not accidentally registered as a combat arena.

UI testing

Check every redesigned screen at desktop resolutions.

Verify full viewport presentation, Game Modes positioned above Practice, image cards, buttons, transitions, loading screens and navigation.

GitHub and build validation

Run the complete automated test suite and production build.

Review GitHub Actions and resolve all relevant failures.

Do not remove tests or weaken assertions to achieve a passing result.

Distinguish genuine implementation defects from outdated test expectations that legitimately need updating.

Do not claim GitHub is fixed unless the relevant checks have actually passed.

Documentation

Update all project documentation.

Clearly identify completed features, outstanding tasks, known issues and test results.

Do not declare the project complete while requested functional features remain unfinished.

Phase 4 acceptance criteria

Ancient Ruins Expedition Parkour must be fully playable and replayable.

All generated courses must have valid routes.

All sixteen main fighters and all original game systems must remain functional.

Every fighter attack, combo hit, heavy attack, normal ability and ultimate must have its own unique and correctly functioning audio. All combat audio must pass the final integration tests.

All requested game modes must be integrated correctly.

The complete test suite and production build must be executed.

All known Critical and High priority defects must be resolved.

[planning/review model] must perform the final independent project inspection and approve the release.

STOP and display:

SWITCH TO [PLANNING/REVIEW MODEL] FOR FINAL PROJECT INSPECTION AND RELEASE APPROVAL.

11\. FINAL DEVELOPMENT RULES

Follow the exact development sequence.

[planning/review model] leads Phase 0 planning and approves the architecture.

[implementation model] implements one approved phase at a time.

[light model] is optional for small and isolated tasks.

[planning/review model] independently reviews and approves every completed implementation phase.

If [planning/review model] finds problems, it must create one consolidated correction prompt for [implementation model].

Do not begin another phase until the current phase has passed review.

Do not create Story Mode.

Do not create the Jungle Expedition environment.

Do not create additional combat arenas beyond the Roman Colosseum during this development cycle.

The ancient ruins environment is exclusively for Parkour.

Do not remove existing working features unless explicitly required by this plan.

Fix and balance the original four fighters before introducing Vexoris and the other eleven new fighters. The final playable combat roster must contain exactly sixteen main fighters.

Ensure Vexoris's poison focused combat design remains distinct from the other fighters.

Complete and obtain [planning/review model] approval for the full sixteen fighter roster, Roman Colosseum, UI redesign and tutorial system before beginning Parkour.

Complete the entire sixteen fighter roster and approve it before beginning Parkour. Parkour must be the final gameplay feature developed in this plan.

Ensure Game Modes remains the first primary button in the Main Menu, above Practice.

Maintain the existing game's visual identity and technical architecture.

Parkour must be the last gameplay feature in the implementation sequence. Do not schedule additional modes or fighter expansions after it. The final result must contain exactly sixteen main combat fighters and feel like one cohesive, polished, stable and fully playable Stickman Arena experience.

12\. FIRST ACTION

# MANDATORY UNIQUE FIFTH ABILITY ADDITIONS FOR THE FULL ROSTER

This section adds the specific fifth normal ability for every main roster fighter except Inferno. It supplements and takes priority over any earlier generic instruction to create an unspecified fifth ability. Do not treat these as optional suggestions. Implement the named ability for each fighter unless inspection proves that the existing implemented kit already contains a substantially identical move. If a duplicate exists, preserve the existing move and create a different ability with the same intended tactical purpose. Do not create duplicate ability slots.

Every fighter must finish with exactly five distinct normal abilities and one separate ultimate. The player equips four of the five normal abilities before a match. The fifth is an alternative loadout choice and is not an extra in-match slot. Inferno already has five normal ability options after his orange-to-blue transformation is reclassified as a normal ability. Do not add another normal ability to Inferno. Create only his separate new ultimate as already required in B10.

## Original fighters

**Titan. Ability 5. Bastion Anchor.** Titan plants his feet and locks his stance for a short duration. He gains strong resistance to ordinary knockback and reduced frontal damage, but his movement becomes very slow. He remains vulnerable to grabs, flanking attacks and clearly defined heavy counters. When the stance ends, he releases a short ground pulse that creates space without stunning opponents. It must not duplicate his ultimate defence increase of 40 percent or grant permanent armour. Give the stance a readable activation, clear visual feedback, a defined duration, cooldown and recovery window.

**Necro. Ability 5. Soul Tether.** Necro marks one opponent with a visible spectral tether. While the tether remains active, Necro's currently active skeletons receive a modest damage bonus against that marked target. The target is not stunned, rooted or prevented from attacking. The tether ends after a defined duration, when the target moves beyond its range or when Necro is interrupted. It does not summon additional skeletons and must respect the exact four active skeleton limit. The ability is a tactical focus command rather than another summon. The AI should use it when focusing one opponent is more valuable than spreading skeleton attacks.

**Shroud. Ability 5. Umbral Feint.** Shroud performs a readable shadow feint and sidesteps a short distance in the chosen direction. If an opponent commits to a nearby melee attack during the active timing window, Shroud may perform a quick counter slash. If no attack is committed or the timing is missed, the move provides only the sidestep and no free damage. It must not grant prolonged invisibility, guarantee a hit or bypass dodge recovery. It is separate from Shroud's five hit basic attack combo and must not recreate the repeated stabbing exploit or prevent an opponent from recovering.

## Vexoris

**Ability 5. Corrosive Filter.** Vexoris activates an emergency chemical filtration system and vents a controlled ring of defensive neutralising vapour around himself. For a short duration, the vapour reduces incoming poison and damage over time effects and slightly weakens the next eligible melee hit from an opponent who enters the cloud. Opponents inside the cloud receive only a small, capped poison application. This ability must not remove all existing toxicity stacks, grant full immunity, heal Vexoris or exceed the established five toxicity stack, 10 percent movement slow and four HP per tick poison limits. The cloud has a clearly defined radius, duration, cooldown and recovery window. Opponents can leave the area or wait for it to expire. Its purpose is defensive chemical control, not another poison projectile or trap.

## Eleven additional fighters

**AERION. Ability 5. Featherguard.** Aerion folds his wings forward and forms a rotating barrier of compressed air and hardened feathers. It reduces incoming frontal projectile damage for a short duration and deflects a limited number of weak projectiles at an angle. It does not make Aerion invulnerable, does not protect his back and ends early if its durability is depleted. This is a defensive option and must remain distinct from Tailwind's mobility buff. Show the wings folding into position and the barrier visibly weakening as it absorbs damage.

**ARCSTRIKE. Ability 5. Static Snare.** Arcstrike plants a compact electrical charge at a short targeted location. After a visible arming delay, it releases one narrow electrical pulse when an opponent enters its radius. The pulse deals modest damage and briefly reduces movement responsiveness without stunning, freezing or repeatedly interrupting the target. The charge can be avoided, baited or destroyed with an appropriate attack. Only one pulse may affect each opponent per activation. This gives Arcstrike area control distinct from his dash, punch, chain lightning and self buff.

**FROSTWELD. Ability 5. Prism Mirror.** Frostweld creates a floating crystal mirror in front of himself for a short duration. The mirror absorbs a limited amount of frontal projectile damage and refracts one eligible projectile toward a nearby direction with reduced damage. It does not reflect melee attacks, ultimates or every projectile automatically. The mirror visibly cracks as it absorbs damage and shatters when its durability is exhausted or its duration ends. This is a reactive defensive counter distinct from Geode Shield's direct protection. Keep the visual language entirely crystalline and do not introduce ice or snow effects.

**RESON. Ability 5. Feedback Pulse.** Reson emits a short circular vibration pulse around his body. It pushes nearby opponents away and briefly disrupts their aim and movement direction, but it must not stun them or automatically cancel every attack. It deals low damage and is primarily a spacing and escape tool. Give it a readable charge animation, limited radius, clear recovery window and cooldown. It must not overlap with Resonance Barrier's defensive role or Resonance Dash's mobility role.

**GEARGRIND. Ability 5. Magnetic Recall.** Geargrind fires a magnetic tether at a nearby eligible piece of battlefield furniture or at his own deployed Combat Drone. If it connects to furniture, he pulls that object a short distance toward a chosen lane, creating a moving obstacle or setting up a later throw. If it connects to his drone, he recalls the drone to his side and briefly reinforces its next action. It cannot pull fighters, bypass collision or create unlimited objects. This adds battlefield manipulation without duplicating Rocket Fist, Combat Drone, Magnetic Mine or Reinforced Plating. The ability must use the existing furniture and drone systems where possible.

**PSION. Ability 5. Kinetic Redirect.** Psion enters a brief focused stance and creates a narrow telekinetic field in front of himself. If a compatible projectile hits the field during its active window, Psion redirects it toward the nearest valid opponent with reduced damage. If no projectile arrives, the stance ends without a free attack. It does not reflect melee attacks, ultimates or unavoidable area effects. Directional limits, timing and recovery must allow opponents to bait or punish it. This is a skill based counter distinct from Psychic Barrier and Telekinetic Throw.

**SOLSTICE. Ability 5. Dawnbrand.** Solstice charges the tip of his spear with focused sunlight and marks a narrow line on the ground. After a short, clearly telegraphed delay, a radiant thrust travels along that line. An opponent struck receives moderate damage and a brief exposed status that slightly increases the damage of Solstice's next direct spear hit only. The mark cannot stack, the vulnerability has a short duration and the attack can be avoided by moving out of the line. This adds a deliberate setup and follow up option without duplicating Sunpiercer.

**TIDEBREAKER. Ability 5. Undertow.** Tidebreaker sends a low current across a defined ground area. Opponents caught in the current are pulled a short distance toward its centre and receive a brief movement slow, while Tidebreaker remains free to reposition. The pull must never override grab immunity, pull through walls or hold opponents in place. The current deals low or no direct damage and is designed to reposition opponents into or away from other attacks. Its direction, radius and duration must be clearly telegraphed. This adds battlefield control distinct from Tidal Wave, Water Prison and Tidal Guard.

**QUAKOR. Ability 5. Faultline Stance.** Quakor braces himself and channels seismic force through his legs for a short defensive window. While braced, he takes reduced frontal damage and resists ordinary knockback, but moves slowly and remains vulnerable from behind, to grabs and to clearly defined heavy counters. When the stance ends, he releases a small ground tremor that creates space but deals only modest damage. It must not become permanent armour or an automatic counter. This is distinct from Stoneguard and Quakor's offensive ground attacks.

**KENSHIRO. Ability 5. Iaijutsu Draw.** Kenshiro enters a brief sheathed sword stance. If the player times activation as an incoming melee strike reaches the counter window, Kenshiro performs a fast unsheathing slash and steps past the attacker. On a successful read, it deals moderate counter damage and briefly creates separation. If no attack arrives or the timing is missed, Kenshiro performs only a short low damage draw slash with recovery. It cannot counter projectiles, grabs or ultimates. The counter window must be precise and readable, making it a skill based alternative rather than a duplicate of Perfect Parry.

**CHRONOS. Ability 5. Afterimage Decoy.** Chronos leaves a temporal afterimage at his previous position and quickly shifts a short distance in the chosen direction. For a brief period, the afterimage performs a delayed copy of Chronos's last basic attack animation but deals no damage. Nearby AI may briefly consider the afterimage as a secondary target only if their normal target selection permits it. The decoy must not become an invulnerable clone, deal hidden damage or reset ability cooldowns. This gives Chronos a deception and repositioning tool distinct from Rewind Step.

## Required implementation and balancing checks

Inspect every existing fighter configuration before adding these moves. Confirm that the proposed move does not duplicate an existing ability, passive, heavy attack or ultimate. Preserve all previously specified abilities and character identities. Each new ability needs a unique animation, activation and recovery states, hitbox or effect logic, cooldown, range, damage values where applicable, visual effects, sound effects, AI decision rules, counterplay and ability information panel entry. Do not leave any move as a name only or a visual placeholder.

Balance the new abilities against all other fighters. Defensive abilities must have limited duration, defined durability or clear positional weaknesses. Counters must require timing and must not counter every attack type. Crowd control must not stun lock or prevent recovery. Movement abilities must not grant unlimited invulnerability. Damage over time and poison must use the central status effect system. Summons must respect existing entity limits. All displayed ability values must match the actual implementation.

Update all five ability descriptions, loadout screens, combat HUD slots, fighter tutorials, AI behaviour, fighter configuration data, automated tests and development documentation. Confirm that each fighter has exactly five normal abilities and one ultimate, that four normal abilities can be equipped before each match, and that Inferno remains at five normal abilities without receiving a sixth. Test every new ability against multiple opposing fighter types and record the balance results before requesting phase approval.

Start with Phase 0 only.

Use [planning/review model] to inspect the existing project, investigate architecture, identify actual file paths, examine current fighter systems, inspect GitHub failures and prepare the project documentation.

Do not implement gameplay changes during Phase 0. Do not create, replace, modify or integrate fighter attack audio during Phase 0. Only inspect existing audio assets and systems, document the current state and plan the later implementation.

Do not begin Phase 1 automatically.

Once [planning/review model] finishes its inspection and implementation plan, explicitly tell me to switch to [planning/review model] for independent approval if the initial work was performed by another model. Since [planning/review model] is leading Phase 0, it must independently validate its own architecture and plan against the actual project and report any remaining uncertainty.

Once the plan is approved, explicitly tell me:

SWITCH TO [IMPLEMENTATION MODEL] TO BEGIN PHASE 1 IMPLEMENTATION.

Wait for my manual model selection.

Do not automatically continue to Phase 1.
