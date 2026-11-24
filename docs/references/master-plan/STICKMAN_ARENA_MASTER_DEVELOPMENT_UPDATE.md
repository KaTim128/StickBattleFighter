# STICKMAN ARENA MASTER DEVELOPMENT UPDATE

Update the existing Stickman Arena project only.

Your task is to implement all the changes described in this document directly into the existing project.

Before modifying anything, inspect the relevant codebase, character configurations, ability definitions, AI behaviour, decision making systems, animation controllers, combat systems, physics, environmental objects, rendering pipeline, camera visibility, depth sorting, collision detection, damage calculations, tournament systems, character selection screen, asset loading processes, game modes and UI components.

Understand how the existing systems work, identify the relevant files and dependencies, and create a brief implementation plan before editing.

Preserve all unrelated characters, abilities, mechanics, animations, visual effects, furniture assets, room layouts, controls, game modes, progression systems and existing functionality.

Reuse existing systems and assets wherever possible. Make targeted modifications instead of unnecessarily rewriting working implementations. Do not introduce duplicate mechanics, placeholder animations, fake physics or temporary visual solutions.

All changes must be properly integrated into the existing game.

# PART 1. TOURNAMENT BATTLE SYSTEM

## 1.1 Tournament Battle Time Limit

Modify the tournament battle system so that fights cannot continue indefinitely.

Every tournament battle must have a configurable maximum regulation duration.

When a fight exceeds the configured time limit, it must transition into a sudden death or overtime phase designed to conclude the battle as quickly as reasonably possible.

The objective is to prevent excessively long tournament battles while ensuring that every match eventually produces a legitimate winner.

Do not simply terminate the fight, randomly select a winner or declare a draw when the time expires.

Instead, introduce a decisive overtime system that encourages the fighters to engage and finish the match.

Where appropriate, use existing combat mechanics to progressively reduce unnecessary downtime, encourage aggressive engagement and prevent fighters from endlessly avoiding one another.

Consider existing AI behaviour, movement, attack frequency, cooldowns, defensive mechanics and passive recovery when implementing overtime.

Any overtime adjustments must apply fairly to both fighters and must not arbitrarily favour one character.

The match must continue until one fighter legitimately wins through the existing victory conditions.

If the existing architecture requires an additional maximum overtime safeguard, implement a reliable performance based resolution system as a final fallback. Evaluate remaining HP, damage dealt, successful attacks, knockdowns and other relevant combat statistics. Never randomly select the winner.

The time limit and overtime behaviour must be configurable and reusable for future tournaments.

## 1.2 Tournament Skip Battle Button

Introduce a clearly visible Skip Battle button during tournament fights.

The button must allow spectators to skip watching an ongoing fight and proceed to the match result without having to wait for the entire animation or battle duration.

Skipping must not arbitrarily determine the winner.

Where technically possible, implement accelerated battle simulation so that the existing battle continues using its normal combat logic while its presentation is fast forwarded.

The result must come from the actual outcome of the battle simulation.

If accelerated simulation is not supported by the existing architecture, implement a reliable alternative using the current battle state and established tournament resolution logic.

Ensure that skipping does not automatically favour a particular fighter.

The button must respond immediately and provide clear visual feedback when activated.

Prevent multiple activations from creating duplicate results, interrupting tournament state transitions or advancing the bracket more than once.

After the result is determined, display the correct winning fighter and proceed to the next tournament stage normally.

The Skip Battle button must have a polished appearance consistent with the final UI design.

## 1.3 Tournament Progression Integrity

Inspect the complete tournament progression system.

Ensure that the following remain functional after introducing time limits, sudden death and skipping.

1. Match initialization.
2. Fighter selection and opponent assignment.
3. Battle start and completion.
4. Winner determination.
5. Loser elimination.
6. Bracket progression.
7. Next match initialization.
8. Tournament completion.
9. Final winner announcement.

Prevent duplicate match completion events, incorrect bracket advancement, stale battle states and matches becoming permanently stuck.

## Tournament Acceptance Criteria

1. Every tournament fight has a configurable regulation duration.
2. Battles transition into overtime when the duration expires.
3. Overtime encourages a decisive conclusion.
4. Battles continue until a legitimate winner is determined.
5. Draws and indefinite matches are prevented.
6. Any fallback winner resolution uses reliable combat performance data.
7. A Skip Battle button is available during the fight.
8. Spectators can skip the battle presentation.
9. Skipping does not randomly assign winners.
10. Skip functionality does not corrupt tournament progression.
11. Match results and bracket advancement remain accurate.
12. The system supports future fighters and tournament formats.

# PART 2. UNIVERSAL CHARACTER BALANCING

Review and rebalance every Stickman Arena fighter, including the original four fighters, Necro, Titan, Shroud, Prismor, Psion and all other currently available or newly created characters.

The objective is to ensure that no fighter is excessively powerful, unfair, ineffective or consistently dominant over the others.

Do not restrict balancing to basic character statistics.

Review the complete combat configuration of every fighter, including HP, damage, defence, movement speed, attack speed, recovery, stamina, cooldowns, ability duration, attack distance, hitbox dimensions, knockback, crowd control, attack reliability, mobility, survivability, combo potential, ultimate strength and other relevant combat attributes.

You may modify any relevant character statistics, ability damage, cooldowns, durations, attack ranges, attack speeds, recovery times, defensive mechanics, hitboxes and combat parameters to achieve better balance.

## 2.1 Evaluate Every Fighter Individually

Inspect each fighter's combat identity, strengths, weaknesses and overall effectiveness.

Consider how their abilities work together rather than balancing every ability independently.

For example, a fighter with high damage and mobility may require longer recovery, more restrictive cooldowns or lower survivability.

A slower fighter may require stronger attacks, better defensive options or more reliable ways to approach opponents.

A ranged fighter should have appropriate spacing advantages without being able to defeat melee fighters through unavoidable attacks.

Defensive fighters should have meaningful counterplay and should not be able to stall matches indefinitely.

High damage abilities must have appropriate restrictions, recovery or counterplay.

Ultimate abilities must feel powerful without making normal combat irrelevant.

Do not make every fighter feel identical simply to achieve balance.

Maintain each fighter's distinctive combat style, strengths, weaknesses and visual identity.

## 2.2 Actual Combat Testing and Balance Adjustments

Use available combat simulations, automated test utilities and actual gameplay to evaluate character performance.

Where technically possible, run systematic matchups across the entire roster.

Identify fighters who consistently dominate, struggle to win, have attacks that are too difficult to land, possess abilities that are excessively effective or have unfair matchup advantages.

Evaluate the following factors.

1. Win rates across different opponents.
2. Average battle duration.
3. Damage dealt and damage received.
4. Ability effectiveness and successful hit rates.
5. Attack range and reliability.
6. Defensive effectiveness.
7. Movement and mobility advantages.
8. Knockback and crowd control effectiveness.
9. Ultimate ability impact.
10. Survivability and recovery.
11. Matchup specific weaknesses.
12. Whether a fighter can be countered through reasonable gameplay.

Make targeted adjustments using observed combat results.

Do not simply reduce the damage of every powerful fighter.

Improve weaker fighters where necessary and adjust individual abilities, cooldowns, movement, recovery, defensive mechanics and attack effectiveness.

Do not weaken a fighter simply because they have a high theoretical damage value. Evaluate how reliably their attacks connect and how difficult their abilities are to counter.

Do not strengthen a fighter simply because their win rate is low without understanding the reason.

## 2.3 Universal Balance Framework for Future Fighters

Create or improve a reusable balancing framework so future Stickman Arena characters can be integrated without introducing excessively powerful or ineffective fighters.

Establish consistent baseline expectations for character statistics, including HP, damage, movement speed, defence, attack speed and survivability.

Establish appropriate balancing expectations for normal abilities, heavy attacks, ultimate abilities, cooldowns, ability duration, attack range, recovery, mobility, crowd control and defensive mechanics.

Where appropriate, establish a standard ability power budget or equivalent internal balancing model.

The framework must recognise that different character classes require different statistical distributions.

