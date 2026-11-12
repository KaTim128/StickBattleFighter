# Magic Attack VFX Standard

Owner request, 11/11/2026. **Benchmark:** Inferno's Fireball. Every magic attack in Stickman Arena uses the stages below that fit its delivery, drawn in its own element's colours.
- Effects are presentation only. They never change damage or timing.
- They are driven by data in the ability definition (`AbilityDef.look`, type `MagicLook` in `src/abilities/ability-def.ts`) and drawn by the shared effects layer (`src/vfx/ability-vfx.ts`).
- There is no per-ability code in the shared engine.

## The sequence

| # | Stage | What the player sees | Data (`MagicLook`) | Synchronised with |
|---|---|---|---|---|
| 1 | Charge | Motes of the element drawn in from the air to the casting hand. Body charges also gather around the whole body, with a glow on the floor. | `charge.gatherRadiusM`, `charge.motesPerS` | the cast wind-up (`castS`); stops the moment the cast is released or interrupted |
| 2 | Core | A white-hot core swelling in the palm: soft glow, layered body, white centre, flickering tongues, heat shimmer | `charge.coreMaxM`, `flight.shimmer` | wind-up progress (0 to 1) |
| 3 | Travel | Projectiles carry a tapering tail and a stream of motes and sparks; beams pour a layered stream with flowing edges and heat shimmer | `flight.trailPerS`, `flight.sparksPerS` | projectile position and beam reach, each step (walls cut beams short) |
| 4 | Impact | A bright flash first, then sparks and motes spraying outward, a burst ring, a scorch and delayed smoke. Big blasts (ring 2 m or more) add a second shockwave, fire spreading across the floor and camera shake. | `impact.*` | the hit event (`impact` FX), emitted only on real contact |
| 5 | Reaction | The target's body flashes (white for magic); flinch or knockdown and knockback from the shared combat rules | `hitFlash` | the same hit that deals the damage |
| 6 | Sound | Charge, release and impact sounds | `sfx.cast`, `sfx.release`, `sfx.impact` | cast start, release and first contact |
| 7 | Lingering | The element stays on the target: burning flames over the whole body that shrink as the burn runs out, embers, then smoke fading for 1.2 s | payload `burn` | the burn timer |
| 8 | Elemental defeat | A KO by fire chars the body, flames consume it, and it crumbles into embers and ash with rising smoke | automatic for fire hits and burns | the KO |

## Rules

- **Use only the stages that fit.**
  - A dash has no charge core.
  - A beam has no tail.
  - A leap uses a body charge, flames in the air and a big impact.
- **Never force fire onto other elements.** Each element brings its own palette, particles and sounds. For example: ice uses cold blues, frost motes and a shatter instead of embers; lightning uses white-violet, jagged arcs and a crack instead of a boom.
- **Nothing before contact and nothing after its time:**
  - impact effects only follow an `impact` event;
  - charge effects only exist during the wind-up;
  - beams fade out at their end;
  - smoke starts after the flash.
- **Performance:** all particles come from one pool of 480; emitters are rate-based and carry fractions between frames; there is no per-frame allocation of particle objects.

## Inferno's kit under the standard

| Ability | Stages | Exact behaviour |
|---|---|---|
| Fireball (A1) | 1, 2, 3, 4, 5, 6, 7, 8 | 0.4 s charge (interruptible), released at 18 m/s for up to 10 m. On contact: 70 damage, 3 m/s push, flinch, burn 12 dps for 2 s, sets furniture alight. 0.25 s recovery, 2.5 s cooldown, 20 stamina. |
| Flame Dash (A2) | 3, 4, 5, 7 (default fire look) | Unchanged. |
| Fire Beam (A3) | 1 (body), 2, 3 (beam), 4 (small, per tick), 5, 6, 7, 8 | 1 s charge (interruptible), then a 1.4 s beam reaching 6.5 m, 0.6 m wide, stopped by walls. A hit every 0.15 s: 15 within 1.5 m, falling to 45% at full reach (about 135 close, 60 far over the whole beam), a 1.6 m/s push (at least half of it at range), and a burn. 8 s cooldown, 35 stamina. |
| Eruption (ult) | 1 (body), 3 (flames in the air), 4 (big), 5, 6, 7, 8 | 0.55 s squat-and-charge, then a 0.75 s jump (2.4 m peak, up to 8 m, untouchable in the air) and a 3.2 m blast where he lands. Damage falls off from the centre: 300 within 1 m, falling to 45% (135) at the edge. Knockdown, 10 m/s knockback (at least half of it at the edge), burn 20 dps for 3 s. |
