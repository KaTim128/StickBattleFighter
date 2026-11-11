# src/audio
**Owner:** Rendering Specialist (2D) until an audio owner is assigned. Original sound effects synthesised at runtime with the Web Audio API (TD-033): no audio files.

**Key interfaces:** `SoundBoard` (`unlock()` on first input, `play(id)`, `muted`); `hasSound(id)`. Sound ids come from impact profiles (`src/data/combat/impacts.ts`), ability SFX hooks and the KO (`ko`, `dust`).
