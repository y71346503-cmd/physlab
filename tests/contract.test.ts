// Every experiment must satisfy the contract: complete metadata, valid parameters,
// five tasks that run, a lab that records or explains why not, and a simulation
// that can be created, stepped and described with the default setup.
import { describe, expect, it } from 'vitest';
import { catalog, loadExperiment } from '../src/experiments/registry';
import type { Experiment, LabContext } from '../src/experiments/types';
import { checkNumeric, variantVars } from '../src/core/tasks';
import { makeNoise, readMeter } from '../src/shared/measure';
import { defaults } from '../src/shared/params';

const experiments: [string, Experiment][] = await Promise.all(catalog.map(async (m) => [m.id, await loadExperiment(m.id)] as [string, Experiment]));

describe('catalog', () => {
  it('has the six experiments in order', () => {
    expect(catalog.map((m) => m.id)).toEqual(['pendulum', 'projectile', 'incline', 'circuit', 'lens', 'archimedes']);
  });
});

describe.each(experiments)('%s', (id, exp) => {
  it('has complete metadata', () => {
    expect(exp.meta.id).toBe(id);
    expect(exp.meta.title.length).toBeGreaterThan(3);
    expect(exp.meta.grade).toBeGreaterThanOrEqual(7);
    expect(exp.meta.grade).toBeLessThanOrEqual(11);
    expect(exp.theory).toContain('<h2');
    expect(exp.theory).toContain('katex');
  });

  it('has valid parameters with unique keys', () => {
    const keys = exp.params.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of exp.params) {
      if (p.type === 'select') {
        expect(p.options?.some((o) => o.value === p.default)).toBe(true);
      } else {
        expect(p.min).toBeLessThan(p.max);
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
        for (const pr of p.presets ?? []) {
          expect(pr.value).toBeGreaterThanOrEqual(p.min);
          expect(pr.value).toBeLessThanOrEqual(p.max);
        }
      }
    }
  });

  it('creates, steps and describes a simulation', () => {
    const sim = exp.create(defaults(exp.params));
    if (exp.kind === 'dynamic') {
      expect(exp.dt).toBeGreaterThan(0);
      for (let i = 0; i < 500 && !sim.done; i++) sim.step!(exp.dt!);
      expect(sim.t).toBeGreaterThan(0);
    }
    const noise = makeNoise('test');
    const readouts = sim.readouts({ real: false, noise, sw: { start: null, stop: null } });
    expect(readouts.length).toBeGreaterThan(0);
    for (const r of readouts) expect(typeof r.text).toBe('string');
    expect(sim.describe().length).toBeGreaterThan(10);
    for (const g of exp.graphs ?? []) for (const s of g.series) expect(Number.isFinite(s.get(sim))).toBe(true);
  });

  it('has five tasks of all kinds that can be checked', () => {
    expect(exp.tasks).toHaveLength(5);
    expect(new Set(exp.tasks.map((t) => t.id)).size).toBe(5);
    const kinds = new Set(exp.tasks.map((t) => t.kind));
    expect(kinds.has('choice') && kinds.has('numeric') && kinds.has('target')).toBe(true);
    const p = defaults(exp.params);
    const sim = exp.create(p);
    for (const t of exp.tasks) {
      if (t.kind === 'numeric') {
        for (let variant = 0; variant < 20; variant++) {
          const v = variantVars(t, 12345, id, variant);
          const a = t.answer(v);
          expect(Number.isFinite(a)).toBe(true);
          expect(t.prompt(v)).not.toMatch(/undefined|NaN/);
          expect(t.explain(v)).not.toMatch(/undefined|NaN/);
          expect(checkNumeric(t, v, String(a))).toMatchObject({ ok: true });
        }
      } else if (t.kind === 'choice') {
        expect(t.correct).toBeGreaterThanOrEqual(0);
        expect(t.correct).toBeLessThan(t.options.length);
      } else {
        const r = t.check(p, sim);
        expect(typeof r.ok).toBe('boolean');
      }
    }
  });

  it('lab records a row or explains why not', () => {
    const p = defaults(exp.params);
    const sim = exp.create(p);
    const noise = makeNoise('lab');
    const meters: LabContext<typeof sim>['meters'] = {};
    for (const m of exp.instruments.meters ?? []) {
      const v = m.value(sim, p);
      meters[m.id] = v === null ? null : readMeter(v, m.rangeRef?.(sim, p) ?? v, m.ranges, m.accuracyClass, false, noise, m.id);
    }
    const r = exp.lab.record({ params: p, sim, sw: { start: null, stop: null }, meters, real: false, noise });
    if ('error' in r) expect(r.error.length).toBeGreaterThan(10);
    else for (const c of exp.lab.columns) expect(Number.isFinite(r.values[c.key])).toBe(true);
    expect(exp.lab.minPoints).toBeGreaterThanOrEqual(3);
  });
});