For example, melee fighters, ranged fighters, defensive fighters, mobility focused fighters and summon based fighters should not necessarily share identical statistics.

However, each fighter must have meaningful weaknesses and reasonable opportunities for opponents to counter their strongest mechanics.

Create a consistent process for evaluating new fighters before they are considered complete.

This process should include automated checks where appropriate and combat testing against existing roster members.

Ensure that introducing a new fighter does not unnecessarily invalidate the balance of previously released characters.

Document the balancing standards and testing methodology in a project reference document so future development sessions can follow the same approach.

## 2.4 Preserve Existing Character Identities

Balance must not come at the expense of character identity.

Preserve unique animations, abilities, combat mechanics, attack styles and intended roles.

Do not remove distinctive mechanics simply because they are difficult to balance.

Instead, adjust their damage, cooldowns, duration, range, recovery, effectiveness or counterplay.

Ensure every fighter has a reasonable chance of winning when played against different opponents.

## Universal Balancing Acceptance Criteria

1. Every existing fighter is reviewed.
2. Every newly created fighter is included.
3. No fighter has an excessively unfair advantage.
4. Character statistics and abilities are adjustable.
5. Cooldowns, duration, range and recovery are considered.
6. Character strengths and weaknesses remain distinct.
7. Actual combat testing is performed where possible.
8. Dominant and ineffective fighters are identified.
9. Adjustments are based on observed performance.
10. The universal balancing framework supports future fighters.
11. New characters follow consistent balance expectations.
12. Balance changes and their reasoning are documented.

# PART 3. INTELLIGENT AND ADAPTIVE FIGHTER AI

Review the existing AI behaviour and decision making systems for every AI controlled fighter.

The objective is to make the fighters intelligent enough to understand their own statistics, abilities, current health, opponent's behaviour and combat situation.

AI fighters must not simply repeat the same attacks, randomly select abilities or blindly approach opponents regardless of their current condition.

They must make sensible combat decisions based on their individual capabilities and the situation they are facing.

## 3.1 Stat Aware Decision Making

Every AI fighter must understand and use its own character configuration when making decisions.

Consider its actual HP, maximum HP, damage, defence, attack range, movement speed, stamina, ability cooldowns, recovery times, defensive capabilities and available abilities.

The AI must recognise whether it is naturally strong, weak, fast, slow, defensive, aggressive, ranged or specialised in particular combat situations.

Use these characteristics to influence its decision making.

For example, a high mobility fighter should use its speed and movement abilities appropriately.

A defensive fighter should recognise situations where blocking, dodging or creating distance is more effective than attacking.

A powerful melee fighter should understand when it needs to approach the opponent and when it should wait for an opening.

A ranged fighter should attempt to maintain effective attack distance instead of constantly approaching unnecessarily.

A fighter with powerful close range abilities should attempt to position itself appropriately before activating those abilities.

An AI fighter must not attempt to use abilities that are unavailable, on cooldown, outside their valid range or otherwise unsuitable for the current situation.

## 3.2 Health Aware Combat Behaviour

AI fighters must actively adjust their behaviour according to their current health and maximum health.

Do not rely exclusively on absolute HP values.

Use health percentages and the fighter's starting health to determine its current condition.

For example, a fighter that starts with lower maximum HP should not automatically be considered healthy simply because its remaining HP is lower than another fighter's.

The AI must understand how much health it has relative to its own maximum HP.

When an AI fighter has low health, it should make more efficient and intelligent decisions to improve its chances of survival and winning.

Depending on its combat identity and available abilities, it may choose to:

1. Become more defensive.
2. Prioritise dodging dangerous attacks.
3. Maintain a safer distance.
4. Avoid unnecessary exchanges with stronger opponents.
5. Use available defensive or escape abilities.
6. Counterattack when the opponent exposes an opening.
7. Avoid wasting powerful abilities.
8. Prioritise attacks that have a higher probability of successfully connecting.
9. Use available recovery or healing mechanics where appropriate.
10. Change its movement and attack patterns to reduce incoming damage.

Do not make every low health fighter behave identically.

A low health aggressive fighter may become more calculated and prioritise powerful openings.

A low health defensive fighter may use its defensive abilities more frequently.

A low health ranged fighter may attempt to maintain distance while continuing to apply pressure.

A mobility focused fighter may use its movement advantages to avoid unnecessary damage.

A fighter that starts with low maximum HP must naturally recognise that it is more vulnerable and adapt its strategy accordingly from the beginning of the fight.

It should not have to lose a large amount of HP before recognising that survival is important.

The AI must consider both its current health percentage and its natural survivability when selecting actions.

## 3.3 Opponent Awareness and Tactical Decision Making

AI fighters must consider their opponent's condition and behaviour.

Evaluate relevant factors such as:

1. Opponent's remaining HP.
2. Opponent's maximum HP where available.
3. Opponent's current distance.
4. Opponent's attack range.
5. Opponent's known abilities.
6. Opponent's active abilities and cooldowns where observable.
7. Opponent's attack animations.
8. Opponent's recovery windows.
9. Opponent's defensive behaviour.
10. Opponent's movement patterns.
11. Environmental obstacles.
12. Available opportunities to attack or escape.

AI fighters should recognise openings and respond appropriately.

For example, when the opponent is recovering from a heavy attack, the AI should recognise the opportunity to counterattack.

When the opponent activates a powerful ability, the AI should attempt an appropriate defensive response when it has a reasonable opportunity to do so.

When the opponent is low on health, the AI may become more aggressive where doing so is tactically sensible.

However, it must not blindly chase or repeatedly attack an opponent when doing so creates unnecessary risks.

## 3.4 Ability Selection and Resource Management

Make AI ability usage more intelligent.

The AI must understand the purpose of each ability and use it in situations where it provides a meaningful advantage.

Consider ability range, damage, cooldown, startup time, recovery, hit probability, defensive value, stamina requirements and potential counterplay.

Avoid wasting powerful abilities against opponents who are outside their effective range.

Avoid repeatedly activating abilities that cannot connect.

Avoid using defensive abilities when no meaningful threat exists.

Avoid wasting ultimate abilities when a more appropriate normal attack would be sufficient, unless the current situation justifies the ultimate.

The AI should also understand when saving an ability for a more important opportunity is better than using it immediately.

Ensure that each fighter uses its own abilities according to its intended combat identity.

Do not give AI fighters abilities or information that they do not actually possess.

## 3.5 Adaptive Behaviour Throughout Combat

AI decision making must adapt as the battle progresses.

The AI should not use exactly the same strategy for the entire match.

Adjust its tactical priorities when:

1. Its HP becomes critically low.
2. Its opponent becomes critically low.
3. It loses a significant amount of HP.
4. Its opponent begins repeating a particular attack.
5. Its opponent starts playing defensively.
6. Its preferred abilities become unavailable.
7. It is trapped or positioned near environmental obstacles.
8. It gains a temporary advantage.
9. It falls behind in overall combat performance.

Introduce sensible behavioural variation so that opponents remain challenging and unpredictable without behaving randomly or irrationally.

Avoid repetitive attack loops, unnecessary movement, passive stalling, constant dodging and abilities being wasted.

## 3.6 Fairness and Performance

AI fighters must make intelligent decisions without receiving unfair advantages.

Do not provide them with impossible reaction speeds, hidden information, unlimited stamina, shortened cooldowns or automatic attacks unless those behaviours are explicitly part of the character's configuration.

Decision making should respect the same combat limitations and gameplay rules that apply to players.

Optimise AI decision updates so that having multiple AI fighters in the arena does not cause unnecessary performance issues.

Use efficient decision evaluation, sensible update intervals and existing combat systems where possible.

### Intelligent AI Acceptance Criteria

1. Every AI fighter understands its own relevant statistics.
2. AI decisions account for current HP and maximum HP.
3. Fighters with naturally low starting HP adapt from the beginning.
4. Low health fighters make more calculated survival decisions.
5. Different fighters retain different tactical behaviours.
6. AI considers opponent health, distance, attacks and abilities.
7. Abilities are used according to their actual purposes.
8. Cooldowns, range, stamina and recovery are respected.
9. AI recognises opportunities to attack and defend.
10. AI adapts throughout the battle.
11. AI avoids repetitive or irrational behaviour.
12. AI does not receive unfair advantages.
13. AI remains performant with multiple fighters.
14. AI behaviour is tested across different fighter types and combat situations.

