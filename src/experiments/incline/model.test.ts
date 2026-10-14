import { describe, expect, it } from 'vitest';
import { DEG } from '../../shared/format';
import { forces, timeToSlide } from './model';
import { InclineSim } from './sim';

describe('incline model', () => {
  it('acceleration is g(sin a - mu cos a)', () => {
    const f = forces({ alpha: 30 * DEG, m: 2, mu: 0.2, g: 9.81 });
    expect(f.moves).toBe(true);
    expect(f.a).toBeCloseTo(9.81 * (0.5 - 0.2 * Math.cos(30 * DEG)), 10);
    expect(f.normal).toBeCloseTo(2 * 9.81 * Math.cos(30 * DEG), 10);
  });

  it('the block rests when tan a <= mu, with static friction mg sin a', () => {
    const f = forces({ alpha: 20 * DEG, m: 1, mu: 0.4, g: 9.81 });
    expect(f.moves).toBe(false);
    expect(f.a).toBe(0);
    expect(f.friction).toBeCloseTo(9.81 * Math.sin(20 * DEG), 10);
    expect(timeToSlide({ alpha: 20 * DEG, m: 1, mu: 0.4, g: 9.81 }, 1)).toBe(Infinity);
  });

  it('the simulated photogate time matches sqrt(2s/a)', () => {
    const sim = new InclineSim({ alpha: 35, m: 1, surface: 0, mu: 0.25, s: 1.2 });
    while (!sim.done) sim.step(1e-3);
    expect(sim.tGate).not.toBeNull();
    expect(Math.abs(sim.tGate! / timeToSlide(sim.phys, 1.2) - 1)).toBeLessThan(1e-9);
  });
});
