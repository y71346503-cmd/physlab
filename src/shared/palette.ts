// Canvas colours come from the same CSS custom properties as the UI,
// so both themes stay in sync.

export interface Palette {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  accentSoft: string;
  blue: string;
  green: string;
  violet: string;
  red: string;
  surface: string;
  dark: boolean;
}

const VARS: Record<Exclude<keyof Palette, 'dark'>, string> = {
  bg: '--scene-bg',
  grid: '--scene-grid',
  ink: '--scene-ink',
  muted: '--scene-muted',
  faint: '--scene-faint',
  accent: '--accent',
  accentSoft: '--accent-soft',
  blue: '--c-blue',
  green: '--c-green',
  violet: '--c-violet',
  red: '--c-red',
  surface: '--surface',
};

let cached: Palette | null = null;

export function palette(): Palette {
  if (cached) return cached;
  const cs = getComputedStyle(document.documentElement);
  const p = { dark: document.documentElement.dataset.theme === 'dark' } as Palette;
  for (const [k, v] of Object.entries(VARS)) {
    (p as unknown as Record<string, string>)[k] = cs.getPropertyValue(v).trim() || '#888';
  }
  cached = p;
  return p;
}

export function invalidatePalette(): void {
  cached = null;
}
