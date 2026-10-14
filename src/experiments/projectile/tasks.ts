import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import { optimalAngle } from './model';
import { physFrom, type ProjectileSim } from './sim';

const g = G_EARTH;

export const tasks: TaskDef<ProjectileSim>[] = [
  {
    kind: 'choice',
    id: 'best-angle',
    level: 1,
    prompt: 'Without air resistance, which launch angle gives the longest range if the ball lands at the launch height?',
    options: ['30°', '45°', '60°', 'It depends on the speed'],
    correct: 1,
    explain: 'L = v₀²·sin 2α / g is largest when sin 2α = 1, that is at α = 45°. Angles that add up to 90° (30° and 60°) give the same range.',
  },
  {
    kind: 'numeric',
    id: 'range',
    level: 1,
    vars: (rng) => ({ v: pick(rng, 8, 30, 1), a: pick(rng, 20, 70, 5) }),
    prompt: (v) => `A ball is launched from the ground at v₀ = ${v.v} m/s and α = ${v.a}° without air resistance (g = 9.81 m/s²). How far does it fly?`,
    unit: 'm',
    answer: (v) => (v.v! * v.v! * Math.sin(2 * v.a! * DEG)) / g,
    tolerance: 0.02,
    explain: (v) => `L = v₀²·sin 2α / g = ${v.v}²·sin ${2 * v.a!}° / 9.81 ≈ ${fmt((v.v! * v.v! * Math.sin(2 * v.a! * DEG)) / g, 1)} m.`,
  },
  {
    kind: 'numeric',
    id: 'height',
    level: 2,
    vars: (rng) => ({ v: pick(rng, 8, 30, 1), a: pick(rng, 30, 80, 5) }),
    prompt: (v) => `A ball is launched at v₀ = ${v.v} m/s and α = ${v.a}° without air resistance. Find the maximum height above the launch point.`,
    unit: 'm',
    answer: (v) => (v.v! * Math.sin(v.a! * DEG)) ** 2 / (2 * g),
    tolerance: 0.02,
    explain: (v) => {
      const vy = v.v! * Math.sin(v.a! * DEG);
      return `At the top the vertical velocity is zero: H = (v₀·sin α)²/(2g) = ${fmt(vy, 2)}²/19.62 ≈ ${fmt((vy * vy) / (2 * g), 2)} m.`;
    },
  },
  {
    kind: 'target',
    id: 'hit-target',
    level: 2,
    prompt: 'Hit the target: launch from the ground at α = 30° without air resistance so that the ball lands 20.0 m away (±0.3 m). Choose the speed and press Start.',
    check: (p, sim) => {
      if (p.drag === 1) return { ok: false, message: 'Switch off air resistance.' };
      if (p.alpha !== 30) return { ok: false, message: 'Set the launch angle to 30°.' };
      if (p.h0 !== 0) return { ok: false, message: 'Launch from the ground (h₀ = 0).' };
      if (sim.range === null) return { ok: false, message: 'Launch the ball and let it land first.' };
      if (Math.abs(sim.range - 20) <= 0.3) return { ok: true };
      return { ok: false, message: `The ball landed at ${fmt(sim.range, 2)} m. ${sim.range < 20 ? 'Increase' : 'Decrease'} the speed.` };
    },
    explain: 'v₀ = √(L·g / sin 2α) = √(20·9.81 / sin 60°) ≈ 15.1 m/s.',
  },
  {
    kind: 'target',
    id: 'drag-angle',
    level: 3,
    prompt:
      'With air resistance the best angle is no longer 45°. Kick a football (air resistance on) from the ground at 25 m/s and find the angle with the longest range. An angle within 2° of the optimum counts.',
    check: (p) => {
      if (p.drag !== 1) return { ok: false, message: 'Switch on air resistance.' };
      if (p.ball !== 2) return { ok: false, message: 'Choose the football.' };
      if (p.v0 !== 25) return { ok: false, message: 'Set the speed to 25 m/s.' };
      if (p.h0 !== 0) return { ok: false, message: 'Launch from the ground (h₀ = 0).' };
      const best = optimalAngle(physFrom(p)) / DEG;
      if (Math.abs(p.alpha! - best) <= 2) return { ok: true, message: `The optimum is about ${fmt(best, 1)}°.` };
      return { ok: false, message: 'Not the best angle yet. Compare the ranges of several launches: the dashed lines keep the previous throws.' };
    },
    explain:
      'Drag grows as v², so a long flight costs a lot of speed. A flatter trajectory spends less time in the air, so the optimum for a football at 25 m/s is noticeably below 45° (about 40°).',
  },
];
