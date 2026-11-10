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
| INV-9 | Exactly **five** combat actions (§7). The mobile HUD shows exactly five combat buttons. |

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

### 5.3 Future arenas `[PB §12 Phase 15, §14.4]`

REQ-ENV-7: playground, street, jungle and field arenas, each with suitable local obstacles, throwable objects and material responses.

## 6. Physics and environmental interaction

### 6.1 Movement physics `[PB §8.4, §12 Phase 2–3]`

| ID | Requirement |
|---|---|
| REQ-PHY-1 | Reusable 2D top-down character controller (circle or capsule body on the floor plane). |
| REQ-PHY-2 | Free movement in all directions with acceleration, deceleration, facing direction, running, obstacles and **jumping as a short hop** (airborne height with a ground shadow; the player is airborne for a moment and avoids ground-level hits). There is no gravity in the floor plane, and no slopes or stairs. *(3D gravity, slopes and stairs superseded: SUP-04.)* |
| REQ-PHY-3 | Friction, knockback, and per-fighter weight and mobility values. |
| REQ-PHY-4 | Collision layers, rigid bodies, camera collision, navigation integration, physics performance. |

### 6.2 Object material model `[PB §14.4]`

| ID | Requirement |
|---|---|
| REQ-PHY-5 | Objects have **material, mass and durability** properties. |
| REQ-PHY-6 | Fragile glass can shatter. Wooden furniture can move, topple or break. Metal objects resist more damage. Some objects are movable but not destructible. |
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
| REQ-CTL-12 | Dodge by **flicking the movement stick** on touch (optional double-tap mode) or the dodge key (Shift) on desktop. | [TD-016] |
| REQ-CTL-13 | One **contextual utility button** (jump / pick up / throw; hold to drop), visually distinct from the five combat buttons. Desktop has Space for jump and a separate interact key. | [TD-016] |
| REQ-CTL-14 | Automatic soft target lock on the nearest visible opponent; switch with a tap on the opponent or Tab. Aim assist never guarantees hits. | [TD-016] |
| REQ-CTL-15 | Two desktop presets: keyboard + mouse (default) and keyboard only. | [TD-016] |

### 7.2 Desktop `[PB §8.9, §12 Phase 11]`

| ID | Requirement |
|---|---|
| REQ-CTL-1 | WASD movement and configurable keyboard bindings. |
| REQ-CTL-2 | Desktop shows keyboard controls and **no** virtual joystick and **no** mobile combat buttons. |
| REQ-CTL-3 | Key rebinding, reset to defaults, conflict prevention. |

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
| REQ-CMB-11 | Pairwise combat and ability regression tests across fighters. | [PB §12 Phase 8–9] |

## 10. Abilities

| ID | Requirement | Source |
|---|---|---|
| REQ-ABL-1 | One **shared ability framework**. Each ability includes target validation, stamina, cooldown, hit detection, animation, VFX, sound, interruption and automated tests. | [PB §11.1] |
| REQ-ABL-2 | Each fighter has exactly 3 unique abilities and 1 unique ultimate. | [PB §4.2, §14.2] |
| REQ-ABL-3 | Ultimate has its own **charge or cooldown** rule (not yet specified, OQ-04). | [PB §4.2] |
| REQ-ABL-4 | Ability interfaces support fighter–object interactions (§8.3). | [PB §12 Phase 7] |
| REQ-ABL-5 | Abilities and ultimates must be **original**. Creature Clash's ability catalogue may be used as a **design reference** for delivery types (projectile, fan, ring, dash, beam, trap, shield, blink, lob, snare, aura, heal), effect categories (control, damage-over-time, mobility, defence, summons, zones) and the "every ultimate designed, none weaker" balance philosophy, reinterpreted for Stickman Arena. See `docs/references/CREATURE_CLASH_OBSERVATIONS.md`. | [OWNER 10/11/2026] [REF-CC] |
| REQ-ABL-6 | Telegraphing: where an ability has a delayed area, show it before it lands so it can be avoided. *Adopted by the owner 10/11/2026 (OQ-15).* | [REF-CC] [REF-VIDEO] [OWNER] |

## 11. Animation and visual presentation

### 11.1 Requirements `[PB §8.7, §12 Phase 8–9]`

