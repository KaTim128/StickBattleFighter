# tools/audio

Offline renderers for Stickman Arena's recorded audio (owner, 12/11/2026; REQ-AUD-10, TD-058). Owner: Master Developer.
Everything is original synthesis in numpy (no samples, no third-party audio); the owner's reference tracks guided style and timing only.

| Script | Output |
|---|---|
| `battle_music.py` | "Steel Rain", the battle loop (32 bars at 92 BPM, seamless) |
| `fight_stinger.py` | The READY... FIGHT! stinger (FIGHT lands 1.5 s in) |
| `synth.py` | Shared instruments, reverb, EQ and mastering |

Re-render and encode (needs Python 3 with numpy, and ffmpeg):

```sh
python3 tools/audio/battle_music.py /tmp/battle.wav
ffmpeg -y -i /tmp/battle.wav -c:a libvorbis -q:a 5 assets/audio/music-battle-steel-rain.ogg
ffmpeg -y -i /tmp/battle.wav -c:a libmp3lame -b:a 160k assets/audio/music-battle-steel-rain.mp3
python3 tools/audio/fight_stinger.py /tmp/stinger.wav
ffmpeg -y -i /tmp/stinger.wav -c:a libvorbis -q:a 6 assets/audio/sfx-fight-stinger.ogg
ffmpeg -y -i /tmp/stinger.wav -c:a libmp3lame -b:a 192k assets/audio/sfx-fight-stinger.mp3
```

If the loop length changes, update `loopS` in `src/data/audio/music.ts`.
