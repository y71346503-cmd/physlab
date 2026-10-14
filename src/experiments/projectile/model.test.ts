import { describe, expect, it } from 'vitest';
import { DEG } from '../../shared/format';
import { analyticFlight, BALLS, optimalAngle, simulateFlight, type ProjPhys } from './model';

const base = (o: Partial<ProjPhys> = {}): ProjPhys => ({ v0: 20, alpha: 45 * DEG, h0: 0, drag: false, m: 0.43, d: 0.22, g: 9.81, ...o });

describe('projectile model', () => {
  it('matches the analytic range, height and time without drag within 0.1%', () => {
    for (const [v0, a, h0] of [
      [10, 30, 0],
      [20, 45, 0],
      [35, 70, 0],
      [15, 20, 12],
      [5, 80, 30],
    ] as const) {
      const p = base({ v0, alpha: a * DEG, h0 });
      const num = simulateFlight(p);
      const ex = analyticFlight(p);
      expect(Math.abs(num.range / ex.range - 1)).toBeLessThan(1e-3);
      expect(Math.abs(num.height / ex.height - 1)).toBeLessThan(1e-3);
      expect(Math.abs(num.time / ex.time - 1)).toBeLessThan(1e-3);
    }
  });

  it('textbook values: L = v0^2 sin 2a / g', () => {
    const ex = analyticFlight(base({ v0: 20, alpha: 45 * DEG }));
    expect(ex.range).toBeCloseTo(400 / 9.81, 6);
    expect(ex.time).toBeCloseTo((2 * 20 * Math.sin(45 * DEG)) / 9.81, 6);
  });

  it('drag shortens the flight and the result converges as the step shrinks', () => {
    const p = base({ v0: 25, drag: true });
    const r1 = simulateFlight(p, 2e-3).range;
    const r2 = simulateFlight(p, 1e-3).range;
    const r3 = simulateFlight(p, 5e-4).range;
    expect(r2).toBeLessThan(analyticFlight(p).range * 0.9);
    expect(Math.abs(r2 - r3)).toBeLessThan(Math.abs(r1 - r2) + 1e-6);
    expect(Math.abs(r2 / r3 - 1)).toBeLessThan(1e-4);
  });

  it('the optimal angle is 45° without drag and smaller with drag', () => {
    expect(optimalAngle(base({ v0: 25 })) / DEG).toBeCloseTo(45, 0);
    const withDrag = optimalAngle(base({ v0: 25, drag: true })) / DEG;
    expect(withDrag).toBeLessThan(43);
    expect(withDrag).toBeGreaterThan(30);
  });

  it('a heavy shot put barely notices the air', () => {
    const shot = BALLS[4]!;
    const p = base({ v0: 13, alpha: 40 * DEG, drag: true, m: shot.m, d: shot.d });
    expect(simulateFlight(p).range / analyticFlight(p).range).toBeGreaterThan(0.98);
  });
});
