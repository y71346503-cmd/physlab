import { arrow, clear, hatch, line, text, withAlpha } from '../../shared/canvas';
import { niceStep } from '../../shared/chart';
import { G_EARTH } from '../../shared/constants';
import { DEG, fmt } from '../../shared/format';
import { quantize } from '../../shared/measure';
import type { NoiseFn, ParamValues, Readout, SimInstance, View } from '../types';
import { analyticFlight, BALLS, dragConstant, launchState, rk4Step, type ProjPhys } from './model';

/** Ground tape division, m. */
export const TAPE_DIV = 0.1;
const MAX_TRACES = 4;
const TRAIL_EVERY = 0.01; // s

export function physFrom(p: ParamValues): ProjPhys {
  const ball = BALLS[p.ball!] ?? BALLS[2]!;
  return { v0: p.v0!, alpha: p.alpha! * DEG, h0: p.h0!, drag: p.drag === 1, m: ball.m, d: ball.d, g: G_EARTH };
}

interface Trace {
  xs: number[];
  ys: number[];
}

export class ProjectileSim implements SimInstance {
  readonly phys: ProjPhys;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t = 0;
  done = false;
  scale = 0;
  /** Exact landing point once the ball is down. */
  range: number | null = null;
  maxHeight: number;
  /** Horizontal position of the highest point. */
  apexX = 0;
  flightTime: number | null = null;
  readonly trail: Trace = { xs: [], ys: [] };
  readonly traces: Trace[];
  private readonly kOverM: number;
  private nextTrail = 0;

  constructor(readonly params: ParamValues, prev?: ProjectileSim) {
    this.phys = physFrom(params);
    const s = launchState(this.phys);
    this.x = s.x;
    this.y = s.y;
    this.vx = s.vx;
    this.vy = s.vy;
    this.maxHeight = this.y;
    this.kOverM = dragConstant(this.phys) / this.phys.m;
    this.traces = prev ? [...prev.traces] : [];
    if (prev && prev.trail.xs.length > 2) {
      this.traces.push(prev.trail);
      if (this.traces.length > MAX_TRACES) this.traces.shift();
    }
    this.pushTrail();
    if (this.y <= 0 && this.vy <= 0) this.land(0, 0);
  }

  private pushTrail(): void {
    this.trail.xs.push(this.x);
    this.trail.ys.push(this.y);
    this.nextTrail = this.t + TRAIL_EVERY;
  }

  private land(x: number, t: number): void {
    this.x = x;
    this.y = 0;
    this.t = t;
    this.range = x;
    this.flightTime = t;
    this.done = true;
    this.pushTrail();
  }

  step(h: number): void {
    if (this.done) return;
    const px = this.x;
    const py = this.y;
    const pt = this.t;
    rk4Step(this, this.kOverM, this.phys.g, h);
    if (this.y < 0) {
      const f = py / (py - this.y);
      this.land(px + f * (this.x - px), pt + f * (this.t - pt));
      return;
    }
    if (this.y > this.maxHeight) {
      this.maxHeight = this.y;
      this.apexX = this.x;
    }
    if (this.t >= this.nextTrail) this.pushTrail();
  }

  /** Landing distance as read from the ground tape. */
  tapeReading(real: boolean, noise: NoiseFn): number | null {
    if (this.range === null) return null;
    return quantize(this.range + (real ? noise('tape', 0.04) : 0), TAPE_DIV);
  }

  render(v: View): void {
    const { ctx, w, h, pal } = v;
    clear(ctx, w, h, pal.bg);
    const a = analyticFlight(this.phys);
    let xMax = Math.max(a.range, 4);
    let yMax = Math.max(a.height, this.phys.h0, 2);
    for (const tr of [...this.traces, this.trail]) {
      for (let i = 0; i < tr.xs.length; i++) {
        xMax = Math.max(xMax, tr.xs[i]!);
        yMax = Math.max(yMax, tr.ys[i]!);
      }
    }
    xMax *= 1.08;
    yMax *= 1.18;
    const padL = 50;
    const padR = 16;
    const padT = 30;
    const padB = 36;
    const s = Math.min((w - padL - padR) / xMax, (h - padT - padB) / yMax);
    this.scale = s;
    const ox = padL;
    const oy = h - padB;
    const X = (x: number) => ox + x * s;
    const Y = (y: number) => oy - y * s;

    // Height grid
    const yStep = niceStep((oy - padT) / s, 5);
    for (let yy = yStep; yy * s < oy - 8; yy += yStep) {
      line(ctx, ox, Y(yy), w - padR, Y(yy), pal.grid);
      text(ctx, `${fmt(yy, yStep < 1 ? 1 : 0)}`, ox - 6, Y(yy), { color: pal.muted, size: 10, mono: true, align: 'right' });
    }
    text(ctx, 'm', ox - 6, padT - 12, { color: pal.muted, size: 10, mono: true, align: 'right' });

    // Ground with tape
    hatch(ctx, 0, oy, w, 10, pal.faint);
    line(ctx, 0, oy, w, oy, pal.ink, 2);
    const xStep = niceStep((w - padL - padR) / s, Math.max(3, Math.floor(w / 80)));
    const minor = xStep / 5;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let xx = 0; X(xx) <= w - 4; xx += minor) {
      const major = Math.abs(xx / xStep - Math.round(xx / xStep)) < 1e-6;
      ctx.moveTo(Math.round(X(xx)) + 0.5, oy);
      ctx.lineTo(Math.round(X(xx)) + 0.5, oy + (major ? 7 : 4));
    }
    ctx.stroke();
    for (let xx = 0; X(xx) <= w - 10; xx += xStep) {
      text(ctx, fmt(xx, xStep < 1 ? 1 : 0), X(xx), oy + 19, { color: pal.muted, size: 10, mono: true, align: 'center' });
    }

