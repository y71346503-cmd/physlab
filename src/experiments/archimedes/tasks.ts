import { G_EARTH, LIQUIDS } from '../../shared/constants';
import { fmt } from '../../shared/format';
import { choose, pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import { solve } from './model';
import { physFrom, type ArchimedesSim } from './sim';

const g = G_EARTH;

export const tasks: TaskDef<ArchimedesSim>[] = [
  {
    kind: 'choice',
    id: 'same-volume',
    level: 1,
    prompt: 'An iron and an aluminium block, each 100 cm³, are fully submerged in water. Which one is pushed up harder?',
    options: ['The iron block', 'The aluminium block', 'They are pushed up equally', 'It depends on the depth'],
    correct: 2,
    explain: 'F_A = ρ_liquid·g·V depends only on the liquid and the submerged volume, not on what the body is made of. The iron block is heavier, so its scale reading stays larger, but the buoyant force is the same.',
  },
  {
    kind: 'numeric',
    id: 'buoyant-force',
    level: 1,
    vars: (rng) => {
      const liquid = choose(rng, [0, 1, 2]);
      return { V: pick(rng, 50, 500, 10), liquid };
    },
    prompt: (v) => `A body of volume ${v.V} cm³ is fully submerged in ${LIQUIDS[v.liquid!]!.label.toLowerCase()} (ρ = ${LIQUIDS[v.liquid!]!.rho} kg/m³). Find the buoyant force (g = 9.81 m/s²).`,
    unit: 'N',
    answer: (v) => LIQUIDS[v.liquid!]!.rho * g * v.V! * 1e-6,
    tolerance: 0.02,
    explain: (v) => `F_A = ρ·g·V = ${LIQUIDS[v.liquid!]!.rho}·9.81·${fmt(v.V! * 1e-6, 6)} m³ ≈ ${fmt(LIQUIDS[v.liquid!]!.rho * g * v.V! * 1e-6, 3)} N. Remember: 1 cm³ = 10⁻⁶ m³.`,
  },
  {
    kind: 'numeric',
    id: 'density-from-scale',
    level: 2,
    vars: (rng) => {
      const rho = choose(rng, [2700, 7800, 8900, 11300, 2000, 3500]);
      const V = pick(rng, 60, 150, 10);
      const P1 = Math.round(rho * V * 1e-6 * g * 100) / 100;
      const P2 = Math.round((rho - 1000) * V * 1e-6 * g * 100) / 100;
      return { P1, P2 };
    },
    prompt: (v) => `A spring scale shows P₁ = ${fmt(v.P1!, 2)} N with a body in air and P₂ = ${fmt(v.P2!, 2)} N when the body is fully in water. Find the density of the body.`,
    unit: 'kg/m³',
    answer: (v) => (1000 * v.P1!) / (v.P1! - v.P2!),
    tolerance: 0.03,
    explain: (v) =>
      `F_A = P₁ − P₂ = ρ_w·g·V, and P₁ = ρ·g·V. Dividing: ρ = ρ_w·P₁/(P₁ − P₂) = 1000·${fmt(v.P1!, 2)}/${fmt(v.P1! - v.P2!, 2)} ≈ ${fmt((1000 * v.P1!) / (v.P1! - v.P2!), 0)} kg/m³.`,
  },
  {
    kind: 'target',
    id: 'iron-floats',
    level: 2,
    prompt: 'Make an iron body (7800 kg/m³) float freely: choose a suitable liquid and lower the scale until the string goes slack.',
    check: (p) => {
      if (p.rhoB !== 7800) return { ok: false, message: 'Set the body density to 7800 kg/m³ (iron).' };
      const st = solve(physFrom(p));
      if (!st.floats) return { ok: false, message: 'In this liquid iron sinks. A liquid denser than iron is needed.' };
      if (!st.slack) return { ok: false, message: 'Iron can float here. Lower the body further until the string goes slack.' };
      return { ok: true };
    },
    explain: 'A body floats when its density is less than the liquid density. Mercury (13 600 kg/m³) is denser than iron, so iron floats in it with 7800/13 600 ≈ 57% of its volume submerged.',
  },
  {
    kind: 'target',
    id: 'half-weight',
    level: 3,
    prompt: 'In water, with the body fully submerged, make the scale show exactly half of the body weight in air (±2%). Choose the body density.',
    check: (p) => {
      if (p.rhoL !== 1000) return { ok: false, message: 'Choose water (1000 kg/m³).' };
      const st = solve(physFrom(p));
      if (!st.fullySubmerged || st.slack) return { ok: false, message: 'Lower the body until it is completely under water (and still hangs on the string).' };
      const ratio = st.tension / st.weight;
      if (Math.abs(ratio - 0.5) <= 0.01) return { ok: true };
      return { ok: false, message: `Now the scale shows ${fmt(ratio * 100, 1)}% of the weight. ${ratio > 0.5 ? 'Choose a lighter material.' : 'Choose a denser material.'}` };
    },
    explain: 'In water the reading is P − ρ_w·g·V = ρ·g·V − ρ_w·g·V. Half of the weight means ρ − ρ_w = ρ/2, so ρ = 2ρ_w = 2000 kg/m³.',
  },
];
