import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { BALLS } from './model';
import { ProjectileSim } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<ProjectileSim>({
  meta,
  kind: 'dynamic',
  dt: 1 / 1000,
  aspect: 0.56,
  params: [
    { key: 'v0', label: 'Launch speed', symbol: 'v₀', unit: 'm/s', min: 1, max: 40, step: 0.1, default: 15 },
    { key: 'alpha', label: 'Launch angle', symbol: 'α', unit: '°', min: 0, max: 90, step: 1, default: 45 },
    { key: 'h0', label: 'Launch height', symbol: 'h₀', unit: 'm', min: 0, max: 30, step: 0.5, default: 0 },
    { key: 'drag', label: 'Air resistance', unit: '', type: 'toggle', min: 0, max: 1, step: 1, default: 0, hint: 'Quadratic drag F = ½·ρ·C·S·v², ρ = 1.204 kg/m³, C = 0.47.' },
    {
      key: 'ball',
      label: 'Ball',
      unit: '',
      type: 'select',
      min: 0,
      max: BALLS.length - 1,
      step: 1,
      default: 2,
      options: BALLS.map((b, i) => ({ label: `${b.label} (${b.m < 0.1 ? `${Math.round(b.m * 1000 * 10) / 10} g` : `${b.m} kg`}, ⌀ ${Math.round(b.d * 100 * 10) / 10} cm)`, value: i })),
      visible: (p) => p.drag === 1,
    },
  ],
  create: (p, prev) => new ProjectileSim(p, prev),
  graphs: [
    { key: 'y', label: 'Height y', unit: 'm', series: [{ label: 'y', get: (s) => s.y }] },
    { key: 'x', label: 'Distance x', unit: 'm', series: [{ label: 'x', get: (s) => s.x }] },
    {
      key: 'v',
      label: 'Velocity components',
      unit: 'm/s',
      series: [
        { label: 'vx', get: (s) => s.vx },
        { label: 'vy', get: (s) => s.vy },
      ],
    },
    { key: 'speed', label: 'Speed v', unit: 'm/s', series: [{ label: 'v', get: (s) => Math.hypot(s.vx, s.vy) }] },
  ],
  instruments: { stopwatch: true, ruler: 10, protractor: true },
  tasks,
  lab,
  theory,
});
