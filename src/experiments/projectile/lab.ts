import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { derive } from '../../shared/lsq';
import type { LabDef } from '../types';
import type { ProjectileSim } from './sim';

export const lab: LabDef<ProjectileSim> = {
  goal: 'Check the range formula L = (v₀²/g)·sin 2α. Plotted against sin 2α, the range is a straight line through the origin with slope v₀²/g; find the launch speed v₀ from it.',
  steps: [
    'Launch from the ground (h₀ = 0) with air resistance off. Keep the speed the same for the whole series.',
    'Set an angle, press Start and wait for the ball to land.',
    'Press "Record measurement": the range is read from the tape on the ground (0.1 m division).',
    'Repeat for angles from 10° to 80°, at least 5 of them.',
    'Then try a series with air resistance on and compare the graphs.',
  ],
  columns: [
    { key: 'alpha', label: 'α', unit: '°', digits: 0 },
    { key: 'sin2a', label: 'sin 2α', unit: '', digits: 3 },
    { key: 'L', label: 'L', unit: 'm', digits: 1 },
  ],
  record({ params, sim, real, noise }) {
    const L = sim.tapeReading(real, noise);
    if (L === null) return { error: 'Launch the ball and wait until it lands, then record.' };
    return {
      values: { alpha: params.alpha!, sin2a: Math.sin(2 * params.alpha! * DEG), L },
      meta: { v0: params.v0!, h0: params.h0!, drag: params.drag!, ball: params.ball! },
    };
  },
  x: { label: 'sin 2α', unit: '1', get: (r) => r.values.sin2a! },
  y: { label: 'L', unit: 'm', get: (r) => r.values.L! },
  minPoints: 4,
  model: 'Fit: L = k·sin 2α + b, expected k = v₀²/g and b = 0.',
  results(fit, rows) {
    const v0 = derive(fit, (k) => Math.sqrt(Math.max(0, k * G_EARTH)));
    const speeds = new Set(rows.map((r) => r.meta.v0));
    const ideal = rows.every((r) => r.meta.drag === 0 && r.meta.h0 === 0);
    return [
      {
        label: 'Launch speed',
        symbol: 'v₀',
        unit: 'm/s',
        value: v0.value,
        error: v0.error,
        reference: speeds.size === 1 && ideal ? rows[0]!.meta.v0! : null,
      },
    ];
  },
  notes(fit, rows) {
    const out: string[] = [];
    if (new Set(rows.map((r) => r.meta.v0)).size > 1) out.push('The rows use different launch speeds: the formula assumes one v₀ for the whole series.');
    if (rows.some((r) => r.meta.drag === 1))
      out.push('With air resistance the ranges are shorter and the points no longer lie on one straight line through the origin: the formula does not apply.');
    if (rows.some((r) => r.meta.h0! > 0)) out.push('Launches from a height fly further than the formula predicts, so the line does not pass through the origin.');
    if (Number.isFinite(fit.sb) && Math.abs(fit.b) > 3 * fit.sb && Math.abs(fit.b) > 0.2) out.push(`The intercept b = ${fmt(fit.b, 2)} m is not zero: look for a systematic effect.`);
    return out;
  },
};
