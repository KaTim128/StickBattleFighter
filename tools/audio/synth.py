"""
Offline instrument synthesis for Stickman Arena's music and stingers (owner, 12/11/2026).

Everything here is original synthesis from first principles (no samples, no third-party audio):
- taiko family: o-daiko (big drum), shime-daiko (tight high drum), kane (small hand gong), tam-tam
- strings: shamisen and koto by Karplus-Strong plucked-string synthesis
- winds: a shakuhachi-like breathy flute (additive tone + filtered breath, scoops and vibrato)
- orchestra: string-ensemble pads and low brass stabs (additive, band-limited saw tones)
- a stereo hall reverb (decaying, decorrelated noise impulse response, FFT convolution)

Requires numpy only. Deterministic: every random source is seeded.
"""

from __future__ import annotations

import numpy as np

SR = 44100
A4 = 440.0
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7,
        "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def hz(name: str) -> float:
    """'D3' -> frequency in Hz."""
    pitch = name[:-1]
    octave = int(name[-1])
    midi = 12 * (octave + 1) + NOTE[pitch]
    return A4 * 2 ** ((midi - 69) / 12)


def semis(f: float, n: float) -> float:
    return f * 2 ** (n / 12)


class Rng:
    def __init__(self, seed: int):
        self.r = np.random.default_rng(seed)

    def noise(self, n: int) -> np.ndarray:
        return self.r.standard_normal(n).astype(np.float64)

    def uniform(self, a: float, b: float) -> float:
        return float(self.r.uniform(a, b))


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env_ad(n: int, attack: float, decay: float) -> np.ndarray:
    """Linear attack, exponential decay (decay = time constant, s)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / decay)


def env_asr(n: int, attack: float, release: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.clip((n / SR - t) / max(release, 1e-4), 0, 1)
    return a * r


def fft_filter(x: np.ndarray, lo: float | None, hi: float | None, order: float = 2.0) -> np.ndarray:
    """Zero-phase band filter by smooth spectral masks (good enough for offline sound design)."""
    n = len(x)
    if n == 0:
        return x
    size = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        m *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * m, size)[:n]


def saw_additive(freq: np.ndarray | float, n: int, max_hz: float = 7000.0, bright: float = 1.0) -> np.ndarray:
    """Band-limited sawtooth by additive harmonics; `freq` may be a per-sample array (glides)."""
    f = np.full(n, freq) if np.isscalar(freq) else freq
    phase = 2 * np.pi * np.cumsum(f) / SR
    out = np.zeros(n)
    top = int(max_hz / float(np.max(f)))
    for k in range(1, max(2, top) + 1):
        out += np.sin(k * phase) / (k ** bright)
    return out * (2 / np.pi)


# ---------------------------------------------------------------- percussion


def odaiko(vel: float, rng: Rng, pitch: float = 58.0, decay: float = 0.75) -> np.ndarray:
    """The big drum: a deep membrane thud with a pitch drop, a body mode and a soft beater slap."""
    n = int((decay * 5) * SR)
    t = np.arange(n) / SR
    f = pitch * (1 + 0.9 * np.exp(-t / 0.035))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    mode2 = np.sin(2 * np.pi * np.cumsum(f * 1.59) / SR) * np.exp(-t / (decay * 0.3)) * 0.35
    mode3 = np.sin(2 * np.pi * np.cumsum(f * 2.14) / SR) * np.exp(-t / (decay * 0.15)) * 0.18
    slap = fft_filter(rng.noise(n) * np.exp(-t / 0.018), 60, 1400) * 0.6
    x = body + mode2 + mode3 + slap
    return np.tanh(1.6 * x * vel) / np.tanh(1.6)


def shime(vel: float, rng: Rng, pitch: float = 420.0) -> np.ndarray:
    """The tight, high drum: a hard crack with a short ring."""
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    ring = (np.sin(2 * np.pi * pitch * t) + 0.5 * np.sin(2 * np.pi * pitch * 1.48 * t)) * np.exp(-t / 0.045)
    crack = fft_filter(rng.noise(n) * np.exp(-t / 0.008), 1500, 9000) * 0.9
    return (ring * 0.6 + crack) * vel


def kane(vel: float, rng: Rng, pitch: float = 1350.0) -> np.ndarray:
    """A small hand gong struck with a hard beater: bright, inharmonic, short."""
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for ratio, amp, dec in ((1.0, 1.0, 0.16), (2.76, 0.6, 0.09), (5.4, 0.35, 0.05), (8.93, 0.2, 0.03)):
        x += amp * np.sin(2 * np.pi * pitch * ratio * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    x += fft_filter(rng.noise(n) * np.exp(-t / 0.004), 3000, None) * 0.4
    return x * vel * 0.5


def tamtam(vel: float, rng: Rng, dur: float = 4.0) -> np.ndarray:
    """A big gong: a dark bloom of many inharmonic partials that swells then fades."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    base = 72.0
    for i in range(28):
        ratio = 1 + i * 0.73 + rng.uniform(-0.2, 0.2)
        dec = dur * 0.45 / (1 + i * 0.08)
        swell = 1 - np.exp(-t / (0.05 + i * 0.01))
        x += np.sin(2 * np.pi * base * ratio * t + rng.uniform(0, 6)) * swell * np.exp(-t / dec) / (1 + i * 0.25)
    x += fft_filter(rng.noise(n), 200, 3000) * np.exp(-t / 0.6) * 0.25
    return x * vel / 3


