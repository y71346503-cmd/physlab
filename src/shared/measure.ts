// Instrument readings: a scale with a division value, rounding to the division,
// and optional realistic error within the accuracy class.

import type { MeterRange, MeterReading, NoiseFn } from '../experiments/types';
import { gaussian, hashString, mulberry32 } from './rng';

export function quantize(value: number, div: number): number {
  return Number((Math.round(value / div) * div).toFixed(10));
}

/** Smallest range that fits the reference value (or the largest one). */
export function pickRange(ranges: MeterRange[], ref: number): MeterRange {
  const a = Math.abs(ref);
  return ranges.find((r) => a <= r.max * 1.0000001) ?? ranges[ranges.length - 1]!;
}

export function readMeter(
  value: number,
  ref: number,
  ranges: MeterRange[],
  accuracyClass: number,
  real: boolean,
  noise: NoiseFn,
  key: string,
): MeterReading {
  const range = pickRange(ranges, ref);
  const maxErr = (accuracyClass / 100) * range.max;
  const err = real ? noise(key, maxErr / 2) : 0;
  const clampedErr = Math.max(-maxErr, Math.min(maxErr, err));
  const overload = Math.abs(value) > range.max * 1.02;
  const raw = Math.max(-range.max, Math.min(range.max, value + clampedErr));
  return { reading: quantize(raw, range.div), range, overload };
}

/** Instrument error by the school rule: half of the division value. */
export function instrumentError(div: number): number {
  return div / 2;
}

/** Build a deterministic noise function for one setup (params + session salt). */
export function makeNoise(setupKey: string): NoiseFn {
  return (key, sigma) => {
    if (!(sigma > 0)) return 0;
    const rng = mulberry32(hashString(`${setupKey}|${key}`));
    return gaussian(rng) * sigma;
  };
}
