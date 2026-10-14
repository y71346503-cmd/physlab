// Reference values used across experiments. Densities follow the school
// reference tables (rounded values printed in grade 7-9 textbooks).

/** Free-fall acceleration on Earth used in school problems, m/s^2 (standard value is 9.80665). */
export const G_EARTH = 9.81;

export interface World {
  label: string;
  g: number;
  hidden?: boolean;
}

/** Surface gravity, m/s^2 (NASA planetary fact sheets). Planet X is a lab "unknown". */
export const WORLDS: readonly World[] = [
  { label: 'Earth', g: 9.81 },
  { label: 'Moon', g: 1.62 },
  { label: 'Mars', g: 3.71 },
  { label: 'Jupiter', g: 24.79 },
  { label: 'Planet X (unknown g)', g: 6.37, hidden: true },
];

/** Dry air at 20 C and 101.325 kPa, kg/m^3. */
export const AIR_DENSITY = 1.204;

/** Drag coefficient of a smooth sphere at typical ball Reynolds numbers. */
export const DRAG_COEFF_SPHERE = 0.47;

export interface Substance {
  label: string;
  rho: number;
  color?: string;
}

/** Liquids, kg/m^3. */
export const LIQUIDS: readonly Substance[] = [
  { label: 'Water', rho: 1000, color: '#5aa9e6' },
  { label: 'Sunflower oil', rho: 930, color: '#e0b64a' },
  { label: 'Salt (sea) water', rho: 1030, color: '#3f8fc9' },
  { label: 'Mercury', rho: 13600, color: '#a7adb3' },
];

/** Solids, kg/m^3. */
export const MATERIALS: readonly Substance[] = [
  { label: 'Pine', rho: 400, color: '#c9a36a' },
  { label: 'Ice', rho: 900, color: '#cfe8f3' },
  { label: 'Aluminium', rho: 2700, color: '#b8bec4' },
  { label: 'Iron', rho: 7800, color: '#6f757b' },
  { label: 'Copper', rho: 8900, color: '#c47a4a' },
  { label: 'Lead', rho: 11300, color: '#5d6168' },
  { label: 'Gold', rho: 19300, color: '#d9b23c' },
];

/** Tungsten filament lamp, rated 6.3 V / 0.30 A (a common school lamp). */
export const LAMP = {
  ratedU: 6.3,
  ratedI: 0.3,
  /** Filament temperature at rated power, K. */
  hotT: 2500,
  /** Room temperature, K. */
  roomT: 293,
  /** Tungsten resistance grows roughly as T^1.2 over the working range. */
  exponent: 1.2,
} as const;
