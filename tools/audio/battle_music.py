"""
"Steel Rain" — Stickman Arena's battle music (owner, 12/11/2026). An original, fully synthesised
Japanese cinematic boss-fight loop, written in the style of the owner's reference (a Japanese
gaming boss-battle track): about 184 BPM felt as a 92 BPM half-time pulse, D minor, heavy taiko
and bass, plucked strings, a breathy bamboo-flute melody and string/brass swells. Nothing from
the reference is copied: the tune, rhythms and every sound are new.

Form (32 bars, ~83.5 s, loops seamlessly: the reverb and any ringing notes past the end are
wrapped round to the start):
  bars  0-3   Gathering  heartbeat o-daiko, drone, kane ticks, a long flute call; the drums roll up
  bars  4-11  Groove     full taiko pattern, shamisen ostinato, bass, chords Dm Dm Bb C
  bars 12-19  Theme      the flute takes the tune over the groove, koto arpeggios answer
  bars 20-27  Climax     brass stabs, the tune an octave up with koto doubling, taiko doubled
  bars 28-31  Turnaround taiko call-and-response, then a roll and riser that lands back on bar 0

Usage:  python3 tools/audio/battle_music.py out.wav
"""

from __future__ import annotations

import sys

import numpy as np

from synth import (SR, Rng, Track, bass, brass_stab, convolve, eq, hall_ir, hz, kane, koto, master, odaiko,
                   riser, shakuhachi, shamisen, shime, strings_pad, write_wav)

BPM = 92.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 32
LOOP_S = BARS * BAR
TAIL_S = 4.0

# Harmony: one chord per bar for each 4-bar phrase (D minor with Japanese colour).
CHORDS = {
    "Dm": ["D3", "A3", "D4", "F4"],
    "Bb": ["Bb2", "F3", "Bb3", "D4"],
    "C": ["C3", "G3", "C4", "E4"],
    "Gm": ["G2", "D3", "G3", "Bb3"],
    "A": ["A2", "E3", "A3", "C#4"],
    "Fsus": ["F2", "C3", "F3", "Bb3"],
}
ROOT = {"Dm": "D2", "Bb": "Bb1", "C": "C2", "Gm": "G1", "A": "A1", "Fsus": "F1"}
PROGRESSION = (
    ["Dm"] * 4
    + ["Dm", "Dm", "Bb", "C"] * 2
    + ["Dm", "Bb", "C", "Dm", "Dm", "Bb", "Gm", "A"]
    + ["Bb", "C", "Dm", "Dm", "Gm", "Bb", "C", "A"]
    + ["Dm", "Dm", "Bb", "A"]
)
assert len(PROGRESSION) == BARS

# The flute theme (D E F A Bb, the hirajoshi colour, plus C and G for the minor key):
# (beat offset within the 8-bar section, note, length in beats, scoop, fall)
THEME = [
    (0, "A4", 1.5, -1, 0), (1.5, "Bb4", 0.5, 0, 0), (2, "A4", 1, 0, 0), (3, "F4", 1, -0.5, 0),
    (4, "E4", 2, -1, 0), (6, "D4", 2, -0.5, -1.5),
    (8, "D4", 0.5, 0, 0), (8.5, "E4", 0.5, 0, 0), (9, "F4", 1, 0, 0), (10, "A4", 1, -1, 0),
    (11, "C5", 1, -1, 0), (12, "Bb4", 2, 0, 0), (14, "A4", 2, -0.5, 0),
    (16, "D5", 2, -1.5, 0), (18, "C5", 1, 0, 0), (19, "Bb4", 1, 0, 0), (20, "A4", 2, 0, 0),
    (22, "F4", 1, 0, 0), (23, "G4", 1, -0.5, 0),
    (24, "A4", 1.5, 0, 0), (25.5, "G4", 0.5, 0, 0), (26, "F4", 1, 0, 0), (27, "E4", 1, 0, 0),
    (28, "C#4", 1, -0.5, 0), (29, "E4", 1, 0, 0), (30, "A4", 2, -1, -2),
]