# ---------------------------------------------------------------- strings


def karplus(freq: float, dur: float, rng: Rng, bright: float = 0.9, decay: float = 0.996,
            excite_hi: float = 9000.0) -> np.ndarray:
    """Karplus-Strong plucked string, vectorised one period at a time."""
    n = int(dur * SR)
    p = max(2, int(round(SR / freq)))
    buf = fft_filter(rng.noise(p * 4), None, excite_hi)[:p]
    buf = buf / (np.max(np.abs(buf)) + 1e-9)
    out = np.zeros(n + p)
    out[:p] = buf
    k = p
    while k < n:
        prev = out[k - p:k]
        nxt = np.empty_like(prev)
        nxt[:-1] = bright * prev[:-1] + (1 - bright) * prev[1:]
        nxt[-1] = bright * prev[-1] + (1 - bright) * out[k]
        nxt *= decay
        m = min(p, n - k)
        out[k:k + m] = nxt[:m]
        k += p
    return out[:n]


def shamisen(freq: float, dur: float, vel: float, rng: Rng) -> np.ndarray:
    """A bright, percussive pluck with the buzzing 'sawari' edge and the plectrum's snap."""
    x = karplus(freq, dur, rng, bright=0.98, decay=0.993, excite_hi=12000)
    x = np.sign(x) * np.abs(x) ** 0.75  # the buzz
    n = len(x)
    t = np.arange(n) / SR
    snap = fft_filter(rng.noise(n) * np.exp(-t / 0.006), 2000, None) * 0.5
    return (x * np.exp(-t / 0.5) + snap) * vel * env_asr(n, 0.001, 0.03)


def koto(freq: float, dur: float, vel: float, rng: Rng) -> np.ndarray:
    """A softer, ringing pluck."""
    x = karplus(freq, dur, rng, bright=0.72, decay=0.998, excite_hi=6000)
    n = len(x)
    return x * vel * env_asr(n, 0.002, 0.08)


# ---------------------------------------------------------------- winds


def shakuhachi(freq: float, dur: float, vel: float, rng: Rng, scoop: float = -1.0,
               fall: float = 0.0, vib: float = 0.35) -> np.ndarray:
    """A breathy bamboo-flute line: scoops into the note, vibrato that grows, optional end fall."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    bend = scoop * np.exp(-t / 0.07)
    if fall:
        bend += fall * np.clip((t - (dur - 0.18)) / 0.18, 0, 1) ** 2
    depth = vib * np.clip((t - 0.25) / 0.6, 0, 1)
    f = freq * 2 ** ((bend + depth * np.sin(2 * np.pi * 5.3 * t)) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph) + 0.05 * np.sin(4 * ph)
    amp = env_asr(n, 0.06, 0.12) * (1 + 0.15 * np.sin(2 * np.pi * 0.7 * t))
    breath = fft_filter(rng.noise(n), freq * 0.8, freq * 4) * 0.22
    chiff = fft_filter(rng.noise(n) * np.exp(-t / 0.03), 1500, 7000) * 0.35
    return (tone * amp + breath * amp + chiff) * vel


# ---------------------------------------------------------------- orchestra


def strings_pad(freqs: list[float], dur: float, vel: float, rng: Rng, attack: float = 0.5,
                release: float = 0.6) -> np.ndarray:
    """A string-ensemble chord: several slightly detuned saws per note, softened."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-7, -2, 3, 8):
            ff = semis(f, d / 100) * (1 + 0.002 * np.sin(2 * np.pi * rng.uniform(4.5, 6) * t))
            out += saw_additive(ff, n, max_hz=3500, bright=1.25)
    return fft_filter(out, 70, 4000) * env_asr(n, attack, release) * vel / (len(freqs) * 3)


