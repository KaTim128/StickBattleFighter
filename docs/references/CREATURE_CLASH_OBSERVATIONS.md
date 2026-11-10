# Creature Clash Reference Observation Report

> Required by Playbook §4.4. Prepared by the Master Developer on 10/11/2026.
> **Source:** `KaTim128/froggy-arcade`, branch inspected read only. **No file was modified, copied or imported.**
> The owner additionally asked (10/11/2026) to use **Creature Clash's abilities** as a reference.

## 1. What was inspected

| File (Froggy repo) | Lines | Content |
|---|---|---|
| `src/scenes2d/CreatureArena.ts` | 6,883 | The real-time fight scene: movement, AI, shots, cover, ultimates, HUD |
| `src/game/specials.ts` | 283 | Catalogue of about 200 unique special abilities (`SpecialDef`) |
| `src/game/ultimates.ts` | 985 | One unique ultimate per creature or boss, with an effect-budget system |
| `src/game/creatures.ts` | 616 | `AttackKind` delivery types, `Mod` effect modifiers, roster, prices |
| `src/game/creatureClash.ts` | 545 | Economy and save transactions: recruit, story, ladder |

Inspected by reading code and comments only. **The game was not run**, so feel and timing were not observed first-hand.

## 2. Key finding: Creature Clash is 2D, not 3D

The playbook calls Creature Clash the "primary reference for the overall **3D** gameplay foundation… camera behaviour" `[PB §4.4]`. The code shows it is a **2D, top-down, real-time Phaser scene** (`CreatureArena.ts` header: "Real time, top down, one on one"). Distances are in pixels, the camera is a fixed 2D view, and the Phaser camera is used only for shake and flash. Froggy does depend on Three.js, but other scenes use it, not the Clash.

**Consequence:** Creature Clash is a valid reference for *free 360° planar movement, cover and line of sight, AI behaviour, ability design and economy flow*, but **not** for a 3D third-person camera, 3D collision or vertical movement. Those must come from first principles and engine documentation. Recorded as TD-011 and flagged to the owner.

## 3. Movement, arena and AI observations (design lessons)

| Observation (Creature Clash) | Lesson for Stickman Arena (original 3D implementation) |
|---|---|
| Free 8-direction movement (WASD, arrows or touch stick); abilities **auto-aim** at the opponent; a blink goes the way you walk. | Auto-aim (soft lock-on) is valuable on mobile. Consider soft target assist for abilities, with the movement direction steering mobility moves. Must still respect real hit detection (REQ-CMB-2). |
| **Cover shapes** in the arena block shots via a line-segment test (`blocked()`); walls never block their owner. | 3D obstruction via physics raycasts and shape casts against arena colliders; furniture as cover (REQ-CMB-2, REQ-ENV-4). |
| "Lobbed" (`arc`) attacks fly over cover; the AI uses them when it has **no line of sight** (`ai: 'hidden'`). | 3D arcing projectiles naturally go over desks; the AI should pick them when LOS is blocked. |
| AI `skill` 0–1 controls aim, leading shots, dodge frequency, fire rate, and whether it **works its way around cover**. The ladder ramps skill rather than adding health. | Difficulty = **behaviour quality**, not stat inflation (REQ-AI-4). Matches the playbook's "not just pursuit and spam" (REQ-AI-3). |
| AI dodges incoming shots by strafing perpendicular to them for about 0.28–0.4 s; tracks being stuck; leads shots using player velocity. | Perception of projectiles, perpendicular evasion, stuck detection and target leading are good AI building blocks. |
| Each special carries an `ai` usage tag: poke, close, mid, self, defend, escape, heal, hidden, never. | Give every Stickman ability data-driven **AI usage hints** so one generic AI can use any fighter's kit (REQ-AI-1, REQ-ARC-3). |
| Every fight is settled exactly once (`finishBattle`/`retreat`) whatever order timers, taps or tab switches arrive in. | Match resolution must be idempotent; a must for server-validated rewards (REQ-BE-3). |
| Admin test switch: "no cooldowns" for admin testing. | Useful admin/dev tool; must be server-role-gated (REQ-BE-4). |

