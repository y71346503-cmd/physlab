import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { choose, pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import { exactPeriod, smallAnglePeriod } from './model';
import { physFrom, type PendulumSim } from './sim';

export const tasks: TaskDef<PendulumSim>[] = [
  {
    kind: 'choice',
    id: 'mass',
    level: 1,
    prompt: 'The bob of a pendulum is replaced by one twice as heavy; the length and the small amplitude stay the same. How does the period change?',
    options: ['It doubles', 'It grows by a factor of √2', 'It does not change', 'It halves'],
    correct: 2,
    explain:
      'T = 2π√(L/g) contains no mass. Gravity mg and the inertia m grow together, so the acceleration does not depend on m. Try it: change the mass in the simulation and measure the period.',
  },
  {
    kind: 'numeric',
    id: 'period',
    level: 1,
    vars: (rng) => ({ L: pick(rng, 0.3, 2.0, 0.1) }),
    prompt: (v) => `A pendulum is ${fmt(v.L!, 1)} m long and swings with a small amplitude on Earth (g = 9.81 m/s²). Find its period.`,
    unit: 's',
    answer: (v) => smallAnglePeriod(v.L!, G_EARTH),
    tolerance: 0.02,
    explain: (v) =>
      `T = 2π√(L/g) = 2π·√(${fmt(v.L!, 1)} / 9.81) ≈ ${fmt(smallAnglePeriod(v.L!, G_EARTH), 2)} s. The formula is accurate for amplitudes below about 15°.`,
  },
  {
    kind: 'target',
    id: 'seconds-pendulum',
    level: 2,
    prompt: 'Build a "seconds pendulum": on Earth, choose a length so that the period is 2.00 s (±1%). Each swing from one side to the other then takes one second.',
    check: (p) => {
      if (p.world !== 0) return { ok: false, message: 'Choose Earth as the location.' };
      const ph = physFrom(p);
      const T = exactPeriod(ph.L, ph.g, p.theta0! * DEG);
      if (Math.abs(T - 2) <= 0.02) return { ok: true };
      return { ok: false, message: `The period is now ${fmt(T, 3)} s. ${T > 2 ? 'Make the pendulum shorter.' : 'Make the pendulum longer.'}` };
    },
    explain: 'From T = 2π√(L/g): L = gT²/(4π²) = 9.81·2.00²/39.48 ≈ 0.99 m. Small amplitude matters: at large angles the period grows.',
  },
  {
    kind: 'numeric',
    id: 'find-g',
    level: 2,
    vars: (rng) => {
      const L = pick(rng, 0.5, 2.0, 0.1);
      const N = choose(rng, [10, 15, 20, 25, 30]);
      const t = Math.round(N * smallAnglePeriod(L, G_EARTH) * 10) / 10;
      return { L, N, t };
    },
    prompt: (v) => `A pendulum ${fmt(v.L!, 1)} m long makes N = ${v.N} full oscillations in t = ${fmt(v.t!, 1)} s. Find the free-fall acceleration g.`,
    unit: 'm/s²',
    answer: (v) => (4 * Math.PI * Math.PI * v.L! * v.N! * v.N!) / (v.t! * v.t!),
    tolerance: 0.02,
    explain: (v) => {
      const T = v.t! / v.N!;
      return `T = t/N = ${fmt(v.t!, 1)}/${v.N} = ${fmt(T, 3)} s, then g = 4π²L/T² = 39.48·${fmt(v.L!, 1)}/${fmt(T, 3)}² ≈ ${fmt((4 * Math.PI ** 2 * v.L!) / (T * T), 2)} m/s².`;
    },
  },
  {
    kind: 'target',
    id: 'large-amplitude',
    level: 3,
    prompt:
      'Large swings are slower. On Earth with L = 1.00 m, find a release angle at which the true period is 5% longer than 2π√(L/g) (T/T₀ = 1.050 ± 0.004).',
    check: (p) => {
      if (p.world !== 0) return { ok: false, message: 'Choose Earth as the location.' };
      if (Math.abs(p.L! - 1) > 1e-9) return { ok: false, message: 'Set the length to exactly 1.00 m.' };
      const ph = physFrom(p);
      const ratio = exactPeriod(ph.L, ph.g, p.theta0! * DEG) / smallAnglePeriod(ph.L, ph.g);
      if (Math.abs(ratio - 1.05) <= 0.004) return { ok: true };
      return { ok: false, message: `Now T/T₀ = ${fmt(ratio, 3)}. ${ratio < 1.05 ? 'Increase the angle.' : 'Decrease the angle.'}` };
    },
    explain:
      'The exact period is T = 4√(L/g)·K(sin(θ₀/2)), where K is the complete elliptic integral. For moderate angles T/T₀ ≈ 1 + θ₀²/16, which reaches 1.05 near θ₀ ≈ 50°.',
  },
];
