import { LIQUIDS, MATERIALS } from '../../shared/constants';
import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { ArchimedesSim, DYNAMOMETER_RANGES } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<ArchimedesSim>({
  meta,
  kind: 'static',
  aspect: 0.62,
  params: [
    {
      key: 'rhoL',
      label: 'Liquid density',
      symbol: 'ρ_l',
      unit: 'kg/m³',
      min: 500,
      max: 14000,
      step: 10,
      default: 1000,
      presets: LIQUIDS.map((l) => ({ label: l.label, value: l.rho })),
    },
    {
      key: 'rhoB',
      label: 'Body density',
      symbol: 'ρ_b',
      unit: 'kg/m³',
      min: 100,
      max: 20000,
      step: 10,
      default: 2700,
      presets: MATERIALS.map((m) => ({ label: m.label, value: m.rho })),
    },
    { key: 'V', label: 'Body volume', symbol: 'V', unit: 'cm³', min: 10, max: 150, step: 5, default: 100 },
    {
      key: 'depth',
      label: 'Immersion depth',
      symbol: 'h',
      unit: 'cm',
      min: 0,
      max: 7,
      step: 0.1,
      default: 0,
      hint: 'How far the bottom of the body is lowered below the liquid surface.',
    },
  ],
  create: (p) => new ArchimedesSim(p),
  instruments: {
    ruler: 0.2,
    meters: [
      {
        id: 'dyn',
        kind: 'dynamometer',
        label: 'Spring scale',
        unit: 'N',
        ranges: DYNAMOMETER_RANGES,
        accuracyClass: 1.5,
        value: (s) => s.st.tension,
        // The scale is chosen to fit the weight of the body, as in a real lab.
        rangeRef: (s) => s.st.weight,
      },
    ],
  },
  tasks,
  lab,
  theory,
});
