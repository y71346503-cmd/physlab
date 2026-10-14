// Number formatting and parsing. Display uses a real minus sign; inputs accept
// both "9.8" and "9,8" (students in Armenia and Russia write decimal commas).

const MINUS = '−';

export function fmt(x: number | null | undefined, digits = 2): string {
  if (x == null || !Number.isFinite(x)) return '—';
  const s = Math.abs(x) < 0.5 * 10 ** -digits ? (0).toFixed(digits) : x.toFixed(digits);
  return s.startsWith('-') ? MINUS + s.slice(1) : s;
}

/** Format with a given number of significant digits, without exponent for usual magnitudes. */
export function fmtSig(x: number | null | undefined, sig = 3): string {
  if (x == null || !Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(x)));
  const digits = Math.max(0, sig - 1 - mag);
  return fmt(x, Math.min(digits, 10));
}

/** Decimals needed to show a value on a grid with the given step (0.05 -> 2). */
export function decimalsOf(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = step.toString();
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/**
 * Round a measured value and its uncertainty consistently:
 * uncertainty to 1 significant digit (2 if it starts with 1), value to the same decimal place.
 */
export function fmtWithError(value: number, err: number): { value: string; err: string; digits: number } {
  if (!Number.isFinite(err) || err <= 0) {
    return { value: fmtSig(value, 3), err: '—', digits: 3 };
  }
  const mag = Math.floor(Math.log10(err));
  const lead = err / 10 ** mag;
  const sigDigits = lead < 2 ? 2 : 1;
  const digits = Math.max(0, sigDigits - 1 - mag);
  return { value: fmt(value, digits), err: fmt(err, digits), digits };
}

export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (!s) return null;
  const commas = (s.match(/,/g) ?? []).length;
  if (commas > 1 || (commas === 1 && s.includes('.'))) return null;
  s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export const DEG = Math.PI / 180;
