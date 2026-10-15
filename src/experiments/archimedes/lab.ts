import { G_EARTH } from '../../shared/constants';
import { derive } from '../../shared/lsq';
import type { LabDef } from '../types';
import { V_LIQUID } from './model';
import type { ArchimedesSim } from './sim';

export const lab: LabDef<ArchimedesSim> = {
  goal: 'Find the density of the liquid and of the body. The scale reading falls linearly with the displaced volume: F = P − ρ_liquid·g·V. The slope gives the liquid density, the intercept the weight in air.',
  steps: [
    'Choose a liquid and a body that sinks in it (body density larger than the liquid density).',
    `Lower the body step by step. At each depth read the scale and the cylinder (the displaced volume is the reading minus ${V_LIQUID} cm³).`,
    'Press "Record measurement" at each depth, including depth 0 and one with the body fully under the surface.',
    'Record at least 5 points.',
  ],
  columns: [
    { key: 'V', label: 'V displaced', unit: 'cm³', digits: 0 },
    { key: 'F', label: 'F scale', unit: 'N', digits: 2 },
  ],
  record({ params, sim, meters, real, noise }) {
    if (sim.st.slack) return { error: 'The body floats and the scale shows 0. Choose a denser body or a lighter liquid for this lab.' };
    const m = meters.dyn;
    if (!m) return { error: 'The spring scale is not connected.' };
    if (m.overload) return { error: 'The body is too heavy for the scale.' };
    const V = sim.cylinderReading(real, noise) - V_LIQUID;
    return {
      values: { V, F: m.reading },
      meta: { rhoL: params.rhoL!, rhoB: params.rhoB!, Vbody: params.V!, full: sim.st.fullySubmerged ? 1 : 0 },
    };
  },
  x: { label: 'V', unit: 'cm³', get: (r) => r.values.V! },
  y: { label: 'F', unit: 'N', get: (r) => r.values.F! },
  minPoints: 4,
  model: 'Fit: F = k·V + b, expected k = −ρ_liquid·g (per cm³) and b = P, the weight in air.',
  results(fit, rows) {
    const rhoL = derive(fit, (k) => (-k * 1e6) / G_EARTH);
    const sameSetup = new Set(rows.map((r) => `${r.meta.rhoL}|${r.meta.rhoB}|${r.meta.Vbody}`)).size === 1;
    const out = [
      { label: 'Density of the liquid', symbol: 'ρ_liquid', unit: 'kg/m³', value: rhoL.value, error: rhoL.error, reference: sameSetup ? rows[0]!.meta.rhoL! : null },
    ];
    const full = rows.filter((r) => r.meta.full === 1);
    if (full.length > 0) {
      // Body volume = displaced volume when fully submerged (mean of such rows).
      const Vb = full.reduce((s, r) => s + r.values.V!, 0) / full.length;
      const rhoB = derive(fit, (_k, b) => b / (G_EARTH * Vb * 1e-6));
      out.push({ label: 'Density of the body', symbol: 'ρ_body', unit: 'kg/m³', value: rhoB.value, error: rhoB.error, reference: sameSetup ? rows[0]!.meta.rhoB! : null });
    }
    return out;
  },
  notes(_fit, rows) {
    const out: string[] = [];
    if (new Set(rows.map((r) => `${r.meta.rhoL}|${r.meta.rhoB}|${r.meta.Vbody}`)).size > 1) out.push('The rows mix different liquids or bodies. Clear the table and keep one setup.');
    if (!rows.some((r) => r.meta.full === 1)) out.push('Record a point with the body fully submerged: its displaced volume is the volume of the body, needed for the body density.');
    else out.push('The body density uses the displaced volume of the fully submerged rows (the error of that reading is not included).');
    return out;
  },
};
