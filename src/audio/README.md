# src/audio
**Owner:** Rendering Specialist (2D) until an audio owner is assigned. Original sound synthesised at runtime with the Web Audio API (TD-033, TD-051): no audio files, and no music.

**Key interfaces:**
- `SoundBoard`: `unlock()` on first input, `play(id)`, `muted`, `setVolume`; `hasSound(id)`. Sound ids come from impact profiles (`src/data/combat/impacts.ts`), ability sound hooks and the KO (`ko`, `dust`).
- `AmbiencePlayer` (`ambience.ts`): `attach`, `play(AmbienceDef)`, `react(cue)`, `setMuted`, `setVolume`. It plays the soundscapes in `src/data/audio/ambiences.ts`.
- `pauseAudioWhenHidden`: silences the game while its tab is hidden.
