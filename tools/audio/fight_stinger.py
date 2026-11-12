"""
The READY... FIGHT! stinger (owner, 12/11/2026), played under the announcer's voice. Modelled on
the owner's reference (a deep-voiced countdown to "FIGHT" with about a second between calls and a
long hall echo after the last): the same build, weight and timing, made of original sounds.

  0.00 s  READY   a double o-daiko hit, a low brass blare and a gong bloom
  0.05-1.40 s     the build: an accelerating taiko roll, tremolo strings climbing, a rising wind
  1.40-1.50 s     a breath of silence
  1.50 s  FIGHT!  massive drums, a sub drop, the tam-tam, a brass power chord and a crack,
                  ringing out through a large hall for about 2.5 s

The game plays it from the start of the intro's READY phase (FIGHT_INTRO.readyAtS), so the FIGHT
hit lands on fightAtS (1.5 s later).

Usage:  python3 tools/audio/fight_stinger.py out.wav
"""

from __future__ import annotations

import sys

import numpy as np

from synth import (SR, Rng, Track, brass_stab, convolve, eq, hall_ir, hz, kane, master, odaiko, riser, saw_additive,
                   shime, tamtam, write_wav)

FIGHT_AT_S = 1.5
LENGTH_S = 4.6


def tremolo_strings(dur: float, f0: float, f1: float) -> np.ndarray:
    """Bowed tremolo climbing from f0 to f1, swelling."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for interval in (0, 7, 12):
        f = f0 * (f1 / f0) ** (t / dur) * 2 ** (interval / 12)
        out += saw_additive(f, n, max_hz=4000, bright=1.2)
    trem = 0.55 + 0.45 * np.sin(2 * np.pi * 13 * t) ** 2
    return out * trem * (t / dur) ** 1.6 / 3


def render() -> np.ndarray:
    rng = Rng(2626)
    build = Track(LENGTH_S + 3.5)  # READY and the build: cut dead just before FIGHT
    hit = Track(LENGTH_S + 3.5)  # FIGHT and its echo
    # READY
    build.add(odaiko(1.0, rng, 56.0, decay=0.5), 0.0, 0.8)
    build.add(odaiko(0.9, rng, 80.0, decay=0.4), 0.02, 0.45, pan=0.2)
    build.add(brass_stab([hz("D2"), hz("A2"), hz("D3")], 0.7, 1.0), 0.0, 0.4)
    build.add(tamtam(0.4, rng, 1.2), 0.0, 0.2)
    build.add(kane(0.8, rng), 0.0, 0.3, pan=0.4)
    # The build: hits come faster and louder toward FIGHT.
    t, gap, k = 0.3, 0.26, 0
    while t < 1.4:
        v = 0.3 + 0.7 * (t / 1.4) ** 1.5
        build.add(shime(v, rng), t, 0.5 + 0.6 * (t / 1.4), pan=-0.2 if k % 2 else 0.2)
        if k % 2 == 0:
            build.add(odaiko(v, rng, 64.0, decay=0.3), t, 0.3 + 0.5 * (t / 1.4))
        t += gap
        gap = max(0.045, gap * 0.84)
        k += 1
    build.add(tremolo_strings(1.35, hz("D3"), hz("A3")), 0.05, 0.6, pan=0.1)
    build.add(riser(1.35, rng, 300, 7000), 0.05, 0.3)
    # FIGHT!
    f = FIGHT_AT_S
    for pitch, gain, pan in ((50.0, 1.0, 0.0), (62.0, 0.8, -0.3), (84.0, 0.6, 0.3)):
        hit.add(odaiko(1.0, rng, pitch, decay=1.1), f, gain, pan=pan)
    n = int(1.4 * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(70 * (28 / 70) ** (tt / 1.4)) / SR) * np.exp(-tt / 0.6)
    hit.add(sub, f, 0.6)
    hit.add(tamtam(1.0, rng, 3.5), f, 0.55)
    hit.add(brass_stab([hz("D2"), hz("A2"), hz("D3"), hz("A3")], 1.2, 1.0), f, 0.55)
    hit.add(shime(1.0, rng, 520.0), f, 0.9)
    hit.add(kane(1.0, rng, 1100.0), f, 0.35, pan=-0.4)

    def through_hall(x: np.ndarray, size: float, seed: int, mix: float) -> np.ndarray:
        return x + convolve(x, hall_ir(size, Rng(seed), damp_hz=4500))[:, : x.shape[1]] * mix

    a = through_hall(build.buf, 1.6, 5, 0.25)
    # The breath: the build stops dead 0.1 s before FIGHT.
    gate = np.ones(a.shape[1])
    s0, s1 = int((f - 0.12) * SR), int((f - 0.08) * SR)
    gate[s0:s1] = np.linspace(1, 0, s1 - s0)
    gate[s1:] = 0
    out = a * gate + through_hall(hit.buf, 3.0, 11, 0.3)
    out = out[:, : int((LENGTH_S + 1.2) * SR)]
    # Fade the last of the echo to true silence.
    fade = int(1.2 * SR)
    out[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    out = eq(out, [(20, -30), (30, -4), (60, 0), (200, 1), (500, -2), (2500, 3), (8000, 1), (16000, -4)])
    return master(out, -15.0)


if __name__ == "__main__":
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "stinger.wav", render())
