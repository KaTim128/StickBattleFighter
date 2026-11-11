# Control Scheme

> **Status:** ACCEPTED (TD-016). Designed by the Master Developer on 10/11/2026 at the owner's request ("make it in a way that is best suited for this control… I will let you deal with that"). This resolves OQ-02 and OQ-03.
> **Implemented by:** Mobile Controls Specialist (input and HUD), with Combat (block, dodge rules) and Physics (jump, carry).

## 1. Design goals
1. Keep **exactly five combat buttons** on mobile (INV-9).
2. Every required verb is reachable: move, camera, melee, 3 abilities, ultimate, **block, dodge, jump, pick up, throw**, and target switching.
3. Same mental model on desktop and mobile, so the tutorial teaches one game.
4. One input layer: devices produce **intents**; gameplay never sees devices (INV-6).
5. **2D top-down (TD-021):** W/up = up the screen (front), S/down = down (back), A/D = left/right; diagonals allowed.

## 2. How the extra verbs fit without extra combat buttons

| Verb | Solution | Why |
|---|---|---|
| **Block** | **Hold Button 1** (melee). Tap means melee; holding at least **0.2 s** raises the guard until released. | Melee is stamina-free and always available, so guarding on the same button is natural and costs no screen space. Threshold is data-driven. |
| **Dodge** | **Flick the movement stick** (mobile) or press the dodge key (desktop). The dodge goes in the flick or movement direction, or backwards if neutral. | A flick is a fast, deliberate gesture distinct from steering. Setting: "Dodge by double-tap" for players who find flicks hard. |
| **Jump, pick up, throw** | One **contextual utility button**, visually separate from the combat cluster. By default it **jumps**. Near a throwable object it shows a **pick-up** icon. While carrying, it **throws** at the locked target (hold to aim with the stick, release to throw). Hold for 0.6 s while carrying to **drop**. | These are movement and interaction verbs, not combat actions, so INV-9 (five *combat* buttons) is preserved. One context button is far clearer than three separate ones. |
| **Target** | **Automatic soft lock** on the nearest visible opponent. Tap an opponent (mobile) or press Tab (desktop) to switch. Abilities aim at the locked target; mobility abilities follow the stick direction. | Proven by Creature Clash's auto-aim on touch. Real hit detection still applies: aiming is assisted, hits are not guaranteed (REQ-CMB-2). |
| **Camera** | **Automatic.** The 2D top-down camera follows the player and zooms to keep opponents in frame (spec §5.1). No camera controls. | Like Creature Clash, the player only steers and fights; nothing to manage mid-fight. *(Updated for 2D, TD-021: manual drag, pinch and orbit removed.)* |

**While carrying an object:** combat buttons dim (unavailable) until the object is thrown or dropped. Fighter kits may override this through data (for example, Titan could fight while carrying).

## 3. Mobile and tablet layout (landscape)

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │ [P1 portrait  HP ███████  ST ▓▓▓]   00:59   [▓▓▓ ST  ███████ HP  P2] │
 │                                                                      │
 │              (2D top-down arena; camera follows you)                │
 │                                                                      │
 │                                                   [UTIL]             │
 │                                             [A3]          [ULT]      │
 │    ( joystick )                         [A2]                         │
 │    flick = dodge                             [A1]   ( MELEE )        │
 │                                                    hold = block      │
 └──────────────────────────────────────────────────────────────────────┘
