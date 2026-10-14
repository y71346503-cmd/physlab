import { WORLDS } from '../../shared/constants';
import { fmt } from '../../shared/format';
import { derive } from '../../shared/lsq';
import { quantize } from '../../shared/measure';
import type { LabDef } from '../types';
import type { PendulumSim } from './sim';

const FOUR_PI2 = 4 * Math.PI * Math.PI;

export const lab: LabDef<PendulumSim> = {
  goal: 'Find the free-fall acceleration g from how the period depends on the length. Since T² = (4π²/g)·L, the graph of T² against L is a straight line with slope 4π²/g.',
  steps: [
    'Choose a location. "Planet X" hides g so you can find it yourself.',
    'Set a release angle of 10° or less and choose a length L.',
    'Press Start. Start the stopwatch when the bob is at an extreme position.',
    'Stop the stopwatch after 10 full oscillations (the counter on the scene helps), then press "Record measurement".',
    'Repeat for at least 5 different lengths from 0.3 to 2.5 m.',
  ],
  columns: [
    { key: 'L', label: 'L', unit: 'm', digits: 3 },
    { key: 'N', label: 'N', unit: '', digits: 0 },
    { key: 't', label: 't', unit: 's', digits: 2 },
    { key: 'T', label: 'T', unit: 's', digits: 3 },
    { key: 'T2', label: 'T²', unit: 's²', digits: 3 },
  ],
  record({ params, sim, sw, real, noise }) {
    if (sw.start === null) return { error: 'Use the stopwatch first: start it, wait for several full oscillations, then stop it.' };
    if (sw.stop === null) return { error: 'Stop the stopwatch before recording.' };
    const N = sim.oscillations(sw.start, sw.stop);
    if (N < 1) return { error: 'The stopwatch did not catch a full oscillation. Measure the time of about 10 oscillations.' };
    const t = Math.round((sw.stop - sw.start) * 100) / 100;
    // Length measured with a ruler: 1 mm division, plus a small reading error in realistic mode.
    const L = quantize(params.L! + (real ? noise('L', 0.0015) : 0), 0.001);
    const T = t / N;
    return {
      values: { L, N, t, T, T2: T * T },
      meta: { world: params.world!, theta0: params.theta0!, gamma: params.gamma! },
    };
  },
  x: { label: 'L', unit: 'm', get: (r) => r.values.L! },
  y: { label: 'T²', unit: 's²', get: (r) => r.values.T2! },
  minPoints: 4,
  model: 'Fit: T² = k·L + b, expected k = 4π²/g and b = 0.',
  results(fit, rows) {
    const g = derive(fit, (k) => FOUR_PI2 / k);
    const worlds = new Set(rows.map((r) => r.meta.world));
    const ref = worlds.size === 1 ? WORLDS[rows[0]!.meta.world!]?.g ?? null : null;
    return [{ label: 'Free-fall acceleration', symbol: 'g', unit: 'm/s²', value: g.value, error: g.error, reference: ref }];
  },
  notes(fit, rows) {
    const out: string[] = [];
    if (new Set(rows.map((r) => r.meta.world)).size > 1) out.push('The rows were recorded in different locations. Clear the table and measure in one place.');
    if (rows.some((r) => r.meta.theta0! > 15)) out.push('Some rows used a release angle above 15°. Large swings are slower than 2π√(L/g), so g comes out too small.');
    if (rows.some((r) => r.meta.gamma! > 0)) out.push('Damping was on for some rows. It changes the period only slightly, but it makes counting oscillations harder.');
    if (rows.some((r) => r.values.N! < 10)) out.push('Count at least 10 oscillations: the reaction error of the stopwatch is then divided by N.');
    if (Number.isFinite(fit.sb) && Math.abs(fit.b) > 3 * fit.sb && Math.abs(fit.b) > 0.02)
      out.push(`The line misses the origin (b = ${fmt(fit.b, 3)} s²). Look for a systematic error, e.g. a miscounted oscillation.`);
    if (rows.some((r) => WORLDS[r.meta.world!]?.hidden)) out.push('Planet X: the reference value is shown only after the calculation. How close did you get?');
    return out;
  },
};
