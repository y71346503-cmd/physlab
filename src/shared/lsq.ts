// Ordinary least squares for y = k x + b with standard errors (1 sigma),
// and propagation of those errors into derived quantities.

export interface Fit {
  k: number;
  b: number;
  /** Standard errors of slope and intercept (NaN when n < 3). */
  sk: number;
  sb: number;
  /** Covariance of k and b. */
  cov: number;
  r2: number;
  n: number;
}

export function linearFit(xs: readonly number[], ys: readonly number[]): Fit | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i]!;
    my += ys[i]!;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const k = sxy / sxx;
  const b = my - k * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i]! - (k * xs[i]! + b);
    ssr += r * r;
  }
  const s2 = n > 2 ? ssr / (n - 2) : NaN;
  const sk = Math.sqrt(s2 / sxx);
  const sb = Math.sqrt(s2 * (1 / n + (mx * mx) / sxx));
  const cov = (-mx * s2) / sxx;
  const r2 = syy > 0 ? 1 - ssr / syy : 1;
  return { k, b, sk, sb, cov, r2, n };
}

/**
 * Value and standard error of f(k, b), using a numerical gradient and the
 * full covariance matrix of the fit.
 */
export function derive(fit: Fit, f: (k: number, b: number) => number): { value: number; error: number } {
  const value = f(fit.k, fit.b);
  const hk = Math.abs(fit.k) * 1e-6 || 1e-9;
  const hb = Math.abs(fit.b) * 1e-6 || 1e-9;
  const dk = (f(fit.k + hk, fit.b) - f(fit.k - hk, fit.b)) / (2 * hk);
  const db = (f(fit.k, fit.b + hb) - f(fit.k, fit.b - hb)) / (2 * hb);
  const variance = dk * dk * fit.sk * fit.sk + db * db * fit.sb * fit.sb + 2 * dk * db * fit.cov;
  return { value, error: Math.sqrt(Math.max(0, variance)) };
}