```

- **Left:** floating joystick (appears where the thumb lands in the left 40% of the screen).
- **Right:** five combat buttons in an arc around the large **MELEE** button: A1, A2, A3, and **ULT** (biggest after melee, glows with an "ultimate ready" cue). Each ability shows its cooldown sweep and stamina-cost tint; unaffordable abilities are greyed.
- **UTIL** sits above the arc and is smaller, with a different shape so it never reads as a combat button. Its icon changes: jump, pick up, throw.
- Multi-touch: stick and buttons work at the same time (REQ-CTL-5). Touch targets are at least 48 px CSS; safe-area insets respected.
- Settings: left-handed mirror layout, button size and opacity, dodge mode (flick or double-tap).

## 4. Desktop default bindings

Two presets. All keys can be rebound, with conflict prevention and reset to defaults (REQ-CTL-3). Desktop never shows the joystick or touch buttons (REQ-CTL-2).

| Action | **Keyboard + mouse** (default) | **Keyboard only** (Creature Clash-style) |
|---|---|---|
| Move | W A S D | W A S D or arrow keys |
| Melee (tap) / Block (hold) | Left mouse button (or J) | J |
| Ability 1 / 2 / 3 | Q / E / R | K / L / O |
| Ultimate (aim, then launch) | F or I | I |
| Dodge | Shift (or double-tap a direction) | Shift (or double-tap a direction) |
| Jump / Pick up / Throw (contextual) | Space jumps; **G** picks up and throws | Space jumps; **U** picks up and throws |
| Switch target | Tab | Tab |
| Pause | Esc | Esc |

On desktop, jump has its own key (Space) because keys are plentiful. The contextual pick up and throw moves to G or U, so you can jump while standing next to an object.

## 4a. Live now (11/11/2026)
- **Button 1** works: J or left click on desktop, the **MELEE** button on touch. Ground: 1-2-3 combo (jab → hook → heavy finisher; press once per strike); in the air: flying kick. **Hold** Button 1 (≥ 0.18 s) to block; raise it just before a hit to parry.
- **Dodge:** Shift (desktop) or a joystick flick (touch).
- **Abilities (Phase 6):** Q / E / R (or K / L / O) = Fire Bolt, Flame Dash, Eruption; F or I = Meteor Fist when the meter is full.
- **Aiming Meteor Fist (owner, 11/11/2026):** press I (or F) to aim: Inferno crouches to spring and a landing ring appears inside the maximum-range ring; WASD moves the ring; press I again to jump. Touch: hold ULT, drag to place the ring, release to jump (a plain tap jumps at the locked target). Getting hit while aiming cancels it (the meter is kept). Keyboard-only preset: A3 moved from I to O (owner chose I for the ultimate). Touch: A1, A2, A3 and ULT around MELEE (five combat buttons); JUMP moved above the arc. Desktop shows an ability bar with cooldowns, stamina costs and the meter; touch draws them on the buttons.
- **Practice helpers:** T makes the dummy attack you (toggle); `?scene=training-yard` opens the open yard; `?slowmo=0.25` plays in slow motion to study animations.
- Touch buttons never select or highlight their label when held (REQ-CTL-16).
- **Punch Clash:** trade punches and blocks with an opponent and a clash starts; mash Button 1 (J, click or MELEE) as fast as you can for 4 s.
- **Sound:** starts after your first key press or tap (browser rule); **M** mutes; `?mute` starts muted.
- **Jump:** Space or the JUMP button. Buttons 2–5 (abilities and ultimate) arrive with Phase 6.

## 5. Intent model (contract for Phase 2)

Devices map to these intents, which are all gameplay sees:
`move(vec2, screen-relative: +x right, +y down)`, `melee.press / melee.release` (the hold-to-block timing is resolved in the input layer into `block.start / block.end`), `ability(1|2|3)`, `ultimate`, `dodge(dir)`, `jump`, `interact.press / interact.release` (pick up, aim-and-throw, drop), `target.next / target.select(id)`, `pause`.

## 6. Tutorial order (REQ-TUT-2)
Move → melee → **hold to block** → **flick to dodge** → jump → abilities 1–3 (cooldowns, stamina) → ultimate (charge and "ready" cue) → **pick up and throw** → health and defeat → a free fight with a dummy. Prompts show the player's actual device bindings.

## 7. Open details (tuning, not blockers)
Hold threshold (0.2 s; 0.18 s in the provisional build, TD-030), flick window (≤ 0.12 s from under 30% to over 90% deflection), drop-hold (0.6 s): all data-driven, tuned in playtests and recorded in `TECHNICAL_DECISIONS.md` if changed.
