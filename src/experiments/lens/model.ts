// Thin lens in the school sign convention:
//   1/F = 1/d + 1/f,  F > 0 converging, F < 0 diverging,
//   d > 0 real object, f > 0 real image (behind the lens), f < 0 virtual image.
// Linear magnification m = -f/d: negative means an inverted image.
// All lengths in centimetres.

export interface ImageInfo {
  /** False when the object is exactly at the focus: refracted rays are parallel. */
  exists: boolean;
  /** Image distance f (signed); Infinity if no image. */
  f: number;
  /** Signed magnification. */
  m: number;
  real: boolean;
  upright: boolean;
  /** |m| > 1 */
  enlarged: boolean;
}

export function imageDistance(F: number, d: number): number {
  if (Math.abs(d - F) < 1e-12) return Infinity;
  return (F * d) / (d - F);
}

export function image(F: number, d: number): ImageInfo {
  const f = imageDistance(F, d);
  if (!Number.isFinite(f)) return { exists: false, f: Infinity, m: Infinity, real: false, upright: false, enlarged: true };
  const m = -f / d;
  return { exists: true, f, m, real: f > 0, upright: m > 0, enlarged: Math.abs(m) > 1 + 1e-9 };
}

export function opticalPower(Fcm: number): number {
  return 100 / Fcm;
}

/** One characteristic ray: from the object tip to the lens plane, then a straight line. */
export interface Ray {
  /** Height where the ray crosses the lens plane. */
  yLens: number;
  /** Direction after the lens (dx > 0). */
  dx: number;
  dy: number;
}

/**
 * The three characteristic rays from the tip of an object of height h at distance d:
 * 1) parallel to the axis, 2) through the optical centre, 3) through (or towards) a focus.
 * Every refracted ray passes through the image point (or, for a virtual image, appears to come from it).
 */
export function characteristicRays(F: number, d: number, h: number): Ray[] {
  const img = image(F, d);
  const lensHeights = [h, 0];
  if (img.exists) lensHeights.push((-h * F) / (d - F));
  return lensHeights.map((yLens) => {
    if (!img.exists) {
      // Object in the focal plane: all refracted rays are parallel to the central ray.
      return { yLens, dx: d, dy: -h };
    }
    const H = img.m * h;
    const sign = img.f > 0 ? 1 : -1;
    return { yLens, dx: sign * img.f, dy: sign * (H - yLens) };
  });
}

/** Diameter of the blur spot on a screen at distance s for a lens of aperture A (real images only). */
export function blurDiameter(F: number, d: number, s: number, aperture: number): number {
  const f = imageDistance(F, d);
  if (!(f > 0) || !Number.isFinite(f)) return Infinity;
  return (aperture * Math.abs(s - f)) / f;
}
