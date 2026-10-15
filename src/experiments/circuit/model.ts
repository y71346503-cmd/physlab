// DC circuits solved by modified nodal analysis (node potentials), so any
// arrangement of resistors works, not just hard-coded formulas.
// The lamp is nonlinear: tungsten resistance grows with temperature, and the
// filament temperature follows from the balance of electric and radiated power.

import { LAMP } from '../../shared/constants';

export interface Resistor {
  id: string;
  a: number;
  b: number;
  R: number;
}

export interface Source {
  /** Negative terminal node (usually 0, the reference). */
  neg: number;
  pos: number;
  emf: number;
  /** Internal resistance, ohm. */
  r: number;
}

export interface Netlist {
  /** Number of nodes, including the reference node 0. */
  nodes: number;
  resistors: Resistor[];
  source: Source;
}

export interface Solution {
  /** Node potentials, V(0) = 0. */
  V: number[];
  /** Current through each resistor from a to b, A. */
  I: Record<string, number>;
  /** Current delivered by the source (out of the positive terminal), A. */
  Isource: number;
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
export function solveDense(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-15) throw new Error('Singular circuit matrix');
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) {
      const f = M[r]![c]! / M[c]![c]!;
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r]![n]!;
    for (let k = r + 1; k < n; k++) s -= M[r]![k]! * x[k]!;
    x[r] = s / M[r]![r]!;
  }
  return x;
}

export function solveCircuit(net: Netlist): Solution {
  const { source } = net;
  let nodes = net.nodes;
  const resistors = [...net.resistors];
  // A real source: ideal EMF in series with its internal resistance.
  let emfPos = source.pos;
  if (source.r > 0) {
    emfPos = nodes++;
    resistors.push({ id: '__r', a: emfPos, b: source.pos, R: source.r });
  }
  const n = nodes - 1; // unknown potentials (node 0 is the reference)
  const size = n + 1; // + current through the ideal EMF
  const A = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const rhs = new Array<number>(size).fill(0);
  const idx = (node: number) => node - 1;
  for (const r of resistors) {
    const g = 1 / r.R;
    if (r.a > 0) A[idx(r.a)]![idx(r.a)]! += g;
    if (r.b > 0) A[idx(r.b)]![idx(r.b)]! += g;
    if (r.a > 0 && r.b > 0) {
      A[idx(r.a)]![idx(r.b)]! -= g;
      A[idx(r.b)]![idx(r.a)]! -= g;
    }
  }
  const m = n;
  if (emfPos > 0) {
    A[idx(emfPos)]![m]! += 1;
    A[m]![idx(emfPos)]! += 1;
  }
  if (source.neg > 0) {
    A[idx(source.neg)]![m]! -= 1;
    A[m]![idx(source.neg)]! -= 1;
  }
  rhs[m] = source.emf;
  const x = solveDense(A, rhs);
  const V = [0, ...x.slice(0, n)].slice(0, net.nodes);
  const Vall = [0, ...x.slice(0, n)];
  const I: Record<string, number> = {};
  for (const r of resistors) I[r.id] = (Vall[r.a]! - Vall[r.b]!) / r.R;
  // The MNA variable is the current entering the EMF at its positive terminal.
  const Isource = -x[m]!;
  delete I.__r;
  return { V, I, Isource };
}

// ---- Lamp ------------------------------------------------------------------

const RATED_R = LAMP.ratedU / LAMP.ratedI;
/** Cold resistance of the filament, ohm. */
export const LAMP_R_COLD = RATED_R / (LAMP.hotT / LAMP.roomT) ** LAMP.exponent;
/** Radiation constant c in P = c (T^4 - T0^4), W/K^4, fixed by the rated point. */
const RAD_C = (LAMP.ratedU * LAMP.ratedI) / (LAMP.hotT ** 4 - LAMP.roomT ** 4);

export function lampResistance(T: number): number {
  return LAMP_R_COLD * (T / LAMP.roomT) ** LAMP.exponent;
}

export interface LampPoint {
  T: number;
  R: number;
  I: number;
  P: number;
}

