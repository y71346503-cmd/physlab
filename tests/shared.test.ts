import { describe, expect, it } from 'vitest';
import { checkNumeric, variantVars } from '../src/core/tasks';
import type { NumericTask, ParamDef } from '../src/experiments/types';
import { fmt, fmtWithError, parseNumber } from '../src/shared/format';
import { derive, linearFit } from '../src/shared/lsq';
import { pickRange, quantize, readMeter } from '../src/shared/measure';
import { decodeParams, encodeParams, snap } from '../src/shared/params';
import { hashString, mulberry32 } from '../src/shared/rng';

describe('least squares', () => {
  it('recovers an exact line with zero errors', () => {
    const xs = [1, 2, 3, 4, 5];
    const fit = linearFit(
      xs,
      xs.map((x) => 2 * x + 1),
    )!;
    expect(fit.k).toBeCloseTo(2, 12);
    expect(fit.b).toBeCloseTo(1, 12);
    expect(fit.sk).toBeCloseTo(0, 12);
    expect(fit.r2).toBeCloseTo(1, 12);
  });

  it('matches textbook standard errors', () => {
    // y = x with residuals +0.1, -0.1, -0.1, +0.1 at x = 0..3
    const fit = linearFit([0, 1, 2, 3], [0.1, 0.9, 1.9, 3.1])!;
    // Sxx = 5, mean x = 1.5
    expect(fit.k).toBeCloseTo(1, 12);
    expect(fit.b).toBeCloseTo(0, 12);
    const s2 = 0.04 / 2;
    expect(fit.sk).toBeCloseTo(Math.sqrt(s2 / 5), 12);
    expect(fit.sb).toBeCloseTo(Math.sqrt(s2 * (1 / 4 + 2.25 / 5)), 12);
    expect(fit.cov).toBeCloseTo((-1.5 * s2) / 5, 12);
  });

  it('propagates errors into derived quantities', () => {
    const fit = { k: 4, b: 0, sk: 0.1, sb: 0, cov: 0, r2: 1, n: 5 };
    const g = derive(fit, (k) => (4 * Math.PI ** 2) / k);
    expect(g.value).toBeCloseTo(Math.PI ** 2, 9);
    expect(g.error).toBeCloseTo((Math.PI ** 2 * 0.1) / 4, 6);
  });

  it('needs at least two distinct x values', () => {
    expect(linearFit([1], [2])).toBeNull();
    expect(linearFit([1, 1, 1], [1, 2, 3])).toBeNull();
  });
});

describe('number parsing and formatting', () => {
  it('accepts decimal points and commas', () => {
    expect(parseNumber('9.81')).toBe(9.81);
    expect(parseNumber('9,81')).toBe(9.81);
    expect(parseNumber(' -2,5 ')).toBe(-2.5);
    expect(parseNumber('−3')).toBe(-3);
    expect(parseNumber('1e-3')).toBe(0.001);
    expect(parseNumber('.5')).toBe(0.5);
  });

  it('rejects garbage and ambiguous input', () => {
    for (const s of ['', 'abc', '1,2,3', '1.234,5', '1..2', '--1', '5 m']) expect(parseNumber(s)).toBeNull();
  });

  it('formats with a real minus sign and no negative zero', () => {
    expect(fmt(-1.5, 1)).toBe('−1.5');
    expect(fmt(-0.001, 2)).toBe('0.00');
    expect(fmt(null)).toBe('—');
  });

  it('rounds a result to its uncertainty', () => {
    expect(fmtWithError(9.7861, 0.0532)).toMatchObject({ value: '9.79', err: '0.05' });
    expect(fmtWithError(9.7861, 0.0132)).toMatchObject({ value: '9.786', err: '0.013' });
    expect(fmtWithError(1234.5, 23)).toMatchObject({ value: '1235', err: '23' });
  });
});

