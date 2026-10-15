import { fmt } from '../../shared/format';
import { pick } from '../../shared/rng';
import type { TaskDef } from '../types';
import { image, imageDistance } from './model';
import type { LensSim } from './sim';

export const tasks: TaskDef<LensSim>[] = [
  {
    kind: 'choice',
    id: 'between-f-2f',
    level: 1,
    prompt: 'An object stands between F and 2F of a converging lens. What is its image like?',
    options: ['Real, inverted, enlarged', 'Real, inverted, reduced', 'Virtual, upright, enlarged', 'There is no image'],
    correct: 0,
    explain: 'For F < d < 2F the image forms beyond 2F on the other side: f > 2F > d, so |Γ| = f/d > 1. Real images of a single lens are always inverted. This is how a projector works.',
  },
  {
    kind: 'numeric',
    id: 'image-distance',
    level: 1,
    vars: (rng) => {
      const F = pick(rng, 8, 20, 1);
      const d = pick(rng, Math.ceil(1.3 * F), 60, 1);
      return { F, d };
    },
    prompt: (v) => `A converging lens has F = ${v.F} cm. An object stands d = ${v.d} cm in front of it. How far from the lens is the image?`,
    unit: 'cm',
    answer: (v) => imageDistance(v.F!, v.d!),
    tolerance: 0.02,
    explain: (v) => `From 1/F = 1/d + 1/f: f = F·d/(d − F) = ${v.F}·${v.d}/${v.d! - v.F!} ≈ ${fmt(imageDistance(v.F!, v.d!), 1)} cm.`,
  },
  {
    kind: 'numeric',
    id: 'power',
    level: 1,
    vars: (rng) => ({ F: pick(rng, 5, 50, 5), div: rng() < 0.5 ? 1 : 0 }),
    prompt: (v) => `What is the optical power of a ${v.div ? 'diverging' : 'converging'} lens with a focal length of ${v.F} cm? (Give the sign.)`,
    unit: 'dpt',
    answer: (v) => (v.div ? -100 : 100) / v.F!,
    tolerance: 0.02,
    explain: (v) => `D = 1/F with F in metres: ${v.div ? '−' : ''}1/${fmt(v.F! / 100, 2)} m ≈ ${fmt((v.div ? -100 : 100) / v.F!, 1)} dpt. Diverging lenses have negative optical power.`,
  },
  {
    kind: 'target',
    id: 'same-size',
    level: 2,
    prompt: 'With a converging lens of F = 15 cm, obtain a real image exactly the size of the object (|Γ| = 1, ±3%).',
    check: (p) => {
      if (p.type !== 0) return { ok: false, message: 'Choose a converging lens.' };
      if (p.F !== 15) return { ok: false, message: 'Set F = 15 cm.' };
      const img = image(15, p.d!);
      if (!img.exists || !img.real) return { ok: false, message: 'The image is not real. Move the object beyond the focus.' };
      const g = Math.abs(img.m);
      if (Math.abs(g - 1) <= 0.03) return { ok: true };
      return { ok: false, message: `Now |Γ| = ${fmt(g, 2)}. ${g > 1 ? 'Move the object further from the lens.' : 'Move the object closer to the lens.'}` };
    },
    explain: 'Γ = f/d = 1 means f = d. With 1/F = 2/d this gives d = 2F = 30 cm: the image forms at 2F on the other side.',
  },
  {
    kind: 'target',
    id: 'diverging-quarter',
    level: 3,
    prompt: 'With a diverging lens of focal length 10 cm, make the image 4 times smaller than the object (|Γ| = 0.25, ±3%).',
    check: (p) => {
      if (p.type !== 1) return { ok: false, message: 'Choose a diverging lens.' };
      if (p.F !== 10) return { ok: false, message: 'Set the focal length to 10 cm.' };
      const g = Math.abs(image(-10, p.d!).m);
      if (Math.abs(g / 0.25 - 1) <= 0.03) return { ok: true };
      return { ok: false, message: `Now |Γ| = ${fmt(g, 3)}. ${g > 0.25 ? 'Move the object further away.' : 'Move the object closer.'}` };
    },
    explain: 'For a diverging lens F = −10 cm: f = F·d/(d − F) = −10d/(d + 10), so |Γ| = |f|/d = 10/(d + 10). |Γ| = 0.25 gives d = 30 cm. A diverging lens always gives a virtual, upright, reduced image.',
  },
];
