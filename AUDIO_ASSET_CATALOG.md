# Audio asset catalogue

Created in Phase 0 (17/11/2026) as an **inspection and plan only**: no audio was downloaded, edited, created or wired in during Phase 0. Every row below was read from the project at commit `e0a78ae`.

Fighter combat audio and Hide and Seek ambience are kept in separate sections. Nothing in the ambience section may be used for an attack, ability, combo or impact.

## 1. How sound works today

- **Combat sounds are synthesised, not recorded.** `src/audio/sound-board.ts` holds 91 named recipes (tones and filtered noise built in Web Audio at play time). An ability or move names a recipe id, and `SoundBoard.play(id)` plays it.
- **Recorded clips** go through `AudioClip` / `MusicLoop` (`src/audio/music.ts`). Definitions are in `src/data/audio/music.ts`, and files in `assets/audio/`. Only music, the UI click and the fight countdown are recorded.
- **Melee sounds by category.** Each fighter's `src/data/characters/<id>/audio.json` maps categories to recipe pools: `lightPunch`, `heavyPunch`, `lightKick`, `heavyKick`, `block`, `parry`, `footstep`, `jump`, `land`, `wallImpact`, `clash`, `finisher`, `defeat`, `disintegration`. The scene chooses the category from the move (`fight-arena-scene.ts`, near "heavyKick"/"lightPunch") and picks from the pool at random. So **individual combo hits have no sound of their own**: the moves in `moveset.json` carry no sound field.
- **Ability sounds.** Each ability in `src/data/abilities/<fighter>.ts` has `sfx: { cast, release, impact }`. The `assault` delivery also has `stabSfx` (one per stab).
- **Event timing.**
  - Cast plays at wind-up start (`scene-abilities.ts` `tryCast`).
  - Release plays on the caster's release event.
  - Impact plays only when a hit lands (`ability-world.ts` emits `impact` on a confirmed hit; a miss emits `release` or `fizzle` instead).
  - Melee hit sounds play on the hit event, not the swing.
- **Mixing.**
  - Music and effects buses have separate volumes (`settings-panel.ts`: "Music and ambience volume", "Sound effects volume"); mute is on M.
  - Audio pauses when the tab is hidden (`pause-when-hidden.ts`).
  - There is **no positional (panned or distance-based) audio**. Hide and Seek needs it (Phase 2).
- **The same mapping serves player and AI** fighters: both go through the same scene paths.

## 2. Recorded assets in the project

| File | Role | Source (from `assets/ASSET_REGISTER.md`) | Status |
|---|---|---|---|
| `assets/audio/music-battle-japanese-boss.{ogg,mp3}` | Battle music (office) | Owner-supplied | In use |
| `assets/audio/music-menu-pulse-epic.{ogg,mp3}` | Menu music | Owner-supplied | In use |
| `assets/audio/sfx-countdown-fight.{ogg,mp3}` | "3, 2, 1, Fight!" countdown | Owner-supplied (freesound_community), trimmed | In use; owner to confirm licence |
| `assets/audio/sfx-ui-click.{ogg,mp3}` | Interface click | Owner-supplied | In use |
| `docs/audio-previews/*.mp3` | Ambience previews (colosseum, office, tunnel) | Rendered by the project | Not in the game |

## 3. Per-fighter combat audio inventory (current)

### Inferno

| Event | Sound id(s) | Unique? |
|---|---|---|
| Light combo hits (jab, straight, hook, roundhouse; kicks) | pools `lightPunch` (`fire-punch-light`, `fire-punch-light-b`), `lightKick` (`fire-kick-light`), random per hit | **No**: hits share a pool |
| Heavy (Blazing Axe Kick) | `heavyKick` → `fire-kick-heavy` | Partly (shared with any heavy kick) |
| Fireball (a1) | `fireball-charge` / `fireball-cast` / `fireball-boom` | Charge and boom are **reused by Flame Detonation** |
| Flame Dash (a2) | `fire-charge` / `fire-rush` / `fire-burst-small` | Yes |
| Fire Beam (a3) | `beam-charge` / `beam-roar` / `beam-sear` | Yes |
| Flame Detonation (a4) | `fireball-charge` / `detonation-blast` / `fireball-boom` | **Reuses Fireball's charge and impact** |
| Eruption (ult) | `fire-roar` / `leap-whoosh` / `meteor-impact` | Yes |

