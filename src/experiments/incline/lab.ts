import { G_EARTH } from '../../shared/constants';
import { DEG } from '../../shared/format';
import { derive } from '../../shared/lsq';
import type { LabDef } from '../types';
import { physFrom, type InclineSim } from './sim';

export const lab: LabDef<InclineSim> = {
  goal: 'Find the friction coefficient μ. From a = g(sin α − μ cos α) it follows that a/cos α = g·tan α − μg: a straight line in tan α with slope g and intercept −μg.',
  steps: [
    'Choose a surface. "Unknown surface A/B" hides μ so you can measure it.',
    'Set an angle at which the block slides and put the photogate at a distance s.',
    'Press Start. The gate timer shows the time t from release to the gate (1 ms division).',
    'Press "Record measurement": the acceleration is a = 2s/t².',
    'Repeat for at least 5 different angles on the same surface.',
  ],
  columns: [
    { key: 'alpha', label: 'α', unit: '°', digits: 0 },
    { key: 's', label: 's', unit: 'm', digits: 2 },
    { key: 't', label: 't', unit: 's', digits: 3 },
    { key: 'a', label: 'a', unit: 'm/s²', digits: 3 },
    { key: 'tan', label: 'tan α', unit: '', digits: 3 },
    { key: 'acos', label: 'a/cos α', unit: 'm/s²', digits: 3 },
  ],
  record({ params, sim, real, noise }) {
    if (!sim.f.moves) return { error: 'The block does not slide at this angle. Make the slope steeper.' };
    const t = sim.gateReading(real, noise);
    if (t === null) return { error: 'Press Start and wait until the block passes the photogate.' };
    const s = params.s!;
    const a = (2 * s) / (t * t);
    const alpha = params.alpha!;
    return {
      values: { alpha, s, t, a, tan: Math.tan(alpha * DEG), acos: a / Math.cos(alpha * DEG) },
      meta: { surface: params.surface!, mu: physFrom(params).mu },
    };
  },
  x: { label: 'tan α', unit: '1', get: (r) => r.values.tan! },
  y: { label: 'a/cos α', unit: 'm/s²', get: (r) => r.values.acos! },
  minPoints: 4,
  model: 'Fit: a/cos α = k·tan α + b, expected k = g and b = −μg.',
  results(fit, rows) {
    const mu = derive(fit, (k, b) => -b / k);
    const g = derive(fit, (k) => k);
    const same = new Set(rows.map((r) => r.meta.mu)).size === 1;
    return [
      { label: 'Friction coefficient', symbol: 'μ', unit: '', value: mu.value, error: mu.error, reference: same ? rows[0]!.meta.mu! : null },
      { label: 'Free-fall acceleration (from the slope)', symbol: 'g', unit: 'm/s²', value: g.value, error: g.error, reference: G_EARTH },
    ];
  },
  notes(_fit, rows) {
    const out: string[] = [];
    if (new Set(rows.map((r) => r.meta.mu)).size > 1) out.push('The rows were recorded on different surfaces. Clear the table and measure one surface.');
    if (rows.some((r) => r.meta.surface! > 0)) out.push('Unknown surface: the reference μ is shown only after the calculation.');
    return out;
  },
};
