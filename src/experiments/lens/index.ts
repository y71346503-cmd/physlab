import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { LensSim } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<LensSim>({
  meta,
  kind: 'static',
  aspect: 0.52,
  params: [
    {
      key: 'type',
      label: 'Lens',
      unit: '',
      type: 'select',
      min: 0,
      max: 1,
      step: 1,
      default: 0,
      options: [
        { label: 'Converging', value: 0 },
        { label: 'Diverging', value: 1 },
      ],
    },
    { key: 'F', label: 'Focal length', symbol: '|F|', unit: 'cm', min: 5, max: 30, step: 0.5, default: 10 },
    { key: 'd', label: 'Object distance', symbol: 'd', unit: 'cm', min: 2, max: 60, step: 0.5, default: 25 },
    { key: 'h', label: 'Object height', symbol: 'h', unit: 'cm', min: 1, max: 6, step: 0.5, default: 3 },
    { key: 's', label: 'Screen position', symbol: 's', unit: 'cm', min: 2, max: 100, step: 0.5, default: 30, hint: 'Distance from the lens to the screen on the right.' },
  ],
  create: (p) => new LensSim(p),
  instruments: { ruler: 0.3 },
  tasks,
  lab,
  theory,
});
