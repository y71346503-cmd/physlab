import { arrow, clear, hatch, line, text } from '../../shared/canvas';
import { WORLDS, type World } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import type { ParamValues, Readout, SimInstance, View } from '../types';
import { energies, gravityAccel, step as advance, type PendulumPhys, type PendulumState } from './model';

export function physFrom(p: ParamValues): PendulumPhys {
  return { L: p.L!, m: p.m!, g: WORLDS[p.world!]!.g, gamma: p.gamma! };
}

export function worldOf(p: ParamValues): World {
  return WORLDS[p.world!] ?? WORLDS[0]!;
}

export class PendulumSim implements SimInstance, PendulumState {
  readonly phys: PendulumPhys;
  readonly world: World;
  readonly theta0: number;
  theta: number;
  omega = 0;
  t = 0;
  a: number;
  scale = 0;
  /** Times of upward zero crossings: one per full oscillation. */
  readonly crossings: number[] = [];
  private readonly e0: number;
  private readonly vmax: number;

  constructor(readonly params: ParamValues) {
    this.phys = physFrom(params);
    this.world = worldOf(params);
    this.theta0 = params.theta0! * DEG;
    this.theta = this.theta0;
    this.a = gravityAccel(this.theta, this.phys);
    this.e0 = energies(this, this.phys).total;
    this.vmax = Math.sqrt(2 * this.phys.g * this.phys.L * (1 - Math.cos(this.theta0)));
  }

  step(h: number): void {
    const prev = this.theta;
    const t0 = this.t;
    advance(this, this.phys, h);
    if (prev < 0 && this.theta >= 0) this.crossings.push(t0 + (h * -prev) / (this.theta - prev));
  }

  /** Full oscillations completed in (t0, t1]. */
  oscillations(t0: number, t1: number): number {
    let n = 0;
    for (const c of this.crossings) if (c > t0 && c <= t1) n++;
    return n;
  }

  gText(): string {
    return this.world.hidden ? '?' : fmt(this.phys.g, 2);
  }

  render(v: View): void {
    const { ctx, w, h, pal } = v;
    clear(ctx, w, h, pal.bg);
    const L = this.phys.L;
    const top = 40;
    const px = Math.min((h - top - 40) / L, (w * 0.4) / L);
    this.scale = px;
    const cx = Math.min(w * 0.45, w - 140 - L * px * 0.3);
    const R = L * px;

    // Support
    hatch(ctx, cx - 70, top - 12, 140, 12, pal.faint);
    line(ctx, cx - 70, top, cx + 70, top, pal.ink, 2);
    line(ctx, cx, top, cx, top + R + 22, pal.faint, 1, [4, 5]);

    // Path of the bob for the release amplitude
    ctx.save();
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, top, R, Math.PI / 2 - this.theta0, Math.PI / 2 + this.theta0);
    ctx.stroke();
    ctx.restore();

    const bx = cx + R * Math.sin(this.theta);
    const by = top + R * Math.cos(this.theta);

    // Angle from the vertical
    if (Math.abs(this.theta) > 0.5 * DEG) {
      const r = Math.min(52, R * 0.4);
      ctx.save();
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, top, r, Math.PI / 2, Math.PI / 2 - this.theta, this.theta > 0);
      ctx.stroke();
      ctx.restore();
      const mid = Math.PI / 2 - this.theta / 2;
      text(ctx, `${fmt(this.theta / DEG, 1)}°`, cx + (r + 18) * Math.cos(mid), top + (r + 12) * Math.sin(mid), {
        color: pal.ink,
        size: 12,
        mono: true,
        align: 'center',
        plate: pal.bg,
      });
    }

    line(ctx, cx, top, bx, by, pal.ink, 1.6);
    ctx.beginPath();
    ctx.arc(cx, top, 3, 0, Math.PI * 2);
    ctx.fillStyle = pal.ink;
    ctx.fill();

    // Velocity vector
    const vx = L * this.omega * Math.cos(this.theta);
    const vy = -L * this.omega * Math.sin(this.theta);
    const k = this.vmax > 1e-6 ? 56 / this.vmax : 0;
    const rb = 7 + 9 * Math.cbrt(this.phys.m / 2);
    if (Math.hypot(vx, vy) * k > rb + 4) {
      arrow(ctx, bx, by, bx + vx * k, by + vy * k, { color: pal.green, width: 2 });
      text(ctx, 'v', bx + vx * k + (vx > 0 ? 8 : -8), by + vy * k - 8, { color: pal.green, size: 13, weight: 600, align: 'center' });
    }

    // Bob
    ctx.beginPath();
    ctx.arc(bx, by, rb, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    this.drawEnergy(v);

    // Labels
    text(ctx, `g = ${this.gText()} m/s² · ${this.world.label}`, 12, 16, { color: pal.muted, size: 12, mono: true });
    if (v.sw.start !== null) {
      const n = this.oscillations(v.sw.start, v.sw.stop ?? this.t);
      text(ctx, `Full oscillations: ${n}`, 12, h - 16, { color: pal.ink, size: 13, mono: true, weight: 600, plate: pal.bg });
    }
  }

  private drawEnergy(v: View): void {
    const { ctx, w, h, pal } = v;
    if (this.e0 <= 0) return;
    const e = energies(this, this.phys);
    const bars = [
      { label: 'Ek', value: e.kinetic, color: pal.accent },
      { label: 'Ep', value: e.potential, color: pal.blue },
      { label: 'E', value: e.total, color: pal.ink },
    ];
    const bw = 16;
    const gap = 8;
    const x0 = w - 12 - bars.length * (bw + gap);
    const base = h - 30;
    const H = Math.min(h * 0.45, 170);
    text(ctx, 'ENERGY', x0, base - H - 14, { color: pal.muted, size: 10, mono: true, weight: 600 });
    line(ctx, x0 - 4, base, w - 10, base, pal.faint);
    bars.forEach((b, i) => {
      const x = x0 + i * (bw + gap);
      const hh = (b.value / this.e0) * H;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, base - hh, bw, hh);
      text(ctx, b.label, x + bw / 2, base + 11, { color: pal.muted, size: 11, mono: true, align: 'center' });
    });
  }

  readouts(): Readout[] {
    const e = energies(this, this.phys);
    return [
      { label: 'Angle', symbol: 'θ', unit: '°', text: fmt(this.theta / DEG, 1) },
      { label: 'Speed', symbol: 'v', unit: 'm/s', text: fmt(Math.abs(this.phys.L * this.omega), 2) },
      { label: 'Energy', symbol: 'E', unit: 'J', text: fmt(e.total, 3) },
      { label: 'Gravity', symbol: 'g', unit: 'm/s²', text: this.gText() },
    ];
  }

  describe(): string {
    return `Pendulum ${fmt(this.phys.L, 2)} m long on ${this.world.label}, released from ${fmt(this.theta0 / DEG, 0)} degrees. Current angle ${fmt(this.theta / DEG, 1)} degrees.`;
  }
}