### Titan (`rampage`)

| Event | Sound id(s) | Unique? |
|---|---|---|
| Light combo (hammer jab, haymaker, double hammer) | `lightPunch` pool (`rampage-punch`, `punch-heavy`) | **No** |
| Heavy (Sledgehammer) | `heavyPunch` → `rampage-heavy-punch` | Yes |
| Kicks | `kick-heavy` (shared with Necro and Shroud) | **No** |
| Ground Smash (a1) | `rampage-grunt` / `ground-crack` / `ground-smash` | Grunt is reused by a3 and a4 |
| Rampage Charge (a2) | `charge-stomp` / `charge-rush` / `charge-impact` | Yes |
| Crushing Strike (a3) | `rampage-grunt` / `heavy-whoosh` / `crushing-impact` | **Identical set to Grapple Slam** |
| Grapple Slam (a4) | `rampage-grunt` / `heavy-whoosh` / `crushing-impact` | **Identical set to Crushing Strike** |
| Rampage Mode (ult) | `rampage-roar` / `rage-burst` / `rage-burst` | Yes |

### Necro

| Event | Sound id(s) | Unique? |
|---|---|---|
| Light combo (staff sweep, soul thrust, grave slam) | `lightPunch` → `staff-whoosh` (one sound for every hit) | **No** |
| Heavy (Soul Rend) | `heavyPunch` → `staff-slam` | Yes |
| Soul Drain (a1) | `soul-gather` / `soul-cast` / `soul-drain-hit` | Gather is reused by a4 |
| Death Eruption (a2) | `grave-call` / `grave-rumble` / `bone-eruption` | Grave call is reused by the ultimate |
| Curse of Decay (a3) | `decay-gather` / `decay-cast` / `decay-hit` | Yes |
| Grave Chains (a4) | `soul-gather` / `chain-lash` / `chain-catch` | Partly |
| Undead Army (ult) | `dominion-rise` / `grave-call` / `summon-rise` | Partly |
| Skeleton warrior hits | generic `punch-light`, `punch-light-b`, `punch-heavy` | **No**: generic punches for bone blades |

### Shroud

| Event | Sound id(s) | Unique? |
|---|---|---|
| Light combo (knife slash, backhand slash, lunging stab): **three hits today**; five are planned | `lightPunch` pool (`knife-slash`, `knife-slash-b`), random | **No** |
| Heavy (Gutting Stab) | `heavyPunch` → `knife-stab` | `knife-stab` is reused as the Bloodfade and Stalker Lunge impact |
| Bloodfade (a1) | `knife-draw` / `shade-rush` / stab `blade-pierce` | Draw and rush are reused by a2 |
| Stalker Lunge (a2) | `knife-draw` / `shade-rush` / stabs `blade-stab-1`, `-2`, `-3` | Stabs are unique |
| Behind You (a3) | `shade-gather` / `teleport-out` / `teleport-in` | Teleport sounds are shared with Necro's former teleport |
| Rending Flurry (a4) | `knife-draw` / `knife-flurry` / `knife-slash-hit` | Partly |
| Hunting Frenzy (ult) | `frenzy-build` / `bulb-burst` / `frenzy-snap` | Yes |

### Shared by every fighter

The following are not unique per fighter:
- `block`, `parry`, `footstep`, `jump`, `land`, `wall-thud`;
- `clash-collide`, `clash-break`, `ko`, `dust`.

The master plan wants meaningful combat actions unique per fighter, so block, parry, clash and defeat need per-fighter variants or layers in Phase 1. Footsteps may stay shared, except for Titan's heavy steps, which already exist.

### Gaps against the master plan (Phase 1 targets)

1. Every combo hit needs its own sound. Today hits draw from category pools, so each combo hit needs a per-move `sfx` field. The mapping should move into the move data, not `audio.json` pools.
2. Shroud needs five combo-hit sounds; the five-hit combo itself arrives in Phase 1 B15.
3. Remove the reuses listed above: Crushing Strike and Grapple Slam; Fireball and Flame Detonation; `knife-stab`; `soul-gather`; `grave-call`; skeleton generic punches.
4. Every fighter's fifth ability (Titan's Bastion Anchor, Necro's Soul Tether, Shroud's Umbral Feint, Inferno's transformation) needs a full set.
5. Inferno's new ultimate needs a full set; see open question OQ-P0-1 in `IMPLEMENTATION_PLAN.md`.
6. Block, shield contact and cancellation sounds per fighter, where the move has them.

