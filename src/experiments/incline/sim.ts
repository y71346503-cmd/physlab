import { arrow, clear, hatch, line, text, withAlpha } from '../../shared/canvas';
import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { quantize } from '../../shared/measure';
import type { NoiseFn, ParamValues, Readout, SimInstance, View } from '../types';
import { forces, type InclineForces, type InclinePhys } from './model';

/** Length of the slope, m. */
export const TRACK = 2;
/** Block size along and across the slope, m. */
const BLOCK_L = 0.2;
const BLOCK_H = 0.12;
/** Start position of the block centre from the top, m. */
const START = 0.15;
/** Photogate timer resolution, s. */
export const GATE_DIV = 0.001;

export interface Surface {
  label: string;
  /** Hidden coefficient for "unknown" surfaces; null means the slider value is used. */
  mu: number | null;
}

export const SURFACES: readonly Surface[] = [
  { label: 'Custom (set μ)', mu: null },
  { label: 'Unknown surface A', mu: 0.27 },
  { label: 'Unknown surface B', mu: 0.41 },
];

export function physFrom(p: ParamValues): InclinePhys {
  const surface = SURFACES[p.surface!] ?? SURFACES[0]!;
  return { alpha: p.alpha! * DEG, m: p.m!, mu: surface.mu ?? p.mu!, g: G_EARTH };
}

export function isHidden(p: ParamValues): boolean {
  return (SURFACES[p.surface!]?.mu ?? null) !== null;
}

export class InclineSim implements SimInstance {
  readonly phys: InclinePhys;
  readonly f: InclineForces;
  readonly hidden: boolean;
  /** Distance travelled along the slope, m. */
  x = 0;
  v = 0;
  t = 0;
  done = false;
  scale = 0;
  /** Gate distance from the start, m. */
  readonly gate: number;
  /** Exact time when the block passed the gate. */
  tGate: number | null = null;

  constructor(readonly params: ParamValues) {
    this.phys = physFrom(params);
    this.f = forces(this.phys);
    this.hidden = isHidden(params);
    this.gate = params.s!;
  }

  step(h: number): void {
    if (this.done) return;
    const a = this.f.a;
    if (a <= 0) {
      this.t += h;
      return;
    }
    const x0 = this.x;
    // Constant acceleration: this update is exact.
    this.x += this.v * h + 0.5 * a * h * h;
    if (this.tGate === null && x0 < this.gate && this.x >= this.gate) {
      const dt = (-this.v + Math.sqrt(this.v * this.v + 2 * a * (this.gate - x0))) / a;
      this.tGate = this.t + dt;
    }
    this.v += a * h;
    this.t += h;
    const end = TRACK - START - BLOCK_L / 2;
    if (this.x >= end) {
      this.x = end;
      this.done = true;
    }
  }

  gateReading(real: boolean, noise: NoiseFn): number | null {
    if (this.tGate === null) return null;
    return quantize(this.tGate + (real ? noise('gate', 0.003) : 0), GATE_DIV);
  }

