// Complete elliptic integral of the first kind via the arithmetic-geometric mean.
// Used for the exact period of a pendulum at any amplitude.

export function agm(a0: number, b0: number): number {
  let a = a0;
  let b = b0;
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) {
    const an = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = an;
  }
  return a;
}

/** K(k) with modulus k (not parameter m = k^2), 0 <= k < 1. */
export function ellipticK(k: number): number {
  return Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)));
}

/** Small-angle period 2 pi sqrt(L/g). */
export function smallAnglePeriod(L: number, g: number): number {
  return 2 * Math.PI * Math.sqrt(L / g);
}

/** Exact period of an undamped simple pendulum released from rest at theta0 (rad). */
export function exactPeriod(L: number, g: number, theta0: number): number {
  return 4 * Math.sqrt(L / g) * ellipticK(Math.sin(Math.abs(theta0) / 2));
}