# PART 4. CHARACTER SELECTION SCREEN PERFORMANCE

Improve the performance of the character selection screen when players enter it.

Currently, entering the selection screen can cause lag or noticeable delays.

Inspect the existing character loading system, character assets, models, textures, animations, ability configurations, UI rendering and initialization processes.

Identify the causes of unnecessary loading, frame drops, stuttering and delays.

The selection screen must open smoothly and respond immediately to player input.

## 4.1 Optimize Asset Loading

Where appropriate, implement lazy loading, caching, asynchronous loading, asset reuse, preloading of essential assets and improved handling of character previews.

Avoid loading every character's complete combat resources, animations, effects and unnecessary assets simultaneously when they are not required for the selection screen.

Only initialize resources that the selection screen actually needs.

Ensure that switching between characters does not repeatedly load the same assets.

Reuse cached character models, textures and preview resources where possible.

Prevent unnecessary reinitialization when players navigate between characters or revisit the selection screen.

## 4.2 Optimize Character Previews

Ensure character models, animations, textures and preview effects are rendered efficiently.

Character switching must remain responsive even when the roster contains many fighters.

Avoid unnecessary rendering of characters that are outside the visible selection area.

Where appropriate, use optimized preview models or reduced visual effects without compromising the accuracy of the actual fighter appearance.

Ensure selected character previews load correctly and do not display missing textures, broken animations or temporary placeholders.

## 4.3 Performance and Functionality

Do not sacrifice the quality of character models, textures, preview animations or selection functionality for performance.

Ensure optimization does not negatively affect combat, character assets, ability systems or other game scenes.

Measure actual performance before and after optimization where available.

Identify unnecessary rendering operations, excessive asset requests and repeated initialization.

### Selection Screen Acceptance Criteria

1. The selection screen opens with minimal delay.
2. Entering the selection screen does not cause noticeable lag.
3. Character switching remains responsive.
4. Unnecessary asset loading is reduced.
5. Assets are reused and cached where appropriate.
6. Character previews remain visually accurate.
7. No characters, assets or selection functionality are removed.
8. Optimization does not negatively affect combat or other scenes.
9. Performance improvements are measured where possible.

# PART 5. OPEN ZONE IN GAME CHARACTER SWITCHING

Improve the Open Zone so players can change their selected fighter without having to leave the game, return to the main menu and re-enter with a different character.

Currently, trying another character requires an unnecessarily long process.

Introduce a convenient in-game character switching system that allows players to select and use a different fighter while remaining in the Open Zone.

## 5.1 In Game Character Selection

Add an accessible Change Character option to the Open Zone interface.

When activated, it should open a character selection interface where the player can browse and select any fighter they are permitted to use.

Use the existing character selection system and assets wherever possible.

The interface must allow players to preview fighters, switch between selections and confirm their preferred character.

Once confirmed, the currently controlled fighter must be replaced with the newly selected character.

The player must not have to exit the Open Zone, restart the game or reload the entire environment.

## 5.2 Preserve the Existing Open Zone State

Changing characters must not unnecessarily restart the Open Zone.

Preserve the current environment, room or zone state, other players, NPCs, interactive objects and relevant world activity.

Where appropriate, spawn the newly selected fighter at the player's current location or at a nearby safe position.

Ensure the camera automatically follows the new fighter.

Update the player control system, character references, animations, physics, collision, abilities, statistics and other relevant systems to reference the new fighter.

Cleanly remove or deactivate the previous fighter without leaving duplicate characters, stale references, disconnected controls or broken camera tracking.

Handle the character replacement safely if the player is currently moving or interacting with the environment.

Where necessary, temporarily pause the player's movement while the selection interface is open.

Do not unnecessarily reset unrelated progression or the current Open Zone session.

## 5.3 Performance and Loading

Character switching must be fast and responsive.

Reuse cached assets from the existing selection screen performance improvements.

Avoid reloading the entire character roster when the player only wants to switch one fighter.

Only initialize the resources required for the newly selected character.

Ensure the character model, animations, textures, abilities and controls are ready before restoring player control.

Avoid visible loading interruptions, black screens, long delays and unnecessary scene transitions.

If the selected character requires additional assets that are not already loaded, handle their loading efficiently and communicate the transition appropriately.

### Open Zone Acceptance Criteria

1. Players can change characters without leaving the Open Zone.
2. The full character roster is available for selection.
3. Character previews work correctly.
4. The new character replaces the previous player controlled fighter.
5. The camera follows the new character.
6. Controls, abilities, statistics and animations update correctly.
7. The Open Zone environment does not restart.
8. Other players and existing world activity remain functional.
9. No duplicate or disconnected player characters remain.
10. Character switching does not cause noticeable lag.
11. Previously loaded assets are reused where possible.
12. Switching can be repeated without breaking the session.

# PART 6. HOUSE OF NIGHTMARE ARENA AND GAME MODE SELECTION

Integrate House of Nightmare into the available combat arenas.

House of Nightmare must be usable as an actual fighting arena in addition to its existing Hide and Seek game mode.

Do not restrict House of Nightmare exclusively to Hide and Seek.

Preserve its existing atmosphere, design, room layout, environmental assets, furniture, lighting and interactive elements.

## 6.1 Introduce House of Nightmare as a Combat Arena

Allow House of Nightmare to be selected as one of the available arenas for actual battles.

The arena must support the existing combat systems, including fighter movement, abilities, attack collisions, knockback, environmental physics and damage registration.

Players and AI fighters must be able to move throughout the intended combat areas without getting stuck or falling through the environment.

Review the existing collision boundaries, navigation, furniture placement and accessible areas.

Ensure the environment is suitable for combat while preserving its original identity and atmosphere.

Do not unnecessarily remove or redesign existing rooms, furniture or environmental objects.

## 6.2 Admin Mode Character Selection

In Admin Mode, allow the administrator to choose whichever available Stickman Arena character they want to play as in House of Nightmare.

Provide access to the existing character roster.

The administrator should be able to preview and select their preferred fighter before starting the activity.

Where supported by the existing admin architecture, also allow the administrator to select the opposing fighter or configure the opponent selection.

The selected fighter must use its actual statistics, abilities, animations and combat configuration.

Do not create separate or simplified versions of existing fighters for House of Nightmare.

Preserve the existing administrator permissions and prevent normal users from accessing admin only controls.

## 6.3 House of Nightmare Game Mode Toggle

Introduce a clear mode selection toggle in Admin Mode for House of Nightmare.

The administrator must be able to choose between:

**Fight**

House of Nightmare becomes an active combat arena.

The selected fighter participates in combat against the selected opponent or existing opponent system.

All existing combat rules, damage calculations, collision detection, character abilities and environmental interactions must function correctly.

**Hide and Seek**

House of Nightmare uses its existing Hide and Seek gameplay.

Preserve the original Hide and Seek mechanics, rules, interactions, character behaviour and existing functionality.

The administrator must be able to switch between these modes without permanently changing or breaking the original game mode.

Ensure the chosen mode is correctly initialized before the activity starts.

Avoid loading unnecessary combat resources while Hide and Seek is active, and avoid initializing unrelated Hide and Seek systems when Fight mode is selected.

## 6.4 Furniture Destruction During Combat

When House of Nightmare is used as a fighting arena, furniture must behave according to the existing intended destructible environment mechanics.

Inspect the furniture destruction and damage systems.

Ensure furniture breaks when it receives sufficient legitimate physical impact or damage from combat.

Furniture should respond appropriately to fighter attacks, heavy attacks, knockback, collisions and environmental interactions where those interactions are intended to cause destruction.

Preserve the furniture's original models, breakable components, materials, textures and collision behaviour.

When furniture breaks, ensure the destruction corresponds to the actual impact.

Do not make furniture break simply because a fighter approaches it, walks past it or performs an unrelated animation.

Ensure broken furniture pieces use proper physics where supported.

