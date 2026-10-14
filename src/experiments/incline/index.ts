import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { InclineSim, SURFACES } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<InclineSim>({
  meta,
  kind: 'dynamic',
  dt: 1 / 1000,
  aspect: 0.58,
  params: [
    { key: 'alpha', label: 'Slope angle', symbol: 'α', unit: '°', min: 0, max: 60, step: 1, default: 30 },
    { key: 'm', label: 'Block mass', symbol: 'm', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1 },
    {
      key: 'surface',
      label: 'Surface',
      unit: '',
      type: 'select',
      min: 0,
      max: SURFACES.length - 1,
      step: 1,
      default: 0,
      options: SURFACES.map((s, i) => ({ label: s.label, value: i })),
    },
    { key: 'mu', label: 'Friction coefficient', symbol: 'μ', unit: '', min: 0, max: 1, step: 0.01, default: 0.2, visible: (p) => p.surface === 0 },
    { key: 's', label: 'Photogate distance', symbol: 's', unit: 'm', min: 0.2, max: 1.6, step: 0.05, default: 1, hint: 'Measured along the slope from the starting position of the block.' },
  ],
  create: (p) => new InclineSim(p),
  graphs: [
    { key: 'x', label: 'Distance x', unit: 'm', series: [{ label: 'x', get: (s) => s.x }] },
    { key: 'v', label: 'Speed v', unit: 'm/s', series: [{ label: 'v', get: (s) => s.v }] },
  ],
  instruments: { stopwatch: true, ruler: 1, protractor: true },
  tasks,
  lab,
  theory,
});
