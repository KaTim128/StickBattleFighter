# STICKMAN ARENA — MASTER SPECIFICATION

> **Status:** Authoritative source of truth for all game requirements.
> **Version:** 1.0 (initialisation) · **Created:** 10/11/2026
> **Primary source:** *Stickman Arena Complete Claude Code Playbook* v1.2 (08/11/2026), copy at `docs/references/Stickman_Arena_Complete_Claude_Code_Playbook_v1.2.docx`.
> **Secondary sources:** the project owner's initialisation instructions (10/11/2026), two owner-supplied gameplay videos (see `docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`), and the owner's instruction to use Creature Clash's abilities as a reference (see `docs/references/CREATURE_CLASH_OBSERVATIONS.md`).

## How to read this document

- Every requirement has an ID (`REQ-<area>-<n>`). Cite IDs in tasks, commits, tests and reports.
- **Source tags** show where a requirement came from: `[PB §x]` = playbook section, `[OWNER]` = owner's direct instruction, `[REF-VIDEO]` / `[REF-CC]` = derived from a reference (presentation targets, not mechanics, unless the owner approves).
- **Precedence rule** `[PB §4.1]`: when the same feature is described differently, the **most recent explicit instruction wins**. Superseded rules stay in §22 labelled *SUPERSEDED* so they cannot be mistaken for active rules.
- Anything unclear, conflicting or missing is in **§21 Open Questions**. Do **not** implement against an open question without an owner decision recorded in `TECHNICAL_DECISIONS.md`.
- Do not silently delete or weaken a requirement. Changes to this file need a dated entry in §23 Change Log.

## Important gap

The playbook says the master specification should hold "the complete original Stickman Arena requirements, including the main game systems and later requirements…" `[PB §4.1]`. **No separate original requirements document was supplied.** This specification was built from everything the playbook contains (sections 4, 8, 12, 14, 15 and 17 especially) and from the owner's instructions. Where the original requirements would have given numbers (stamina values, prices, rewards, cooldowns, story content and so on), they are **missing** and listed in §21. If the owner has the original requirements text, add it here and reconcile it. **Update 10/11/2026:** the owner does not remember the original requirements, so this specification (playbook-based) stands as the baseline. Missing numbers are decided per phase and recorded as TD entries with owner sign-off.

---

## 1. Game vision and identity