Prevent broken furniture from remaining as invisible collision objects or interfering with subsequent combat.

Ensure furniture destruction does not cause excessive performance drops when several objects are damaged during the same battle.

Do not disable the existing furniture destruction system.

## 6.5 Preserve Hide and Seek Functionality

House of Nightmare must continue working as an original Hide and Seek environment.

Adding combat functionality must not break existing hiding locations, seeker behaviour, hiding mechanics, round progression, interactive furniture or the original game rules.

Ensure Fight and Hide and Seek remain separate, correctly initialized modes using the appropriate gameplay systems.

### House of Nightmare Acceptance Criteria

1. House of Nightmare is available as a combat arena.
2. House of Nightmare remains available for Hide and Seek.
3. Admin Mode provides a clear Fight and Hide and Seek toggle.
4. The administrator can choose any available character.
5. Opponent selection is supported where appropriate.
6. Selected fighters use their actual abilities and statistics.
7. Combat physics and collision work correctly.
8. Furniture breaks when legitimate impact conditions are met.
9. Furniture destruction does not happen from simple proximity.
10. Broken furniture behaves correctly after destruction.
11. Furniture destruction does not cause significant performance problems.
12. Existing Hide and Seek gameplay remains fully functional.
13. Mode switching does not create duplicate systems or broken states.
14. Admin only functionality remains restricted to administrators.

# PART 7. ENVIRONMENT RENDERING AND ARCHITECTURE

## 7.1 Fix Furniture Transparency and Camera Occlusion

Inspect the existing furniture transparency system, player visibility detection, camera rendering and depth sorting.

Currently, furniture such as bookshelves becomes partially transparent when the player stands behind it, overlaps it or stands on top of it.

Correct this behaviour so furniture remains fully opaque unless it genuinely obstructs the camera's view of the player.

The transparency system must be based on actual visual obstruction from the camera's perspective rather than simply checking the player's position, distance or collision overlap.

Furniture must remain fully opaque when it is positioned behind the player, when the player stands on top of it, when the player walks across or around it, when the player overlaps its collision area without being visually obstructed, or when the furniture is nearby but does not block the camera's view.

Only activate transparency when foreground furniture genuinely blocks the player's visible character model from the camera.

For example, when a bookshelf is positioned between the camera and the player and visibly obscures the player's body, activate the transparency effect so the player can be seen.

Where the existing rendering architecture supports it, apply transparency only to the obstructing furniture or the specific portion that blocks the player's visibility.

Use reliable visibility or occlusion detection. Consider camera to player visibility checks, relevant body visibility points and actual foreground obstruction rather than relying exclusively on simple bounding box overlap.

The transparency effect must activate smoothly when obstruction begins and restore the furniture to its original opacity when the player is no longer obstructed.

Do not leave furniture permanently transparent after the player moves away.

Preserve the original furniture textures, colours, materials, lighting, shadows and appearance. Maintain any original material transparency where it is intentionally designed.

Do not disable transparency globally or interfere with other intentional transparency effects elsewhere in the game.

### Furniture Acceptance Criteria

1. Furniture behind the player remains fully opaque.
2. Furniture remains opaque when the player stands on top of it unless it genuinely obstructs camera visibility.
3. Collision overlap alone does not activate transparency.
4. Furniture becomes transparent only when it actually blocks the camera's view of the player.
5. Transparency activates and disappears smoothly.
6. Furniture automatically restores its original opacity when the obstruction clears.
7. Correct depth sorting is maintained.
8. Existing materials, textures, lighting and shadows are preserved.
9. Other intentional transparency effects continue working.

## 7.2 Connect the Curved Walls Naturally

Inspect the existing curved wall geometry and the adjoining wall structure shown in the supplied reference images.

Currently, the curved wall looks like two separate wall structures placed beside each other rather than one continuous architectural structure.

Use the second reference image as the desired appearance.

Redesign the connection so the curved wall flows naturally into the adjoining wall, creating one continuous architectural structure.

Ensure consistent wall thickness, height, material, colour, outline and perspective throughout the entire connection.

Pay particular attention to the curved geometry, endpoints, connection angle, visible edges and transition between the straight and curved sections from the isometric camera perspective.

There must be no visible gaps, disconnected edges, awkward overlaps, abrupt transitions, exposed seams or unnatural intersections.

The curved portion must look like it was originally constructed as part of the adjoining wall, not like a separate object attached afterwards.

Preserve the existing wall design, curved shape, room layout and surrounding environment. Modify the geometry, positioning or connecting structure only where necessary.

Maintain proper depth sorting and ensure collision boundaries follow the actual wall geometry.

### Curved Wall Acceptance Criteria

1. The curved and adjoining walls appear as one continuous structure.
2. The connection follows the desired appearance shown in reference image 2.
3. Wall thickness and height remain consistent.
4. No visible gaps, seams or disconnected edges remain.
5. The transition between straight and curved sections is smooth.
6. Materials, outlines, colours and perspective remain consistent.
7. Collision boundaries accurately follow the wall geometry.
8. Existing room layouts and surrounding assets remain unaffected.

# PART 8. UI AND BUTTON REDESIGN

After completing the gameplay, balancing, tournament and performance improvements, review and polish the Stickman Arena UI.

Use the UI reference images I previously provided during this month as the primary visual reference for the design direction.

These images are important project design references. Do not ignore them or substitute an unrelated UI style.

## 8.1 Locate and Preserve the Existing UI Reference Images

Before redesigning the interface, inspect all accessible project folders, reference directories, uploaded assets and available previous development resources for the UI images I previously supplied.

Look for images showing the desired button designs, menu layouts, colours, shapes, borders, outlines, textures, backgrounds, spacing and overall interface presentation.

Inspect the actual image files rather than relying only on written descriptions.

Treat the images as visual design references, not necessarily assets that must be copied directly into the game.

Use their visual language to guide the redesign while maintaining Stickman Arena's existing identity.

Important requirement for future development sessions

If the reference images are available in the project workspace, preserve them in an organised reference directory.

Create or update a document named UI_REFERENCE_GUIDE.md.

Document the reference image filenames and their locations, the important design characteristics, the button appearance, the visual hierarchy, the colour palette, the borders, the shapes, the textures, the spacing and the overall UI direction.

Update the appropriate project documentation, including CLAUDE.md where applicable, so future Claude Code sessions know where the actual reference images are stored and which design guidelines must be followed.

Do not assume Claude Code automatically has access to images uploaded in previous ChatGPT conversations.

If those images cannot be found in the accessible workspace or current attachments, explicitly identify this limitation and request that the original images be placed in a dedicated project reference directory.

Do not pretend to have inspected unavailable images, invent their appearance or replace them with unrelated reference images.

Preserve the original image files. Do not overwrite, compress or modify the references unnecessarily.

## 8.2 Button Design

Redesign buttons to match the visual style and appearance of the previously supplied reference images.

Pay attention to their shape, proportions, borders, outlines, colours, textures, depth, shadows, hover states, pressed states, disabled states and visual feedback.

Buttons should look polished, consistent and intentionally designed.

Avoid generic default buttons, flat placeholder rectangles, inconsistent styles and excessive visual effects.

Ensure important actions are immediately recognisable.

Apply the visual design consistently to menu buttons, selection buttons, tournament buttons, battle controls, settings buttons, confirmation buttons, ability indicators and other relevant interactive elements.

The Skip Battle button must follow the same design language.

The Open Zone character switching interface and House of Nightmare mode selection must also use the same design language.

## 8.3 Overall Interface Improvements

Review the existing menus, selection screens, tournament interface, battle HUD, result screens, settings and navigation components.

Improve alignment, spacing, typography, visual hierarchy, readability, contrast and consistency.

Ensure text fits correctly inside buttons and interface elements.

Avoid overlapping text, clipped labels, inconsistent margins and unnecessarily large interface elements.

Maintain a polished appearance across different supported screen sizes and resolutions.

Preserve the existing functionality of all menus and controls.

Do not redesign unrelated screens unnecessarily if they already follow the intended design direction.

## 8.4 Consistent UI Architecture

Where appropriate, establish reusable UI components and shared style definitions.