describe('parameters and share links', () => {
  const defs: ParamDef[] = [
    { key: 'L', label: 'L', unit: 'm', min: 0.1, max: 2.5, step: 0.01, default: 1 },
    { key: 'w', label: 'w', unit: '', type: 'select', min: 0, max: 2, step: 1, default: 0, options: [0, 1, 2].map((v) => ({ label: String(v), value: v })) },
    { key: 'd', label: 'd', unit: '', type: 'toggle', min: 0, max: 1, step: 1, default: 0 },
  ];

  it('snaps and clamps values', () => {
    expect(snap(defs[0]!, 1.234)).toBe(1.23);
    expect(snap(defs[0]!, 99)).toBe(2.5);
    expect(snap(defs[0]!, -5)).toBe(0.1);
    expect(snap(defs[1]!, 7)).toBe(0);
    expect(snap(defs[2]!, 5)).toBe(1);
  });

  it('encodes only changed values and decodes untrusted input safely', () => {
    expect(encodeParams(defs, { L: 1, w: 2, d: 0 })).toBe('w=2');
    expect(decodeParams(defs, 'L=1.5&w=1&d=1')).toEqual({ L: 1.5, w: 1, d: 1 });
    expect(decodeParams(defs, 'L=1e9&w=abc&d=&evil=1')).toEqual({ L: 2.5, w: 0, d: 0 });
    expect(decodeParams(defs, '')).toEqual({ L: 1, w: 0, d: 0 });
  });
});

describe('instruments', () => {
  it('rounds to the division and picks the smallest fitting range', () => {
    expect(quantize(1.234, 0.05)).toBe(1.25);
    const ranges = [
      { max: 1, div: 0.02 },
      { max: 5, div: 0.1 },
    ];
    expect(pickRange(ranges, 0.8).max).toBe(1);
    expect(pickRange(ranges, 3).max).toBe(5);
    expect(pickRange(ranges, 30).max).toBe(5);
  });

  it('ideal readings have no noise; realistic ones stay within the accuracy class', () => {
    const ranges = [{ max: 5, div: 0.1 }];
    const noNoise = () => 0;
    expect(readMeter(2.34, 2.34, ranges, 1.5, false, noNoise, 'k').reading).toBe(2.3);
    const big = () => 10;
    const r = readMeter(2.34, 2.34, ranges, 1.5, true, big, 'k');
    expect(Math.abs(r.reading - 2.34)).toBeLessThanOrEqual(0.075 + 0.05 + 1e-9);
    expect(readMeter(7, 7, ranges, 1.5, false, noNoise, 'k').overload).toBe(true);
  });
});

describe('task engine', () => {
  const task: NumericTask = {
    kind: 'numeric',
    id: 't',
    level: 1,
    vars: (rng) => ({ a: Math.round(rng() * 100) }),
    prompt: () => '',
    unit: 'm',
    answer: (v) => v.a! * 2 + 10,
    tolerance: 0.02,
    explain: () => '',
  };

  it('variants are deterministic per student and change with the variant number', () => {
    expect(variantVars(task, 42, 'exp', 0)).toEqual(variantVars(task, 42, 'exp', 0));
    const set = new Set([0, 1, 2, 3, 4, 5].map((v) => variantVars(task, 42, 'exp', v).a));
    expect(set.size).toBeGreaterThan(2);
  });

  it('checks answers with a relative tolerance and both decimal separators', () => {
    const v = { a: 20 };
    expect(checkNumeric(task, v, '50')).toMatchObject({ kind: 'checked', ok: true });
    expect(checkNumeric(task, v, '50,9')).toMatchObject({ ok: true });
    expect(checkNumeric(task, v, '51.5')).toMatchObject({ ok: false });
    expect(checkNumeric(task, v, 'fifty')).toEqual({ kind: 'invalid' });
  });

  it('the PRNG is deterministic', () => {
    const a = mulberry32(hashString('x'));
    const b = mulberry32(hashString('x'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
