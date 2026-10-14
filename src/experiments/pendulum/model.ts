// Simple pendulum: point mass on a massless rigid string.
//   theta'' = -(g/L) sin(theta) - gamma * theta'
// Integrated with velocity Verlet (symplectic, 2nd order); linear damping is applied
// as an exact exponential decay of the angular velocity in two half steps.

export { exactPeriod, smallAnglePeriod } from '../../shared/elliptic';

export interface PendulumPhys {
  /** Length, m. */
  L: number;
  /** Bob mass, kg. */
  m: number;
  /** Free-fall acceleration, m/s^2. */
  g: number;
  /** Linear damping coefficient, 1/s. */
  gamma: number;
}

export interface PendulumState {
  theta: number;
  omega: number;
  t: number;
  /** Cached angular acceleration from gravity at the current angle. */
  a: number;
}

export function gravityAccel(theta: number, p: PendulumPhys): number {
  return -(p.g / p.L) * Math.sin(theta);
}

export function initialState(theta0: number, p: PendulumPhys): PendulumState {
  return { theta: theta0, omega: 0, t: 0, a: gravityAccel(theta0, p) };
}

export function step(s: PendulumState, p: PendulumPhys, h: number): void {
  const decay = p.gamma > 0 ? Math.exp(-p.gamma * h * 0.5) : 1;
  s.omega *= decay;
  s.theta += s.omega * h + 0.5 * s.a * h * h;
  const a1 = gravityAccel(s.theta, p);
  s.omega += 0.5 * (s.a + a1) * h;
  s.a = a1;
  s.omega *= decay;
  s.t += h;
}

export function energies(s: PendulumState, p: PendulumPhys): { kinetic: number; potential: number; total: number } {
  const kinetic = 0.5 * p.m * p.L * p.L * s.omega * s.omega;
  const potential = p.m * p.g * p.L * (1 - Math.cos(s.theta));
  return { kinetic, potential, total: kinetic + potential };
}

/** Period measured from the simulation: mean time between upward zero crossings. */
export function simulatedPeriod(theta0: number, p: PendulumPhys, h: number, periods: number): number {
  const s = initialState(theta0, p);
  const crossings: number[] = [];
  let guard = 0;
  while (crossings.length < periods + 1 && guard++ < 1e8) {
    const prev = s.theta;
    const t0 = s.t;
    step(s, p, h);
    if (prev < 0 && s.theta >= 0) crossings.push(t0 + (h * -prev) / (s.theta - prev));
  }
  return (crossings[crossings.length - 1]! - crossings[0]!) / (crossings.length - 1);
}