    // Launch tower and cannon
    if (this.phys.h0 > 0) {
      ctx.fillStyle = withAlpha(pal.dark ? '#5d6862' : '#9aa49e', 0.35);
      ctx.fillRect(X(0) - 22, Y(this.phys.h0), 22, this.phys.h0 * s);
      ctx.strokeStyle = pal.muted;
      ctx.strokeRect(X(0) - 22 + 0.5, Y(this.phys.h0) + 0.5, 22, this.phys.h0 * s);
    }
    ctx.save();
    ctx.translate(X(0), Y(this.phys.h0));
    ctx.rotate(-this.phys.alpha);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(-6, -5, 30, 10);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(X(0), Y(this.phys.h0), 7, 0, Math.PI * 2);
    ctx.fillStyle = pal.muted;
    ctx.fill();

    // Previous throws
    for (const tr of this.traces) this.polyline(ctx, tr, X, Y, pal.muted, [4, 4], 1.4);
    // Current trajectory
    this.polyline(ctx, this.trail, X, Y, pal.accent, [], 2);

    // Apex marker
    if (this.vy < 0 || this.done) {
      const H = this.maxHeight;
      if (H > this.phys.h0 + 0.01) {
        const ax = this.apexX;
        line(ctx, ox, Y(H), X(ax), Y(H), pal.muted, 1, [3, 4]);
        text(ctx, `H = ${fmt(H, 2)} m`, X(ax), Y(H) - 12, { color: pal.ink, size: 11, mono: true, align: 'center', plate: pal.bg });
      }
    }

    // Ball and velocity
    const bx = X(this.x);
    const by = Y(this.y);
    if (!this.done && this.t > 0) {
      const k = 52 / Math.max(this.phys.v0, 1);
      line(ctx, bx, by, bx + this.vx * k, by, pal.green, 1, [3, 3]);
      line(ctx, bx, by, bx, by - this.vy * k, pal.green, 1, [3, 3]);
      arrow(ctx, bx, by, bx + this.vx * k, by - this.vy * k, { color: pal.green, width: 2 });
    }
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Landing mark
    if (this.range !== null) {
      const lx = X(this.range);
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.moveTo(lx, oy);
      ctx.lineTo(lx - 5, oy - 9);
      ctx.lineTo(lx + 5, oy - 9);
      ctx.closePath();
      ctx.fill();
      const reading = this.tapeReading(v.real, v.noise);
      text(ctx, `L = ${fmt(reading, 1)} m`, Math.min(lx, w - 50), oy - 20, { color: pal.ink, size: 12, mono: true, weight: 600, align: 'center', plate: pal.bg });
    }

    text(ctx, `g = 9.81 m/s² · air resistance ${this.phys.drag ? 'on' : 'off'}`, 12, 16, { color: pal.muted, size: 12, mono: true });
  }

  private polyline(ctx: CanvasRenderingContext2D, tr: Trace, X: (x: number) => number, Y: (y: number) => number, color: string, dash: number[], width: number): void {
    if (tr.xs.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(X(tr.xs[0]!), Y(tr.ys[0]!));
    for (let i = 1; i < tr.xs.length; i++) ctx.lineTo(X(tr.xs[i]!), Y(tr.ys[i]!));
    if (!this.done && tr === this.trail) ctx.lineTo(X(this.x), Y(this.y));
    ctx.stroke();
    ctx.restore();
  }

  readouts(o: Pick<View, 'real' | 'noise'>): Readout[] {
    return [
      { label: 'Distance', symbol: 'x', unit: 'm', text: fmt(this.x, 2) },
      { label: 'Height', symbol: 'y', unit: 'm', text: fmt(this.y, 2) },
      { label: 'Speed', symbol: 'v', unit: 'm/s', text: fmt(Math.hypot(this.vx, this.vy), 2) },
      { label: 'Max height', symbol: 'H', unit: 'm', text: fmt(this.maxHeight, 2) },
      { label: 'Range', symbol: 'L', unit: 'm', text: fmt(this.tapeReading(o.real, o.noise), 1) },
      { label: 'Flight time', symbol: 'T', unit: 's', text: fmt(this.flightTime, 2) },
    ];
  }

  describe(): string {
    const p = this.phys;
    const state = this.done ? `Landed at ${fmt(this.range, 1)} metres.` : this.t > 0 ? `In flight at ${fmt(this.x, 1)} m, height ${fmt(this.y, 1)} m.` : 'Ready to launch.';
    return `Ball launched at ${fmt(p.v0, 1)} m/s and ${fmt(p.alpha / DEG, 0)} degrees from ${fmt(p.h0, 1)} m, air resistance ${p.drag ? 'on' : 'off'}. ${state}`;
  }
}
