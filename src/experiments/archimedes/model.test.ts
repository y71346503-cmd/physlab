import { describe, expect, it } from 'vitest';
import { CYL_AREA, solve, V_LIQUID, type ArchPhys } from './model';

const p = (o: Partial<ArchPhys>): ArchPhys => ({ rhoBody: 2700, rhoLiquid: 1000, V: 100, depth: 0, g: 9.81, ...o });

describe('Archimedes model', () => {
  it('buoyant force is rho g V for a fully submerged body', () => {
    const st = solve(p({ depth: 6 }));
    expect(st.fullySubmerged).toBe(true);
    expect(st.buoyancy).toBeCloseTo(1000 * 9.81 * 100e-6, 12);
    expect(st.tension).toBeCloseTo((2700 - 1000) * 9.81 * 100e-6, 12);
  });

  it('does not depend on the material of the body', () => {
    const iron = solve(p({ rhoBody: 7800, depth: 6 }));
    const alu = solve(p({ rhoBody: 2700, depth: 6 }));
    expect(iron.buoyancy).toBeCloseTo(alu.buoyancy, 12);
  });

  it('partial immersion: force proportional to the submerged volume', () => {
    const st = solve(p({ depth: 2 }));
    const side = Math.cbrt(100);
    expect(st.Vsub).toBeCloseTo(side * side * 2, 12);
    expect(st.buoyancy).toBeCloseTo(1000 * 9.81 * st.Vsub * 1e-6, 12);
  });

  it('the cylinder level rises by the submerged volume', () => {
    const st = solve(p({ depth: 6 }));
    expect(st.reading).toBeCloseTo(V_LIQUID + 100, 9);
    expect(st.level).toBeCloseTo((V_LIQUID + 100) / CYL_AREA, 12);
  });

  it('a lighter body floats with the fraction rho_b/rho_l submerged', () => {
    const ice = solve(p({ rhoBody: 900, depth: 7 }));
    expect(ice.floats).toBe(true);
    expect(ice.slack).toBe(true);
    expect(ice.tension).toBe(0);
    expect(ice.Vsub / 100).toBeCloseTo(0.9, 12);
    expect(ice.buoyancy).toBeCloseTo(ice.weight, 12);
    const iron = solve(p({ rhoBody: 7800, rhoLiquid: 13600, depth: 7 }));
    expect(iron.Vsub / 100).toBeCloseTo(7800 / 13600, 12);
  });
});
