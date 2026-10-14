import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import { forces } from './model';
import type { InclineSim } from './sim';

const g = G_EARTH;

export const tasks: TaskDef<InclineSim>[] = [
  {
    kind: 'choice',
    id: 'static-friction',
    level: 1,
    prompt: 'A block rests on a slope and does not slide. What is the friction force on it?',
    options: ['μ·m·g·cos α', 'm·g·sin α', 'μ·m·g', 'Zero: nothing moves'],
    correct: 1,
    explain:
      'At rest the forces balance: static friction exactly cancels the component of gravity along the slope, F = m·g·sin α. The value μ·m·g·cos α is only the largest possible static friction.',
  },
  {
    kind: 'numeric',
    id: 'acceleration',
    level: 1,
    vars: (rng) => ({ a: pick(rng, 25, 50, 5), mu: pick(rng, 0.1, 0.3, 0.05) }),
    prompt: (v) => `A block slides down a slope of α = ${v.a}° with friction coefficient μ = ${fmt(v.mu!, 2)}. Find its acceleration (g = 9.81 m/s²).`,
    unit: 'm/s²',
    answer: (v) => g * (Math.sin(v.a! * DEG) - v.mu! * Math.cos(v.a! * DEG)),
    tolerance: 0.02,
    explain: (v) =>
      `ma = mg·sin α − μmg·cos α, so a = g(sin α − μ·cos α) = 9.81·(${fmt(Math.sin(v.a! * DEG), 3)} − ${fmt(v.mu!, 2)}·${fmt(Math.cos(v.a! * DEG), 3)}) ≈ ${fmt(g * (Math.sin(v.a! * DEG) - v.mu! * Math.cos(v.a! * DEG)), 2)} m/s². The mass cancels.`,
  },
  {
    kind: 'target',
    id: 'critical-angle',
    level: 2,
    prompt: 'Choose the custom surface with μ = 0.40. Find the largest whole-degree angle at which the block still stays at rest.',
    check: (p) => {
      if (p.surface !== 0) return { ok: false, message: 'Choose the custom surface.' };
      if (Math.abs(p.mu! - 0.4) > 1e-9) return { ok: false, message: 'Set μ = 0.40.' };
      const rest = !forces({ alpha: p.alpha! * DEG, m: 1, mu: 0.4, g }).moves;
      const nextRest = !forces({ alpha: (p.alpha! + 1) * DEG, m: 1, mu: 0.4, g }).moves;
      if (rest && !nextRest) return { ok: true };
      return { ok: false, message: rest ? 'The block is at rest, but a steeper slope still holds it.' : 'At this angle the block slides. Make the slope less steep.' };
    },
    explain: 'The block starts to slide when tan α > μ. tan α = 0.40 gives α ≈ 21.8°, so 21° is the last whole angle at rest.',
  },
  {
    kind: 'target',
    id: 'one-second',
    level: 2,
    prompt: 'Put the photogate at s = 1.00 m and make the block reach it in 1.00 s (±0.03 s). Use the custom surface with any μ and angle, then press Start.',
    check: (p, sim) => {
      if (p.surface !== 0) return { ok: false, message: 'Use the custom surface.' };
      if (Math.abs(p.s! - 1) > 1e-9) return { ok: false, message: 'Put the gate at s = 1.00 m.' };
      if (sim.tGate === null) return { ok: false, message: 'Release the block (Start) and let it pass the gate.' };
      if (Math.abs(sim.tGate - 1) <= 0.03) return { ok: true };
      return { ok: false, message: `The block reached the gate in ${fmt(sim.tGate, 3)} s. ${sim.tGate > 1 ? 'It needs a larger acceleration.' : 'It needs a smaller acceleration.'}` };
    },
    explain: 'From s = at²/2 the acceleration must be a = 2s/t² = 2 m/s². For example, μ = 0.20 and α = 23° give a = 9.81·(sin 23° − 0.2·cos 23°) ≈ 2.03 m/s².',
  },
  {
    kind: 'numeric',
    id: 'find-mu',
    level: 3,
    vars: (rng) => {
      const a = pick(rng, 25, 45, 5);
      const mu = pick(rng, 0.1, 0.35, 0.05);
      const s = pick(rng, 0.8, 1.6, 0.2);
      const acc = g * (Math.sin(a * DEG) - mu * Math.cos(a * DEG));
      return { a, s, t: Math.round(Math.sqrt((2 * s) / acc) * 100) / 100 };
    },
    prompt: (v) => `Released from rest on a ${v.a}° slope, a block slides s = ${fmt(v.s!, 1)} m in t = ${fmt(v.t!, 2)} s. Find the friction coefficient μ.`,
    unit: '',
    answer: (v) => Math.tan(v.a! * DEG) - (2 * v.s!) / (v.t! * v.t! * g * Math.cos(v.a! * DEG)),
    tolerance: 0.04,
    explain: (v) => {
      const acc = (2 * v.s!) / (v.t! * v.t!);
      return `a = 2s/t² = ${fmt(acc, 3)} m/s². From a = g(sin α − μ cos α): μ = tan α − a/(g·cos α) = ${fmt(Math.tan(v.a! * DEG), 3)} − ${fmt(acc / (g * Math.cos(v.a! * DEG)), 3)} ≈ ${fmt(Math.tan(v.a! * DEG) - acc / (g * Math.cos(v.a! * DEG)), 3)}.`;
    },
  },
];