def brass_stab(freqs: list[float], dur: float, vel: float) -> np.ndarray:
    """Low brass hit: a bright blare that darkens quickly."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-6, 0, 6):
            ph = 2 * np.pi * semis(f, d / 100) * t
            top = int(5000 / f)
            for k in range(1, top + 1):
                bright = np.exp(-t / (0.08 + 0.5 / k))  # the high harmonics die first
                out += np.sin(k * ph) / k * bright
    return np.tanh(out * 0.6) * env_asr(n, 0.015, 0.12) * vel / len(freqs)


def bass(freq: float, dur: float, vel: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    x = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return np.tanh(1.4 * x) * env_ad(n, 0.005, dur * 0.6) * vel


def riser(dur: float, rng: Rng, f0: float = 300.0, f1: float = 5000.0) -> np.ndarray:
    """Noise that climbs and swells (chunks band-passed along a rising centre)."""
    n = int(dur * SR)
    out = np.zeros(n)
    chunk = int(0.05 * SR)
    win = np.hanning(chunk * 2)
    for i, s in enumerate(range(0, n, chunk)):
        k = s / n
        fc = f0 * (f1 / f0) ** k
        seg = fft_filter(rng.noise(chunk * 2), fc * 0.6, fc * 1.6) * win
        e = min(n, s + chunk * 2)
        out[s:e] += seg[: e - s] * (k ** 2)
    return out / (np.max(np.abs(out)) + 1e-9)


# ---------------------------------------------------------------- mixing


class Track:
    """A stereo buffer with panned, placed sounds."""

    def __init__(self, dur: float):
        self.buf = np.zeros((2, int(dur * SR)))

    def add(self, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
        s = int(at * SR)
        if s >= self.buf.shape[1] or len(x) == 0:
            return
        e = min(self.buf.shape[1], s + len(x))
        left = np.cos((pan + 1) * np.pi / 4)
        right = np.sin((pan + 1) * np.pi / 4)
        self.buf[0, s:e] += x[: e - s] * gain * left * np.sqrt(2)
        self.buf[1, s:e] += x[: e - s] * gain * right * np.sqrt(2)


def hall_ir(seconds: float, rng: Rng, damp_hz: float = 5000.0) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for c in range(2):
        noise = fft_filter(rng.noise(n), 120, damp_hz)
        ir[c] = noise * np.exp(-6.9 * t / seconds) * np.clip(t / 0.012, 0, 1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = x.shape[1] + ir.shape[1]
    size = 1 << int(np.ceil(np.log2(n)))
    out = np.zeros((2, x.shape[1] + ir.shape[1]))
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], size) * np.fft.rfft(ir[c], size), size)[: out.shape[1]]
    return out


def eq(x: np.ndarray, points: list[tuple[float, float]]) -> np.ndarray:
    """Mastering EQ: a smooth gain curve (dB) through (frequency, gain) points, log-interpolated."""
    out = np.zeros_like(x)
    size = 1 << int(np.ceil(np.log2(x.shape[1])))
    f = np.fft.rfftfreq(size, 1 / SR)
    fx = np.log10([p[0] for p in points])
    g = np.interp(np.log10(np.maximum(f, 1.0)), fx, [p[1] for p in points])
    mask = 10 ** (g / 20)
    for c in range(x.shape[0]):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], size) * mask, size)[: x.shape[1]]
    return out


def master(x: np.ndarray, target_rms_db: float) -> np.ndarray:
    """Gentle glue compression, then normalise to a target loudness with a soft safety limiter."""
    rms = np.sqrt(np.mean(x ** 2))
    x = x * (10 ** (target_rms_db / 20) / (rms + 1e-12))
    return np.tanh(x * 1.1) / 1.1


def write_wav(path: str, x: np.ndarray) -> None:
    import wave

    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").T.copy()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