Ensure buttons, panels and interface elements use consistent design specifications instead of having individually implemented styles that become inconsistent.

Future UI additions should be able to reuse the same design system.

Document the shared UI standards so future development maintains the same appearance.

### UI Acceptance Criteria

1. Previously supplied reference images are located and inspected when accessible.
2. The reference images are preserved in the project.
3. UI_REFERENCE_GUIDE.md records the visual design requirements.
4. CLAUDE.md or equivalent project documentation references the UI guidelines.
5. Buttons follow the established reference design.
6. UI elements have consistent shapes, colours, borders and visual feedback.
7. Menus and selection screens have improved visual hierarchy.
8. Text remains readable and correctly positioned.
9. Tournament and battle interfaces match the overall design.
10. Open Zone character selection and House of Nightmare mode selection follow the same design.
11. Existing UI functionality remains intact.
12. Future UI components can reuse the same design system.

# PART 9. LOADING SCREEN REDESIGN

Redesign the existing loading screen while maintaining the current loading functionality.

The loading screen must use the same main menu background image that is already used in Stickman Arena.

Do not introduce an unrelated background image or create an entirely different loading screen design.

## 9.1 Main Menu Background

Use the existing main menu background image as the loading screen background.

Create a darker version of the image for loading purposes.

The background must remain visually recognisable as the main menu background, but its brightness must be reduced to provide a darker and more atmospheric appearance.

Where possible, achieve this through a dark overlay or rendering adjustment rather than modifying the original source image.

Preserve the original background image and its asset quality.

Do not stretch, distort, crop incorrectly or change the original composition unnecessarily.

Ensure the image scales correctly across supported screen resolutions and aspect ratios.

## 9.2 Loading Text Position

Display a clear Loading... text indicator in the bottom right corner of the screen.

The text must be positioned consistently with appropriate padding from the right and bottom edges.

Use a font, colour, size and visual treatment that match the existing Stickman Arena UI design.

The text must remain readable against the darkened background.

You may include a subtle animated loading indicator alongside the text where appropriate.

Avoid unnecessary visual clutter.

## 9.3 Loading Behaviour

The loading screen must only appear when the game is actually loading or transitioning between scenes.

Ensure the loading screen does not appear unnecessarily during normal gameplay.

Maintain the existing loading processes, scene transitions and asset initialization behaviour.

Where the architecture supports accurate progress reporting, show actual loading progress.

Do not display fabricated loading percentages or claim loading is complete when required assets are still being initialized.

Avoid prolonged black screens, blank screens or abrupt transitions.

Transition smoothly between the loading screen and the destination scene.

Reuse the existing main menu background asset instead of loading unnecessary duplicate images.

### Loading Screen Acceptance Criteria

1. The loading screen uses the existing main menu background image.
2. The background is visibly darker than the original.
3. The original image file remains unchanged.
4. Loading text appears in the bottom right corner.
5. The text remains readable across supported resolutions.
6. The design follows the existing UI reference style.
7. Loading appears during genuine loading operations.
8. Existing loading and scene transition functionality remains intact.
9. The loading screen does not introduce unnecessary asset loading or performance problems.

# PART 10. PRISMOR

## 10.1 Rename and Redesign Crystal Arsenal to Shard Blade

Rename Prismor's existing Crystal Arsenal ability to Shard Blade everywhere it appears, including the ability configuration and UI.

Replace the existing crystal fists with two dual crystal swords that physically grow directly from Prismor's hands.

The swords must appear as natural extensions of his arms rather than separate weapons floating beside his hands.

Create detailed crystal geometry with sharp edges, layered structures and textured surfaces consistent with Prismor's visual identity.

Both swords must remain properly attached, aligned and animated throughout walking, running, dodging, attacking, jumping and other combat movements.

Ensure their positions follow the actual movement of Prismor's hands and arms.

## 10.2 Improve Default Attacks and Five Hit Combo

Improve Prismor's default tap attacks to deliver stronger damage while introducing varied and impactful dual sword combat.

Retain the existing five hit combo structure.

Each attack must have its own distinct anticipation, execution, physical contact, impact and recovery animation.

Introduce varied movements such as alternating sword strikes, diagonal slashes, horizontal cross attacks, forward thrusts and coordinated dual sword combinations.

Avoid repetitive movements, identical animations or attacks that simply extend Prismor's arms towards the opponent.

The fifth and final combo attack must be especially powerful.

For this attack, transform one of Prismor's hands into a sharp, elongated crystal blade. His arm must visibly extend through crystal growth, creating a powerful crystal piercing punch.

Include a distinct wind up, strong body rotation, forward momentum, visible crystal growth, accurate weapon alignment and a powerful impact.

The opponent must respond appropriately through physical hit reactions, knockback and impact animations.

The extended crystal blade must retract or transform smoothly after the attack.

## 10.3 Heavy Attack, Crystal Hammer

Replace Prismor's existing Heavy Attack with a massive crystal hammer strike.

Prismor must transform one hand and forearm into a large, heavily structured crystal hammer.

The animation must show him preparing the attack, growing the hammer, lifting it and delivering a powerful downward slam onto the ground.

The hammer must have convincing size, weight and proportions. Its movement must follow Prismor's arm and shoulder instead of behaving like a detached object.

Introduce proper body movement, anticipation, momentum, ground impact, debris and appropriate opponent reactions.

Ground impact visual effects must correspond to the actual attack and must not independently cause damage.

After the attack, the hammer must retract or transform smoothly back into the normal crystal weapon configuration.

## 10.4 Ultimate, Crystal Armour Transformation

Keep Prismor's Ultimate as the original Crystal Armour transformation.

Do not summon the Crystal Monster or replace the transformation with another mechanic.

Prismor must transform by covering his body with detailed, layered and textured crystal armour that follows his actual body proportions.

The armour must look physically integrated, as though Prismor is genuinely wearing it.

Avoid floating armour pieces, disconnected attachments, incorrect positioning, excessive gaps or unnatural clipping.

Ensure the armour follows his head, torso, shoulders, arms, forearms and legs.

Maintain consistent positioning and proportions during walking, running, dodging, attacking, jumping and all other combat animations.

Give the transformation a proper activation animation, visible crystal growth and smooth transition into the completed armoured form.

All crystal weapons and armour must remain correctly integrated throughout the transformation and subsequent combat.

### Prismor Acceptance Criteria

1. Crystal Arsenal is renamed to Shard Blade everywhere.
2. Both crystal swords grow directly from Prismor's hands.
3. Both swords remain connected throughout combat and movement.
4. Default attacks have stronger damage and a varied five hit combo.
5. Every combo attack has distinct animation phases and recovery.
6. The fifth attack performs the crystal piercing punch with visible arm extension.
7. Heavy Attack creates a massive crystal hammer connected to Prismor's arm.
8. The hammer performs a convincing downward ground slam and retracts smoothly.
9. Ultimate activates the original Crystal Armour transformation.
10. Armour remains aligned with Prismor's body throughout combat.
11. No crystal weapon or armour attachment floats, detaches or moves independently of its intended body part.

# PART 11. NECRO

## 11.1 Ultimate Skeleton Summons

Increase Necro's Ultimate summon count to exactly four skeletons.

All four skeletons must be spawned using the existing summon system.

Ensure they can move, identify opponents, attack and participate in combat using the existing behaviour and combat systems.

Prevent accidental duplicate summons or additional skeletons beyond the specified limit.

## 11.2 Soul Drain Healing

Reduce Soul Drain's healing percentage from 50% to 15% of the actual damage dealt.

Healing must be calculated using the actual health damage successfully applied to the opponent rather than the theoretical attack damage.

Missed attacks, blocked attacks and attacks that deal no actual health damage must not generate healing.

Ensure healing cannot exceed Necro's maximum HP.

Preserve Soul Drain's existing animations, visual effects and unrelated functionality.

### Necro Acceptance Criteria

1. Ultimate summons exactly four skeletons.
2. All four skeletons can properly participate in combat.
3. No additional skeletons spawn from one Ultimate activation.
4. Soul Drain heals exactly 15% of actual health damage dealt.
5. Missed or unsuccessful attacks generate no healing.
6. Healing cannot exceed maximum HP.
7. Other Necro abilities remain unaffected.

