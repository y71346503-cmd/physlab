// Block on an inclined plane with dry friction (one coefficient for rest and sliding).
// Released from rest, it slides only if mg sin(a) exceeds the maximum static friction mu mg cos(a).

export interface InclinePhys {
  /** Angle, rad. */
  alpha: number;
  m: number;
  mu: number;
  g: number;
}

export interface InclineForces {
  weight: number;
  /** Component of gravity along the slope, mg sin a. */
  along: number;
  /** Component of gravity into the slope, mg cos a. */
  into: number;
  normal: number;
  /** Friction magnitude (static if the block rests). */
  friction: number;
  moves: boolean;
  /** Acceleration down the slope, m/s^2. */
  a: number;
}

export function forces(p: InclinePhys): InclineForces {
  const weight = p.m * p.g;
  const along = weight * Math.sin(p.alpha);
  const into = weight * Math.cos(p.alpha);
  const normal = into;
  const maxStatic = p.mu * normal;
  // Small tolerance so that tan(a) = mu exactly counts as rest.
  const moves = along > maxStatic * (1 + 1e-12);
  const friction = moves ? maxStatic : along;
  return { weight, along, into, normal, friction, moves, a: moves ? (along - friction) / p.m : 0 };
}

/** Time to slide a distance s from rest, or Infinity if the block stays. */
export function timeToSlide(p: InclinePhys, s: number): number {
  const { a } = forces(p);
  return a > 0 ? Math.sqrt((2 * s) / a) : Infinity;
}

/** Largest angle (rad) at which the block stays at rest. */
export function criticalAngle(mu: number): number {
  return Math.atan(mu);
}