/** Operating point of the lamp connected to a source with Thevenin voltage Vth and resistance Rth. */
export function lampOperatingPoint(Vth: number, Rth: number): LampPoint {
  const V = Math.abs(Vth);
  if (V < 1e-12) return { T: LAMP.roomT, R: LAMP_R_COLD, I: 0, P: 0 };
  const f = (T: number) => {
    const R = lampResistance(T);
    const I = V / (Rth + R);
    return I * I * R - RAD_C * (T ** 4 - LAMP.roomT ** 4);
  };
  let lo: number = LAMP.roomT;
  let hi = 4000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const T = (lo + hi) / 2;
  const R = lampResistance(T);
  const I = V / (Rth + R);
  return { T, R, I, P: I * I * R };
}

/**
 * Solve a circuit in which resistor `lampId` is a lamp: find the Thevenin
 * equivalent seen by the lamp, its operating point, then the whole circuit.
 */
export function solveWithLamp(net: Netlist, lampId: string): { sol: Solution; lamp: LampPoint } {
  const withR = (R: number): Netlist => ({ ...net, resistors: net.resistors.map((r) => (r.id === lampId ? { ...r, R } : r)) });
  const lampRes = net.resistors.find((r) => r.id === lampId)!;
  const open = solveCircuit(withR(1e9));
  const Voc = open.V[lampRes.a]! - open.V[lampRes.b]!;
  const short = solveCircuit(withR(1e-6));
  const Isc = short.I[lampId]!;
  const Rth = Math.abs(Isc) > 1e-12 ? Voc / Isc : Infinity;
  const lamp = Number.isFinite(Rth) ? lampOperatingPoint(Voc, Rth) : lampOperatingPoint(0, 1);
  return { sol: solveCircuit(withR(lamp.R)), lamp };
}

// ---- The four school circuits ---------------------------------------------------

export type Scheme = 0 | 1 | 2 | 3;
export const SCHEMES = ['Single element', 'Series', 'Parallel', 'Mixed: 1 + (2 ∥ 3)'] as const;

export interface CircuitSetup {
  scheme: Scheme;
  emf: number;
  r: number;
  /** Element 1 is a lamp instead of R1. */
  lamp: boolean;
  R1: number;
  R2: number;
  R3: number;
}

export function netlistOf(c: CircuitSetup): Netlist {
  const source: Source = { neg: 0, pos: 1, emf: c.emf, r: c.r };
  const R1 = c.lamp ? 21 : c.R1;
  switch (c.scheme) {
    case 0:
      return { nodes: 2, source, resistors: [{ id: 'e1', a: 1, b: 0, R: R1 }] };
    case 1:
      return { nodes: 3, source, resistors: [{ id: 'e1', a: 1, b: 2, R: R1 }, { id: 'R2', a: 2, b: 0, R: c.R2 }] };
    case 2:
      return { nodes: 2, source, resistors: [{ id: 'e1', a: 1, b: 0, R: R1 }, { id: 'R2', a: 1, b: 0, R: c.R2 }] };
    case 3:
      return {
        nodes: 3,
        source,
        resistors: [
          { id: 'e1', a: 1, b: 2, R: R1 },
          { id: 'R2', a: 2, b: 0, R: c.R2 },
          { id: 'R3', a: 2, b: 0, R: c.R3 },
        ],
      };
  }
}

export interface CircuitState {
  sol: Solution;
  lamp: LampPoint | null;
  /** Voltage across each element, V. */
  U: Record<string, number>;
  /** Resistance of each element now (the lamp's depends on its temperature). */
  R: Record<string, number>;
  /** Terminal voltage of the source. */
  Uterm: number;
}

export function solveSetup(c: CircuitSetup): CircuitState {
  const net = netlistOf(c);
  const { sol, lamp } = c.lamp ? solveWithLamp(net, 'e1') : { sol: solveCircuit(net), lamp: null };
  const U: Record<string, number> = {};
  const R: Record<string, number> = {};
  for (const r of net.resistors) {
    R[r.id] = r.id === 'e1' && lamp ? lamp.R : r.R;
    U[r.id] = sol.V[r.a]! - sol.V[r.b]!;
  }
  return { sol, lamp, U, R, Uterm: sol.V[1]! };
}
