import { LAMP } from '../../shared/constants';
import { fmt } from '../../shared/format';
import { pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import type { CircuitSim } from './sim';

const RATED_P = LAMP.ratedU * LAMP.ratedI;

export const tasks: TaskDef<CircuitSim>[] = [
  {
    kind: 'choice',
    id: 'parallel',
    level: 1,
    prompt: 'Two resistors are connected in parallel. Which statement is true?',
    options: [
      'The same current flows through both',
      'The voltage across both is the same',
      'The total resistance is the sum of the two',
      'The voltage divides in proportion to the resistances',
    ],
    correct: 1,
    explain:
      'In parallel both resistors are connected to the same two nodes, so U₁ = U₂. The currents add up, I = I₁ + I₂, and 1/R = 1/R₁ + 1/R₂, so the total is smaller than either resistor. Check it with the voltmeter in the parallel circuit.',
  },
  {
    kind: 'numeric',
    id: 'full-ohm',
    level: 1,
    vars: (rng) => ({ E: pick(rng, 3, 12, 0.5), r: pick(rng, 0.5, 2, 0.5), R: pick(rng, 4, 30, 1) }),
    prompt: (v) => `A source with EMF ε = ${fmt(v.E!, 1)} V and internal resistance r = ${fmt(v.r!, 1)} Ω is connected to a resistor R = ${v.R} Ω. Find the current.`,
    unit: 'A',
    answer: (v) => v.E! / (v.R! + v.r!),
    tolerance: 0.02,
    explain: (v) => `Ohm's law for a complete circuit: I = ε/(R + r) = ${fmt(v.E!, 1)}/(${v.R} + ${fmt(v.r!, 1)}) ≈ ${fmt(v.E! / (v.R! + v.r!), 3)} A.`,
  },
  {
    kind: 'numeric',
    id: 'parallel-r',
    level: 2,
    vars: (rng) => ({ a: pick(rng, 4, 60, 2), b: pick(rng, 4, 60, 2) }),
    prompt: (v) => `Resistors R₁ = ${v.a} Ω and R₂ = ${v.b} Ω are connected in parallel. Find the total resistance.`,
    unit: 'Ω',
    answer: (v) => (v.a! * v.b!) / (v.a! + v.b!),
    tolerance: 0.02,
    explain: (v) => `1/R = 1/R₁ + 1/R₂, so R = R₁R₂/(R₁ + R₂) = ${v.a}·${v.b}/${v.a! + v.b!} ≈ ${fmt((v.a! * v.b!) / (v.a! + v.b!), 2)} Ω.`,
  },
  {
    kind: 'target',
    id: 'divider',
    level: 2,
    prompt:
      'Voltage divider: in the series circuit with ε = 6.0 V and r = 0 (two resistors), choose R1 and R2 so that the current is 0.20 A and the voltage across R1 is 4.0 V (both ±2%).',
    check: (p, sim) => {
      if (p.scheme !== 1) return { ok: false, message: 'Choose the series circuit.' };
      if (p.elem !== 0) return { ok: false, message: 'Element 1 must be a resistor.' };
      if (Math.abs(p.emf! - 6) > 1e-9 || p.r !== 0) return { ok: false, message: 'Set ε = 6.0 V and r = 0.' };
      const I = Math.abs(sim.state.sol.Isource);
      const U1 = Math.abs(sim.state.U.e1!);
      if (Math.abs(I - 0.2) <= 0.004 && Math.abs(U1 - 4) <= 0.08) return { ok: true };
      return { ok: false, message: `Now I = ${fmt(I, 3)} A and U₁ = ${fmt(U1, 2)} V.` };
    },
    explain: 'The total resistance is ε/I = 6/0.2 = 30 Ω, and R1 = U₁/I = 4/0.2 = 20 Ω, so R2 = 10 Ω.',
  },
  {
    kind: 'target',
    id: 'lamp-rated',
    level: 3,
    prompt: `The lamp is rated ${LAMP.ratedU} V, ${LAMP.ratedI} A. In the series circuit with element 1 = lamp, ε = 9.0 V and r = 0.5 Ω, choose R2 so that the lamp works at its rated power ${fmt(RATED_P, 2)} W (±5%).`,
    check: (p, sim) => {
      if (p.scheme !== 1) return { ok: false, message: 'Choose the series circuit.' };
      if (p.elem !== 1) return { ok: false, message: 'Make element 1 a lamp.' };
      if (Math.abs(p.emf! - 9) > 1e-9 || Math.abs(p.r! - 0.5) > 1e-9) return { ok: false, message: 'Set ε = 9.0 V and r = 0.5 Ω.' };
      const P = sim.state.lamp!.P;
      if (Math.abs(P / RATED_P - 1) <= 0.05) return { ok: true };
      return { ok: false, message: `The lamp now uses ${fmt(P, 2)} W. ${P > RATED_P ? 'Increase' : 'Decrease'} R2.` };
    },
    explain: `At rated power the lamp takes ${LAMP.ratedI} A at ${LAMP.ratedU} V. The rest of the EMF, 9 − 6.3 = 2.7 V, must drop on R2 and r: R2 + r = 2.7/0.3 = 9 Ω, so R2 ≈ 8.5 Ω (8 or 9 Ω on the slider).`,
  },
];