| ID | Requirement | Source |
|---|---|---|
| REQ-VIS-1 | Stickman Arena is an **original**, browser-based, **2D top-down, real-time arena fighting game**. Everything is 2D: arenas, fighters, effects and UI. | [OWNER 10/11/2026] (supersedes the playbook's "fully 3D", SUP-04) |
| REQ-VIS-2 | **Free movement in every direction** across the arena floor, seen from above: up/down (front/back), left/right and diagonals, like Creature Clash. | [OWNER 10/11/2026] [PB §4.3, §14.1] |
| REQ-VIS-3 | **No** side-scrolling, side view or single fighting lane: the arena is viewed from above and fighters can go anywhere on it. (The playbook's ban on "flat 2D sprite combat" is superseded, SUP-04.) | [PB §4.3, §4.4, §14.1] [OWNER] |
| REQ-VIS-4 | Players can circle, retreat, approach from behind, reposition, dodge and use obstacles tactically. | [PB §14.1] |
| REQ-VIS-9 | **Depth in 2D:** objects lower on the screen draw in front (y-sorting); jumping, thrown objects and airborne attacks show height with a ground shadow. | [TD-021] |
| REQ-VIS-11 | **2.5D pseudo-isometric look (owner approved the mockups, 11/11/2026):** the arena is drawn on a 2:1 isometric grid (about 26.6°) with light-wood floors, bevelled furniture and walls lit from the top-left, soft drop shadows and ambient occlusion; back walls stand tall with windows, front walls are low ledges; fighters are upright stick figures with volume; Inferno's head is a living flame that lights the floor around it. The simulation stays top-down in metres (REQ-VIS-1 still holds for gameplay: free 2D movement on the floor). Keys and the joystick move along the screen; fighters face any direction and attacks soft-lock toward nearby opponents. Depth sorting uses x + y (REQ-VIS-9). Mockups: `docs/mockups/`. |
| REQ-CTL-16 | **Dodge button and character dodges (owner, 11/11/2026):** touch has a DODGE button beside the utility button (a movement verb, not one of the five combat buttons, INV-9), showing its cooldown as it refills; desktop keeps Shift and the joystick flick. A dodge goes the way you push, or backwards. Its cooldown depends on body weight (0.15 s + 0.0055 s per kg, so 70 kg ≈ 0.54 s, 140 kg ≈ 0.92 s). Each character dodges in its own way from its Animation Profile's `Dodge` clip: the default stickman tucks and rolls backwards; Inferno's body bursts into a flame that streaks backwards and reforms. |
| REQ-PHY-6c | **Tough metal (owner, 11/11/2026):** materials have a toughness; metal takes only 45% of each blow's damage (stone 60%), so filing cabinets, steel drawers, snack shelves and coffee machines are much harder to break. |
| REQ-PHY-9b | **More throwables and fighter object styles (Phase 7):** every cubicle desk carries a book, stapler, water bottle or paper stack; fire extinguishers stand by the walls and burst into foam when broken. While carrying, a dotted arc and landing ring show where the throw will land (it clears furniture, stops at walls). Each fighter's Stats Profile sets `objects`: the heaviest thing it can lift (default 15 kg), its throw power, and whether its throws catch fire (Inferno: thrown objects burn in flight and set the target alight). |
| REQ-VIS-10 | **Dynamic wall transparency (owner, 11/11/2026):** any wall section, door, pillar or prop drawn in front of a fighter and covering it fades to about 30% opacity over about 0.2 s, and restores smoothly when no longer covering; only the covering sections fade; it works continuously, including between rooms and for moving furniture, so combat is never hidden. |
| REQ-VIS-5 | All characters, abilities, VFX, animations, UI, arenas, progression and identity must be original. References are for learning only. | [PB §4.4] [OWNER] |
| REQ-VIS-6 | Stickman Arena is **not** a Pokémon game, a creature-collection game, or a turn-based battle game. No Pokémon branding or implied affiliation. | [PB §4.5] [OWNER] |
| REQ-VIS-7 | Stickman Arena is a **standalone repository**, separate from the Froggy project. | [PB §1, §3.1] |
| REQ-VIS-8 | **Single player against AI only** for now. Every opponent and teammate in every mode is AI-controlled. Online multiplayer may come later; the architecture keeps that path open (fixed-timestep simulation, device-independent intents) but no netcode is built. | [OWNER 10/11/2026] (resolves OQ-13) |

## 2. Reference material and how it may be used

### 2.1 Reference roles

| Ref | Role | Allowed use | Forbidden |
|---|---|---|---|
| **Creature Clash** (Froggy project, `KaTim128/froggy-arcade`) | Primary reference for free arena movement, navigation, positioning around opponents, collision, arena exploration `[PB §4.4]`. Owner (10/11/2026) also allows **its abilities as a reference** `[OWNER]`. | Study design goals and ability *concepts* (delivery types, effect categories, ultimate design philosophy, AI behaviour ideas). Recreate them with an original architecture. | Importing, modifying or copying Froggy code or assets. **Froggy is read only** and must never be modified by Stickman Arena workers `[PB §4.3, §17.1]`. |
| **Stickman Kombat 2D** (Playgama, by Ernar / Tempo Play; **confirmed by owner 10/11/2026**) | Reference for **style and feel**: the character of its sound effects and its attacks, plus combat readability, hit feedback, attack timing, combo pacing, defensive choices, fighter differentiation and beginner guidance `[PB §4.4]` [OWNER]. **Movement does NOT follow it**: movement follows Creature Clash (free movement around the whole map, not side to side) [OWNER]. | Study the style, punchiness and feel of attacks and sound effects, then create **original** attacks and **original** sound effects with a similar feel. Patterns to *evaluate*: timed combo windows, attacks from behind, aerial follow-ups, blocks, counters, clear hit reactions. | Its characters, designs, exact move list, animation sequences, interface, sound, arena layouts, source code or assets. It must **never** push the game towards side view, side-scrolling or lanes. Not a reference for 3D movement, camera or arena structure `[PB §4.3]`. |
| **Owner-supplied gameplay videos** (two files; they show Pokémon fan games) | Visual and animation reference for how combat should **look and feel** `[PB §4.5]` [OWNER]. | Transferable presentation principles: anticipation, wind-up, timing, impact frames, hit reactions, knockback, recovery, ability activation, camera framing, VFX, particles, lighting, trails, sound cues, readability. | Pokémon characters, creatures, names, designs, moves, type system, battle rules, collection mechanics, evolution, UI, music, sound, exact animation sequences, any protected expression. |

### 2.2 Reference translation rules `[PB §4.4, §4.5]`

1. Keep the game 2D top-down with free movement in every direction across explorable arenas (REQ-VIS-1/2).
2. Design original attacks that account for real distance, facing, obstacles, hitboxes, hurtboxes and physics in the 2D arena plane, plus airborne state where relevant.
3. Treat combo windows, attacks from behind, aerial follow-ups, blocks, counters and hit reactions as **optional patterns**, each checked against the five-action layout (§7) and balance. **Do not add actions that contradict the approved controls.**
4. The video may shape how the five actions are **presented**, but must not silently change the control layout or game design.
5. If a reference cannot be accessed, report it and work from public descriptions or owner-supplied screenshots or videos. Never claim to have inspected gameplay you did not see.
6. Reference research for a milestone is done by a specialist who writes an observation report: the design lesson, how it translates to the original 2D top-down game, the relevant REQ ID, and any conflict. **The Master Developer decides** whether to adopt it `[PB §4.4]`.

### 2.3 Reference reports already produced

- `docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`: Video Reference Observation Report for both videos `[PB §4.5]`.
- `docs/references/CREATURE_CLASH_OBSERVATIONS.md`: read-only Creature Clash observation report, covering movement, arena and the ability catalogue.
- Stickman Kombat 2D: **not yet inspected** (not attached, and no gameplay access during initialisation). The owner confirmed it as the style, feel, attack and sound-effect reference (10/11/2026). A `/reference-observation` report is scheduled for Phase 5–6, before attacks and sound effects are designed; it needs access to the game or owner-supplied footage.

## 3. Design invariants (must never be broken) `[PB §4.3]`

| ID | Invariant |
|---|---|
| INV-1 | **2D top-down free movement** in every direction (owner, 10/11/2026). No side-scrolling, side view or single fighting lane. |
| INV-2 | Creature Clash is a read-only reference, never a source of copied code or assets. |
| INV-3 | Stickman Kombat 2D is a secondary reference for presentation, timing, combo flow, defence and tutorial ideas only. |
| INV-4 | The Froggy project is never modified by Stickman Arena workers. |
| INV-5 | **One common combat engine** serves all fighters and all game modes. |
| INV-6 | **One shared, input-independent combat layer** supports keyboard and touchscreen. |
| INV-7 | Profiles, rewards, tutorial completion and administrator access are **persistent and server validated** once backend work begins. |
| INV-8 | No feature is complete until it has a working implementation and appropriate tests. |
| INV-9 | ~~Exactly **five** combat actions (§7).~~ **Six** combat actions (owner, 12/11/2026, SUP-20): melee, four abilities and the ultimate. The mobile HUD shows exactly six combat buttons. |

## 4. Technical architecture

| ID | Requirement | Source |
|---|---|---|
| REQ-ARC-1 | Browser-based game. | [PB §7] |
| REQ-ARC-2 | Modular systems with single sources of truth. | [PB §7] |
| REQ-ARC-3 | **Data-driven** fighter, attack, ability, arena and game settings. | [PB §7] |
| REQ-ARC-4 | Input devices are kept separate from gameplay rules. | [PB §7, §8.4] |
| REQ-ARC-5 | Shared combat and physics systems are reusable across modes. | [PB §7] |
| REQ-ARC-6 | Avoid duplicate logic and premature abstractions. | [PB §7] |
| REQ-ARC-7 | Before choosing an engine, compare **at least two** plausible rendering approaches and explain the choice. Do not install competing engines just to test. | [PB §6] |
| REQ-ARC-8 | Evaluate browser 2D renderers, physics engines, animation pipelines, asset formats, UI approaches and backend options. | [PB §6] |
| REQ-ARC-9 | Check toolchain version requirements (for example Vite's Node requirement) during architecture planning. Do not pin old versions blindly. | [PB §3.2] |
| REQ-ARC-10 | Engine-agnostic fighter logic: avoid fighter-specific branches inside the shared engine where configuration or ability components fit. | [PB §8.5] |
| REQ-ARC-11 | Content pipeline must scale (toward 100 fighters) without rewriting core systems. | [PB §12 Phase 15] |
| REQ-ARC-12 | Changing the approved rendering or physics architecture after implementation starts requires owner approval. | [PB §17.1] |

Selected stack (TD-021, after the switch to 2D): TypeScript + Vite, **PixiJS 8** (2D WebGL renderer), **Rapier 2D** physics, Vitest + Playwright. The playbook's 3D candidates (Three.js, Blender) are superseded.

## 5. 2D environments and arenas

### 5.1 Camera (2D top-down) `[OWNER 10/11/2026]` `[TD-021]`

| ID | Requirement |
|---|---|
| REQ-CAM-1 | Top-down 2D camera that **follows the player** smoothly. |
| REQ-CAM-2 | Keeps the **opponent(s) in frame**, zooming out automatically when fighters spread apart (within limits) and in when close. |
| REQ-CAM-3 | Clamped to the arena bounds (never shows large empty space beyond the walls when avoidable). |
| REQ-CAM-4 | Screen shake, flash and short zoom punches for impacts and ultimates (PRS-3, PRS-8), stable under knockback. |
| REQ-CAM-5 | No manual camera rotation; the view is always from above. *(Supersedes free 3D camera rotation, orbit and obstruction handling: SUP-04.)* |

### 5.2 First arena: the office `[PB §12 Phase 4, §14.4]`

| ID | Requirement |
|---|---|
| REQ-ENV-1 | A fully explorable office arena built with reusable scene and asset systems. |
| REQ-ENV-2 | Open combat zones **and** tighter routes. |
| REQ-ENV-3 | Furniture: desks, meeting tables, office chairs, computers, keyboards, mice, cabinets, glass partitions, windows, plants, water dispensers, rubbish bins and other office equipment. |
| REQ-ENV-4 | Correct geometry, materials and collision. All paths navigable; no furniture blocks the player incorrectly. |
| REQ-ENV-5 | Readable for combat; performance-aware. |
| REQ-ENV-6 | Greybox assets recorded separately from final art. |

### 5.2a Office layout and breakable door (owner, 11/11/2026)

| ID | Requirement |
|---|---|
| REQ-ENV-8 | Main office floor with **12 cubicles: 6 on each side** of a central aisle. | *Updated 11/11/2026 (owner):* the 12 cubicles stand in the **centre** as **six back-to-back pairs** (one opening north, one south, sharing the back panel), with walkways between the pairs and aisles north and south.
| REQ-ENV-9 | A separate **boss room** with an **executive desk, a boss chair behind it and a visitor chair opposite**. Each room has its own look (floor, walls, decor). |
| REQ-ENV-10 | The camera follows smoothly between rooms, keeping active characters in view, with **no hard cuts**. |
| REQ-ENV-12 | **Compact office (owner, 11/11/2026):** the office is tight, with no large empty space in the centre and a short overall length (29 m × 12 m; aisle ≤ 7.5 m between cubicle rows). | *Updated 11/11/2026:* 33 m × 12 m to fit the centre cubicle block and an open area before the boss door.
| REQ-ENV-11 | The rooms are joined by a door that starts **closed and blocks the way**. *(Updated 11/11/2026, owner: walking into it now swings it open, REQ-ENV-13; the 'walking never opens it' rule is SUP-07.)* It **breaks** (shatters violently, clearing the path) when a fighter lands a **kick** or a **heavy-impact knockback attack** against it. Implemented as: kick, combo finisher (heavy strike) or a body knocked into it, at ≥ the door's break strength. |
| REQ-ENV-13 | **Easy-to-find, walk-through door (owner, 11/11/2026):** the boss-room wall is **curved** (owner's later sketches: an arc meeting the top and bottom walls near x 23.6 m and bowing into the boss room to x 26.2 m, where the door is) so its face and the door can be seen; the boss room keeps the floor in front of the door open (desk set back in the top corner, meeting table in the bottom corner); the door is **small** (1.3 m) with a bright frame, red mats on both sides and a floor arrow. A firm walk into it swings it open away from the walker; it swings shut once the doorway is clear; it can still be smashed. Interior walls are drawn cut away (0.8 m) so doorways show where they are on the floor. |
| REQ-ENV-14 | **Furnished office (owner, 11/11/2026):** the empty wall space is filled with themed corners while both combat aisles stay clear: file cabinets, bookshelves and two print stations; a kitchenette (counter with a coffee machine, microwave and mug, a snack shelf and a vending machine); a calling room of two glass phone booths; a small lounge (sofa and plants). New items keep the material, durability and pickup rules (the coffee machine and microwave can be thrown; the vending machine and booths break but never move). |
| REQ-ENV-15 | **Furniture faces the room; a tall, breakable glass-door wall (owner, 11/11/2026):** pieces against a wall face into the room (we see their backs from the camera side: the bottom-wall shelves, sofa, booths, cabinets and printers, and the boss room's wall cabinets); chairs face their desks and tables. The curved wall stands full height (2.2 m) so it never looks jumpable, with a glass door in a metal frame. The wall is made of 24 sections of 900 points each (plaster takes 60% of a blow): punching one spot chips only the section hit, so about six or seven full combos open a small hole too narrow to pass; two neighbouring holes make a walkable gap; blasts (×3) and fighters knocked into it chip it too, but never the whole wall. Cracks show as a section weakens; a break throws rubble and dust. |

Design sheet: `docs/design/arenas/office.md`.

### 5.3 Future arenas `[PB §12 Phase 15, §14.4]`

REQ-ENV-7: playground, street, jungle and field arenas, each with suitable local obstacles, throwable objects and material responses.

## 6. Physics and environmental interaction

### 6.1 Movement physics `[PB §8.4, §12 Phase 2–3]`

| ID | Requirement |
|---|---|
| REQ-PHY-1 | Reusable 2D top-down character controller (circle or capsule body on the floor plane). |
| REQ-PHY-2 | Free movement in all directions with acceleration, deceleration, facing direction, running, obstacles and **jumping as a short hop** (airborne height with a ground shadow; the player is airborne for a moment and avoids ground-level hits). There is no gravity in the floor plane, and no slopes or stairs. *(3D gravity, slopes and stairs superseded: SUP-04.)* |
| REQ-PHY-2a | **Higher jump (owner, 11/11/2026):** the jump clearly separates the fighter from the floor (peak about 1 m, about 0.65 s airtime), with a distinct **jump stance**: rising (lead knee driven up) and falling (legs tucked, arms out), plus a landing dip. |
| REQ-PHY-3 | Friction, knockback, and per-fighter weight and mobility values. |
| REQ-PHY-4 | Collision layers, rigid bodies, camera collision, navigation integration, physics performance. |

### 6.2 Object material model `[PB §14.4]`

| ID | Requirement |
|---|---|
| REQ-PHY-5 | Objects have **material, mass and durability** properties. |
| REQ-PHY-6 | Fragile glass can shatter. Wooden furniture can move, topple or break. Metal objects resist more damage. Some objects are movable but not destructible. |
| REQ-PHY-6a | **Struck furniture reacts (owner, 11/11/2026):** when a fighter hits a table, chair or other prop (or is knocked into it), the prop **moves or breaks depending on its durability**. Walking into furniture does not shove it. Items on a desk move with it and fall when it breaks. Debris counts are capped (REQ-PHY-7). |
| REQ-PHY-6b | **Breakable office equipment (owner, 11/11/2026):** computers (screens) and other desk items can be punched: weak items shatter, survivors are knocked off the desk; each cubicle has a steel drawer pedestal; steel drawers (260), filing cabinets (450) and office tables (320; executive desk 450) need far more damage. Destruction looks and sounds like its material: wood splinters with sawdust and a crack, steel plates with sparks and a clang, glass shards with glints and a shatter, plastic chunks, fabric stuffing with a soft rip. |
| REQ-PHY-7 | Avoid uncontrolled debris and expensive physics for cosmetic objects. `[PB §8.6]` |

### 6.3 Pickup, carry and throw `[PB §12 Phase 7, §14.4]`

| ID | Requirement |
|---|---|
| REQ-PHY-8 | Reusable pickup, carrying, aiming, throwing, impact, bouncing, rolling, breaking and destruction systems. |
| REQ-PHY-9 | Initial throwables: coffee cups, water bottles, staplers, books, folders, keyboards, mice, small decorations, chairs, rubbish bins, paper bundles, fire extinguishers. |
| REQ-PHY-10 | Thrown objects use proper physics and collide with fighters, walls, furniture and floors. |
| REQ-PHY-11 | Office props behave physically and **can support combos**. |
| REQ-PHY-12 | **Sand** can temporarily impair opponent visibility or accuracy when it hits. (Listed under the office arena; probably meant for a future arena. See OQ-12.) |
| REQ-PHY-13 | Fighter-specific object interactions go through data and ability interfaces (§8.4). |

## 7. Controls and combat action layout

### 7.1 The five-action layout (LOCKED) `[PB §4.2]`

| Action | Purpose | Rule |
|---|---|---|
| **Button 1** | Universal melee | Every fighter has it. **No stamina cost.** |
| **Button 2** | Unique ability 1 | Fighter-specific. Configurable cost, cooldown and animation. |
| **Button 3** | Unique ability 2 | Fighter-specific. Configurable cost, cooldown and animation. |
| **Button 4** | Unique ability 3 | Fighter-specific. Configurable cost, cooldown and animation. |
| **Button 5** | Ultimate | Fighter-specific powerful signature attack with its own charge or cooldown rule. |

- Fighters may still have **combo chains and multiple animation variations**, but the mobile HUD shows **exactly five** combat buttons `[PB §4.2]`.
- This supersedes the older "four basic attack buttons plus four abilities" layout (see §22, SUP-01).
- **Resolved (TD-016, 10/11/2026):** block = hold Button 1; dodge = flick the movement stick (or a dodge key on desktop); jump, pick up and throw = one contextual **utility** button that is not a combat button; automatic soft target lock. The full scheme, layouts and default bindings are in `docs/design/CONTROL_SCHEME.md`, which is part of this specification.

| ID | Requirement | Source |
|---|---|---|
| REQ-CTL-11 | Block by **holding Button 1** (hold threshold data-driven, default 0.2 s); a tap is melee. | [TD-016] |
| REQ-CTL-12 | Dodge by **flicking the movement stick** on touch (optional double-tap mode) or the dodge input on desktop (default **right click**, REQ-CTL-17). *(Shift as the dodge key superseded: SUP-09.)* | [TD-016] |
| REQ-CTL-13 | One **contextual utility button** (jump / pick up / throw; hold to drop), visually distinct from the five combat buttons. Desktop has Space for jump and a separate interact key. | [TD-016] |
| REQ-CTL-14 | Automatic soft target lock on the nearest visible opponent; switch with a tap on the opponent or Tab. Aim assist never guarantees hits. | [TD-016] |
| REQ-CTL-16 | **Touch buttons never highlight (owner, 11/11/2026):** holding a button (for example MELEE to block) must not select or highlight its label or open a long-press menu. |
| REQ-CTL-15 | ~~Two desktop presets: keyboard + mouse (default) and keyboard only.~~ One rebindable desktop layout (REQ-CTL-17). *(Superseded: SUP-10.)* | [TD-016] |

### 7.2 Desktop `[PB §8.9, §12 Phase 11]`

| ID | Requirement |
|---|---|
| REQ-CTL-1 | WASD movement and configurable keyboard bindings. |
| REQ-CTL-2 | Desktop shows keyboard controls and **no** virtual joystick and **no** mobile combat buttons. |
| REQ-CTL-3 | Key rebinding, reset to defaults, conflict prevention. |
| REQ-CTL-17 | **Default desktop controls and Settings (owner, 11/11/2026; TD-049):** W/A/S/D move · hold Shift sprint (about 45% faster while running freely) · Space jump · left click tap attack (hold: block) · right click dodge (always straight back, REQ-CTL-20; *toward the held direction superseded: SUP-17*) · Q/E/R abilities 1–3 · F ultimate · G grab, G again to throw. A **Settings** screen (gear button or Esc; the fight pauses while open) has an **Audio** tab (separate music and sound-effect volume sliders, applied immediately) and a **Controls** tab where every action can be rebound to any key or mouse button, with **Reset to defaults**. A key already in use is refused with a clear message naming the action that has it ("W is already assigned to Move up"); Esc, M, T, P and \` are reserved. Settings persist in the browser between sessions. The browser's right-click menu is disabled over the game area. |
| REQ-CTL-18 | **Mouse-aimed leap ultimate (owner, 11/11/2026; Inferno's Meteor Fist):** press the ultimate key to aim, hover the mouse over the landing spot (the ring follows the cursor, clamped to the leap's range; W/A/S/D still nudge it), then **left click** to jump there (pressing the ultimate key again also launches). The click launches and never punches. The launch input is its own rebindable control: it may share its key only with the tap attack or the ultimate key (it only acts while aiming), never with movement, sprint, jump, dodge, grab or an ability. |

### 7.3 Mobile and tablet `[PB §8.9, §12 Phase 11]`

| ID | Requirement |
|---|---|
| REQ-CTL-4 | **Left** movement joystick; **exactly five** combat buttons on the **right**. Button 1 = stamina-free melee, buttons 2–4 = fighter abilities, button 5 = ultimate. |
| REQ-CTL-5 | Simultaneous touch input (move and attack at once). |
| REQ-CTL-6 | Landscape layout. |
| REQ-CTL-7 | Cooldown and stamina indicators. |
| REQ-CTL-8 | Responsive layouts across multiple viewport sizes; accessibility. |
| REQ-CTL-9 | Both input layouts work independently (and, per the Phase 11 exit condition, "simultaneously"; see OQ-14). Test on actual desktop and mobile devices. |
| REQ-CTL-10 | One input abstraction feeds the shared combat layer (INV-6). |

## 8. Characters

### 8.1 Initial roster `[PB §14.2]`

| Fighter | Identity | Signature design direction |
|---|---|---|
| **Inferno** | Fire elemental | Flame attacks, ignition, explosions and fire projectiles. |
| **Shadowfang** | Supernatural vampire- or werewolf-inspired fighter | Aggressive close combat, supernatural movement and shadow abilities. |
| **Ronin** | Sword specialist | Precise sword attacks, counters, deflection and projectile techniques. |
| **Titan** | Heavy robot | High defence, powerful strikes, knockback resistance and heavy object handling. |
| **Phantom** | Supernatural magic fighter | Illusions, teleportation, levitation, ranged magic and object redirection. |

| ID | Requirement |
|---|---|
| REQ-CHR-1 | Each of the five needs a distinct model, proportions, silhouette, materials, animations, movement identity, strengths and weaknesses. |
| REQ-CHR-2 | All have the same five action slots, but the three abilities and the ultimate must be **genuinely unique** per fighter. |
| REQ-CHR-3 | **No recolours** as unique fighters. A consistent rig contract where practical, without making fighters look like recoloured copies. `[PB §8.7]` |
| REQ-CHR-4 | The first complete fighter becomes the approved **quality benchmark** for all others. `[PB §12 Phase 8]` |
| REQ-CHR-5 | Long-term expansion toward **100 fighters**, in batches, with no shallow recolours. `[PB §12 Phase 15]` |
| REQ-CHR-6 | Unavailable assets are never invented. Temporary greybox assets are clearly labelled and final asset requirements recorded. `[PB §8.7]` |
| REQ-CHR-7 | Validate missing assets and missing animation states. `[PB §8.7]` |

### 8.2 Stats `[PB §14.3]`

The central fighter definition supports these stats, all data-driven and balanceable:
**HP, Speed, Power, Stamina, Defence, Avoidance, Attack Range, Attack Speed, Recovery Speed, Critical Chance, Critical Damage, Knockback Resistance, Mobility.**

No numeric values were supplied (OQ-05).

### 8.3 Fighter–object interactions `[PB §14.5]`

| Fighter | Example interaction |
|---|---|
| Titan | Lift and throw heavier objects; resist knockback. |
| Shadowfang | Throw lightweight objects rapidly; agile repositioning. |
| Ronin | Deflect or precisely launch projectiles. |
| Phantom | Levitate, redirect or magically reposition objects. |
| Inferno | Ignite suitable objects through abilities. |

## 9. Combat systems

| ID | Requirement | Source |
|---|---|---|
| REQ-CMB-1 | Shared combat state machine, attack timing, hitboxes, hurtboxes, target validation, damage, recovery, stun, knockback, interruptions, block, dodge, counter, and death or defeat states. | [PB §12 Phase 5–6] |
| REQ-CMB-2 | **Real spatial hit detection**: results depend on actual 2D arena positions (plus airborne state), attack direction, timing, range, line of sight and obstruction. **No guaranteed hits.** | [PB §8.5, §12] |
| REQ-CMB-3 | Outcomes supported: hit, miss, dodge, block, interrupt, counter, recovery. | [PB §8.5] |
| REQ-CMB-4 | Health, stamina, cooldowns. Melee costs no stamina; abilities have configurable stamina cost and cooldown. | [PB §4.2, §12] |
| REQ-CMB-5 | Abilities support cooldowns, stamina, targeting, animation, range, collision, VFX and sound, plus interruption. | [PB §11.1, §12] |
| REQ-CMB-6 | Projectiles. | [PB §12 Phase 6] |
| REQ-CMB-7 | Critical chance and critical damage (from stats). | [PB §14.3] |
| REQ-CMB-8 | Combos: fighters may have combo chains; timed combo windows are an optional pattern to evaluate (§2.2). | [PB §4.2, §4.4] |
| REQ-CMB-9 | Fighter values data-driven; no fighter-specific branches in the shared engine where data or components fit. | [PB §8.5] |
| REQ-CMB-10 | Unit and integration tests for every combat rule changed: hits, misses, blocks, dodges, interruptions, cooldowns, stamina, knockback. | [PB §8.5, §15] |
| REQ-CMB-12 | ~~**1-2-3 combo (owner, 11/11/2026):** repeated Button 1 presses on the ground flow left jab → right hook → heavy final strike.~~ Now four hits: REQ-CMB-26. *(Superseded: SUP-12.)* |
| REQ-CMB-26 | **Four-hit tap combo (owner, 11/11/2026):** repeated tap attacks flow **three consecutive punches then a kick** (default stickman: jab → cross → hook → roundhouse kick finisher; Inferno: jab → straight → hook → fire roundhouse). Each strike has its own animation; strikes chain at each move's cancel point, so pressing once per strike stays responsive. Stop pressing and it resets. Combo damage is unchanged (default 240). |
| REQ-CMB-13 | The **third strike is a heavy-impact finisher** with **strong knockback** (and camera shake and zoom punch). |
| REQ-CMB-14 | **Aerial attack:** Button 1 while airborne performs a **flying kick** (once per jump) that blends with the jump and **can smash the boss door**. |
| REQ-CMB-15 | Strikes hit along their whole path (capsule from the body to full reach), not only at the fist. |
| REQ-CMB-16 | **Health and damage:** every fighter has HP; hits deal data-driven damage scaled by power, defence and a seeded critical roll; HP bars and floating damage numbers show it. At 0 HP the fighter is KO'd (Practice: the dummy gets up after 2.5 s). Values are **provisional** until OQ-05 is answered (TD-030). |
| REQ-CMB-17 | **Block and parry:** holding Button 1 (≥ 0.18 s) raises the guard; blocked hits deal 15% chip damage, cost stamina and push back less. A block raised within 0.15 s of a hit **parries** it and stuns the attacker; a guard out of stamina breaks (stun). |
| REQ-CMB-18 | **Dodge:** Shift (or a joystick flick) dashes about 2.4 m with 0.18 s of invulnerability for 25 stamina, cancelling the current attack. Stamina regenerates after 0.7 s; melee never costs stamina (REQ-CMB-4). |
| REQ-CMB-19 | **Hit reactions:** light hits flinch (short stun); heavy hits knock down (no control, then a short get-up invulnerability); hit-stop on contact sells the impact. |
| REQ-CMB-20 | **One engine for every fighter (INV-5):** the player and the dummy use the same fighter entity, combat rules and attacks; the dummy can be switched to attack (Practice, T key) for testing defence. |
| REQ-CMB-22 | **Combo variations (owner, 11/11/2026):** each strike (jab, hook, finisher, flying kick) has several animations with **identical damage, reach and timing**; the look changes every press (never the same twice in a row), so the combo does not look identical each time. |
| REQ-CMB-23 | **Kick distance (owner, 11/11/2026):** the flying kick knocks down but does not send the target far (about 3 m, previously about 10 m); knockdown slides brake harder in general. |
| REQ-CMB-24 | **Powerful, responsive hits (owner, 11/11/2026):** every landed blow (melee or ability) flashes the target white for a few frames, plays a sharp contact sound matched to the blow (bare knuckles light or heavy, kick, block, fire; weapons later), throws sparks along the blow with a contact flash, knocks the target back along the hit direction, bounces the striker back slightly, adds a subtle screen shake and freezes the action briefly (hit-stop). Tuning lives in impact profiles (`src/data/combat/impacts.ts`). |
| REQ-CMB-25 | **Punch Clash (owner, 11/11/2026):** a sustained exchange of punches and blocks (6 contacts within 5 s, at least 2 from each fighter, within 1.9 m) triggers a clash: the fighters lock face to face and trade rapid punches, blocks and fist collisions while both build Clash Power for 4 s (the player by mashing Button 1; the opponent by its data-driven rate). Power shows live for both; the camera starts at normal distance and closes in, tightest in the final 0.9 s, where the exchange, sparks, sound, flashes and shake spike. Higher power wins: the winner breaks through with a finisher whose damage, knockback, sparks, shake and hit-stop (3–6 frames) scale with the gap; the loser is knocked back, the winner recoils. Within 5% is a stalemate: fists collide and both are thrown back. The camera then glides back; an 8 s cooldown prevents an immediate repeat. |
| REQ-CMB-21 | **No lost taps:** quick Button 1 taps are queued (up to three) and handled one per simulation step, so a slow frame or hit-stop never swallows a combo input. |
| REQ-CMB-11 | Pairwise combat and ability regression tests across fighters. | [PB §12 Phase 8–9] |

## 10. Abilities

| ID | Requirement | Source |
|---|---|---|
| REQ-ABL-1 | One **shared ability framework**. Each ability includes target validation, stamina, cooldown, hit detection, animation, VFX, sound, interruption and automated tests. | [PB §11.1] |
| REQ-ABL-2 | Each fighter has exactly 3 unique abilities and 1 unique ultimate. | [PB §4.2, §14.2] |
| REQ-ABL-3 | Ultimate has its own **charge meter** (owner decision 11/11/2026, OQ-04): it fills from damage dealt and taken plus slowly over time; a full meter makes the ultimate ready; using it empties the meter. Values provisional (TD-032). | [PB §4.2] [OWNER 11/11/2026] |
| REQ-ABL-4 | Ability interfaces support fighter–object interactions (§8.3). | [PB §12 Phase 7] |
| REQ-ABL-5 | Abilities and ultimates must be **original**. Creature Clash's ability catalogue may be used as a **design reference** for delivery types (projectile, fan, ring, dash, beam, trap, shield, blink, lob, snare, aura, heal), effect categories (control, damage-over-time, mobility, defence, summons, zones) and the "every ultimate designed, none weaker" balance philosophy, reinterpreted for Stickman Arena. See `docs/references/CREATURE_CLASH_OBSERVATIONS.md`. | [OWNER 10/11/2026] [REF-CC] |
| REQ-ABL-6 | Telegraphing: where an ability has a delayed area, show it before it lands so it can be avoided. *Adopted by the owner 10/11/2026 (OQ-15).* | [REF-CC] [REF-VIDEO] [OWNER] |
| REQ-ABL-7 | **Inferno is the first full kit (owner, 11/11/2026):** A1 Fire Bolt (projectile that burns), A2 Flame Dash (dash leaving a burning trail), A3 Eruption (telegraphed fire ring around Inferno, knocks down), Ultimate Meteor Fist (telegraphed leaping slam, heavy area damage). Fire sets flammable furniture alight. | [OWNER 11/11/2026] |
| REQ-ABL-8 | Ability hits use the same combat rules as melee (block, dodge, parry, crit, knockback, interruption); a hit during an ability's wind-up cancels it, except the ultimate. Projectiles are stopped by walls, doors and furniture. | [INV-5] |
| REQ-ABL-9 | **Aimed ultimate (owner, 11/11/2026):** Inferno's leap is aimed before launch: a targeting indicator shows the landing zone and the maximum jump range, and the fighter holds a jump-preparation pose while aiming. Touch: hold and drag ULT, release to jump. Desktop: I enters aiming, WASD moves the landing spot, I launches. The indicator shows where the leap will really land (short of walls). |
| REQ-CHR-1 | **Data-driven characters (owner, 11/11/2026):** every stickman is a Character Definition (JSON) referencing reusable Animation, Moveset, Statistics, Effects, Audio and AI Behaviour profiles, with capability flags and unlock data. Shared systems read the resolved character; no character-name checks in shared code (enforced by a test). |
| REQ-CHR-2 | **Animation fallback:** each state resolves character profile → combat-style profile → shared default → safe clip with a clear warning; never frozen, invisible or missing. |
| REQ-CHR-3 | **Moveset separate from look:** moves define inputs, timing (seconds), hit area, damage, knockback, impact feel, combo routes, aerial use, required capabilities, effects and status; the Animation Profile chooses how each looks. |
| REQ-CHR-4 | **Validation:** values within safe limits; references, clips, routes, starters, required states, effects and sounds checked; invalid data produces clear messages and a safe fallback to the Base Stickman, never a crash. |
| REQ-CHR-5 | **Base Stickman template and Inferno example:** new characters start by duplicating the Base Stickman; Inferno (fire, taekwondo: punches and kicks, aerial kicks, downward fire kick, Punch Clash with a flame finisher, ember-and-ash defeat, fist flames) is configured entirely from data. |
| REQ-CHR-6 | **Admin character editor** (`admin.html`): create, duplicate, assign profiles, toggle capabilities, edit stats, moves, animations, effects, sounds and AI, preview animations and hit areas, validate, export JSON, try in game. Local only until server-side admin (REQ-BE-4). |

## 11. Animation and visual presentation

### 11.1 Requirements `[PB §8.7, §12 Phase 8–9]`

| ID | Requirement |
|---|---|
| REQ-ANI-1 | Fighter definition schema, model loading, rig contract, animation state machine, movement parameters, audio and VFX hooks. |
| REQ-ANI-2 | Animation states blend smoothly with movement, attacks, hit reactions, knockback, pickup and throwing. |
| REQ-ANI-3 | Each fighter has distinct attack, ability and ultimate animations. |
| REQ-ANI-4 | Animation events (for example hit-frame timing) are coordinated with the combat system. |
| REQ-ANI-5 | 2D asset pipeline (TD-022, proposed): fighters as crisp vector stick figures drawn in code with 2D skeletal (bone) animation defined as data; effects as particles and sprites; environment props as 2D top-down art. *(Blender and glTF superseded: SUP-04.)* |
| REQ-ANI-6 | **Jointed fighters (owner, 10/11/2026):** every fighter has a 2D skeleton with real joints: pelvis, spine (lower and upper), neck, head; shoulder → **elbow** → hand; hip → **knee** → foot on both sides. Attacks, kicks and movement are animated by rotating these joints with eased curves (anticipation, snap, follow-through, settle), so motion feels smooth and natural, never stiff. Blending between animations is joint by joint. | [OWNER 10/11/2026] [TD-022] |
| REQ-ANI-8 | **Fall and get-up (owner, 11/11/2026):** a heavy hit or KO plays a readable fall (tumble back, arms flung, a short flight, landing with a bounce, lying flat), and recovery plays a **get-up** (sit up on a hand, knee drawn, rise through a crouch into the stance). The fighter cannot act and cannot be hit while getting up. |
| REQ-ANI-9 | **KO dissolve (owner, 11/11/2026):** at zero health the fighter faints (a longer freeze on the final blow, then the fall), lies still for a beat, then dissolves into dust particles that drift away while the figure fades out, with a soft dusting sound. |
| REQ-ANI-10 | **Walking and running (owner, 11/11/2026):** responsive movement with smooth walk and run cycles: legs step alternately (the swinging foot lifts), each fist swings opposite its leg with the elbows bent so the fighter still looks ready, running has longer strides, higher knees, more lean and a bigger arm pump; idle, walk, run and combat poses blend without snapping. *(Supersedes the 'shuffle with arms only bobbing' part of REQ-ANI-7: SUP-05.)* |
| REQ-ANI-14 | **Inferno's living-flame look (owner, 11/11/2026):** his body is drawn as a living flame (Effects Profile `body: "flame"`): a soft glow, ember-dark edges instead of a black outline, a flickering white-hot core, charred streaks and flame tongues licking up from the joints. The face is fiery orange and yellow with ember-rimmed eyes (no grey or blue). His flame dodge is a small, quick streak of fire with no grey. |
| REQ-ABL-14 | **Rampage (owner, 12/11/2026), the second playable fighter:** **Titan** (named Braxon until 13/11/2026 and Rampage Buffer until 12/11/2026; owner, SUP-16, SUP-18): a heavily muscular human stickman in grey with a bodybuilder's physique, drawn just a bit taller than Inferno at 1.1× (owner: "just a bit taller than inferno, not this big like a boss"), wearing dark fighting pants (owner: "it should at least have pants on"), moving like a heavyweight: a planted, forward-leaning stance, deliberate heavy steps with no bounciness, firm clenched-fist arm swings and a grounded run (owner: "powerful, aggressive and intimidating rather than exaggerated or overly bouncy"), with a much broader chest, massive shoulders, thick arms, powerful legs and visibly defined muscles, a plain round stickman head with no eyes (SUP-18) and no animal features. Same line art style as Inferno. He is slower than Inferno to move and turn (3.9 m/s top speed, low acceleration), with 1300 HP and 140 kg. His combo is three punches: hammer jab, haymaker, then a double-fist hammer that knocks down. **Kit:** Q Ground Smash (a shockwave around him: knockdown and knockback); E Rampage Charge (a 0.5 s wind-up standing on two legs: upper body leaning in, shoulders lowered, arms pulled back, trembling with building momentum; then a long (11 m), fast (15 m/s) locked-direction run on two legs, shoulder first, kicking up dust, that smashes breakable walls, doors and furniture and stops dead in the first fighter it hits or in a solid wall, with a big collision burst and screen shake); R Crushing Strike (an overhead blow: 190 damage and a 1.1 s stun); F Rampage Mode (8 s at +15% speed and 15% less damage taken, with a red rage aura). **Heavy Throw** is his grab (G): he lifts movable furniture up to 60 kg and throws with ×1.8 power. Kept to three abilities plus an ultimate by owner decision (INV-9). Further fighters are added one at a time. |
| REQ-ABL-15 | **Necro (owner, 12/11/2026), the third playable fighter:** a hooded death mage. He has no eyes (SUP-18), with a dark cowl peaked at the back over an empty face, a robe to the ankles over skeletal armour (a ribcage plate and a bone pauldron), and a **bone staff in his left (rear) hand** topped by a skull whose eyes glow purple while he works magic. **Idle:** standing straight and confident, the staff planted as a support. The staff is raised with his hand, never hanging low, and it swings with his arm in staff strikes. Speed 4.7 m/s, 1000 HP (balanced, REQ-ABL-16). **Combo:** staff sweep, soul-charged thrust, then a grave slam that knocks down (plus a plunging air strike). **Kit (owner dropped Zombie Summon):** Q **Soul Drain** (a projectile; half its damage returns to him as health); E **Death Eruption** (at the aimed spot, after a 0.6 s warning, bone spikes and skeletal hands burst up, dealing 110 damage and trapping the target for 1.2 s); Q also **blinds** the target for 3 s (it cannot lock on, and summons lose it); R **Teleport** (owner, 12/11/2026, SUP-19): he enters aiming, picks a spot up to 9 m away and dissolves there in violet smoke. **Ultimate Undead Army:** four skeleton warriors rise at random free spots near the enemy, inside the map; they stay until killed and never fade on a timer. **Summoning animation:** his free arm rises overhead as he levitates slightly off the ground, with subtle purple energy at his face, his staff and around his body; controlled and supernatural. **Summons:** independent AI (they hunt the nearest enemy, attack in reach, and otherwise stay near him), take hits and fall like any fighter, never appear inside walls or furniture, and never exceed 8 of his at once (the oldest goes first). Blows, throws and abilities never hit their own side. |
| REQ-ABL-16 | **Balance and fighter stats (owner, 12/11/2026):** every fighter is rated 0 to 100 on HP, Speed, Power, Stamina, Defence and Avoidance (`src/characters/ratings.ts`). No fighter is objectively stronger: rating totals stay within 3% of each other, each fighter leads in some stat and trails in another, and none beats another in every stat. Clicking a fighter in the main menu opens its details: the six bars fill smoothly from left to right, each ability (and the basic combo) opens its description, numbers and how to use it on the device being played; **Select** picks the fighter and **Back** returns. |
| REQ-ABL-17 | **Fourth ability on R (owner, 12/11/2026, SUP-20):** every fighter has a fourth ability, default key R (ability 3 moves to F): Inferno **Flame Detonation** (gathers fire between his hands for 0.55 s, then a short-range explosion round him that hurls enemies backwards); Titan **Grapple Slam** (seizes the enemy in front, hoists it overhead and slams it into the floor: 150 damage, a knockdown, knockback and screen shake; owner 13/11/2026: a miss has its own animation, the hands closing on air and a stumble forward, with no slam and no damage); Necro **Grave Chains** (spectral chains catch the first enemy at range and drag it to his feet, holding it for 0.8 s). Braxon's charge now runs in a straight line until a wall or an enemy stops it, smashing furniture and breakable walls on the way. |
| REQ-CTL-21 | **Keyboard and joystick targeting (owner, 12/11/2026, SUP-21):** default keys J attack (hold: block), K ultimate, L dodge, F ability 3, R ability 4; no key drives two actions. An aimed ability (Inferno's leap, Necro's Teleport) is entered and confirmed with its own key; W A S D (or, on touch, the movement joystick) move the target at the ability's own speed (Teleport much faster than the leap); Escape or the touch ✕ cancels without casting; clear instructions show while aiming; movement returns at once afterwards. |
| REQ-ANI-13 | **Walk, run and relaxed idle (owner, 12/11/2026):** without Shift a fighter walks with a proper walk cycle (upright, straighter knees, natural arm swing); running only while Shift is held (or charging). The fighting stance is only for fighting: after 3 s with no attack, cast, block, dodge, aim or hit, a fighter eases into a relaxed standing idle and snaps back to the guard when it fights. |
| REQ-PHY-12 | **Furniture climbing and fall damage (owner, 12/11/2026):** fighters jump onto climbable furniture (desks, tables, cabinets, counters, shelves); a top too high to land on but within reach is grabbed and climbed with repeated Space presses (hang, pull-up, the lead elbow hooked over the edge and pressing the body up while the other arm pulls, then a smooth step onto the top); a hit during the climb (for example at about 70%) cancels it and the fighter falls. Fall damage grows with the real drop and the fighter's weight (SUP-27). **Traversal, falling and recovery (owner, 13/11/2026):** walking on furniture steps across a small gap (up to about 0.5 m) or onto a neighbour up to 0.4 m higher or lower without dropping or hanging; hanging only when the gap is genuinely too wide. A fall from a height shows a physical falling pose (arms out, legs reaching for the floor); never a dizzy effect. Landings react to the real drop, measured from the fall's highest point once per fall: under 1.4 m a knee bend; 1.4–2.2 m (walking off the tallest furniture) a firm squat that holds 0.12–0.32 s, no damage; 2.2 m or more (for example jumping off a 2 m bookshelf) fall damage and a collapse flat on the floor (onto the back, or face down when landing on the move), lying 0.55–1.2 s by height, then an animated get-up (a push-up from face down) with no moving or attacking until it ends. An aerial attack plays out before the landing reaction. |
| REQ-PHY-14 | **Taller arena walls (owner, 13/11/2026):** the outer walls stand 4.5 m tall for a more enclosed arena and are **always shown** (owner, later the same day: "just make the wall height visible" instead of showing it only in the air, SUP-28). The back walls are solid; the front walls are faint glass with a faint top edge so a fighter is never hidden. Presentation only: collisions and the arena bounds never change. |
| REQ-UI-30 | **HUD look (owner, 12/11/2026):** the top health bars are styled after the owner's reference image of an arcade fighter's HUD (original design): slanted, framed bars with glossy fills, a tick scale and a damage trail, bold italic names and timer, slanted portrait frames, each side in its fighter's colour. Metal furniture sounds like heavy steel, louder for harder hits. |
| REQ-UI-31 | **Always landscape, settings everywhere, combat controls only in fights (owner, 13/11/2026):** on phones and tablets the game plays in landscape from launch with no "turn your phone" screen; pages cannot be pinch- or double-tap-zoomed; every screen fits one landscape screen without scrolling (the tournament draw scales to fit); fullscreen is asked for on every tap until granted (each page change drops it), and the game installs to the home screen as a full-screen app (manifest; the way to full screen on iPhones, which show a one-time hint): held upright, the whole page is laid out in landscape and turned a quarter turn (touches mapped into the turned layout); the first tap also requests fullscreen and a landscape lock where the browser allows them (browsers never allow fullscreen without a tap, and iPhone Safari has no orientation lock, so the turned layout is what makes it automatic there). The Settings (gear) button sits in the same top-right place, in the same style, above every screen (menu, fighter pages, tournament draw, fights). The combat controls (touch buttons, joystick, ability bar) show only during an active fight; they are hidden on the menu, fighter pages, the tournament draw and watched battles, and scrolling cannot reveal them. |
| REQ-UI-32 | **Front end (owner, 13/11/2026):** the game opens on the **title screen**: the **owner's supplied title art** (logo top left, the four fighters in an arena) always covering the screen, its painted menu removed at the owner's request; the menu is the game's own buttons, all in the style of the Admin Panel plate (owner, 13/11/2026): **Story Mode** (shown, locked, says so when pressed), **Game Modes**, **Settings**, **Quit Game** (browsers only let a page close a tab it opened, so Quit tries and then shows a goodbye screen). No Start button. **Game Modes** offers only **Tournament** and **3 vs 3** (shown as coming soon until built; REQ-MOD-2); Ladder Run is not offered (it has no implementation yet; REQ-MOD-3 stays a requirement). Every interface button (menus, settings, navigation, fighter selection) plays the owner's click sound once per press; combat buttons never do. |
| REQ-UI-33 | **Fighter select (owner, 13/11/2026):** the selected fighter large in its own **select stance** beside an information panel: name and title, fighting style and story, the six stats (HP, Speed, Power, Stamina, Defence, Avoidance), the four abilities and the ultimate with descriptions; it updates the moment another fighter is picked from the roster below. Every playable fighter has a distinct stance on its own rig, struck from data (`src/data/presentation/select-stances.ts`: Inferno coiled and aggressive, Titan wide and grounded, Necro tall with the staff planted and a hand raised, Shroud crouched and hunched with the knife low), breathing gently; all face the same diagonal (towards the panel) **turned 30-45° towards the camera** (shoulders and hips spread, the chest seen wider; owner 13/11/2026), in one shared window at one scale with **Titan drawn about 30% larger, standing with both hands on his hips**, with a rim light, a glow in the fighter's colour and a floor shadow. A new fighter adds its stance (tested). The player's registered name is shown as the player; fighter names are kept. Then the tournament's arena, size and difficulty, and FIGHT. |
| REQ-UI-34 | **Player name and the admin name (owner, 13/11/2026):** before Story Mode or Game Modes the player registers a name: 1 to 10 characters (letters, numbers, spaces, - _ .), saved in this browser, changeable in Settings → Profile, shown wherever the player is identified (HUD: "Name · Fighter"; tournament draw: "Name (Fighter)"). The exact name `addmen1280` shows the **Admin Screen** (an Admin Panel item on the title): the former set-up screen with practice opponents and both modes, fighter settings and Move Config, AI difficulty; every other name sees the User Screen (fighter selection, stats and abilities, key rebinding, touch button size, audio and game settings). **This is a screen choice on the player's device, not security** (TD-065): real admin powers require a server-verified role (REQ-BE-4). |
| REQ-UI-35 | **Practice (owner, 13/11/2026):** the title menu has **Practice** under Game Modes, offering **Tutorial** and **Open Zone**. The tutorial runs in the training yard and teaches, one step at a time, moving, punching, a 4-hit combo, the heavy attack, blocking (the dummy fights back only then), dodging, an ability and the ultimate (charged for that step), each worded for the player's keys or the touch buttons; each step finishes only when the player has done it; it can be skipped; the finish card leads to the Open Zone or the menu. The Open Zone is fighter select for practice: any fighter, any arena, the training dummy or any AI fighter at any difficulty; leaving the fight returns to Practice. |
| REQ-AI-9 | **Watched AI battles are close and exciting (owner, 13/11/2026):** in a watched tournament battle both fighters play at least at Hard, and the fighter clearly ahead on health eases off (more hesitation and mistakes, fewer punishes and combo chains, slower tempo; only decisions, never damage, health or speed), so battles stay tense to the end. Tested: across four matchups the winner ends with under 35% health on average (measured about 22%, against 46% without it), every battle lasting over 20 s. |
| REQ-CMB-30 | **Dodging projectiles, and no dodge spam (owner, 13/11/2026):** with a projectile (an ability shot or a thrown object) flying at the fighter, the dodge sidesteps at right angles out of its path, to the side the fighter is already on (the shorter way out); with nothing incoming it is still the back-step (REQ-CTL-20). Dodges chained within 1.2 s of the dodge being ready again form a chain: each extra link costs 50% more stamina, waits 60% longer and protects for less (100%, 55%, 20%, then no invulnerability from the fourth); pressing during the cooldown does nothing; 1.2 s of rest resets it. Every fighter and the AI follow the same rules. |
| REQ-ABL-18 | **Shroud (owner, 12/11/2026), the fourth playable fighter:** an original masked slasher (inspired by, not copying, a film character): a long white porcelain mask of our own design in a black hood, a tattered black robe, a knife in his lead hand; a hunched stalker in idle, walk, run, dodge (a low shade skitter trailing smoke) and attacks. Knife combo, Thrown Blade, Stalker Lunge, Behind You, Rending Flurry; cuts bleed. Ultimate **Hunting Frenzy**: 8 s faster, knife strikes quicker and deadlier, every cut bleeds, red aura. |
| REQ-CMB-30 | **Heavy Attack (owner, 12/11/2026):** a dedicated key (default K) and touch button; every fighter has its own heavy blow (Inferno blazing axe kick, Braxon sledgehammer, Necro soul rend, Shroud gutting stab) with its own animation, effects and damage. The ultimate moves to I. Rebindable. |
| REQ-CMB-31 | **Damage balance (owner, 13/11/2026):** tap strings open with light hits (about 20–35 raw) and end in a moderately strong finisher; heavy attacks and air attacks always deal less than the fighter's damaging special abilities; a full tap string takes under a fifth of a health bar, so fights last longer and abilities stay important. Melee still moves and breaks furniture and walls as before. |
| REQ-CTL-22 | **Target lock (owner, 12/11/2026):** while an opponent is in sight (within 14 m, not behind a wall) the player faces it at all times, whatever the movement; free facing when blinded, out of range or out of sight; restored at once when sight returns. |
| REQ-ABL-19 | **Fire Beam (owner, 12/11/2026):** damage builds with unbroken contact (×1.4 after 0.6 s, +0.6 a second, capped at ×2), reset when contact breaks; while it pours, held J sweeps it left and L right (up to half a turn each way), rebindable in a Fire Beam controls section, with the keys shown on screen. |
| REQ-AUD-9 | **Fight intro (owner, 12/11/2026):** before every fight, READY... then FIGHT! with an announcer voice (the device's deepest English male speech voice), impact sounds and cinematic lettering; fighters, AI and inputs are locked until FIGHT. |
| REQ-PHY-13 | **Thrown furniture flight (owner, 12/11/2026; refined the same day, SUP-26):** a thrown piece flies a steady, intentional arc: no random spin of its own, only a forward pitch from the throw (at most a quarter turn over the flight, less for heavy pieces, the same for the same throw), then it rests on the face it lands on (no scripted upright reset). Any further turning comes from what it hits. |
| REQ-ABL-20 | **Curse of Decay (owner, 12/11/2026, SUP-25; replaces Necro's Teleport on F):** a decay bolt at the opponent; on a hit the target deals 30% less damage and its defence drops by 20% for 6 s (a new curse refreshes the time, never stacks). The target shows green rot on its body and two falling green chevrons overhead; when the curse ends the rot flakes away with its own effect and sound. Cooldown 12 s, 30 stamina. |
| REQ-ABL-21 | **Shroud: Shadow Escape and lights out (owner, 12/11/2026, SUP-25):** Q **Shadow Escape** (replaces Thrown Blade) is strictly defensive: he sinks into his shadow and slips out 7 m away from the opponent at once, turned aside from walls, never inside walls, furniture or outside the arena; no damage. The ultimate **Hunting Frenzy** now also bursts a light bulb (its own sound) and puts the lights out on every opponent for its 8 s: the opponent sees only a 1.6 m circle round itself, everything else almost black (an AI cannot find targets beyond it), while Shroud sees everything in a night-vision view. Knife damage bonus 10% (was 35%); everything else unchanged. |
| REQ-AUD-10 | **Battle music and the fight stinger (owner, 12/11/2026, SUP-24):** fight arenas play the **owner's supplied Japanese gaming boss-battle track** (owner: "use this audio instead, just use this"), unchanged except that its final fade-out is cut and its end crossfaded on the beat back into the body (43.7 s), so it plays the intro once and then loops for the whole fight with no gap, from FIGHT!, mixed under the combat sounds (music volume in Settings). The READY... FIGHT! intro carries an original cinematic stinger (READY hit, an accelerating drum build, a breath of silence, a huge FIGHT impact and a hall echo) modelled on the owner's voice reference and rendered by `tools/audio/`. The Testing Area keeps no music (SUP-22). |
| REQ-AUD-11 | **Menu music and the click (owner, 13/11/2026):** the owner's supplied "Pulse" epic track plays on the title screen and every menu (Game Modes, fighter select, the tournament draw), looping with no gap; it is **lowered on fighter select**; when a fight starts it gives way to the battle music (from FIGHT!); **when the battle is over** the battle music fades out and the menu music **slowly fades back in**. Browsers only allow sound after the player's first tap or key, so on a fresh visit the music starts then; pages reached from the game's own menus try to start at once. The owner's click sound plays on interface buttons (REQ-UI-32). |
| REQ-VIS-10 | **Visual redesign, prototype stage (owner, 13/11/2026):** the game's look moves toward the owner's reference images 2 and 3 (painted, muscular, professionally designed fighters and detailed furniture). First two prototypes, for owner approval before anything else is redesigned: **Inferno** (a heroic muscular build with shaded anatomy, ember skin, charcoal armour, a molten chest core, lava veins, glowing fists and a flame crest; on the same rig, so every animation works) with a **premium portrait** drawn from the in-game model, and the **bookshelf** (real cabinetry: board thickness, cornice, plinth, recessed shelves, 3D books and objects, wood grain and lighting; behaviour unchanged). Status: **approved by the owner 13/11/2026** (slimmer boots requested and done); this is the standard for the rest of the redesign. The office furniture got the material finish (plus detailed panels, desks, monitors and cabinets; monitors in north-facing cubicles show their backs). The first fighter rollout was rolled back at the owner's request (13/11/2026); a revised one (Titan's armour and upper back, Necro as a Mage of Death with a skull staff, Shroud's hollow-eyed mask) was reviewed in a preview and **made the default for every fighter and portrait (owner, 13/11/2026)**, replacing the old look (TD-060). |
| REQ-CTL-20 | **Dodge direction (owner, 12/11/2026):** every dodge (right click, the DODGE button, a stick flick) moves the fighter straight **backwards relative to its facing**, whatever the movement input says. The facing does not change during the dodge. The back-step is quick off the mark and eases to a stop, so it always covers the same distance (about 2.4 m, less only if something blocks it). |
| REQ-CTL-19 | **Main menu and leaving the game (owner, 12/11/2026):** a main menu (fighter cards, arena choice, Play) opens on a fresh visit. Settings has **Leave game** (back to the menu) and **Fullscreen**. On phones and tablets the game fills the screen (fullscreen and landscape on the first tap where the browser allows; not available on iPhone Safari), and short landscape screens use a compact HUD and a tighter touch cluster so nothing overlaps. |
| REQ-ABL-11 | **Magic Attack VFX Standard (owner, 11/11/2026; benchmark: the Fireball):** every magic attack uses the stages that fit it (charge, core, travel, impact, reaction, sound, lingering, elemental defeat), in its own element's look, synchronised with its timing and hits (`docs/design/MAGIC_VFX_STANDARD.md`). A fire KO burns the body away to ash. |
| REQ-ABL-12 | **Inferno's kit (owner, 11/11/2026):** Fireball (renamed from Fire Bolt), Flame Dash, **Fire Beam** (1 s charge, continuous medium-range beam; replaces the ring-of-fire Eruption), **Eruption** (renamed from Meteor Fist: a squat-and-charge, a flaming jump and a ground slam with a clearly marked 3.2 m blast). Exact numbers are in the standard document. |
| REQ-ABL-13 | **Distance-based damage (owner, 11/11/2026):** Fire Beam and Eruption deal full damage up close, easing linearly to 45% at their reach (beam: from Inferno; slam: from the landing point); knockback eases too, but never below half. |
| REQ-AUD-1 | *(The "never music" part is superseded by SUP-24: fight arenas also play battle music, REQ-AUD-10.)* **Background ambience, never music (owner, 12/11/2026; TD-051):** every map (and the menu) has a soundscape of environmental sound only, with no notes, melodies, beats or instruments, synthesised in code. **Office:** an empty office after hours: air conditioning and ventilation breathing slowly, 50 Hz mains hum, a faint low drone, and occasional creaks, distant thumps, electrical ticks, pipe knocks, a fluorescent flicker and a vent clicking; still, spacious, slightly eerie; no people. **Colosseum** (the training yard until a Colosseum arena exists): a live tournament crowd: thousands murmuring under a low surging roar, cheers, applause, whistles, "ooh"s and occasional eruptions in a vast stone reverb; it reacts to the fight (a big blow draws an "ooh", a KO a roar). **Menu:** the same tournament heard muffled from the fighters' tunnel. The game falls silent while its tab is hidden. |
| REQ-ANI-13 | **Real running and sprinting (owner, 11/11/2026: "not just a sped-up walk"):** the run is its own cycle: the foot strikes ahead and pushes off behind, a flight phase with both feet off the ground, the heel kicks up behind and the knee drives high in front, the chest leans in with an extra push at each drive, and the arms pump with bent elbows (fist up to the chin in front, elbow driven back past the hip). Holding sprint blends into a deeper version: more lean, longer bounding strides (3.0 m per cycle, run 2.2 m, walk 1.1 m), higher heel kick and a bigger pump. Feet keep pace with the ground at every speed. |
| REQ-ANI-12 | **Quick dodge (owner, 11/11/2026):** the default dodge is a fast, low dash (not a roll): forward lunging in, backwards leaning away with the front foot sliding out, sideways (up or down the screen) a crouched shuffle; guard kept up, with speed lines trailing opposite the dash. Clip `proc.dodge.quick` is the shared default; Inferno keeps its flame dodge. *(The default roll of REQ-CTL-16 superseded: SUP-11.)* |
| REQ-ANI-11 | **Strong, confident gait (owner, 11/11/2026: "strong and confident", not crouched or timid):** walking is tall and proud (hips high, chest up within a few degrees of upright, head level, long steps, a springy bounce and a small chest roll per step) with loose fists swinging freely between the hips and chest; running drives from the chest (a firm lean, head up) with high knees, long bounding strides and a strong elbows-bent arm drive. The guard returns when standing (idle stance) or attacking. *(Supersedes the 'elbows bent so the fighter still looks ready' guard-up walk of REQ-ANI-10: SUP-06.)* |
| REQ-ANI-7 | **Unique body language per fighter (owner, 10/11/2026):** every fighter has its **own idle stance** (including a breathing or ready loop), its **own movement style** (walk, run, strafe, turn, start and stop) and its **own attack animations** for melee, all three abilities and the ultimate, plus distinct hit reactions where practical. No two fighters share these animations; only the skeleton system is shared. **Fighting stance at all times (owner, 11/11/2026):** idle and every movement animation keep a fighting posture (guard up near the chin, knees bent, staggered feet, torso engaged); never a casual walk with loose swinging arms. Each fighter's stance and footwork style is still its own. **Unarmed default (owner, 11/11/2026): a slightly bent, boxer-like stance** (`BOXER_STANCE`); armed fighters get weapon-specific stances (chosen by the fighter's `weapon` field). Direction (to be designed per fighter, not final): Inferno = bouncy, restless boxer stance with flickering energy; Shadowfang = low crouch, prowling lope, claw-ready hands; Ronin = calm, centred sword stance, smooth gliding steps; Titan = wide, heavy planted stance, slow stomping gait with weight shift; Phantom = upright floating hover, drifting glide, hands weaving magic. | [OWNER 10/11/2026] |

### 11.2 Presentation quality targets (from the owner's videos) `[PB §4.5]` `[REF-VIDEO]`

**Status: BINDING. Adopted by the owner on 10/11/2026 (OQ-15).** These are **quality targets for presentation**, not new mechanics. Full evidence and timestamps are in `docs/references/VIDEO_REFERENCE_OBSERVATIONS.md`.

| ID | Target |
|---|---|
| PRS-1 | **Instant action identification:** each ability is visually distinct in colour, shape and motion, so a viewer can tell which action fired without reading text. |
| PRS-2 | **Anticipation before power:** big attacks show a readable wind-up or charge; the ultimate gets an unmistakable build-up moment. |
| PRS-3 | **Impact sells the hit:** burst VFX, brief flash, screen shake scaled to power, short hit-stop, and visible knockback or recoil on the target. |
| PRS-4 | **Floating combat feedback:** damage numbers at the impact point; distinct callouts for MISS, BLOCKED, CRITICAL and combo count ("2 HIT COMBO" style). |
| PRS-5 | **Readable defence:** a visible shield or barrier effect when a hit is blocked or absorbed. |
| PRS-6 | **Status readability:** visible state for stun, freeze or root and similar effects, both on the fighter and on the HUD. |
| PRS-7 | **Trajectory clarity:** projectiles and beams have trails and a clear travel path, so they can be read and dodged. |
| PRS-8 | **Ultimate showcase:** a brief full-screen or cinematic emphasis (for example speed lines or a flash) when an ultimate lands, kept short so real-time play is not interrupted for long. |
| PRS-9 | **Defeat moment:** a clear KO callout and a short beat before the next round or result screen. |
| PRS-10 | **HUD at a glance:** top health bars with portraits for both sides, a match timer, and the name of the action just used. |
| PRS-11 | The top-down view matches the reference videos, so their readability lessons apply directly. Effects must stay readable at the camera's widest zoom and on small phone screens. |

## 12. AI

| ID | Requirement | Source |
|---|---|---|
| REQ-AI-1 | AI uses the **shared** movement and combat systems; no AI-only combat rules. | [PB §8.8, §12 Phase 10] |
| REQ-AI-2 | AI considers distance, attack range, line of sight, obstacles, cooldowns, stamina, threat, retreat, circling, dodge, block, counter and object interactions. | [PB §8.8, §12 Phase 10] |
| REQ-AI-3 | Not just direct pursuit and attack spamming. | [PB §8.8] |
| REQ-AI-4 | Distinct combat personalities and adjustable difficulty. | [PB §12 Phase 10] |
| REQ-AI-5 | Navigation around office furniture; tactical variety. | [PB §12 Phase 10] |
| REQ-AI-6 | Can fight, evade, reposition and use objects (exit condition). | [PB §12 Phase 10] |
| REQ-AI-7 | **Fighter AI opponents (owner, 13/11/2026):** any playable fighter can be the opponent, played by the AI on the same combat rules as the player: it closes in, punches in strings, throws in heavy attacks, uses its abilities and ultimate when the distance suits each one (ranges come from each ability's delivery data), backs off a knocked-down player, and jumps or climbs onto furniture after a player standing on it. The training dummy stays the default opponent and keeps its own behaviour. **Opponent picker:** the main menu has an Opponent row (Training Dummy, then every playable fighter); the choice starts the fight (`?opponent=<id>`). **Path-finding (REQ-AI-5, 13/11/2026):** the AI routes round walls and furniture on a 0.5 m walking grid (A*, refreshed every 2 s as furniture moves). **Difficulty (REQ-AI-4):** Easy, Normal (default) and Hard on the menu change how quickly and boldly it plays (decision pauses, ability and heavy-attack chances, hesitation, combo length), never its damage or stats. Owner's word "admin": there is no sign-in yet, so the picker is open to whoever uses the menu; restricting it to admins needs the server-side roles of REQ-BE-4. |
| REQ-AI-8 | **Per-fighter AI brains and difficulty as intelligence (owner, 13/11/2026):** every fighter has its own AI profile and brain design (`src/data/ai/brains.ts`): preferred range, movement (direct, circle, stalk, kite), melee and heavy bias, defence style (dodge, block, mixed), retreat and hit-and-run, a tactic for every ability (role, range, conditions) and preferred combo chains. Titan is an aggressive brute (straight in, charges, grabs, blocks), Inferno mixes fire at every range, Necromancer keeps away and curses first, Shroud stalks, ambushes and slips away. **A new fighter's brain is designed and tested with its kit; no fighter may reuse another's** (tested). Difficulty (Easy, Normal, Hard, **Expert**) changes intelligence only: reaction time, mistakes, hesitation, combo chaining, punishing openings, defending (reading attacks; Hard and up anticipate the player's rhythm), aiming ahead, saving cooldowns, adapting to the player; never damage, health or attack speed. At every difficulty each fighter uses its whole kit (all abilities, the ultimate, punch strings and its heavy; abilities and basic attacks rotate so none is ignored), tested for every fighter at every level. |

## 13. Game modes

| ID | Mode | Required behaviour | Source |
|---|---|---|---|
| REQ-MOD-1 | **1v1** | One fighter against one opponent. Match entry and victory rewards are configurable. | [PB §14.6] |
| REQ-MOD-2 | **3v3** | Select three fighters from a **randomly presented pool of five**. | [PB §14.6, §12 Phase 13] |
| REQ-MOD-3 | **Ladder Run** | Progress through increasingly difficult opponents. | [PB §14.6] |
| REQ-MOD-4 | **Story Mode** | Different opponents, arenas, challenges and bosses. | [PB §14.6] |
| REQ-MOD-5 | **Practice Zone** | Select fighters, restore health, configure dummies, enable or disable dummy attacks, respawn dummies (automatic dummy reset), restart battles. | [PB §14.6, §12 Phase 10] |
| REQ-MOD-6 | All modes run through shared fighter, arena, match and combat services. The combat engine is never duplicated per mode. Mode rules, entry costs and rewards are data-driven. | [PB §12 Phase 13] |
| REQ-MOD-7 | Clear win, loss, exit, draw, reward and progression flows. | [PB §12 Phase 13] |
| REQ-MOD-8 | **Tournament mode (owner, 13/11/2026):** a Game Mode option on the main menu. Stages are named **Top 16, Top 8, Top 4, Top 2**, then **Champion** (owner, 13/11/2026; SUP-32), the draw ending in a Champion slot. A knockout tournament of 4, 8 or 16 fighters (the bracket supports any size, rounding up with byes, so the cap can grow past 16 without a rebuild): the player's fighter plus AI fighters (other fighters first, so a 4-fighter field has all four; repeats numbered), drawn at random into pairs; winners advance, losers are out for good. Stages are named by the fighters left: Round of 16, Quarter Finals, Semi Finals, Final; a smaller field starts later (4 starts at the Semi Finals). Each match is a real fight in the chosen arena against the AI at the chosen difficulty; the first KO wins (no respawn); at 150 s of play the fighter with more health left (as a share of its maximum) wins. After the player's match the player may **watch any AI battle** of the stage, as many as they like, by tapping it in the draw (real AI-vs-AI fights with full combat; in a Punch Clash both AI fighters mash), and one **Skip** button under the draw settles the rest of the stage (owner, 13/11/2026; SUP-30); unwatched battles are settled by a rating-weighted draw. **Leaving a tournament fight** (Settings → Leave), the player's own or a watched one, settles it on the health left (a tie goes to the side that stayed in the player's own fight; a watched battle tie is a rating-weighted draw); the bracket records it and moves on and shows the result ("Semi Finals: A beat B (fight left early ...)"). The tournament never moves on while the player's match or a battle they may still watch is open. The tournament screen shows every fighter with its portrait, the pairings, the current stage, winners (bold) and the eliminated (struck through), upcoming matches and the player highlighted; the champion screen shows the winner, the title and the final bracket, with the player's placement and record. A tournament survives page changes and can be resumed from the menu. Results are kept in this browser as display-only history until server progression exists (REQ-BE). |

Details not supplied: 3v3 switching or tag rules, ladder length, story content and bosses, draw conditions, match timers (OQ-06, OQ-07).

## 14. Tutorial and onboarding `[PB §12 Phase 12, §8.9]`

| ID | Requirement |
|---|---|
| REQ-TUT-1 | Progressive, interactive first-time tutorial. |
| REQ-TUT-2 | Teaches movement, camera, melee, all three abilities, ultimate, dodge, block, stamina, cooldowns, health, pickup and throwing. |
| REQ-TUT-3 | Uses training dummies and practical demonstrations. |
| REQ-TUT-4 | Instructions adapt to keyboard or touchscreen controls. |
| REQ-TUT-5 | Completion is saved to the persistent profile through the approved backend interface; replayable from menus. |
| REQ-TUT-6 | Only **verified server-side administrator permissions** may show and honour **Skip Tutorial**. |
| REQ-TUT-7 | A skip must **not** mark an ordinary user's tutorial as complete. |
| REQ-TUT-8 | Test flows: new player, returning player, tutorial replay, admin skip. |

## 15. Progression and economy

| ID | Requirement | Source |
|---|---|---|
| REQ-PRG-1 | Persistent player profiles across sessions **and devices**. | [PB §14.7] |
| REQ-PRG-2 | Track matches played, wins, losses, win rate, damage, knockouts, ability usage, ultimate usage and unlocked fighters. | [PB §14.7] |
| REQ-PRG-3 | Achievements with unique icons, descriptions and meaningful unlock conditions. | [PB §14.7] |
| REQ-ECO-1 | Token ledger (in-game currency) with auditable transactions. | [PB §8.10, §12 Phase 14] |
| REQ-ECO-2 | Fighter unlocking, with fighter prices configurable by admin. | [PB §8.10, §14.7] |
| REQ-ECO-3 | Match entry costs and rewards configurable (per mode). | [PB §14.6, §14.7] |
| REQ-ECO-4 | Currency, rewards, purchases, unlocks, tutorial completion and published settings are protected from client manipulation. | [PB §8.10] |

All numeric economy values (starting tokens, prices, entry costs, rewards, achievement list) are **missing** (OQ-08). Whether "purchases" means real-money purchases is unclear (OQ-09). Any real-money pricing would be shown in **MYR**.

## 16. Backend, security and administration

| ID | Requirement | Source |
|---|---|---|
| REQ-BE-1 | Evaluate and select a backend **before** implementation. | [PB §8.10, §12 Phase 14] |
| REQ-BE-2 | Secure player identity, persistent profiles, token ledger, fighter unlocking, achievements, match statistics. | [PB §12 Phase 14] |
| REQ-BE-3 | Server validation of rewards, purchases, tutorial completion and admin permissions. | [PB §12 Phase 14] |
| REQ-BE-4 | The account label **`admin128` is not proof of privilege.** Use a verified role and an audit log. | [PB §8.10, §12 Phase 14] |
| REQ-BE-5 | Published configuration with defaults, versioning, audit history and rollback. | [PB §12 Phase 14, §14.7] |
| REQ-BE-6 | Admin settings cover fighter stats, ability values, cooldowns, difficulty, match costs and rewards, fighter prices, object settings and win conditions. | [PB §14.7] |
| REQ-BE-7 | Database migrations, access policies and tests. | [PB §8.10] |
| REQ-BE-8 | No secrets in source control or browser code. No client-side security. | [PB §8.9, §8.10] |
| REQ-BE-9 | Never deploy, create paid services or change production data without explicit owner approval. | [PB §8.10, §17.1] |
| REQ-BE-10 | Test cross-device persistence and abuse cases. | [PB §12 Phase 14] |
| REQ-BE-11 | Hosting uses **free tiers** (MYR 0 running cost). The game is hosted on **GitHub Pages** (owner decision 10/11/2026); Supabase Free is proposed for auth and data from Phase 14 (TD-017). Any paid upgrade needs owner approval with its cost in MYR. | [OWNER 10/11/2026] |

## 17. Performance

| ID | Requirement | Source |
|---|---|---|
| REQ-PRF-1 | Browser and mobile performance drive engine choice. | [PB §6.1] |
| REQ-PRF-2 | Profile rendering, physics, memory, loading, mobile GPU usage, asset size and network requests. | [PB §12 Phase 15–16] |
| REQ-PRF-3 | Measure frame rate, memory, loading and input responsiveness **on real devices**. | [PB §15] |
| REQ-PRF-4 | No expensive physics for cosmetic objects; controlled debris. | [PB §8.6] |

No numeric targets (FPS, load time, bundle size, minimum devices) were supplied (OQ-10).

## 18. Testing and quality gates `[PB §15]`

A successful build alone does not prove the game works. Use unit tests for deterministic rules, integration tests for system interactions, browser tests for user flows, visual inspection for layout and animation, and real-device checks for mobile input and performance.

| Area | Minimum evidence before marking complete |
|---|---|
| Build | Production build exits successfully. No unresolved TypeScript or bundler errors. |
| Movement | Up, down, left, right and diagonal movement (diagonals not faster), hop, collision, facing and knockback. |
| Camera | Follow, auto-zoom to keep fighters framed, arena-bound clamping, shake. |
| Combat | Hit, miss, block, dodge, interrupt, cooldown, stamina and knockback. |
| Environment | Pickup validity, carry, throw, collision, bounce, breakage and cleanup. |
| Fighters | Every fighter action and important matchups; distinct animation and stats. |
| AI | Obstacle navigation, approach, retreat, dodge, block, attacks and object use. |
| Controls | Desktop has no mobile controls. Mobile has a joystick and exactly five combat buttons. |
| Tutorial | New player, returning player, tutorial replay and administrator skip. |
| Backend | Cross-device persistence, server-validated rewards, access control and audit trail. |
| Performance | Frame rate, memory, loading and input responsiveness on real devices. |

Browser verification uses the documented dev command and browser automation: test the milestone's acceptance criteria (not just the home page), capture screenshots where visual behaviour matters, and inspect console and network errors. **Never infer success from source code alone** `[PB §15.1]`. The full checklist is in `TESTING_CHECKLIST.md`.

## 19. Process, permissions and safe autonomy `[PB §16, §17]`

- Actions needing **owner approval**: public deployment, domain purchase, hosting activation or paid API subscription; production database changes or irreversible migrations; deleting or replacing major folders, assets or unrelated files; changing the approved rendering or physics architecture after implementation starts; accessing or modifying Froggy (read-only reference access is already authorised by the playbook); publishing credentials, keys, personal data or secrets.
- No unrestricted permission bypass as the default.
- Commit each working milestone. Record branch and commit hash at checkpoints.
- Agent Teams (experimental) are **not** enabled during setup `[PB §2, §10]`.

## 20. Future expansion

- Roster expansion toward 100 fighters in batches through the approved fighter pipeline `[PB §12 Phase 15]`.
- Additional arenas: playground, street, jungle, field `[PB §12 Phase 15, §14.4]`.
- Release phase: performance, security, compatibility, release and maintenance. Public deployment only with explicit approval `[PB §12 Phase 16]`.

## 21. Open questions (need owner decisions)

| ID | Question | Why it matters | Blocks / status |
|---|---|---|---|
| OQ-01 | Is **Stickman Kombat 2D** (Playgama, Ernar / Tempo Play) the intended "Stickman Kombat" reference? `[PB §4.4]` | The playbook asks for confirmation before treating it as definitive. | **RESOLVED 10/11/2026:** confirmed. It is the reference for style, feel, sound effects and attacks; movement follows Creature Clash (§2.1). |
| OQ-02 | **How are dodge, block, jump, pickup and throw triggered** when the HUD has exactly five combat buttons? Options: gestures (for example swipe the joystick to dodge), context-sensitive Button 1 near an object, extra *non-combat* buttons, automatic block, or a combination. | Dodge, block, jump, pickup and throw are all required (REQ-CMB-1, REQ-PHY-2, REQ-PHY-8, REQ-TUT-2), but no inputs are assigned. Adding buttons could breach INV-9. | **RESOLVED 10/11/2026 (TD-016):** the owner delegated the design. Hold Button 1 = block, flick stick = dodge, contextual utility button = jump / pick up / throw. See `docs/design/CONTROL_SCHEME.md`. |
| OQ-03 | Desktop default key map for the five actions, dodge, block, jump and pickup. | Only WASD is specified. | **RESOLVED 10/11/2026 (TD-016):** default bindings in `docs/design/CONTROL_SCHEME.md` §4. |
| OQ-04 | ~~Ultimate rule~~ **RESOLVED 11/11/2026:** charge meter (owner). Fill rates provisional (TD-032). | REQ-ABL-3 | Phase 6 |
| OQ-05 | Base **stat values** and ranges for the 13 stats; stamina pool, regeneration rate and ability costs. | Balance needs a baseline. | Phase 5–6, Phase 9 |
| OQ-06 | **Match rules:** round count, timer, draw conditions, win conditions, ring-out or fall-off? | REQ-MOD-7 | Phase 13 |
| OQ-07 | **3v3 rules** (simultaneous team fight or tag/relay?), ladder length, Story Mode content and bosses. | REQ-MOD-2 to 4 | Phase 13 |
| OQ-08 | **Economy numbers:** starting tokens, fighter prices, entry costs, rewards per mode, achievement list. | REQ-ECO-* | Phase 13–14 |
| OQ-09 | Does "purchases" mean real-money purchases? If yes: payment provider, MYR pricing, legal requirements. | Security and legal scope. | Phase 14 |
| OQ-10 | **Performance targets:** target FPS (desktop and mobile), minimum supported devices and browsers, load-time and bundle budgets. | REQ-PRF-* | Phase 1 onward |
| OQ-11 | **Backend preference** (for example Supabase, Firebase, or a custom Node API with Postgres) and hosting budget in MYR. | REQ-BE-1 | **PARTLY RESOLVED 10/11/2026:** owner wants free hosting (MYR 0). Game on GitHub Pages (decided); Supabase Free proposed for data (TD-017). Final backend sign-off is in Phase 14. |
| OQ-12 | **Sand** is listed under office props. Does the office have a sand source (for example a planter or fire bucket), or is sand for future arenas only? | REQ-PHY-12 | Phase 7 |
| OQ-13 | Multiplayer: are 1v1 and 3v3 against AI only, local, or **online PvP**? Nothing in the playbook specifies networking. | Online PvP changes the architecture fundamentally (netcode, authoritative server). | **RESOLVED 10/11/2026:** AI opponents only for now; online play possibly in the future (REQ-VIS-8, TD-018). |
| OQ-14 | Phase 11 says the desktop and mobile layouts "work independently **and simultaneously**". Does that mean one device with a keyboard and touchscreen at once, or only that both code paths coexist? | REQ-CTL-9 | **RESOLVED 10/11/2026 (TD-016):** both layouts coexist in one build; the active one follows the device actually used. A touch laptop switches to the touch HUD on the first touch and back on keyboard or mouse input. |
| OQ-15 | Adopt reference-derived presentation targets PRS-1 to PRS-11 and the telegraphing rule REQ-ABL-6 as binding? | Videos are references; the owner decides adoption. | **RESOLVED 10/11/2026:** adopted as binding (PRS-1..11, REQ-ABL-6). |
| OQ-16 | Art direction: what should the 2D top-down stickmen look like (pure line figures, thicker limbs, outlines, colours; seen from above or at a slight three-quarter angle)? How do the five fighters keep distinct silhouettes within it? | REQ-CHR-1, REQ-CHR-3 | Phase 8 |
| OQ-17 | Audio source: **partly answered 11/11/2026** (owner asked for impact sounds now): sound effects are synthesised in code (original, no files, TD-033). Still open: music, and whether to replace the synth with recorded or commissioned SFX later. | REQ-ABL-1 | Phase 6 on |
| OQ-18 | The specialist team was set by the owner (10 roles), which differs from the playbook's 9. The mapping of the playbook's environment, game-mode, UI and tutorial duties onto the 10 roles is in `docs/workflow/SYSTEM_OWNERSHIP.md`. Confirm. | Ownership clarity. | **RESOLVED 10/11/2026:** mapping confirmed, on condition that specialists are only used when needed to save tokens (TD-019). |

## 22. Superseded requirements

| ID | Old requirement | Superseded by | Date |
|---|---|---|---|
| SUP-01 | Four visible basic attack buttons plus four abilities. | Five-action layout (§7.1): 1 melee + 3 abilities + 1 ultimate. | Playbook v1.0/v1.2, 08/11/2026 |
| SUP-02 | Playbook §8.1: nine-worker team (stickman-architect, movement-physics-engineer, combat-systems-engineer, environment-engineer, character-animation-engineer, ai-gameplay-engineer, ui-mobile-tutorial-engineer, backend-security-engineer, qa-reviewer). | Owner's 10-specialist team (10/11/2026). Duties remapped in `docs/workflow/SYSTEM_OWNERSHIP.md`. | 10/11/2026 |
| SUP-04 | Fully 3D game: 3D arenas, third-person orbit camera with free rotation and obstruction handling, 3D gravity, slopes and stairs, Three.js, Blender and glTF assets, "no flat 2D sprite combat". | **2D top-down** game (REQ-VIS-1/2/3/9, INV-1, §5.1, REQ-PHY-1/2, REQ-ANI-5; TD-021, TD-022). Owner: "make it in 2D not 3D like Creature Clash where the creature can go front and back and left and right, everything should be in 2D". | 10/11/2026 |
| SUP-03 | Playbook §8: "create the first group [of workers] after the architecture has been approved". | Owner instructed creating all specialists during initialisation (10/11/2026). | 10/11/2026 |
| SUP-05 | REQ-ANI-7 (owner, 11/11/2026): moving as a fighting shuffle, feet never crossing, arms only bobbing in guard ("never a casual walk with loose swinging arms"). | REQ-ANI-10: real alternating steps with each fist swinging opposite its leg, elbows bent; a run cycle. Owner: "smooth walking animations with alternating arm and leg movements". | 11/11/2026 |
| SUP-06 | REQ-ANI-10 (owner, 11/11/2026): walking with the fists held up near the chin in guard, low crouched hips and a hunched lean. | REQ-ANI-11: an upright, confident walk with freely swinging fists and a powerful upright run. Owner: "it looks weird and not confident ... it should be strong and confident". | 11/11/2026 |
| SUP-07 | REQ-ENV-11 (owner, 11/11/2026): walking or normal movement never opens the door; only breaking it clears the way. | REQ-ENV-13: walking into the door swings it open (breaking still works). Owner: "the player can just break the door or walk to the next room without breaking the door". | 11/11/2026 |
| SUP-08 | REQ-ENV-13 (owner, 11/11/2026): interior walls cut away to 0.8 m so doorways show. | REQ-ENV-15: the curved wall full height with a glass door. Owner: "a short wall makes the player think they can jump over it". | 11/11/2026 |
| SUP-09 | REQ-CTL-12 / REQ-CTL-16 / CONTROL_SCHEME §4: Shift dodges on desktop. | REQ-CTL-17: right click dodges toward the movement keys; Shift sprints. | 11/11/2026 |
| SUP-10 | REQ-CTL-15: two desktop presets (keyboard + mouse; keyboard only with J melee, K/L/O abilities, I ultimate, U interact, arrow keys). | REQ-CTL-17: one default layout, fully rebindable in Settings (one key per action). | 11/11/2026 |
| SUP-11 | REQ-CTL-16 (owner, 11/11/2026): the default stickman tucks and rolls backwards to dodge. | REQ-ANI-12: a quick directional dash dodge. Owner: "a quick dodge movement rather than a rolling animation". | 11/11/2026 |
| SUP-13 | Inferno A3 "Eruption": slam the floor, a telegraphed ring of fire erupts around him. Ultimate "Meteor Fist". | REQ-ABL-12: A3 is Fire Beam; the ultimate is renamed Eruption (a jumping ground slam). | 11/11/2026 |
| SUP-15 | TD-042: procedural background fight music per map (beats, bass, melody) and a menu theme. | REQ-AUD-1: ambience only, no music. Owner: "ensure all background music are ambience not music". | 12/11/2026 |
| SUP-14 | REQ-CTL-16: Inferno's dodge as a large flame with a blue-grey base. | REQ-ANI-14: a small, quick streak of fire, no grey. | 11/11/2026 |
| SUP-16 | REQ-ABL-14 (owner, 12/11/2026): Rampage as a rhino-themed brawler (rhino head, great horn, armoured hide, bronze gear) whose charge started on all fours. | REQ-ABL-14: Rampage Buffer, a muscular grey human stickman with a round head; the charge stays on two legs. Owner: "His head must be a simple round human stickman head, not a rhino head ... Do not make him run on four legs." | 12/11/2026 |
| SUP-17 | REQ-CTL-17 (owner, 11/11/2026): the dodge goes toward the held movement direction (backwards with none). | REQ-CTL-20: always straight back from the facing, facing kept. Owner: "Make dodge always move the character backwards relative to their facing direction, regardless of movement input." | 12/11/2026 |
| SUP-18 | Eyes on stickmen (owner, 12/11/2026: Braxon's "visible and menacing" eyes; the angular eyes of the restyle; Necro's planned glowing eyes). | No eyes on any stickman. Owner: "remove the eyes for all stickmen". The character Rampage Buffer is renamed **Braxon**. | 12/11/2026 |
| SUP-19 | REQ-ABL-15 (owner, 12/11/2026): R Undead Army (three skeletons for 10 s around Necro) and the ultimate Death's Dominion (8 s of power, two more skeletons). | R **Teleport**; ultimate **Undead Army**: four skeletons near the enemy that stay until killed; Soul Drain also blinds for 3 s. | 12/11/2026 |
| SUP-20 | INV-9 (exactly five combat actions: melee, three abilities, ultimate) and the five touch combat buttons. | Six: a fourth ability on R for every fighter (REQ-ABL-17). Owner: "add another ability to every one of the stickmen ... set that new ability as the R keybind as default". | 12/11/2026 |
| SUP-21 | REQ-CTL-17/18: left click attacks, right click dodges, R ability 3, F ultimate, a separate launch key (left click) and mouse-hover or touch-drag aiming for the leap; Teleport aimed by mouse click or tap. | REQ-CTL-21: J/K/L/F/R defaults, the ability's own key confirms, WASD or the joystick aim, Escape or ✕ cancels. Saved key layouts reset once (settings v2). | 12/11/2026 |
| SUP-22 | The testing area (training yard) played the Colosseum tournament ambience (suspenseful crowd). | No background soundscape in the testing area, now or in future updates. Owner: "Remove the suspense background music from the Testing Area completely. Never reuse it in future Testing Area updates." Heads of every stickman sit centred on the torso's axis (the head angle no longer moves the head). | 12/11/2026 |
| SUP-24 | REQ-AUD-1 "background ambience, never music"; Undead Army skeletons that stay until killed (REQ-ABL-15). | Battle music in fight arenas (REQ-AUD-10), alongside the ambience. Undead Army skeletons last 10 s again (and fall with Necro). Owner: "the skeletons ... should have time frame ... revert it to how it previously was". | 12/11/2026 |
| SUP-25 | Necro's Teleport on F (aimed, then briefly one press away / two presses in); Shroud's Thrown Blade on Q; Hunting Frenzy knife damage +35%. | Curse of Decay (REQ-ABL-20); Shadow Escape; lights out with night vision; knife +10% (REQ-ABL-21). | 12/11/2026 |
| SUP-26 | REQ-PHY-13 first version: thrown pieces tumble with their momentum (fast end-over-end, plus a spin). | A steady arc with at most a quarter-turn pitch and no random spin. Owner: "Fix the issue where thrown furniture spins randomly or uncontrollably." | 12/11/2026 |
| SUP-27 | REQ-PHY-12 first version: drops over 1.3 m hurt, with a short dizzy (stunned) recovery. | Safe up to 2.2 m (walking off any furniture), damage and a collapse plus get-up beyond it, by the real drop; never dizzy. Owner: "The height shown in the reference image should not cause damage when simply walking off a platform." | 13/11/2026 |
| SUP-28 | REQ-PHY-14 first version: the taller walls rise into view only while a fighter is in the air. | Always shown at full height. Owner: "just make the wall height visible instead of making it visible and not visible again". | 13/11/2026 |
| SUP-29 | REQ-PHY-8..10 landings: thrown glass and ceramic shattered on a hard landing; other thrown furniture landed whole and was planted again. | Anything thrown breaks where it lands (owner: "Once the furniture is thrown it should break"); pieces with no durability survive. | 13/11/2026 |
| SUP-30 | REQ-MOD-8: watch up to 3 AI battles per stage; per-battle Watch/Skip rows and Skip Battles; a Skip battle button in a watched fight; held upright, phones paused behind a turn-your-phone screen (REQ-UI). | Watch any battle by tapping it in the draw; one Skip under the draw; leaving a fight settles it; upright phones play in a turned landscape layout (REQ-UI-31). | 13/11/2026 |
| SUP-31 | REQ-CTL-19 / REQ-MOD-8: the main menu (fighter cards, arena, Practice or Tournament, opponent, difficulty, Play) opens first for everyone; Leave game returns to it. | The title screen opens first (REQ-UI-32); the old main menu is the Admin Panel, for the admin name only (REQ-UI-34); players reach tournaments through Game Modes and fighter select (REQ-UI-33); Leave game returns to the title screen. | 13/11/2026 |
| SUP-32 | REQ-MOD-8: stages named Round of 16, Quarter Finals, Semi Finals, Final. REQ-CTL-20: the dodge is always the back-step. REQ-UI-33: select stances in side profile at a common height. | Top 16, Top 8, Top 4, Top 2, then Champion. The dodge sidesteps out of an incoming projectile's path (REQ-CMB-30). Select stances turned 30-45° towards the camera, Titan larger with hands on his hips (REQ-UI-33). | 13/11/2026 |
| SUP-23 | REQ-CTL-21 defaults: K ultimate. | K Heavy Attack, I ultimate; J/L also sweep a pouring Fire Beam (settings v3). | 12/11/2026 |
| SUP-12 | REQ-CMB-12: three-strike 1-2-3 combo (jab, hook, heavy finisher). | REQ-CMB-26: three punches then a kick. | 11/11/2026 |

## 23. Change log

| Date | Change | By |
|---|---|---|
| 13/11/2026 | Owner: roll back the other fighters' redesign and their portraits to the last approved state (Inferno and the bookshelf approved; the furniture finish and monitor fix kept). | Master Developer |
| 13/11/2026 | Owner: the approved style applied to everything (REQ-VIS-10): every fighter (premium skins), every portrait, and the furniture (material finish on every prop, detailed cubicle panels, desks, monitors and cabinets). | Master Developer |
| 13/11/2026 | Owner approved the redesign prototypes (REQ-VIS-10, TD-059 accepted); Inferno's boots slimmed. | Master Developer |
| 13/11/2026 | Owner: visual-redesign prototypes, Inferno, his premium portrait and the bookshelf (REQ-VIS-10), awaiting approval. | Master Developer |
| 12/11/2026 | Owner: battle music (the owner's supplied Japanese boss track, looped) and the fight stinger (REQ-AUD-10, SUP-24); Undead Army back on a 10 s timer (SUP-24); Curse of Decay replaces Teleport (REQ-ABL-20, SUP-25); Shadow Escape, lights out and night vision, knife +10% (REQ-ABL-21, SUP-25); steady thrown-furniture arcs (REQ-PHY-13, SUP-26). | Master Developer |
| 12/11/2026 | Owner: Shroud (REQ-ABL-18); Heavy Attack and ultimate on I (REQ-CMB-30, SUP-23); target lock (REQ-CTL-22); Fire Beam build-up and J/L sweep (REQ-ABL-19); fight intro (REQ-AUD-9); tumbling furniture (REQ-PHY-13); testing area silent (SUP-22); centred heads behind the near arm; restyled ability icons. | Master Developer |
| 12/11/2026 | Owner: keyboard/joystick targeting and J/K/L/F/R keys (REQ-CTL-21, SUP-21); a fourth ability on R for every fighter (REQ-ABL-17, SUP-20, INV-9); walk/run split and relaxed idle (REQ-ANI-13); climbing and fall damage (REQ-PHY-12); Braxon's structure and straight-line charge; heavy steel sound; fighter-coloured stats and combo icons; HUD restyle (REQ-UI-30). | Master Developer |
| 12/11/2026 | Owner: Necro's Teleport, blinding Soul Drain and permanent Undead Army ultimate (REQ-ABL-15, SUP-19); fighter stats screen and balance (REQ-ABL-16). | Master Developer |
| 12/11/2026 | Owner: Necro, the third fighter (REQ-ABL-15), with summoned minions and teams; the Necro design pass (mage idle with a planted bone staff in the left hand, skull eyes that glow while casting, a levitating summon with the free arm raised, purple energy). | Master Developer |
| 12/11/2026 | Owner: eyes removed from all stickmen (SUP-18); Rampage Buffer renamed Braxon (REQ-ABL-14). | Master Developer |
| 12/11/2026 | Owner: Rampage's walk on straighter legs; Inferno breaks walls far faster, with damage accumulating on the struck section and progressive cracks, spalls, cavity and scorch; on touch, the joystick aims the Fire Beam while it pours; the Colosseum ambience redesigned (suspenseful crowd with arena echoes, not based on supplied audio); the Dummy, Inferno and Rampage restyled after the owner's reference art (tapered limbs, cel shading, coloured edges, angular eyes) with sizes and gameplay unchanged. | Master Developer |
| 12/11/2026 | Owner: dodge always straight back from the facing, with a consistent distance (REQ-CTL-20, SUP-17). | Master Developer |
| 12/11/2026 | Owner: Rampage Buffer resized to 1.1× Inferno (was 1.6×); body radius 0.38 m and reach +0.1 m over his original moves (REQ-ABL-14). | Master Developer |
| 12/11/2026 | Owner: Rampage Buffer leaner, with shaded (not drawn) muscles and no belt blob; a heavyweight idle, walk and run (REQ-ABL-14). | Master Developer |
| 12/11/2026 | Owner: Rampage Buffer a little smaller (1.6×), bodybuilder physique, fighting pants (REQ-ABL-14); the admin editor can pick the opponent for Try in game (admin preview only). | Master Developer |
| 12/11/2026 | Owner: Rampage redesigned as Rampage Buffer, a muscular grey human stickman with a round head (REQ-ABL-14, SUP-16); Rampage Charge on two legs, longer and faster, stopping in a collision burst; drawn twice Inferno's size; lifting heavier objects takes longer (REQ-PHY-8); Fire Beam steerable by mouse or swipe (REQ-ABL-12); ability icons on the bar and buttons; button text always fits. | Master Developer |
| 12/11/2026 | Owner: Rampage, the second fighter (REQ-ABL-14); fighters to be added one at a time; main menu, Leave game, fullscreen and compact phone layout (REQ-CTL-19). | Master Developer |
| 12/11/2026 | Owner: background music replaced by ambiences (REQ-AUD-1, SUP-15): an empty office, a Colosseum tournament crowd and a muffled tunnel for the menu. | Master Developer |
| 12/11/2026 | Owner: the game is silent while its tab is hidden (REQ-AUD, `pauseAudioWhenHidden`); the Fire Beam charge is 1 s (REQ-ABL-12). | Master Developer |
| 11/11/2026 | Owner: Inferno's living-flame look (REQ-ANI-14), Magic Attack VFX Standard with the Fireball as benchmark (REQ-ABL-11), Fire Beam and the Eruption slam (REQ-ABL-12), distance-based damage (REQ-ABL-13); doorway posts fit the curved wall. | Master Developer |
| 11/11/2026 | Owner: a real running cycle and a sprint gait (REQ-ANI-13). | Master Developer |
| 11/11/2026 | Owner: default desktop controls, sprint, right-click dodge, Settings with audio sliders and rebinding with conflict checks, no context menu (REQ-CTL-17); mouse-aimed leap ultimate (REQ-CTL-18); four-hit combo (REQ-CMB-26); quick dodge (REQ-ANI-12). Superseded SUP-09..12. | Master Developer |
| 11/11/2026 | Owner: data-driven character system (REQ-CHR-1..6); Inferno fist flames via its effects profile. | Master Developer |
| 11/11/2026 | Owner: centre cubicle pairs (REQ-ENV-8 updated), 33 m office (REQ-ENV-12 updated), breakable office equipment and material destruction (REQ-PHY-6b). | Master Developer |
| 11/11/2026 | Owner: furniture facing, tall glass-door wall, breakable wall sections (REQ-ENV-15; supersedes the 0.8 m cut-away wall of REQ-ENV-13: SUP-08). | Master Developer |
| 11/11/2026 | Phase 7 slice 2: throwables, throw aim indicator, per-fighter object handling (REQ-PHY-9b). | Master Developer |
| 11/11/2026 | Owner: dodge button, weight-based dodge cooldown, character dodges (REQ-CTL-16); tougher metal (REQ-PHY-6c). | Master Developer |
| 11/11/2026 | Owner approved the 2.5D mockups: REQ-VIS-11 (isometric presentation, fire head, free facing with soft lock). | Master Developer |
| 11/11/2026 | Owner: furnished office (REQ-ENV-14). | Master Developer |
| 11/11/2026 | Owner: curved (first diagonal) boss-room wall, rearranged furniture, small visible door that swings open when walked into (REQ-ENV-13, REQ-ENV-11 updated, SUP-07). | Master Developer |
| 11/11/2026 | Owner: strong, confident walk and run (REQ-ANI-11); crouched guard-up walk superseded (SUP-06). | Master Developer |
| 11/11/2026 | Owner: walking and running (REQ-ANI-10); shuffle rule superseded (SUP-05). | Master Developer |
| 11/11/2026 | Owner: aimed ultimate (REQ-ABL-9); keyboard-only preset A3 moved to O. | Master Developer |
| 11/11/2026 | Owner: dynamic wall transparency (REQ-VIS-10). | Master Developer |
| 11/11/2026 | Owner: Punch Clash (REQ-CMB-25). | Master Developer |
| 11/11/2026 | Owner: hit feel for every blow (REQ-CMB-24) and the KO dust dissolve (REQ-ANI-9); OQ-17 partly answered (synthesised original SFX, TD-033). | Master Developer |
| 11/11/2026 | Phase 6: OQ-04 resolved (charge-meter ultimate, REQ-ABL-3); Inferno kit (REQ-ABL-7); abilities share melee rules (REQ-ABL-8). | Master Developer |
| 11/11/2026 | Owner feedback: compact office (REQ-ENV-12), furniture moves or breaks by durability (REQ-PHY-6a), fall and get-up animation (REQ-ANI-8), combo variations (REQ-CMB-22), shorter kick knockback (REQ-CMB-23), no button highlight on touch (REQ-CTL-16). | Master Developer |
| 11/11/2026 | Phase 5 combat: health, damage and KO, block and parry, dodge, stamina, hit reactions, one engine for player and dummy, queued taps (REQ-CMB-16..21). Values provisional pending OQ-05 (TD-030). | Master Developer |
| 10/11/2026 | Initial specification compiled from Playbook v1.2, owner instructions, both reference videos and Creature Clash. | Master Developer |
| 11/11/2026 | Owner requests: office layout with 12 cubicles, boss room and breakable door (REQ-ENV-8..11); higher jump with jump stance (REQ-PHY-2a); 1-2-3 combo, heavy finisher, flying kick, capsule hits (REQ-CMB-12..15); unarmed boxer stance as default (REQ-ANI-7). | Master Developer |
| 11/11/2026 | REQ-ANI-7 extended: fighting stance at all times when idle or moving (owner). | Master Developer |
| 10/11/2026 | Added REQ-ANI-7: unique idle stance, movement style and attack animations per fighter (owner). | Master Developer |
| 10/11/2026 | Added REQ-ANI-6: jointed 2D skeletons with elbows and knees for smooth, natural attacks (owner). | Master Developer |
| 10/11/2026 | **Switched from 3D to 2D top-down** (owner). Rewrote REQ-VIS-1/2/3, INV-1, §5.1 camera, REQ-PHY-1/2, REQ-CMB-2, REQ-ANI-5, PRS-11, the §18 table and OQ-16; added REQ-VIS-9; superseded the 3D rules as SUP-04. | Master Developer |
| 10/11/2026 | Game hosting switched from Cloudflare Pages to GitHub Pages (owner). | Master Developer |
| 10/11/2026 | Owner decisions applied: control scheme (REQ-CTL-11..15, TD-016), AI-only play (REQ-VIS-8), free hosting (REQ-BE-11), PRS-1..11 and REQ-ABL-6 binding, Stickman Kombat 2D role confirmed and widened to style, feel, sound effects and attacks; OQ-01/02/03/13/14/15/18 resolved, OQ-11 partly; original requirements confirmed unavailable. | Master Developer |
| 13/11/2026 | Owner: Braxon renamed **Titan** (REQ-ABL-14); the character id stays `rampage`. | Master Developer |
| 13/11/2026 | Owner: Grapple Slam hit and miss animations (REQ-ABL-17); traversal across small gaps, falling, height-based landings, get-up and new fall damage rule (REQ-PHY-12, SUP-27). | Master Developer |
| 13/11/2026 | Owner: redesign made the default for all fighters (REQ-VIS-10, TD-060); damage balance (REQ-CMB-31); taller outer walls shown in the air (REQ-PHY-14). | Master Developer |
| 13/11/2026 | Owner: taller walls always shown (REQ-PHY-14, SUP-28); Shroud's knife points up diagonally and his mask tips down slightly. | Master Developer |
| 13/11/2026 | Owner: thrown furniture breaks on landing (SUP-29); fighter AI opponents and the menu's opponent picker (REQ-AI-7). | Master Developer |
| 13/11/2026 | Owner: AI path-finding and difficulty levels (REQ-AI-7); Tournament mode (REQ-MOD-8). | Master Developer |
| 13/11/2026 | Owner: before every fight (READY... FIGHT!) the fighters stand about 3 m apart on clear floor, facing each other (REQ-UI intro, `FIGHT_START_GAP_M`). | Master Developer |
| 13/11/2026 | Owner: landscape only on phones and tablets (first tap goes full screen and locks landscape; held upright the game pauses behind a turn-your-phone screen); main menu in a two-column landscape layout that fits one phone screen (fighters left, match settings right, Play below), cards without descriptions; lore-based fighter histories in the details. Mobile e2e now runs on a landscape phone. | Master Developer |
| 13/11/2026 | Owner: per-fighter AI brains and four difficulty levels as intelligence (REQ-AI-8); Necro no longer only uses his ultimate on Easy. | Master Developer |
| 13/11/2026 | Owner: always landscape with no rotate screen, settings on every screen, combat controls only in fights (REQ-UI-31); tournament: watch any battle, one Skip, leaving a fight settles it (REQ-MOD-8, SUP-30); both AI fighters mash in a watched Punch Clash. | Master Developer |
| 13/11/2026 | Owner: front end with the owner's title art, name registration, admin/user screens, Game Modes, fighter select with info panel and unique select stances, menu music and click (REQ-UI-32..34, REQ-AUD-11, SUP-31). | Master Developer |
| 13/11/2026 | Owner: projectile-aware dodge and dodge fatigue (REQ-CMB-30); tournament stages Top 16/8/4/2 then Champion; select stances turned 30-45° towards the camera, Titan larger with hands on hips (SUP-32). | Master Developer |
| 13/11/2026 | Owner: title menu as the game's own plates (Admin Panel style) over the art with its painted plates removed; every screen fits one landscape screen (tournament draw scaled to fit); no page zoom; fullscreen asked on every tap until granted, web app manifest for home-screen full screen (Froggy's approach studied, not copied); Titan's select pose cleaned up. | Master Developer |
| 13/11/2026 | Owner: Practice with Tutorial and Open Zone (REQ-UI-35); close, exciting watched AI battles (REQ-AI-9); title art anchored to the top so Titan's head shows in fullscreen, Necro's face dark, Shroud's mask curved; new app icon; Titan's select pose restored to the owner's preferred version. | Master Developer |