# PART 12. REBALANCE NECRO, TITAN AND SHROUD

Review and rebalance Necro, Titan and Shroud against the original four fighters and all newly created characters.

This work must follow the universal balancing framework established in Part 2.

Evaluate their overall combat performance, including HP, damage, defence, movement speed, attack speed, cooldowns, ability effectiveness, hitbox accuracy, attack reliability and survivability.

Conduct actual combat testing across matchups involving all three characters, the original four fighters and the newer characters.

Identify significant advantages, weaknesses, excessively powerful abilities, ineffective attacks and characters that consistently struggle to win.

Make targeted adjustments based on observed combat performance.

Do not simply reduce every statistic. Improve weaknesses where appropriate and adjust individual abilities, cooldowns, damage, defensive capabilities and attack effectiveness.

Maintain the unique fighting identity of each character.

Necro must retain the four skeleton Ultimate and 15% Soul Drain healing requirements while his other attributes are balanced.

Avoid making Necro, Titan or Shroud excessively powerful against original or newer fighters.

### Balance Acceptance Criteria

1. All three characters are reviewed against the original four and newer fighters.
2. Actual combat tests are conducted across representative matchups.
3. Significant advantages and disadvantages are identified.
4. Adjustments are based on observed performance.
5. Each character retains their distinctive fighting identity.
6. Necro's four skeletons and 15% Soul Drain healing remain unchanged.
7. None of the three characters consistently dominates or becomes excessively ineffective against tested opponents.
8. Significant balance changes and their reasoning are documented.

# PART 13. WALKING ANIMATIONS FOR NEWLY CREATED FIGHTERS

Review the walking animations of every newly created stickman.

Improve their movement so it looks natural, coordinated and physically believable.

Introduce natural elbow bending instead of keeping both arms completely straight.

Improve shoulder and elbow articulation, coordinated arm and leg swinging, subtle upper body movement, natural torso rotation, weight distribution, body balance and smooth transitions.

Ensure movements remain natural when changing directions.

Walking, running, stopping and returning to idle must transition smoothly without sudden limb snapping or unnatural poses.

Ensure animations remain consistent when moving forward, backward, sideways and diagonally.

Preserve each fighter's original proportions, appearance, stance and unique visual identity.

Walking animations should suit each character rather than giving everyone an identical movement style.

Do not unnecessarily modify the original four characters' walking animations.

### Walking Animation Acceptance Criteria

1. Every newly created fighter is reviewed.
2. Arms have natural elbow bends and shoulder movement.
3. Arm swings are coordinated with opposite leg movements.
4. Upper body movement looks balanced and believable.
5. No sudden limb snapping or unnatural poses occur.
6. Movement works consistently in different directions.
7. Individual character proportions and visual identities are preserved.
8. Original four fighters retain their existing walking animations.

# PART 14. PSION, TELEKINETIC TOSS AND PSYCHIC SLAM

Review Psion's existing ability configuration.

Remove Psychic Barrier and replace it with Telekinetic Toss.

Rename the existing Telekinetic Throw ability to Psychic Slam.

These must remain two distinct abilities with separate functions.

Telekinetic Toss is responsible for grabbing and controlling nearby environmental objects.

Psychic Slam is responsible for launching or slamming the currently grabbed object into the opponent.

Do not combine these abilities into one mechanic or create duplicate versions of the same functionality.

## 14.1 Telekinetic Toss, Object Acquisition

Psion uses telekinesis to automatically detect and grab a suitable nearby environmental object.

Support different suitable environmental objects regardless of their size and weight, provided they are compatible with the existing physics system.

When activated, Psion performs a convincing telekinetic grabbing animation.

The selected environmental object must physically move towards Psion's telekinetic control position and remain suspended in the air.

Use the actual environmental object from the game world, not a duplicated model, visual effect or placeholder projectile.

The object must remain under telekinetic control until Psychic Slam is activated or the existing system otherwise releases it.

Ensure the object follows Psion's control position smoothly without excessive clipping, disappearing or becoming disconnected from its physics representation.

Preserve its actual dimensions, mass and collision information.

If no suitable object is nearby, prevent activation and display a clear message explaining that no suitable object is available.

Do not consume the ability's cooldown when activation fails because no suitable object can be found.

## 14.2 Psychic Slam, Existing Telekinetic Throw

Rename the existing Telekinetic Throw ability to Psychic Slam everywhere it appears, including ability configurations and UI.

Preserve its existing intended functionality where appropriate, but integrate it with the new Telekinetic Toss object acquisition system.

Psychic Slam must use the actual object currently held through Telekinetic Toss.

Psion performs a distinct throwing or slamming animation and launches the held object towards the opponent.

The object must physically travel through the environment and collide with the opponent before damage is registered.

Ensure convincing acceleration, trajectory, rotation and impact behaviour.

Calculate damage and knockback using the object's actual physical characteristics.

Larger and heavier objects should generally produce stronger impacts than smaller and lighter objects.

Use actual mass and dimensions where available. Apply sensible damage limits so unusually large objects cannot produce unlimited or unintended damage.

Damage must only register when the thrown object physically collides with the opponent's body.

Do not apply damage simply because the projectile reaches the opponent's general position or because the throwing animation completes.

After successful contact, apply appropriate knockback, impact reactions and object physics.

If Psychic Slam is activated without an object currently being held, prevent activation and display a clear message explaining that Psion must grab an object first.

Do not consume cooldown when activation fails.

After throwing or releasing the object, ensure it returns to normal environmental physics and remains part of the actual game world.

### Psion Acceptance Criteria

1. Psychic Barrier is removed from Psion's configuration and UI.
2. Telekinetic Toss replaces Psychic Barrier.
3. Telekinetic Throw is renamed to Psychic Slam everywhere.
4. Telekinetic Toss identifies suitable nearby environmental objects.
5. The actual environmental object is physically grabbed.
6. The grabbed object remains suspended and controlled.
7. Different object sizes and weights are supported.
8. Psychic Slam uses the object acquired through Telekinetic Toss.
9. The actual object physically travels towards the opponent.
10. Damage and knockback correspond to the object's physical characteristics.
11. Damage only registers after actual collision.
12. Telekinetic Toss cannot activate without a suitable nearby object.
13. Psychic Slam cannot activate without a held object.
14. Failed activations do not consume cooldowns.
15. Objects return to normal physics after being thrown or released.
16. Existing environmental object physics and unrelated interactions remain functional.

# PART 15. UNIVERSAL HIT DETECTION AND DAMAGE REGISTRATION

Review the existing hit detection and damage systems across the game.

The objective is to ensure damage is registered only when a legitimate physical attack connects with an opponent.

Apply consistent collision detection across all relevant characters, melee attacks, heavy attacks, crystal weapons, special abilities, projectiles, summoned attackers and environmental object interactions.

## 15.1 Physical Contact Requirements

All attack hitboxes must correspond to the actual position and movement of the attacking stickman's body parts, weapons or physical projectiles.

For melee attacks, the actual attacking body part or weapon must physically intersect the opponent's body during the valid attack window.

For weapon attacks, hitboxes must accurately follow the physical position and geometry of the weapon throughout its animation.

For projectile attacks, the actual projectile must collide with the opponent before damage is registered.

For summoned attackers, damage must originate from legitimate physical attacks and contact.

For area attacks, use an actual gameplay collision volume that intersects the opponent rather than relying on visual effects alone.

Do not register damage from attacks that have not connected, weapons that are visually nearby but have not made contact, visual effects without gameplay collision, attacks that hit empty space, disconnected weapons or damage calculations triggered solely by animation completion or ability activation.

## 15.2 Hitbox Accuracy and Reliability

Ensure hitboxes accurately follow their corresponding body parts, weapons and projectiles.

Update collision positions throughout the attack animation.

Ensure fast attacks and moving projectiles do not pass through opponents between physics updates.

Where necessary, implement continuous collision detection or swept collision checks to prevent tunnelling without introducing inaccurate contacts.

