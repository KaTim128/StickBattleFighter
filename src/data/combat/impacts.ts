/**
 * How a landed blow FEELS (owner request 11/11/2026: "every hit powerful and
 * responsive"), per kind of contact. Data only: attacks and abilities name a
 * profile; weapons add their own later (for example 'blade', 'blunt').
 * Values are presentation tuning, not balance.
 */
export type ImpactId = 'knuckle-light' | 'knuckle-heavy' | 'kick' | 'fire' | 'fire-heavy' | 'blocked';

export interface ImpactProfile {
  /** Sound-effect id played at the moment of contact (src/audio). */
  readonly sound: string;
  /** How long the struck fighter flashes white, seconds (a few frames). */
  readonly flashS: number;
  /** Spark particles thrown along the blow. */
  readonly sparks: number;
  readonly sparkSpeedMps: number;
  readonly sparkColour: number;
  /** Size of the impact burst ring, metres. */
  readonly burstM: number;
  /** The attacker bounces back this fast on contact (melee only), m/s. */
  readonly recoilMps: number;
  /** Freeze frames on contact, seconds. */
  readonly hitstopS: number;
  /** Camera shake added on contact (0..1 trauma; shake is trauma²). */
  readonly shake: number;
}

export const IMPACTS: Readonly<Record<ImpactId, ImpactProfile>> = {
  'knuckle-light': {
    sound: 'punch-light',
    flashS: 0.07,
    sparks: 9,
    sparkSpeedMps: 5,
    sparkColour: 0xfff4d6,
    burstM: 0.35,
    recoilMps: 0.9,
    hitstopS: 0.055,
    shake: 0.22,
  },
  'knuckle-heavy': {
    sound: 'punch-heavy',
    flashS: 0.1,
    sparks: 18,
    sparkSpeedMps: 7.5,
    sparkColour: 0xffe08a,
    burstM: 0.6,
    recoilMps: 1.6,
    hitstopS: 0.1,
    shake: 0.5,
  },
  kick: {
    sound: 'kick-heavy',
    flashS: 0.1,
    sparks: 16,
    sparkSpeedMps: 7,
    sparkColour: 0xffe08a,
    burstM: 0.55,
    recoilMps: 2.2,
    hitstopS: 0.09,
    shake: 0.45,
  },
  fire: {
    sound: 'fire-hit',
    flashS: 0.08,
    sparks: 10,
    sparkSpeedMps: 5,
    sparkColour: 0xffa53a,
    burstM: 0.4,
    recoilMps: 0,
    hitstopS: 0.05,
    shake: 0.2,
  },
  'fire-heavy': {
    sound: 'fire-hit',
    flashS: 0.11,
    sparks: 16,
    sparkSpeedMps: 7,
    sparkColour: 0xffa53a,
    burstM: 0.6,
    recoilMps: 0,
    hitstopS: 0.1,
    shake: 0.35,
  },
  blocked: {
    sound: 'block',
    flashS: 0,
    sparks: 6,
    sparkSpeedMps: 4,
    sparkColour: 0x9fd6ff,
    burstM: 0.3,
    recoilMps: 1.2,
    hitstopS: 0.04,
    shake: 0.12,
  },
};
