import { WORLDS } from '../../shared/constants';
import { DEG } from '../../shared/format';
import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { energies } from './model';
import { PendulumSim } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<PendulumSim>({
  meta,
  kind: 'dynamic',
  dt: 1 / 1000,
  aspect: 0.62,
  params: [
    { key: 'L', label: 'Length', symbol: 'L', unit: 'm', min: 0.1, max: 2.5, step: 0.01, default: 1 },
    { key: 'm', label: 'Bob mass', symbol: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, default: 0.5 },
    { key: 'theta0', label: 'Release angle', symbol: 'θ₀', unit: '°', min: 1, max: 90, step: 1, default: 10 },
    {
      key: 'world',
      label: 'Location',
      unit: '',
      type: 'select',
      min: 0,
      max: WORLDS.length - 1,
      step: 1,
      default: 0,
      options: WORLDS.map((w, i) => ({ label: w.hidden ? w.label : `${w.label} (g = ${w.g} m/s²)`, value: i })),
    },
    {
      key: 'gamma',
      label: 'Damping',
      symbol: 'γ',
      unit: '1/s',
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0,
      hint: '0 means no air resistance. The model: θ″ = −(g/L)·sin θ − γ·θ′.',
    },
  ],
  create: (p) => new PendulumSim(p),
  graphs: [
    { key: 'angle', label: 'Angle θ', unit: '°', series: [{ label: 'θ', get: (s) => s.theta / DEG }] },
    { key: 'x', label: 'Displacement x', unit: 'm', series: [{ label: 'x', get: (s) => s.phys.L * Math.sin(s.theta) }] },
    { key: 'v', label: 'Velocity v', unit: 'm/s', series: [{ label: 'v', get: (s) => s.phys.L * s.omega }] },
    {
      key: 'energy',
      label: 'Energy',
      unit: 'J',
      series: [
        { label: 'Kinetic', get: (s) => energies(s, s.phys).kinetic },
        { label: 'Potential', get: (s) => energies(s, s.phys).potential },
        { label: 'Total', get: (s) => energies(s, s.phys).total },
      ],
    },
  ],
  instruments: { stopwatch: true, ruler: 1, protractor: true },
  tasks,
  lab,
  theory,
});