  render(view: View): void {
    const { ctx, w, h, pal } = view;
    clear(ctx, w, h, pal.bg);
    const { alpha } = this.phys;
    const ca = Math.cos(alpha);
    const sa = Math.sin(alpha);
    const s = Math.min((w - 70) / (TRACK * ca + 0.15), (h - 80) / (TRACK * sa + 0.45));
    this.scale = s;
    const B = { x: w / 2 + (TRACK * ca * s) / 2, y: h - 34 };
    const T = { x: B.x - TRACK * ca * s, y: B.y - TRACK * sa * s };
    const u = { x: ca, y: sa }; // down the slope (canvas coordinates)
    const n = { x: sa, y: -ca }; // out of the surface

    // Ground and wedge
    hatch(ctx, 0, B.y, w, 10, pal.faint);
    line(ctx, 0, B.y, w, B.y, pal.ink, 2);
    ctx.beginPath();
    ctx.moveTo(T.x, T.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(T.x, B.y);
    ctx.closePath();
    ctx.fillStyle = withAlpha(pal.dark ? '#6b7570' : '#a9b2ac', 0.25);
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Angle at the bottom
    const r = 42;
    ctx.beginPath();
    ctx.arc(B.x, B.y, r, Math.PI, Math.PI + alpha);
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, `α = ${fmt(alpha / DEG, 0)}°`, B.x - r - 14, B.y - 12 - (alpha > 0.5 ? 6 : 0), { color: pal.ink, size: 12, mono: true, align: 'right', plate: pal.bg });

    // Photogate
    const gx = T.x + u.x * (START + this.gate) * s;
    const gy = T.y + u.y * (START + this.gate) * s;
    const gh = Math.max(34, BLOCK_H * s * 2);
    line(ctx, gx, gy, gx + n.x * gh, gy + n.y * gh, pal.ink, 3);
    line(ctx, gx, gy, gx + n.x * gh, gy + n.y * gh, pal.red, 1, [2, 3]);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(gx + n.x * gh - 5, gy + n.y * gh - 5, 10, 10);
    const reading = this.gateReading(view.real, view.noise);
    text(ctx, `gate: ${reading === null ? '0.000' : fmt(reading, 3)} s`, gx + n.x * gh + 10, gy + n.y * gh - 10, {
      color: pal.ink,
      size: 12,
      mono: true,
      weight: 600,
      plate: pal.bg,
    });

    // Block
    const d = (START + this.x) * s;
    const cx = T.x + u.x * d + n.x * (BLOCK_H / 2) * s;
    const cy = T.y + u.y * d + n.y * (BLOCK_H / 2) * s;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(alpha);
    ctx.fillStyle = pal.accent;
    ctx.fillRect((-BLOCK_L / 2) * s, (-BLOCK_H / 2) * s, BLOCK_L * s, BLOCK_H * s);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.2;
    ctx.strokeRect((-BLOCK_L / 2) * s, (-BLOCK_H / 2) * s, BLOCK_L * s, BLOCK_H * s);
    ctx.restore();

    // Forces from the block centre; scale so that mg is about 72 px.
    const k = 72 / this.f.weight;
    const num = (label: string, value: number) => (this.hidden ? label : `${label} = ${fmt(value, 2)} N`);
    // Components of gravity
    line(ctx, cx, cy, cx + u.x * this.f.along * k, cy + u.y * this.f.along * k, pal.muted, 1.2, [4, 3]);
    line(ctx, cx, cy, cx - n.x * this.f.into * k, cy - n.y * this.f.into * k, pal.muted, 1.2, [4, 3]);
    arrow(ctx, cx, cy, cx, cy + this.f.weight * k, { color: pal.ink, width: 2.2 });
    text(ctx, num('mg', this.f.weight), cx + 8, cy + this.f.weight * k + 4, { color: pal.ink, size: 12, mono: true, plate: pal.bg });
    arrow(ctx, cx, cy, cx + n.x * this.f.normal * k, cy + n.y * this.f.normal * k, { color: pal.blue, width: 2.2 });
    text(ctx, num('N', this.f.normal), cx + n.x * this.f.normal * k + 6, cy + n.y * this.f.normal * k - 6, { color: pal.blue, size: 12, mono: true, plate: pal.bg });
    if (this.f.friction > 1e-9) {
      const fx = cx - u.x * this.f.friction * k;
      const fy = cy - u.y * this.f.friction * k;
      arrow(ctx, cx, cy, fx, fy, { color: pal.red, width: 2.2 });
      text(ctx, num(this.f.moves ? 'F fr' : 'F fr (static)', this.f.friction), fx - 6, fy - 10, { color: pal.red, size: 12, mono: true, align: 'right', plate: pal.bg });
    }

    text(ctx, this.hidden ? `μ = ? · ${SURFACES[this.params.surface!]!.label}` : `μ = ${fmt(this.phys.mu, 2)} · g = 9.81 m/s²`, 12, 16, { color: pal.muted, size: 12, mono: true });
    if (!this.f.moves) text(ctx, 'The block stays at rest: mg·sin α ≤ μ·mg·cos α', 12, 34, { color: pal.ink, size: 12, weight: 600 });
  }

  readouts(o: Pick<View, 'real' | 'noise'>): Readout[] {
    const hide = (v: string) => (this.hidden ? '?' : v);
    return [
      { label: 'Acceleration', symbol: 'a', unit: 'm/s²', text: hide(fmt(this.f.a, 2)) },
      { label: 'Speed', symbol: 'v', unit: 'm/s', text: fmt(this.v, 2) },
      { label: 'Distance', symbol: 'x', unit: 'm', text: fmt(this.x, 3) },
      { label: 'Friction', symbol: 'F', unit: 'N', text: hide(fmt(this.f.friction, 2)) },
      { label: 'Normal force', symbol: 'N', unit: 'N', text: hide(fmt(this.f.normal, 2)) },
      { label: 'Gate timer', symbol: 't', unit: 's', text: fmt(this.gateReading(o.real, o.noise), 3) },
    ];
  }

  describe(): string {
    return `Block of ${fmt(this.phys.m, 1)} kg on a ${fmt(this.phys.alpha / DEG, 0)} degree slope. ${this.f.moves ? `It slides; ${fmt(this.x, 2)} m travelled.` : 'It stays at rest.'}`;
  }
}
