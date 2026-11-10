# Control Scheme

> **Status:** ACCEPTED (TD-016). Designed by the Master Developer on 10/11/2026 at the owner's request ("make it in a way that is best suited for this control… I will let you deal with that"). This resolves OQ-02 and OQ-03.
> **Implemented by:** Mobile Controls Specialist (input and HUD), with Combat (block, dodge rules) and Physics (jump, carry).

## 1. Design goals
1. Keep **exactly five combat buttons** on mobile (INV-9).
2. Every required verb is reachable: move, camera, melee, 3 abilities, ultimate, **block, dodge, jump, pick up, throw**, and target switching.
3. Same mental model on desktop and mobile, so the tutorial teaches one game.
4. One input layer: devices produce **intents**; gameplay never sees devices (INV-6).

## 2. How the extra verbs fit without extra combat buttons

| Verb | Solution | Why |
|---|---|---|
| **Block** | **Hold Button 1** (melee). Tap means melee; holding at least **0.2 s** raises the guard until released. | Melee is stamina-free and always available, so guarding on the same button is natural and costs no screen space. Threshold is data-driven. |
| **Dodge** | **Flick the movement stick** (mobile) or press the dodge key (desktop). The dodge goes in the flick or movement direction, or backwards if neutral. | A flick is a fast, deliberate gesture distinct from steering. Setting: "Dodge by double-tap" for players who find flicks hard. |
| **Jump, pick up, throw** | One **contextual utility button**, visually separate from the combat cluster. By default it **jumps**. Near a throwable object it shows a **pick-up** icon. While carrying, it **throws** at the locked target (hold to aim with the stick, release to throw). Hold for 0.6 s while carrying to **drop**. | These are movement and interaction verbs, not combat actions, so INV-9 (five *combat* buttons) is preserved. One context button is far clearer than three separate ones. |
| **Target** | **Automatic soft lock** on the nearest visible opponent. Tap an opponent (mobile) or press Tab (desktop) to switch. Abilities aim at the locked target; mobility abilities follow the stick direction. | Proven by Creature Clash's auto-aim on touch. Real hit detection still applies: aiming is assisted, hits are not guaranteed (REQ-CMB-2). |
| **Camera** | Drag on the empty right side of the screen (mobile) or the mouse (desktop). Pinch or mouse wheel to zoom. The camera eases behind the player and frames the target when not being dragged. | A third-person 3D camera needs free rotation (REQ-CAM-5), but should look after itself during hectic fights. |

**While carrying an object:** combat buttons dim (unavailable) until the object is thrown or dropped. Fighter kits may override this through data (for example, Titan could fight while carrying).

## 3. Mobile and tablet layout (landscape)

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │ [P1 portrait  HP ███████  ST ▓▓▓]   00:59   [▓▓▓ ST  ███████ HP  P2] │
 │                                                                      │
 │                 (3D arena; drag here to rotate camera)               │
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
- Settings: left-handed mirror layout, button size and opacity, dodge mode (flick or double-tap), camera sensitivity, auto-camera on or off.

## 4. Desktop default bindings

Two presets. All keys can be rebound, with conflict prevention and reset to defaults (REQ-CTL-3). Desktop never shows the joystick or touch buttons (REQ-CTL-2).

| Action | **Keyboard + mouse** (default) | **Keyboard only** (Creature Clash-style) |
|---|---|---|
| Move | W A S D | W A S D or arrow keys |
| Camera | Mouse (pointer lock after clicking the game) | Q / E rotate |
| Zoom | Mouse wheel | Z / X |
| Melee (tap) / Block (hold) | Left mouse button | J |
| Ability 1 / 2 / 3 | Q / E / R | K / L / I |
| Ultimate | F | O |
| Dodge | Shift (or double-tap a direction) | Shift (or double-tap a direction) |
| Jump / Pick up / Throw (contextual) | Space jumps; **G** picks up and throws | Space jumps; **U** picks up and throws |
| Switch target | Tab | Tab |
| Pause | Esc | Esc |

On desktop, jump has its own key (Space) because keys are plentiful. The contextual pick up and throw moves to G or U, so you can jump while standing next to an object.

## 5. Intent model (contract for Phase 2)

Devices map to these intents, which are all gameplay sees:
`move(vec2, camera-relative)`, `look(delta)`, `zoom(delta)`, `melee.press / melee.release` (the hold-to-block timing is resolved in the input layer into `block.start / block.end`), `ability(1|2|3)`, `ultimate`, `dodge(dir)`, `jump`, `interact.press / interact.release` (pick up, aim-and-throw, drop), `target.next / target.select(id)`, `pause`.

## 6. Tutorial order (REQ-TUT-2)
Move → camera → melee → **hold to block** → **flick to dodge** → jump → abilities 1–3 (cooldowns, stamina) → ultimate (charge and "ready" cue) → **pick up and throw** → health and defeat → a free fight with a dummy. Prompts show the player's actual device bindings.

## 7. Open details (tuning, not blockers)
Hold threshold (0.2 s), flick window (≤ 0.12 s from under 30% to over 90% deflection), drop-hold (0.6 s): all data-driven, tuned in playtests and recorded in `TECHNICAL_DECISIONS.md` if changed.