# Shamisen ostinato (16ths over one bar; None = rest), shifted to each chord's root.
OSTINATO = [0, None, 0, 7, 12, None, 0, 10, 0, None, 0, 7, 3, None, 5, 7]
ROOT_PC = {"Dm": "D3", "Bb": "Bb2", "C": "C3", "Gm": "G2", "A": "A2", "Fsus": "F2"}


def at(bar: float, beat: float = 0.0) -> float:
    return bar * BAR + beat * BEAT


def render() -> np.ndarray:
    rng = Rng(1984)
    drums = Track(LOOP_S + TAIL_S)
    music = Track(LOOP_S + TAIL_S)

    taiko_cache = {}

    def big(vel: float, pitch: float = 58.0) -> np.ndarray:
        key = (round(vel, 2), pitch)
        if key not in taiko_cache:
            taiko_cache[key] = odaiko(vel, rng, pitch)
        return taiko_cache[key]

    for bar, chord in enumerate(PROGRESSION):
        section = "gather" if bar < 4 else "groove" if bar < 12 else "theme" if bar < 20 else (
            "climax" if bar < 28 else "turn")
        rise = (bar % 4) / 3  # each phrase leans into the next

        # ---- drums
        if section == "gather":
            for b in (0, 2):
                drums.add(big(0.8 + 0.05 * bar), at(bar, b), 0.9)
            for e in range(8):
                drums.add(kane(0.35 + 0.1 * (e % 2 == 0), rng), at(bar, e * 0.5), 0.45, pan=0.35)
            if bar == 3:  # the roll that launches the groove
                for k in range(16):
                    drums.add(shime(0.4 + k / 22, rng), at(bar, k * 0.25), 0.8, pan=-0.2)
        elif section in ("groove", "theme", "climax"):
            pattern = [(0, 1.0), (1.5, 0.7), (2, 0.95), (3.5, 0.75)]
            if section == "climax":
                pattern += [(1, 0.6), (3, 0.7)]
            for b, v in pattern:
                drums.add(big(v), at(bar, b), 0.7)
            if section == "climax":  # a second, higher drum answering
                for b in (0.75, 2.75):
                    drums.add(big(0.7, 82.0), at(bar, b), 0.7, pan=0.3)
            for k in range(16):
                accent = 1.0 if k % 4 == 0 else 0.55 if k % 2 == 0 else 0.35
                drums.add(shime(accent, rng), at(bar, k * 0.25), 0.8, pan=-0.25)
            for e in range(4):
                drums.add(kane(0.5, rng), at(bar, e + 0.5), 0.4, pan=0.4)
            if bar % 4 == 3:  # fill into the next phrase
                for k in range(8):
                    drums.add(shime(0.5 + k / 14, rng, pitch=460), at(bar, 2 + k * 0.25), 0.7, pan=0.1)
        else:  # turnaround: call and response, then a roll
            calls = [(0, 1.0), (0.5, 0.8), (1, 1.0), (2.5, 0.9), (3, 1.0)]
            for b, v in calls:
                drums.add(big(v), at(bar, b), 1.0)
                drums.add(big(v * 0.8, 82.0), at(bar, b + 0.25), 0.6, pan=0.3)
            if bar == BARS - 1:
                for k in range(32):
                    drums.add(shime(0.35 + k / 40, rng), at(bar, k * 0.125), 0.75, pan=-0.2)
                drums.add(riser(BAR, rng, 250, 6000), at(bar), 0.18)

        # ---- bass: the root in driving eighths (felt as the fast pulse), a drone in the gathering
        root = hz(ROOT[chord])
        if section == "gather":
            music.add(bass(root, BAR, 0.6), at(bar), 0.55)
        else:
            for e in range(8):
                music.add(bass(root if e % 4 != 3 else root * 2, BEAT * 0.5, 0.55 + 0.15 * (e % 2 == 0)),
                          at(bar, e * 0.5), 0.3)

        # ---- shamisen ostinato
        if section in ("groove", "theme", "climax"):
            base = hz(ROOT_PC[chord])
            for k, step in enumerate(OSTINATO):
                if step is None:
                    continue
                f = base * 2 ** (step / 12)
                music.add(shamisen(f, BEAT * 0.6, 0.55 if k % 4 else 0.75, rng), at(bar, k * 0.25), 0.55,
                          pan=-0.45)

        # ---- string pads (swelling across each phrase)
        notes = [hz(n) for n in CHORDS[chord]]
        pad_gain = {"gather": 0.25, "groove": 0.3, "theme": 0.32, "climax": 0.45, "turn": 0.4}[section]
        music.add(strings_pad(notes, BAR + 0.3, 0.8 + 0.3 * rise, rng), at(bar), pad_gain * 1.6, pan=0.15)

        # ---- brass stabs in the climax (and the turnaround's calls)
        if section == "climax":
            for b in (0, 1.5):
                music.add(brass_stab([n / 2 for n in notes[:3]], BEAT * 0.9, 0.9), at(bar, b), 0.35)
        if section == "turn":
            music.add(brass_stab([n / 2 for n in notes[:3]], BEAT * 1.4, 1.0), at(bar, 0), 0.4)

        # ---- koto arpeggio answers in the theme and climax
        if section in ("theme", "climax"):
            arp = [notes[1] * 2, notes[2] * 2, notes[3] * 2, notes[2] * 2]
            for k, f in enumerate(arp):
                music.add(koto(f, BEAT * 1.5, 0.5, rng), at(bar, 2 + k * 0.5), 0.5, pan=0.5)

    # ---- the flute: a long call in the gathering, the theme twice (second time an octave up)
    music.add(shakuhachi(hz("A4"), BAR * 1.5, 0.7, rng, scoop=-2, fall=-1), at(0, 1), 0.45, pan=0.1)
    music.add(shakuhachi(hz("D5"), BAR * 1.2, 0.7, rng, scoop=-1.5, fall=-2), at(2, 0.5), 0.45, pan=0.1)
    for start, octave, gain in ((12, 1, 0.8), (20, 2, 0.7)):
        for beat, name, length, scoop, fall in THEME:
            f = hz(name) * octave
            dur = length * BEAT * 0.98
            music.add(shakuhachi(f, dur, 0.8, rng, scoop=scoop, fall=fall), at(start, beat), gain, pan=0.1)
            if octave == 2:  # koto doubling the climax tune
                music.add(koto(f / 2, dur, 0.6, rng), at(start, beat), 0.28, pan=-0.3)

    # ---- mix: drums and music through one hall, drums a little drier
    ir = hall_ir(2.4, Rng(7))
    wet = convolve(music.buf * 0.9 + drums.buf * 0.45, ir) * 0.22
    dry = music.buf + drums.buf * 1.15
    mix = np.zeros((2, wet.shape[1]))
    mix[:, : dry.shape[1]] += dry
    mix += wet

    # Seamless loop: everything ringing past the loop's end is folded back onto its start.
    n = int(round(LOOP_S * SR))
    out = mix[:, :n].copy()
    rest = mix[:, n:]
    for s in range(0, rest.shape[1], n):
        seg = rest[:, s: s + n]
        out[:, : seg.shape[1]] += seg
    # Tame the sub (the drums and bass are felt, not allowed to swamp everything) and open up the
    # presence range where the flute, shamisen and strings live, matching the reference's balance.
    out = eq(out, [(20, -30), (32, -8), (60, -6), (100, 1), (160, 4), (250, 2), (450, -3), (800, -3),
                   (1500, 1), (2500, 5), (5000, 4), (10000, 1), (16000, -3)])
    return master(out, -17.0)


if __name__ == "__main__":
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "battle.wav", render())
