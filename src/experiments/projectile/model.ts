// Projectile in uniform gravity with optional quadratic air drag:
//   m dv/dt = m g - k |v| v,   k = (1/2) rho_air C_d A.
// Integrated with classical RK4 (drag makes the equations nonlinear).

import { AIR_DENSITY, DRAG_COEFF_SPHERE } from '../../shared/constants';

export interface Ball {
  label: string;
  /** Mass, kg. */
  m: number;
  /** Diameter, m. */
  d: number;
}

/** Standard balls (masses and diameters from the official sports rules). */
export const BALLS: readonly Ball[] = [
  { label: 'Ping-pong ball', m: 0.0027, d: 0.04 },
  { label: 'Tennis ball', m: 0.057, d: 0.067 },
  { label: 'Football', m: 0.43, d: 0.22 },
  { label: 'Basketball', m: 0.62, d: 0.24 },
  { label: 'Shot put', m: 7.26, d: 0.12 },
];

export interface ProjPhys {
  v0: number;
  /** Launch angle, rad. */
  alpha: number;
  /** Launch height, m. */
  h0: number;
  drag: boolean;
  m: number;
  d: number;
  g: number;
}

export interface ProjState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

/** Drag constant k in F = k v^2, kg/m. */
export function dragConstant(p: ProjPhys): number {
  if (!p.drag) return 0;
  const area = Math.PI * (p.d / 2) ** 2;
  return 0.5 * AIR_DENSITY * DRAG_COEFF_SPHERE * area;
}

export function launchState(p: ProjPhys): ProjState {
  return { x: 0, y: p.h0, vx: p.v0 * Math.cos(p.alpha), vy: p.v0 * Math.sin(p.alpha), t: 0 };
}

function accel(vx: number, vy: number, kOverM: number, g: number): [number, number] {
  const v = Math.hypot(vx, vy);
  return [-kOverM * v * vx, -g - kOverM * v * vy];
}

export function rk4Step(s: ProjState, kOverM: number, g: number, h: number): void {
  const [a1x, a1y] = accel(s.vx, s.vy, kOverM, g);
  const v2x = s.vx + 0.5 * h * a1x;
  const v2y = s.vy + 0.5 * h * a1y;
  const [a2x, a2y] = accel(v2x, v2y, kOverM, g);
  const v3x = s.vx + 0.5 * h * a2x;
  const v3y = s.vy + 0.5 * h * a2y;
  const [a3x, a3y] = accel(v3x, v3y, kOverM, g);
  const v4x = s.vx + h * a3x;
  const v4y = s.vy + h * a3y;
  const [a4x, a4y] = accel(v4x, v4y, kOverM, g);
  s.x += (h / 6) * (s.vx + 2 * v2x + 2 * v3x + v4x);
  s.y += (h / 6) * (s.vy + 2 * v2y + 2 * v3y + v4y);
  s.vx += (h / 6) * (a1x + 2 * a2x + 2 * a3x + a4x);
  s.vy += (h / 6) * (a1y + 2 * a2y + 2 * a3y + a4y);
  s.t += h;
}

export interface Flight {
  range: number;
  height: number;
  time: number;
}

/** Exact results without air drag. */
export function analyticFlight(p: ProjPhys): Flight {
  const vx = p.v0 * Math.cos(p.alpha);
  const vy = p.v0 * Math.sin(p.alpha);
  const time = (vy + Math.sqrt(vy * vy + 2 * p.g * p.h0)) / p.g;
  return { range: vx * time, height: p.h0 + (vy > 0 ? (vy * vy) / (2 * p.g) : 0), time };
}

/** Numerical flight until the ball returns to the ground (y = 0), with linear interpolation of the landing. */
export function simulateFlight(p: ProjPhys, h = 1e-3): Flight {
  const s = launchState(p);
  const kOverM = dragConstant(p) / p.m;
  let height = s.y;
  if (s.y <= 0 && s.vy <= 0) return { range: 0, height: 0, time: 0 };
  for (let i = 0; i < 1e7; i++) {
    const px = s.x;
    const py = s.y;
    const pt = s.t;
    rk4Step(s, kOverM, p.g, h);
    height = Math.max(height, s.y);
    if (s.y < 0) {
      const f = py / (py - s.y);
      return { range: px + f * (s.x - px), height, time: pt + f * (s.t - pt) };
    }
  }
  return { range: s.x, height, time: s.t };
}

/** Launch angle (rad) with the largest range, by golden-section search. */
export function optimalAngle(p: ProjPhys, h = 2e-3): number {
  const range = (a: number) => simulateFlight({ ...p, alpha: a }, h).range;
  const r = (Math.sqrt(5) - 1) / 2;
  let lo = 0.05;
  let hi = Math.PI / 2 - 0.05;
  let c = hi - r * (hi - lo);
  let d = lo + r * (hi - lo);
  let fc = range(c);
  let fd = range(d);
  while (hi - lo > 1e-4) {
    if (fc > fd) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - r * (hi - lo);
      fc = range(c);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + r * (hi - lo);
      fd = range(d);
    }
  }
  return (lo + hi) / 2;
}
