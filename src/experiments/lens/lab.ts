import { derive } from '../../shared/lsq';
import type { LabDef } from '../types';
import { SHARP_LIMIT, signedF, type LensSim } from './sim';

export const lab: LabDef<LensSim> = {
  goal: 'Find the focal length of a converging lens. By the thin lens formula 1/f = 1/F − 1/d, so the graph of 1/f against 1/d is a straight line with slope −1 and intercept 1/F (the optical power D).',
  steps: [
    'Choose a converging lens and put the object further than the focus.',
    'Move the screen until the image on it is as sharp as possible.',
    'Press "Record measurement": d and the screen position f are read from the bench.',
    'Repeat for at least 5 object distances from about 1.2F to 60 cm.',
  ],
  columns: [
    { key: 'd', label: 'd', unit: 'cm', digits: 1 },
    { key: 'f', label: 'f', unit: 'cm', digits: 1 },
    { key: 'invD', label: '1/d', unit: 'dpt', digits: 2 },
    { key: 'invF', label: '1/f', unit: 'dpt', digits: 2 },
  ],
  record({ params, sim, real, noise }) {
    if (!sim.img.exists || !sim.img.real) return { error: 'There is no real image: a virtual image cannot be caught on a screen. Move the object beyond the focus.' };
    const c = sim.blur();
    if (!(c <= SHARP_LIMIT)) return { error: 'The image on the screen is blurred. Move the screen until it is sharp.' };
    const f = sim.screenReading(real, noise);
    const d = params.d!;
    return { values: { d, f, invD: 100 / d, invF: 100 / f }, meta: { F: signedF(params) } };
  },
  x: { label: '1/d', unit: 'dpt', get: (r) => r.values.invD! },
  y: { label: '1/f', unit: 'dpt', get: (r) => r.values.invF! },
  minPoints: 4,
  model: 'Fit: 1/f = k·(1/d) + b, expected k = −1 and b = D = 1/F.',
  results(fit, rows) {
    const F = derive(fit, (_k, b) => 100 / b);
    const D = derive(fit, (_k, b) => b);
    const same = new Set(rows.map((r) => r.meta.F)).size === 1;
    return [
      { label: 'Focal length', symbol: 'F', unit: 'cm', value: F.value, error: F.error, reference: same ? rows[0]!.meta.F! : null },
      { label: 'Optical power', symbol: 'D', unit: 'dpt', value: D.value, error: D.error, reference: same ? 100 / rows[0]!.meta.F! : null },
    ];
  },
  notes(fit, rows) {
    const out: string[] = [];
    if (new Set(rows.map((r) => r.meta.F)).size > 1) out.push('The rows were recorded with different lenses. Clear the table and use one lens.');
    if (Number.isFinite(fit.sk) && Math.abs(fit.k + 1) > 3 * fit.sk && Math.abs(fit.k + 1) > 0.03)
      out.push(`The slope k = ${fit.k.toFixed(3)} differs from −1: check that the screen was sharp for every row.`);
    return out;
  },
};
