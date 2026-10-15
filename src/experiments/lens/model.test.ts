import { describe, expect, it } from 'vitest';
import { blurDiameter, characteristicRays, image, imageDistance } from './model';

/** Point where the refracted ray crosses x = X. */
const yAt = (r: { yLens: number; dx: number; dy: number }, X: number) => r.yLens + (r.dy / r.dx) * X;

describe('thin lens model', () => {
  it('satisfies 1/F = 1/d + 1/f', () => {
    for (const [F, d] of [
      [10, 25],
      [10, 15],
      [10, 6],
      [-10, 30],
      [20, 60],
    ] as const) {
      const f = imageDistance(F, d);
      expect(1 / d + 1 / f).toBeCloseTo(1 / F, 12);
    }
  });

  it('classifies images like the school table', () => {
    expect(image(10, 30)).toMatchObject({ real: true, upright: false, enlarged: false });
    expect(Math.abs(image(10, 20).m)).toBeCloseTo(1, 12);
    expect(image(10, 15)).toMatchObject({ real: true, upright: false, enlarged: true });
    expect(image(10, 10).exists).toBe(false);
    expect(image(10, 5)).toMatchObject({ real: false, upright: true, enlarged: true });
    expect(image(-10, 30)).toMatchObject({ real: false, upright: true, enlarged: false });
  });

  it('all three characteristic rays pass through the image point', () => {
    for (const [F, d] of [
      [10, 25],
      [10, 6],
      [-12, 20],
    ] as const) {
      const h = 3;
      const img = image(F, d);
      const H = img.m * h;
      const rays = characteristicRays(F, d, h);
      expect(rays).toHaveLength(3);
      for (const r of rays) expect(yAt(r, img.f)).toBeCloseTo(H, 9);
      // Ray 1 starts parallel (height h), ray 2 through the centre.
      expect(rays[0]!.yLens).toBe(h);
      expect(rays[1]!.yLens).toBe(0);
    }
  });

  it('a parallel ray of a converging lens crosses the axis at the focus', () => {
    const [r1] = characteristicRays(10, 25, 2);
    expect(yAt(r1!, 10)).toBeCloseTo(0, 12);
  });

  it('the blur spot vanishes at the image and grows away from it', () => {
    const f = imageDistance(10, 30);
    expect(blurDiameter(10, 30, f, 14)).toBeCloseTo(0, 12);
    expect(blurDiameter(10, 30, f + 3, 14)).toBeCloseTo((14 * 3) / f, 12);
    expect(blurDiameter(10, 5, 20, 14)).toBe(Infinity);
  });
});
