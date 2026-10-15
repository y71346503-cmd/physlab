import { derive } from '../../shared/lsq';
import type { LabDef } from '../types';
import type { CircuitSim } from './sim';

export const lab: LabDef<CircuitSim> = {
  goal: "Check Ohm's law I = U/R for a resistor and find its resistance from the slope of the I–V graph. Then repeat with the lamp: is its graph a straight line?",
  steps: [
    'Choose "Single element", element 1 = resistor. Connect the voltmeter across element 1 and the ammeter in the main line.',
    'Set the EMF, read the voltmeter and the ammeter on their dials, press "Record measurement".',
    'Change the EMF in steps from about 1 V to 12 V and record at least 5 points.',
    'Clear the table, switch element 1 to the lamp and take a second series.',
  ],
  columns: [
    { key: 'U', label: 'U', unit: 'V', digits: 2 },
    { key: 'I', label: 'I', unit: 'A', digits: 3 },
  ],
  record({ params, sim, meters }) {
    if (params.volt !== 1) return { error: 'Connect the voltmeter across element 1.' };
    if (!sim.ammeterMeasuresElement1()) return { error: 'Put the ammeter where it measures the current of element 1 (main line or its branch).' };
    const v = meters.volt;
    const a = meters.amm;
    if (!v || !a) return { error: 'Both meters must be connected.' };
    if (v.overload || a.overload) return { error: 'A meter is off the scale. Lower the EMF.' };
    return { values: { U: v.reading, I: a.reading }, meta: { elem: params.elem!, R1: params.R1!, scheme: params.scheme! } };
  },
  x: { label: 'U', unit: 'V', get: (r) => r.values.U! },
  y: { label: 'I', unit: 'A', get: (r) => r.values.I! },
  minPoints: 4,
  model: 'Fit: I = k·U + b, for a resistor k = 1/R and b = 0.',
  results(fit, rows) {
    const R = derive(fit, (k) => 1 / k);
    const resistorOnly = rows.every((r) => r.meta.elem === 0);
    const sameR = new Set(rows.map((r) => r.meta.R1)).size === 1;
    return [{ label: 'Resistance from the slope', symbol: 'R', unit: 'Ω', value: R.value, error: R.error, reference: resistorOnly && sameR ? rows[0]!.meta.R1! : null }];
  },
  notes(fit, rows) {
    const out: string[] = [];
    if (rows.some((r) => r.meta.elem === 1)) {
      out.push('The lamp is not an ohmic element: as the filament heats up, its resistance grows several times, so the I–V curve bends towards the U axis and a straight line fits poorly.');
      if (Number.isFinite(fit.r2)) out.push(`Quality of the straight-line fit: r² = ${fit.r2.toFixed(4)}. For the resistor it is very close to 1.`);
    }
    if (rows.some((r) => r.meta.elem === 0) && new Set(rows.map((r) => r.meta.R1)).size > 1) out.push('R1 was changed during the series: the table mixes different resistors.');
    if (rows.some((r) => r.meta.elem === 0) && rows.some((r) => r.meta.elem === 1)) out.push('The table mixes resistor and lamp measurements. Clear it between the series.');
    return out;
  },
};