## 4. Ability catalogue (reference for REQ-ABL-5)

### 4.1 Delivery types (`AttackKind`)

`bolt` (one fast shot) · `spread` (fan of shots) · `nova` (ring around self) · `dash` (you are the projectile) · `beam` (instant long line) · `mine` (ground trap) · `shield` (moment of cover) · `blink` (short teleport) · `arc` (lobbed over cover, bursts on landing) · `snare` (rooting shot) · `aura` (timed buff) · `mend` (self-heal).

→ **Translation:** a good starting vocabulary for the Stickman shared ability framework's *delivery components*, rebuilt in 3D (a bolt becomes a physics projectile, a nova a sphere overlap, a beam a capsule cast, an arc a ballistic projectile, a mine a trigger volume, and so on).

### 4.2 Effect modifiers (`Mod`)

- **On hit:** poison, mark, shred, execute, drain, pull, push, root, silence, weaken, chill, stagger, crit
- **Path:** homing, bounce, wave, boomerang, grow, drill, split
- **Area:** linger, echo, vortex
- **Self:** haste, guard, regen, cleanse, evade, focus, fury, quicken, reflect, thorns, strike

→ **Translation:** status and modifier components that the five Stickman fighters' abilities can combine. For example, Ronin's deflection maps to *reflect*, Phantom's object redirection to *pull/push + homing*, and Inferno's ignition to *linger (burn zone)*.

### 4.3 Design rules worth adopting (owner to confirm)

1. **Every ability is unique**: no two abilities do the same thing, and where two share an effect they deliver it differently. Same spirit as REQ-CHR-2 and REQ-CHR-3.
2. **Every description states exactly what it does, with numbers.** Good practice for tooltips, tutorials and balance review.
3. **Ultimates are designed, not dealt**: each built from 2–4 effects with a signature first; checked so no two share the same make-up.
4. **Ultimate power budget**: every effect is valued in one currency (health-equivalent) and each ultimate is scaled to the same budget (56; bosses ×1.5). This is a strong approach to REQ-ABL-2 balance.
5. **Ultimate timing**: unlocks 25 s into a fight, then a 25 s cooldown, the same clock for both sides. (Stickman's rule is open; see OQ-04.)
6. **Ultimate effect families**: hits (charge, leap, nova, beam, sweep, meteor, chain…), summons (pack, turret, totem, clones…), control (stun, slow field, root field, blind, silence…), self (shield, reflect, lifesteal, giant form, stealth…).

### 4.4 Illustrative examples (concepts only; do not copy names or numbers verbatim)

- *Dash that leaves a burning strip* → an Inferno-style ability concept.
- *Telegraphed strike where the enemy will be in a second; change course to dodge* → predictive, telegraphed attacks (REQ-ABL-6).
- *A shield that swallows the next shot and heals* → timed parry-style defence (a Ronin counter concept).
- *Burrow: untargetable for 1 s, resurface up to N away* → a Phantom or Shadowfang repositioning concept.

## 5. Must NOT be copied

Any Froggy source code, data tables, creature names, ability names and descriptions, pixel art, `clashFx` drawings, sounds, economy numbers or UI. Concepts are re-designed for Stickman Arena's five fighters and 3D space. Ability names must be original.

## 6. Conflicts and uncertainties

1. **2D vs 3D** (§2 above): the camera and vertical movement have no reference in Creature Clash.
2. Creature Clash has **3** attack buttons (one plain attack plus two specials) **plus** an ultimate. Stickman has 5 (1 + 3 + 1). Fine, but balance numbers do not transfer.
3. Creature Clash has no block, dodge button, jump, pickup or throw. It gives no answer to OQ-02.
4. Creature Clash's economy (recruit packs, faint and revive, ladder entry 20 tokens) is not Stickman's design. Stickman economy values remain OQ-08.
