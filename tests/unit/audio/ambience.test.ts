import { describe, expect, it } from 'vitest';
import { nextDelayS } from '../../../src/audio/ambience';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { AMBIENCES, AMBIENT_EVENTS, CROWD_EVENTS, MENU_AMBIENCE_ID } from '../../../src/data/audio/ambiences';

const ARENAS = [OFFICE, TRAINING_YARD];

describe('background ambience, never music (owner, 12/11/2026)', () => {
  it('every map has its own soundscape, and the menu has its own', () => {
    expect(AMBIENCES[MENU_AMBIENCE_ID]).toBeDefined();
    const ids = ARENAS.map((a) => a.ambience);
    for (const id of ids) {
      expect(id && AMBIENCES[id], `${id}`).toBeTruthy();
      expect(id).not.toBe(MENU_AMBIENCE_ID);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(Object.values(AMBIENCES))('$id is well formed: beds and events only, sensible timings', (a) => {
    expect(a.beds.length).toBeGreaterThan(0);
    expect(a.level).toBeGreaterThan(0);
    expect(a.level).toBeLessThanOrEqual(1);
    expect(a.reverb.seconds).toBeGreaterThan(0.5);
    for (const bed of a.beds) {
      expect(['noise', 'hum', 'crowd']).toContain(bed.kind); // no note, melody or beat layers exist
      expect(bed.gain).toBeGreaterThan(0);
      expect(bed.gain).toBeLessThanOrEqual(1);
    }
    for (const e of a.events) {
      expect(AMBIENT_EVENTS).toContain(e.id);
      expect(e.everyS[0]).toBeGreaterThan(1); // occasional, never a steady pulse
      expect(e.everyS[1]).toBeGreaterThan(e.everyS[0]); // irregular: no fixed tempo
    }
    for (const id of Object.values(a.reactions ?? {})) expect(a.events.map((e) => e.id)).toContain(id);
  });

  it('the empty office is still: air, hum and the building settling; no people at all', () => {
    const office = AMBIENCES[OFFICE.ambience!]!;
    expect(office.beds.some((b) => b.kind === 'crowd')).toBe(false);
    for (const e of office.events) expect(CROWD_EVENTS).not.toContain(e.id);
    expect(office.reactions).toBeUndefined();
    expect(office.events.map((e) => e.id)).toEqual(expect.arrayContaining(['creak', 'thump', 'tick']));
    expect(office.beds.some((b) => b.kind === 'hum')).toBe(true); // ventilation and mains hum
  });

  it('the Colosseum has a crowd: murmur, distant and near cheers, nervous murmur swells, applause, whistles, gasps, oohs and roars, with arena echoes, answering the fight', () => {
    const arena = AMBIENCES.colosseum!;
    expect(arena.beds.some((b) => b.kind === 'crowd')).toBe(true);
    expect(arena.events.map((e) => e.id).sort()).toEqual([...CROWD_EVENTS].sort());
    expect(arena.reverb.seconds).toBeGreaterThan(AMBIENCES[OFFICE.ambience!]!.reverb.seconds); // a vast stone bowl
    expect(arena.reactions).toEqual({ 'heavy-hit': 'ooh', ko: 'roar' });
    expect(arena.echo?.delaysS.length).toBeGreaterThanOrEqual(2); // slapback off the stone walls
    expect(AMBIENCES.tunnel!.muffleHz).toBeLessThan(1000); // the menu hears it through stone
  });

  it('event timing is random within its range', () => {
    let s = 1;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const seen = Array.from({ length: 200 }, () => nextDelayS([5, 12], rand));
    for (const d of seen) {
      expect(d).toBeGreaterThanOrEqual(5);
      expect(d).toBeLessThanOrEqual(12);
    }
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(5);
  });
});
