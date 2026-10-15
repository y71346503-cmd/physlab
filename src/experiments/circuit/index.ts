import { LAMP } from '../../shared/constants';
import { defineExperiment } from '../types';
import { lab } from './lab';
import { meta } from './meta';
import { SCHEMES } from './model';
import { AMMETER_POS, AMMETER_RANGES, CircuitSim, hasElement, METER_CLASS, VOLTMETER_POS, VOLTMETER_RANGES } from './sim';
import { tasks } from './tasks';
import theory from './theory.en.md';

export default defineExperiment<CircuitSim>({
  meta,
  kind: 'static',
  aspect: 0.6,
  params: [
    { key: 'scheme', label: 'Circuit', unit: '', type: 'select', min: 0, max: 3, step: 1, default: 0, options: SCHEMES.map((s, i) => ({ label: s, value: i })) },
    { key: 'emf', label: 'EMF of the source', symbol: 'ε', unit: 'V', min: 0, max: 12, step: 0.1, default: 4.5 },
    { key: 'r', label: 'Internal resistance', symbol: 'r', unit: 'Ω', min: 0, max: 5, step: 0.1, default: 0.5 },
    {
      key: 'elem',
      label: 'Element 1',
      unit: '',
      type: 'select',
      min: 0,
      max: 1,
      step: 1,
      default: 0,
      options: [
        { label: 'Resistor R1', value: 0 },
        { label: `Lamp ${LAMP.ratedU} V, ${LAMP.ratedI} A`, value: 1 },
      ],
    },
    { key: 'R1', label: 'Resistance R1', symbol: 'R₁', unit: 'Ω', min: 1, max: 100, step: 1, default: 10, visible: (p) => p.elem === 0 },
    { key: 'R2', label: 'Resistance R2', symbol: 'R₂', unit: 'Ω', min: 1, max: 100, step: 1, default: 20, visible: (p) => p.scheme! >= 1 },
    { key: 'R3', label: 'Resistance R3', symbol: 'R₃', unit: 'Ω', min: 1, max: 100, step: 1, default: 30, visible: (p) => p.scheme === 3 },
    {
      key: 'amm',
      label: 'Ammeter',
      unit: '',
      type: 'select',
      min: 0,
      max: 3,
      step: 1,
      default: 0,
      options: AMMETER_POS.map((label, value) => ({ label, value })),
      optionAvailable: (value, p) => value === 0 || hasElement(p.scheme!, value),
    },
    {
      key: 'volt',
      label: 'Voltmeter',
      unit: '',
      type: 'select',
      min: 0,
      max: 3,
      step: 1,
      default: 1,
      options: VOLTMETER_POS.map((label, value) => ({ label, value })),
      optionAvailable: (value, p) => value === 0 || hasElement(p.scheme!, value),
    },
  ],
  create: (p) => new CircuitSim(p),
  instruments: {
    meters: [
      { id: 'amm', kind: 'ammeter', label: 'Ammeter', unit: 'A', ranges: AMMETER_RANGES, accuracyClass: METER_CLASS, value: (s) => s.ammeterValue() },
      { id: 'volt', kind: 'voltmeter', label: 'Voltmeter', unit: 'V', ranges: VOLTMETER_RANGES, accuracyClass: METER_CLASS, value: (s) => s.voltmeterValue() },
    ],
  },
  tasks,
  lab,
  theory,
});