Use proper attack activation and recovery windows so damage cannot be triggered repeatedly by one continuous overlap.

Prevent duplicate damage from a single attack unless the ability is intentionally designed to deliver multiple separate hits.

Support different fighter proportions, weapon configurations, attack animations and projectile sizes.

## 15.3 Damage, Knockback and Reactions

Damage must only be applied after a valid collision has been confirmed.

Knockback, hit reactions, damage effects and combat feedback must originate from the same legitimate collision event.

Visual effects must never independently trigger damage.

Avoid modifying unrelated environmental physics or breaking existing attack interactions.

### Hit Detection Acceptance Criteria

1. Melee attacks only register damage when the actual attacking body part or weapon contacts the opponent.
2. Weapon hitboxes remain correctly aligned throughout animations.
3. Projectiles register damage only following actual physical contact.
4. Environmental objects only cause damage through actual collision.
5. Summoned attackers require legitimate physical contact.
6. Visual effects cannot independently cause damage.
7. Missed attacks deal zero damage.
8. Duplicate hits are prevented unless intentionally supported.
9. Fast moving attacks cannot pass through opponents because of collision update timing.
10. Knockback and hit reactions only occur after valid damage registration.
11. Different character proportions and weapon configurations are supported.
12. Existing combat abilities and environmental physics remain functional.

# PART 16. CLASH VICTORY MESSAGES

Replace the generic Clash Won and Clash Lost messages with the actual winning fighter's name.

The result screen must identify the fighter who actually won the match.

Examples include Prismor Won, Necro Won, Titan Won and Shroud Won.

The correct name must appear regardless of whether the player or opponent wins.

Determine the winner using the actual match outcome rather than assuming the player is always the winner.

Remove the generic Clash Won and Clash Lost messages from the result screen.

### Clash Acceptance Criteria

1. The actual winning fighter's name is displayed.
2. Results are correct when the player wins.
3. Results are correct when the opponent wins.
4. The system works with original and newly created fighters.
5. Generic Clash Won and Clash Lost messages are removed.
6. Existing Clash result functionality remains intact.

# PART 17. IMPLEMENTATION AND TESTING REQUIREMENTS

Work systematically and make targeted modifications to the relevant existing files.

Before implementation, identify the existing systems responsible for each requested feature and understand their dependencies.

After implementation, run all relevant available project checks, including automated tests, build checks, type checks and runtime tests.

Do not rely exclusively on checking whether the code compiles.

Test actual gameplay behaviour wherever the project has a working test environment.

## 17.1 Tournament Testing

Test tournament battles under normal conditions and situations where battles exceed their configured duration.

Verify that overtime begins correctly, both fighters continue participating and a legitimate winner is eventually determined.

Test matches involving different character types, including melee, ranged, defensive and mobility focused fighters.

Test the Skip Battle button at different stages of a fight.

Confirm that accelerated simulation or the alternative skip resolution produces a valid result and does not corrupt tournament progression.

Test multiple consecutive matches and complete tournament progression.

Verify that no duplicate results or incorrect bracket updates occur.

## 17.2 Character Balancing Testing

Test every fighter against a representative selection of opponents.

Use automated round robin or matchup simulations where possible.

Where the roster size permits, conduct a full matchup matrix.

Record the number of matches, win rates, average battle duration, damage statistics and other relevant performance measurements.

Do not claim exhaustive testing if only a sample of matchups was tested.

Identify the characters and matchups that could not be tested.

Validate that the universal balance framework can be used to evaluate future fighters.

## 17.3 AI Behaviour Testing

Test intelligent AI behaviour across different characters and combat situations.

Include fighters with high and low maximum HP, fighters starting with reduced health, fighters that become low on health during battle, ranged fighters, melee fighters, defensive fighters and mobility focused fighters.

Verify that each fighter changes its strategy according to its own statistics and available abilities.

Test whether AI fighters use defensive options appropriately, maintain useful attack distances, recognise openings, avoid wasting abilities and respond to opponents' behaviour.

Test different starting HP values to confirm that low health fighters adapt immediately rather than waiting until they have taken additional damage.

Verify that AI does not become excessively defensive, avoid combat indefinitely or repeatedly use the same actions.

Measure AI performance with multiple fighters to ensure decision making does not introduce unnecessary frame drops.

## 17.4 Selection Screen and Open Zone Testing

Measure selection screen loading behaviour before and after optimization where possible.

Inspect loading times, frame rates, asset initialization, memory usage and character switching responsiveness.

Test the screen with the complete character roster.

Ensure no missing assets, broken previews, incorrect animations or loading errors occur.

Revisit the selection screen multiple times to verify that caching and asset reuse work correctly.

Test Open Zone character switching repeatedly without leaving the game.

Verify that the current environment remains active, the camera follows the new character, controls work correctly and no duplicate player characters remain.

Test switching between characters with significantly different models, animations and ability configurations.

Confirm that switching does not cause noticeable lag or unnecessary scene reloads.

## 17.5 House of Nightmare Testing

Test House of Nightmare in both Fight and Hide and Seek modes.

Verify that the administrator can select any available fighter and start the intended mode.

In Fight mode, test movement, combat, collision, ability usage, environmental interactions and furniture destruction.

Verify that furniture only breaks when legitimate impact conditions are met.

Test different attacks, heavy attacks, knockback and object collisions against destructible furniture.

Ensure broken objects do not leave invisible collision barriers or cause significant performance problems.

Switch between Fight and Hide and Seek and verify that neither mode breaks the other.

Confirm that existing Hide and Seek locations, interactions and progression remain functional.

Test administrator permissions and ensure normal players cannot access administrator only mode controls.

## 17.6 Loading Screen Testing

Verify that the loading screen uses the correct main menu background image.

Confirm that the background is sufficiently darkened while retaining its original appearance and composition.

Check the Loading text position at the bottom right corner across supported resolutions.

Test actual scene loading and verify that the loading screen appears and disappears at the correct times.

Ensure the loading screen does not create unnecessary asset loading or performance issues.

## 17.7 Environment Testing

Conduct visual and functional testing for furniture transparency and curved wall improvements.

Test furniture transparency with the player behind furniture, in front of furniture, on top of furniture and moving around bookshelves.

Verify that furniture only becomes transparent when it genuinely blocks the camera's view.

Inspect the curved wall from different camera positions and confirm that the connection is visually seamless and that collision boundaries align with the geometry.

## 17.8 Character and Combat Testing

Test Prismor's transformations and attacks, Psion's object interactions, Necro's summons and healing, character balancing, walking animations, universal hit detection and Clash results.

Test Necro, Titan and Shroud against the original four fighters and newer characters using available combat test utilities or actual gameplay.

Test Telekinetic Toss and Psychic Slam with different environmental objects, including objects with different sizes and weights.

Verify grabbing, holding, throwing, collision, damage, knockback and normal physics restoration.

Test hit detection across melee attacks, heavy attacks, crystal weapons, projectiles, summoned attackers and environmental interactions.

## 17.9 UI Testing

Inspect all modified interfaces at supported screen resolutions and aspect ratios.

Verify button appearance, button interactions, hover states, pressed states, disabled states, text alignment, spacing and readability.

Ensure that the Skip Battle button works correctly and follows the established reference design.

Verify that selection screens, tournament screens, battle HUDs, result screens, Open Zone character switching and House of Nightmare mode selection remain visually consistent.

## 17.10 Project Integrity

Check that modifying one system does not unintentionally break another.

Fix any bugs introduced by these changes.

Use available automated combat simulations and test utilities where appropriate.

Do not invent test results or claim exhaustive matchup coverage when the necessary tests were not performed.

If a requested feature cannot be fully implemented because of limitations in the existing architecture, explain the specific limitation and what remains incomplete rather than providing a fake implementation.

# PART 18. FINAL ACCEPTANCE CHECKLIST

The update is considered complete only when the following requirements have been verified.

## Tournament

1. Tournament fights have a configurable time limit.
2. Overtime begins when the regulation duration expires.
3. Battles continue until a legitimate winner is determined.
4. A reliable fallback resolution exists where necessary.
5. The Skip Battle button is available.
6. Skipping does not randomly determine the winner.
7. Tournament progression and bracket advancement remain correct.