## 4. Tools and sourcing (checked 17/11/2026)

| Tool | Status |
|---|---|
| FFmpeg / FFprobe | **Installed**: `/usr/bin/ffmpeg`, version 6.1.1 |
| SoX, Audacity | Not installed |
| Headless browser | Chromium with Playwright: available |
| Network to `https://pixabay.com` | **Blocked**: `curl` to `pixabay.com/sound-effects/search/` got no connection (HTTP 000) from this environment |

**Phase 1 and 3 blocker:** Pixabay can't be reached here, so nothing can be previewed or downloaded. Before the audio batches, one of these must happen:
- the owner allows `pixabay.com` (and its CDN host) in the environment's network settings; or
- the owner supplies the chosen files.

Until then the implementation phases can still remove reuses with distinct synthesised recipes (`sound-board.ts`), but must not claim Pixabay sourcing.

### Planned Pixabay search terms (to use once access exists)

| Fighter | Moves and search terms |
|---|---|
| Shroud | 5 combo hits: "knife slash", "blade swipe", "knife stab", "dagger thrust", "blade stab flesh"; heavy: "deep stab"; Umbral Feint: "cloth whoosh", "quick slash counter" |
| Inferno | "fire whoosh punch", "flame ignition", "flamethrower burst", "fire explosion small", "fire transformation"; new ultimate per its design |
| Titan | "heavy body punch", "body slam impact", "ground pound", "grab cloth grip", "metal stance stomp" (Bastion Anchor) |
| Necro | "staff swing whoosh", "bone crack", "spectral whoosh", "chain rattle", "ghost tether" (Soul Tether); skeletons: "bone sword slash" |
| Vexoris and the eleven new fighters | "glass jar shatter liquid", "aerosol spray", "gas hiss", "electric zap", "crystal shatter", "water splash impact", "hydraulic clank", "sword unsheathe slash", "time warp whoosh", per move |

For each chosen sound, record:
- the source URL, title and contributor;
- the licence check and download date;
- the original and edited paths, and the trim range;
- the event mapping and the in-game verification.

Add one row per sound to section 6.

## 5. Planned coverage matrix (16 fighters)

Every fighter needs unique sounds for:
- every light-combo hit;
- the heavy attack;
- all five normal abilities (cast, release and travel where it applies, impact, sustained, cancel);
- the ultimate;
- block, parry and counter, plus grab and throw where the fighter has them.

Ability names come from the master plan (section 4 and "Mandatory unique fifth ability additions").

| # | Fighter | Combo hits | Normal abilities (5) | Ultimate | Phase |
|---|---|---|---|---|---|
| 1 | Inferno | 4 + kicks | Fireball, Flame Dash, Fire Beam, Flame Detonation, Blue-flame transformation (OQ-P0-1) | New ultimate (OQ-P0-1) | 1 |
| 2 | Titan | 3 + body slam | Ground Smash, Rampage Charge, Crushing Strike, Grapple Slam, Bastion Anchor | Rampage Mode | 1 |
| 3 | Necro | 3 + plunge | Soul Drain, Death Eruption, Curse of Decay, Grave Chains, Soul Tether | Undead Army | 1 |
| 4 | Shroud | **5** (B15) | Bloodfade, Stalker Lunge, Behind You, Rending Flurry, Umbral Feint | Hunting Frenzy | 1 |
| 5 | Vexoris | 4 + poison splash | Venom Spray, Toxic Jar, Chemical Trap, Vapor Step, Corrosive Filter | Plague Bloom | 3 |
| 6 | Aerion | per spec | Sky Dive, Wind Blade, Cyclone Lift, Tailwind, Featherguard | Celestial Tempest | 3 |
| 7 | Arcstrike | per spec | Thunder Dash, Volt Punch, Chain Lightning, Voltage Surge, Static Snare | Stormbreaker | 3 |
| 8 | Frostweld | per spec | Crystal Shards, Geode Shield, Prism Cage, Crystal Spike, Prism Mirror | Crystal Cataclysm | 3 |
| 9 | Reson | per spec | Sonic Boom, Vibration Punch, Resonance Barrier, Resonance Dash, Feedback Pulse | Shatterwave | 3 |
| 10 | Geargrind | per spec | Rocket Fist, Combat Drone, Magnetic Mine, Reinforced Plating, Magnetic Recall | Overdrive Protocol | 3 |
| 11 | Psion | per spec | Mind Crush, Telekinetic Throw, Psychic Barrier, Floating Prison, Kinetic Redirect | Mindstorm | 3 |
| 12 | Solstice | per spec | Solar Spear, Radiant Burst, Radiant Aegis, Sunpiercer, Dawnbrand | Celestial Judgement | 3 |
| 13 | Tidebreaker | per spec | Aqua Spear, Tidal Wave, Water Prison, Tidal Guard, Undertow | Leviathan's Wrath | 3 |
| 14 | Quakor | per spec | Earth Splitter, Stone Wall, Boulder Crash, Stoneguard, Faultline Stance | Continental Rupture | 3 |
| 15 | Kenshiro | per spec | Twin Fang, Perfect Parry, Blade Tempest, Focus Stance, Iaijutsu Draw | Final Judgement | 3 |
| 16 | Chronos | per spec | Temporal Acceleration, Echo Strike, Temporal Collapse, Rewind Step, Afterimage Decoy | End of Time | 3 |

