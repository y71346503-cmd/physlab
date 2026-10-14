import { describe, expect, it } from 'vitest';
import { DEG } from '../../shared/format';
import { energies, exactPeriod, initialState, simulatedPeriod, smallAnglePeriod, step, type PendulumPhys } from './model';

const phys = (L: number, g = 9.81, gamma = 0): PendulumPhys => ({ L, m: 0.5, g, gamma });

describe('pendulum model', () => {
  it('small-angle period matches 2π√(L/g) within 0.1%', () => {
    for (const L of [0.25, 1, 2.5]) {
      const T = simulatedPeriod(2 * DEG, phys(L), 1e-3, 10);
      expect(Math.abs(T / smallAnglePeriod(L, 9.81) - 1)).toBeLessThan(1e-3);
    }
  });

  it('large-angle period matches the elliptic-integral formula within 0.1%', () => {
    for (const deg of [30, 60, 90]) {
      const T = simulatedPeriod(deg * DEG, phys(1), 1e-3, 10);
      expect(Math.abs(T / exactPeriod(1, 9.81, deg * DEG) - 1)).toBeLessThan(1e-3);
    }
  });

  it('the exact period is longer than T0 at large angles', () => {
    expect(exactPeriod(1, 9.81, 90 * DEG) / smallAnglePeriod(1, 9.81)).toBeCloseTo(1.18034, 4);
    expect(exactPeriod(1, 9.81, 10 * DEG) / smallAnglePeriod(1, 9.81)).toBeCloseTo(1.0019, 4);
  });

  it('conserves energy within 0.5% over 60 s without damping', () => {
    for (const [L, deg] of [
      [0.1, 30],
      [1, 60],
      [2.5, 90],
    ] as const) {
      const p = phys(L);
      const s = initialState(deg * DEG, p);
      const e0 = energies(s, p).total;
      let worst = 0;
      while (s.t < 60) {
        step(s, p, 1e-3);
        worst = Math.max(worst, Math.abs(energies(s, p).total / e0 - 1));
      }
      expect(worst).toBeLessThan(0.005);
    }
  });

  it('damping removes energy', () => {
    const p = phys(1, 9.81, 0.2);
    const s = initialState(20 * DEG, p);
    const e0 = energies(s, p).total;
    while (s.t < 20) step(s, p, 1e-3);
    expect(energies(s, p).total).toBeLessThan(e0 * 0.05);
  });

  it('period does not depend on mass', () => {
    const a = simulatedPeriod(5 * DEG, { L: 1, m: 0.1, g: 9.81, gamma: 0 }, 1e-3, 5);
    const b = simulatedPeriod(5 * DEG, { L: 1, m: 2, g: 9.81, gamma: 0 }, 1e-3, 5);
    expect(a).toBeCloseTo(b, 10);
  });
});
