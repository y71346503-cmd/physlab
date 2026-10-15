import { describe, expect, it } from 'vitest';
import { LAMP } from '../../shared/constants';
import { lampOperatingPoint, LAMP_R_COLD, solveCircuit, solveSetup } from './model';

describe('circuit solver', () => {
  it("Ohm's law for a complete circuit", () => {
    const s = solveSetup({ scheme: 0, emf: 6, r: 1, lamp: false, R1: 11, R2: 1, R3: 1 });
    expect(s.sol.Isource).toBeCloseTo(0.5, 12);
    expect(s.Uterm).toBeCloseTo(5.5, 12);
    expect(s.U.e1).toBeCloseTo(5.5, 12);
  });

  it('series: same current, voltages add up', () => {
    const s = solveSetup({ scheme: 1, emf: 9, r: 0, lamp: false, R1: 10, R2: 20, R3: 1 });
    expect(s.sol.I.e1).toBeCloseTo(0.3, 12);
    expect(s.sol.I.R2).toBeCloseTo(0.3, 12);
    expect(s.U.e1! + s.U.R2!).toBeCloseTo(9, 12);
  });

  it('parallel: same voltage, currents add up, 1/R = 1/R1 + 1/R2', () => {
    const s = solveSetup({ scheme: 2, emf: 12, r: 0, lamp: false, R1: 30, R2: 60, R3: 1 });
    expect(s.U.e1).toBeCloseTo(12, 12);
    expect(s.U.R2).toBeCloseTo(12, 12);
    expect(s.sol.Isource).toBeCloseTo(s.sol.I.e1! + s.sol.I.R2!, 12);
    expect(12 / s.sol.Isource).toBeCloseTo(20, 10);
  });

  it("mixed circuit obeys Kirchhoff's current law", () => {
    const s = solveSetup({ scheme: 3, emf: 10, r: 0.5, lamp: false, R1: 7, R2: 12, R3: 6 });
    const R = 7 + (12 * 6) / 18 + 0.5;
    expect(s.sol.Isource).toBeCloseTo(10 / R, 12);
    expect(s.sol.I.e1).toBeCloseTo(s.sol.I.R2! + s.sol.I.R3!, 12);
  });

  it('a general netlist (bridge) conserves current at every node', () => {
    const sol = solveCircuit({
      nodes: 4,
      source: { neg: 0, pos: 1, emf: 5, r: 0.2 },
      resistors: [
        { id: 'a', a: 1, b: 2, R: 10 },
        { id: 'b', a: 1, b: 3, R: 15 },
        { id: 'c', a: 2, b: 3, R: 5 },
        { id: 'd', a: 2, b: 0, R: 20 },
        { id: 'e', a: 3, b: 0, R: 8 },
      ],
    });
    expect(sol.I.a! - sol.I.c! - sol.I.d!).toBeCloseTo(0, 12);
    expect(sol.I.b! + sol.I.c! - sol.I.e!).toBeCloseTo(0, 12);
    expect(sol.Isource).toBeCloseTo(sol.I.d! + sol.I.e!, 12);
  });

  it('the lamp reaches its rated current at the rated voltage and is nonlinear', () => {
    const rated = lampOperatingPoint(LAMP.ratedU, 0);
    expect(rated.I).toBeCloseTo(LAMP.ratedI, 6);
    expect(rated.T).toBeCloseTo(LAMP.hotT, 3);
    const low = lampOperatingPoint(0.5, 0);
    expect(low.R).toBeLessThan(rated.R / 3);
    expect(low.R).toBeGreaterThan(LAMP_R_COLD);
  });

  it('lamp in a series circuit: element voltages add up to the terminal voltage', () => {
    const s = solveSetup({ scheme: 1, emf: 9, r: 0.5, lamp: true, R1: 10, R2: 9, R3: 1 });
    expect(s.U.e1! + s.U.R2!).toBeCloseTo(s.Uterm, 9);
    expect(s.lamp!.P).toBeGreaterThan(1.7);
    expect(s.lamp!.P).toBeLessThan(2.1);
  });
});
