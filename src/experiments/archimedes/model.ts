// A cube hanging on a spring scale is lowered into a liquid in a measuring cylinder.
//   F_A = rho_liquid g V_submerged,   scale reading T = m g - F_A (>= 0).
// A body lighter than the liquid floats with the fraction rho_body/rho_liquid submerged;
// lowering the scale further only slackens the string.
// Lengths in cm, volumes in cm^3, densities in kg/m^3, forces in N.

export const CYL_AREA = 50; // inner cross-section of the cylinder, cm^2
export const V_LIQUID = 400; // liquid poured into the cylinder, cm^3
export const CYL_HEIGHT = 14; // cm

export interface ArchPhys {
  rhoBody: number;
  rhoLiquid: number;
  /** Body volume, cm^3 (a cube). */
  V: number;
  /** Requested depth of the bottom face below the surface, cm. */
  depth: number;
  g: number;
}

export interface ArchState {
  side: number;
  /** Actual immersion depth of the bottom face, cm. */
  hSub: number;
  /** Submerged volume, cm^3. */
  Vsub: number;
  weight: number;
  buoyancy: number;
  /** Spring-scale reading, N. */
  tension: number;
  floats: boolean;
  /** The body floats freely and the string is slack. */
  slack: boolean;
  fullySubmerged: boolean;
  /** Liquid level in the cylinder, cm from the bottom. */
  level: number;
  /** Volume shown by the cylinder scale, cm^3. */
  reading: number;
}

export function solve(p: ArchPhys): ArchState {
  const side = Math.cbrt(p.V);
  const floats = p.rhoBody < p.rhoLiquid;
  const hEq = floats ? (side * p.rhoBody) / p.rhoLiquid : Infinity;
  const slack = floats && p.depth >= hEq;
  const hSub = slack ? hEq : p.depth;
  const Vsub = side * side * Math.min(hSub, side);
  const weight = p.rhoBody * p.V * 1e-6 * p.g;
  const buoyancy = p.rhoLiquid * Vsub * 1e-6 * p.g;
  const tension = slack ? 0 : Math.max(0, weight - buoyancy);
  const reading = V_LIQUID + Vsub;
  return {
    side,
    hSub,
    Vsub,
    weight,
    buoyancy,
    tension,
    floats,
    slack,
    fullySubmerged: hSub >= side - 1e-9,
    level: reading / CYL_AREA,
    reading,
  };
}