| ID | Requirement |
|---|---|
| REQ-ANI-1 | Fighter definition schema, model loading, rig contract, animation state machine, movement parameters, audio and VFX hooks. |
| REQ-ANI-2 | Animation states blend smoothly with movement, attacks, hit reactions, knockback, pickup and throwing. |
| REQ-ANI-3 | Each fighter has distinct attack, ability and ultimate animations. |
| REQ-ANI-4 | Animation events (for example hit-frame timing) are coordinated with the combat system. |
| REQ-ANI-5 | 2D asset pipeline (TD-022, proposed): fighters as crisp vector stick figures drawn in code with 2D skeletal (bone) animation defined as data; effects as particles and sprites; environment props as 2D top-down art. *(Blender and glTF superseded: SUP-04.)* |

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
| OQ-04 | **Ultimate rule:** charge meter (built how?) or timed cooldown? Values? (For reference, Creature Clash unlocks ultimates 25 s into a fight with a 25 s cooldown.) | REQ-ABL-3 | Phase 6 |
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
| OQ-17 | Audio: no music or SFX requirements beyond "sound" hooks. Source of audio assets? | REQ-ABL-1 | Phase 6 onward |
| OQ-18 | The specialist team was set by the owner (10 roles), which differs from the playbook's 9. The mapping of the playbook's environment, game-mode, UI and tutorial duties onto the 10 roles is in `docs/workflow/SYSTEM_OWNERSHIP.md`. Confirm. | Ownership clarity. | **RESOLVED 10/11/2026:** mapping confirmed, on condition that specialists are only used when needed to save tokens (TD-019). |

## 22. Superseded requirements

| ID | Old requirement | Superseded by | Date |
|---|---|---|---|
| SUP-01 | Four visible basic attack buttons plus four abilities. | Five-action layout (§7.1): 1 melee + 3 abilities + 1 ultimate. | Playbook v1.0/v1.2, 08/11/2026 |
| SUP-02 | Playbook §8.1: nine-worker team (stickman-architect, movement-physics-engineer, combat-systems-engineer, environment-engineer, character-animation-engineer, ai-gameplay-engineer, ui-mobile-tutorial-engineer, backend-security-engineer, qa-reviewer). | Owner's 10-specialist team (10/11/2026). Duties remapped in `docs/workflow/SYSTEM_OWNERSHIP.md`. | 10/11/2026 |
| SUP-04 | Fully 3D game: 3D arenas, third-person orbit camera with free rotation and obstruction handling, 3D gravity, slopes and stairs, Three.js, Blender and glTF assets, "no flat 2D sprite combat". | **2D top-down** game (REQ-VIS-1/2/3/9, INV-1, §5.1, REQ-PHY-1/2, REQ-ANI-5; TD-021, TD-022). Owner: "make it in 2D not 3D like Creature Clash where the creature can go front and back and left and right, everything should be in 2D". | 10/11/2026 |
| SUP-03 | Playbook §8: "create the first group [of workers] after the architecture has been approved". | Owner instructed creating all specialists during initialisation (10/11/2026). | 10/11/2026 |

## 23. Change log

| Date | Change | By |
|---|---|---|
| 10/11/2026 | Initial specification compiled from Playbook v1.2, owner instructions, both reference videos and Creature Clash. | Master Developer |
| 10/11/2026 | **Switched from 3D to 2D top-down** (owner). Rewrote REQ-VIS-1/2/3, INV-1, §5.1 camera, REQ-PHY-1/2, REQ-CMB-2, REQ-ANI-5, PRS-11, the §18 table and OQ-16; added REQ-VIS-9; superseded the 3D rules as SUP-04. | Master Developer |
| 10/11/2026 | Game hosting switched from Cloudflare Pages to GitHub Pages (owner). | Master Developer |
| 10/11/2026 | Owner decisions applied: control scheme (REQ-CTL-11..15, TD-016), AI-only play (REQ-VIS-8), free hosting (REQ-BE-11), PRS-1..11 and REQ-ABL-6 binding, Stickman Kombat 2D role confirmed and widened to style, feel, sound effects and attacks; OQ-01/02/03/13/14/15/18 resolved, OQ-11 partly; original requirements confirmed unavailable. | Master Developer |