## 6. Sourced and edited assets

None yet (Phase 0 is inspection only).

## 7. Hide and Seek ambience (separate from combat audio)

| Candidate | Inspection |
|---|---|
| `b53eb9fc-darkne-scary-horror-atmosphere-620036.mp3` | 74.87 s, 44.1 kHz stereo, 256 kbit/s |
| `5aabfd83-darkne-scary-horror-atmosphere-620036.mp3` | **Byte-identical to the first** (same MD5 `7ff697472f92…`) |
| `877cad4c-darkne-scary-horror-atmosphere-620036.mp3` (attached again 16/11/2026) | **Byte-identical to the first** |

There is therefore **one** ambience candidate, not two. An untouched copy is kept at:

`docs/references/master-plan/darkne-scary-horror-atmosphere-620036.mp3`

It is not wired into the game. In Phase 2 it becomes the Hide and Seek bed, looped with a crossfade. The rest of the horror layer (creaks, doors, footsteps per movement style, hiding sounds per hiding spot, Shroud's approach cues) comes from the Phase 2 audio batch, positional. The source licence must be confirmed by the owner: the filename suggests Pixabay item 620036.

## 8. Phase 1 B18: per-attack combat audio (18/11/2026)

**Source: synthesised in the game, no files, no third-party audio.** The master plan prefers Pixabay recordings of the real physical events. Pixabay could not be reached from the build environment in this session, and no download or edit was attempted, so **nothing here is a Pixabay asset and no licence record applies**. Every sound below is an original Web Audio recipe (`src/data/audio/move-sounds.ts`, `src/audio/sound-board.ts`). They are placeholders in the sense that recorded, edited clips could replace them one id at a time (the ids are the stable interface); the owner decides whether synthesised sounds are good enough.

| Group | Sound ids | Event |
|---|---|---|
| Inferno melee (10) | `hit-inferno-jab`, `-straight`, `-hook`, `-roundhouse`, `-front-kick`, `-side-kick`, `-spinning-kick`, `-jumping-front-kick`, `-meteor-kick`, `-blazing-axe-kick` | contact of that move |
| Titan melee (5) | `hit-titan-hammer-jab`, `-haymaker`, `-double-hammer`, `-body-slam`, `-sledgehammer` | contact |
| Necro melee (5) | `hit-necro-staff-sweep`, `-soul-thrust`, `-grave-slam`, `-staff-plunge`, `-soul-rend` | contact |
| Shroud melee (7) | `hit-shroud-knife-slash`, `-backhand-slash`, `-rising-cut`, `-cross-slash`, `-lunging-stab` (the five combo hits), `-knife-plunge`, `-gutting-stab` | contact |
| Skeleton warrior (2) | `hit-skeleton-bone-slash`, `-bone-chop` | contact |
| Abilities (newly unique) | `detonation-boom`, `blue-gather`, `blue-ignite`, `blue-surge`, `tether-cast`, `tether-bind`, `grab-whoosh`, `slam-thud`, `anchor-plant`, `anchor-shove`, `rage-shock`, `lunge-rush`, `lunge-stab`, `feint-slip`, `feint-cut` | release or impact of Flame Detonation, Blue Inferno, Soul Tether, Grapple Slam, Bastion Anchor, Rampage Mode, Stalker Lunge, Umbral Feint |

Verification (automated, `tests/unit/audio/move-sounds.test.ts`, `tests/integration/scenes/shroud.test.ts`): every melee move of the four fighters and the skeleton has its own existing sound; no two sounds are the same recipe; every ability (all five normal and the ultimate, per fighter) has its own release and its own impact sound and an existing cast sound; Shroud's five combo hits play five different sounds, each once as it lands, and a whiff plays none. **Not verified by ear:** nobody has listened to these in a browser in this session; judging how they sound is an owner check.
Not yet covered: block and parry still use the shared guard sounds, and the cast sounds of several abilities of one fighter are still shared family sounds (`rampage-grunt`, `knife-draw`, `soul-gather`); status applications (bleed, burn, blind) have no sound of their own.

## Hide and Seek Nightmare (Phase 2, master plan section J; 18/11/2026)
All original and synthesised at runtime (`src/audio/hide-seek-audio.ts`, `src/data/audio/ambiences.ts`); no audio files are shipped for this mode.

| Sound | Where | Notes |
|---|---|---|
| `house-night` ambience | `AMBIENCES['house-night']` (`AmbiencePlayer`) | brown-noise air, a beating 36 Hz drone, long reverb, rare creaks, thumps, knocks and ticks; no voices or music |
| Footsteps (player, hunter) | `HideSeekAudio.event` | positional: pan from the screen side, level and muffling from the same wall, door and floor rule the hunter hears by; the hunter's steps are deeper and heavier; a crouching step is nearly inaudible |
| Doors (open creak, close thud), hiding places (creak + thud by kind) | `event` | loudness comes from the game event |
| Thrown objects | `event` | whoosh on throw; glass shatter, can clang or soft toy thud on landing |
| Heartbeat tension | `update` | silent when calm; rate and level follow the hunter's awareness, chase and nearness |
| Chase sting, kill shriek, victory tone | `alert`, `kill`, `victory` | once each per round |

Candidate file: `docs/references/master-plan/darkne-scary-horror-atmosphere-620036.mp3` is NOT wired in. The owner must confirm its licence and source before it is used (register it in `assets/ASSET_REGISTER.md` first).
Tests: `tests/unit/audio/hide-seek-audio.test.ts` (positional rules, heartbeat) and the ambience well-formedness test that covers every soundscape. The sounds themselves have not been listened to by a person (owner check).

## 9. Pixabay sound workflow: status (19/11/2026)

**Built:** `scripts/audio/process-sfx.sh`. It takes one downloaded clip and writes `assets/audio/sfx/<fighter>/<ability>/sfx-<name>.{ogg,mp3}`, trimmed of leading and trailing silence (-50 dB), optionally capped in length, and loudness-normalised to -16 LUFS / -1.5 dBTP. It refuses to run without `--source-url`, `--creator` and `--licence`, and appends one row to `assets/audio/sfx/SOURCES.tsv` (the provenance record: file, fighter, ability, URL, creator, licence, date, edits). Tested on a synthesised tone padded with silence (2.30 s in, 0.40 s out, both formats written, refusal without a licence). The test files were removed; nothing is wired into the game.

**Not done: downloading from Pixabay.** The sandbox could reach `pixabay.com` only after the session was moved to a personal environment that allows it (owner approval, 19/11/2026). Pixabay then served a Cloudflare "Just a moment..." bot challenge to every page, so no search, preview or download was possible. The challenge was not bypassed. Pixabay's terms and licence pages are behind the same challenge, so whether automated searching and bulk downloading are allowed could not be checked. No sound was downloaded, so no licence row exists yet.

**Owner decision needed before any Pixabay sound is used:**
1. Either confirm that automated Pixabay access is acceptable (after reading their terms yourself), or
2. download the chosen clips by hand from Pixabay and send them, with each item's URL and creator name. The script then processes them and records the source. This is the route we recommend.

**Matching plan (unchanged):** section 4's search terms per fighter and move are the shortlist. Search only for the gaps listed in section 3 (the reused and generic sounds), not for every move. Existing synthesised sounds stay in place until a recorded clip is verified by ear in the browser.

