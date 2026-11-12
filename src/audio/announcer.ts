/**
 * The fight announcer (owner, 12/11/2026: "a mature, deep voiced English male announcer with a
 * commanding fighting tournament style delivery"). Spoken with the browser's own speech engine
 * (no audio files, nothing to license): an English male voice where the device has one, pitched
 * down and slowed for weight. "READY..." is drawn out; "FIGHT!" is clipped and loud.
 *
 * Limitation: speech engines differ by device; this picks the deepest-sounding English male voice
 * available. A recorded announcer can replace it later behind the same `say()` call.
 */
export type AnnouncerLine = 'ready' | 'fight';

const LINES: Record<AnnouncerLine, { text: string; rate: number; pitch: number }> = {
  ready: { text: 'Ready...', rate: 0.72, pitch: 0.3 },
  fight: { text: 'Fight!', rate: 0.95, pitch: 0.25 },
};

/** Voices that are English and male on common platforms, best first. */
const PREFERRED = [
  'Google UK English Male',
  'Microsoft Ryan',
  'Microsoft Guy',
  'Microsoft George',
  'Microsoft David',
  'Daniel',
  'Arthur',
  'Aaron',
  'Alex',
  'Fred',
  'Rishi',
];

export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;

  constructor(
    private readonly volume: () => number,
    private readonly muted: () => boolean,
  ) {
    const synth = Announcer.synth();
    if (!synth) return;
    const pick = () => {
      this.voice = Announcer.pickVoice(synth.getVoices());
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
  }

  private static synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  /** The best English male voice on this device (or any English voice, or none). */
  static pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    for (const name of PREFERRED) {
      const v = english.find((x) => x.name.includes(name));
      if (v) return v;
    }
    return (
      english.find((v) => /male|man|guy|david|daniel/i.test(v.name) && !/female/i.test(v.name)) ?? english[0] ?? null
    );
  }

  /** Speak a line now (cancelling anything still being said). */
  say(line: AnnouncerLine): void {
    const synth = Announcer.synth();
    if (!synth || this.muted()) return;
    const l = LINES[line];
    const u = new SpeechSynthesisUtterance(l.text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? 'en-GB';
    u.rate = l.rate;
    u.pitch = l.pitch;
    u.volume = Math.min(1, Math.max(0, this.volume() * (line === 'fight' ? 1 : 0.9)));
    synth.cancel();
    synth.speak(u);
  }

  stop(): void {
    Announcer.synth()?.cancel();
  }
}