## Universal Character Balance

8. Every existing fighter has been reviewed.
9. Every newly created fighter is included.
10. Stats and abilities have been balanced using observed performance.
11. Damage, cooldowns, duration, range, speed and recovery have been considered.
12. No fighter consistently dominates unfairly.
13. Character identities and combat styles remain intact.
14. A reusable balance framework exists for future characters.

## Intelligent AI

15. AI decisions account for individual fighter statistics.
16. AI understands current and maximum HP.
17. Low health fighters change their tactics appropriately.
18. Fighters with low starting HP adapt from the beginning.
19. AI uses abilities according to their purpose and availability.
20. AI understands attack range, cooldowns and recovery.
21. AI responds to opponent behaviour and combat opportunities.
22. AI behaviour remains distinct between character types.
23. AI does not repeatedly perform irrational or wasteful actions.
24. AI performance remains stable with multiple fighters.

## Selection Screen and Open Zone

25. The selection screen opens smoothly.
26. Unnecessary lag and loading delays have been reduced.
27. Character switching remains responsive.
28. Asset caching and loading optimizations work correctly.
29. Open Zone players can switch characters without leaving the game.
30. The current Open Zone state remains intact after switching.
31. The camera, controls, abilities and character configuration update correctly.
32. Character switching does not introduce noticeable lag.

## House of Nightmare

33. House of Nightmare is available as a combat arena.
34. House of Nightmare retains its Hide and Seek mode.
35. Admin Mode includes a Fight and Hide and Seek toggle.
36. Administrators can select their preferred character.
37. Selected characters use their actual combat configurations.
38. Furniture breaks through legitimate combat impacts.
39. Broken furniture behaves correctly.
40. Both game modes remain functional and independent.

## Environment

41. Furniture remains opaque unless it genuinely obstructs the camera's view of the player.
42. Furniture transparency activates and clears correctly.
43. The curved wall and adjoining wall form one continuous structure.
44. Wall geometry, appearance and collision boundaries are correctly integrated.

## UI and Loading Screen

45. Previously supplied UI reference images are located and inspected where accessible.
46. UI reference files are preserved.
47. UI_REFERENCE_GUIDE.md documents the visual design requirements.
48. Buttons follow the established visual reference.
49. UI elements have consistent styling and interactions.
50. Tournament and battle interfaces follow the same design system.
51. Loading screen uses the main menu background image.
52. Loading background is darkened.
53. Loading text appears in the bottom right.
54. Loading transitions remain smooth.

## Prismor

55. Crystal Arsenal is renamed to Shard Blade.
56. Dual crystal swords are physically connected to Prismor's hands.
57. The five hit combo has stronger damage and varied animations.
58. The final combo hit performs the extended crystal piercing punch.
59. Heavy Attack creates and uses the massive crystal hammer.
60. Ultimate activates the original Crystal Armour transformation.
61. All weapons and armour remain properly aligned throughout their animations.

## Necro and Character Balancing

62. Necro summons exactly four skeletons.
63. Soul Drain restores 15% of actual health damage dealt.
64. Necro, Titan and Shroud have been rebalanced through actual combat testing.

## Walking Animations

65. Every newly created fighter has improved natural walking animations.
66. The original four fighters' walking animations remain unaffected.

## Psion

67. Psychic Barrier is replaced with Telekinetic Toss.
68. Telekinetic Throw is renamed to Psychic Slam.
69. Telekinetic Toss grabs and holds actual environmental objects.
70. Psychic Slam uses the grabbed object for a physical attack.
71. Damage and knockback are calculated from physical object characteristics.
72. Missing objects and invalid activation are handled correctly.
73. Environmental object physics remain functional.

## Combat and Results

74. Universal hit detection requires legitimate physical contact.
75. Visual effects and disconnected attacks cannot independently register damage.
76. Collision and damage registration work correctly across relevant attack types.
77. Clash results display the actual winning fighter's name.

## Project Integrity

78. Existing unrelated functionality remains intact.
79. Available automated tests and project builds pass.
80. Actual gameplay testing has been performed for modified features, with untested areas clearly identified.
81. Remaining issues and architectural limitations are documented.

# PART 19. FINAL DEVELOPMENT REPORT

After implementation and testing, provide a structured report.

## Files Modified

Identify every modified file and explain its purpose.

## Tournament Changes

Summarise the time limit, overtime behaviour, Skip Battle functionality, winner determination and tournament progression improvements.

## Character Balancing

Explain the overall balancing methodology, changes to individual fighters, combat statistics, ability adjustments and future balancing framework.

Include available matchup results and performance measurements.

## AI Improvements

Explain how AI evaluates its own statistics, health, available abilities, opponents and current combat conditions.

Describe how low health fighters and fighters with low starting HP adapt their tactics.

Explain how different character types retain individual combat behaviours.

Include actual AI testing results.

## Selection Screen Performance

Explain the loading optimizations, caching, rendering improvements and measured performance changes.

## Open Zone Changes

Explain the in game character switching system, asset reuse, player replacement, camera updates and how the existing Open Zone state is preserved.

## House of Nightmare Changes

Explain how House of Nightmare was integrated as a combat arena, how the administrator selects characters, how the Fight and Hide and Seek toggle works and how furniture destruction behaves.

## Environment Changes

Summarise furniture transparency and curved wall improvements.

## UI and Loading Screen Changes

Explain the button redesign, interface improvements, reference images used and how the visual guidelines were preserved for future development.

Describe the darkened main menu background loading screen and bottom right loading indicator.

## Character Changes

Summarise Prismor, Necro, Titan, Shroud and newly created fighter animation changes.

## Psion Changes

Explain Telekinetic Toss and Psychic Slam, including object acquisition, physics and collision behaviour.

## Combat System Changes

Explain hit detection, damage registration and other relevant combat improvements.

## Testing Performed

List actual automated tests, build checks, runtime checks, gameplay tests, tournament tests, AI tests, performance tests and character matchups performed.

## Test Results

Identify which acceptance criteria passed, failed or could not be verified.

## Remaining Issues

Clearly identify unresolved bugs, architectural limitations or incomplete features.

Do not claim that a feature is complete merely because its code has been written.

Distinguish between successful implementation, successful build verification and actual gameplay verification.

# FINAL DEVELOPMENT PRIORITY

Prioritise intelligent AI, physical accuracy, animation quality, proper character integration, reliable collision detection, balanced gameplay, tournament integrity, selection screen performance and visual consistency.

Tournament fights must conclude within a reasonable duration while continuing until a legitimate winner is determined.

Spectators must be able to skip fights without corrupting tournament results or progression.

Every fighter must be balanced against the existing roster, with a consistent framework for future characters.

AI fighters must understand their own strengths, weaknesses, health, abilities and combat limitations. They must adapt their strategies to survive, attack and counter opponents intelligently.

The character selection screen must load smoothly without sacrificing the quality of character previews.

Open Zone players must be able to switch characters without leaving or restarting their current session.

House of Nightmare must function as both a combat arena and its original Hide and Seek environment. Admin Mode must provide character selection and a clear mode toggle.

Furniture must break appropriately during combat without compromising environmental physics or performance.

The loading screen must use a darker version of the existing main menu background image with the loading text positioned in the bottom right corner.

The UI must follow the actual reference images previously supplied, and their visual design requirements must be preserved in project documentation for future development sessions.

Furniture transparency must be based on genuine camera obstruction rather than player proximity or collision overlap.

The curved wall must look like one continuous architectural structure.

Crystal weapons and armour must look physically integrated with Prismor.

Psion must interact with actual environmental objects rather than visual substitutes.

Combat damage must depend on legitimate collision rather than visual effects or disconnected animations.

Do not use placeholder animations, fake projectiles, detached geometry, visual only collision, instant damage shortcuts or temporary implementations.

Do not unnecessarily replace working systems.

The final result must feel like a polished, balanced, intelligent, cohesive and fully integrated Stickman Arena game.

Complete the implementation systematically, verify the actual gameplay behaviour and document all results honestly.
