// Parameter values: defaults, snapping to the grid, and share links.
// Values from a URL are untrusted: they are parsed, clamped and snapped.

import type { ParamDef, ParamValues } from '../experiments/types';
import { decimalsOf } from './format';

export function defaults(defs: ParamDef[]): ParamValues {
  const p: ParamValues = {};
  for (const d of defs) p[d.key] = d.default;
  return p;
}

export function snap(def: ParamDef, v: number): number {
  if (!Number.isFinite(v)) return def.default;
  if (def.type === 'select') {
    return def.options?.some((o) => o.value === v) ? v : def.default;
  }
  if (def.type === 'toggle') return v ? 1 : 0;
  const clamped = Math.min(def.max, Math.max(def.min, v));
  const n = Math.round((clamped - def.min) / def.step);
  const snapped = Math.min(def.max, def.min + n * def.step);
  return Number(snapped.toFixed(Math.max(decimalsOf(def.step), decimalsOf(def.min))));
}

/** Only values that differ from defaults go into the link. */
export function encodeParams(defs: ParamDef[], values: ParamValues): string {
  const q = new URLSearchParams();
  for (const d of defs) {
    const v = values[d.key];
    if (v !== undefined && v !== d.default) q.set(d.key, String(v));
  }
  return q.toString();
}

export function decodeParams(defs: ParamDef[], query: string): ParamValues {
  const p = defaults(defs);
  const q = new URLSearchParams(query);
  for (const d of defs) {
    const raw = q.get(d.key);
    if (raw === null || raw.trim() === '') continue;
    const v = Number(raw);
    if (Number.isFinite(v)) p[d.key] = snap(d, v);
  }
  // Select options that are unavailable for this setup fall back to the default.
  for (const d of defs) {
    if (d.type === 'select' && d.optionAvailable && !d.optionAvailable(p[d.key]!, p)) p[d.key] = d.default;
  }
  return p;
}
