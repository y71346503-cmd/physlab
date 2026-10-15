import { arrow, clear, line, mix, text, withAlpha } from '../../shared/canvas';
import { G_EARTH, LIQUIDS, MATERIALS } from '../../shared/constants';
import { fmt } from '../../shared/format';
import { quantize } from '../../shared/measure';
import type { MeterRange, NoiseFn, ParamValues, Readout, SimInstance, View } from '../types';
import { CYL_AREA, CYL_HEIGHT, solve, V_LIQUID, type ArchPhys, type ArchState } from './model';

/** Division of the measuring cylinder, cm^3. */
export const CYL_DIV = 5;
export const DYNAMOMETER_RANGES: MeterRange[] = [
  { max: 1, div: 0.02 },
  { max: 2.5, div: 0.05 },
  { max: 5, div: 0.1 },
  { max: 10, div: 0.2 },
  { max: 25, div: 0.5 },
  { max: 50, div: 1 },
];
const STRING = 2.5; // cm
const DYN_LEN = 8; // cm

export function physFrom(p: ParamValues): ArchPhys {
  return { rhoBody: p.rhoB!, rhoLiquid: p.rhoL!, V: p.V!, depth: p.depth!, g: G_EARTH };
}

function liquidColor(rho: number): string {
  return LIQUIDS.find((l) => l.rho === rho)?.color ?? (rho > 5000 ? '#a7adb3' : '#5aa9e6');
}

function bodyColor(rho: number): string {
  return MATERIALS.find((m) => m.rho === rho)?.color ?? '#c98a4b';
}

export class ArchimedesSim implements SimInstance {
  readonly phys: ArchPhys;
  readonly st: ArchState;
  t = 0;
  scale = 0;

  constructor(readonly params: ParamValues) {
    this.phys = physFrom(params);
    this.st = solve(this.phys);
  }

  /** Volume read from the cylinder scale, cm^3. */
  cylinderReading(real: boolean, noise: NoiseFn): number {
    return quantize(this.st.reading + (real ? noise('cyl', 1.2) : 0), CYL_DIV);
  }

  render(v: View): void {
    const { ctx, w, h, pal } = v;
    clear(ctx, w, h, pal.bg);
    const st = this.st;
    const k = (h - 40) / 28;
    this.scale = k * 100;
    const axisX = Math.min(w * 0.42, w / 2 - 20);
    const baseY = h - 14 - 1.2 * k;
    const Y = (y: number) => baseY - y * k;
    const cylW = 2 * Math.sqrt(CYL_AREA / Math.PI);

    // Stand: base and rod
    const rodX = axisX - 8 * k;
    ctx.fillStyle = pal.muted;
    ctx.fillRect(rodX - 2.5 * k, baseY + 0.2 * k, 9 * k, 0.8 * k);

    // Positions (cm from the cylinder bottom)
    const level = st.level;
    const bodyBottom = level - st.hSub;
    const bodyTop = bodyBottom + st.side;
    const tautTop = level - this.phys.depth + st.side;
    const hookY = tautTop + STRING;
    const dynBottom = hookY + 0.6;
    const dynTop = dynBottom + DYN_LEN;

    // Rod, arm and clamp
    line(ctx, rodX, baseY, rodX, Y(dynTop + 2.2), pal.muted, 4);
    line(ctx, rodX, Y(dynTop + 0.8), axisX, Y(dynTop + 0.8), pal.muted, 3);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(rodX - 5, Y(dynTop + 0.8) - 5, 10, 10);
    line(ctx, axisX, Y(dynTop + 0.8), axisX, Y(dynTop), pal.ink, 1.5);

    // Spring scale
    this.drawDynamometer(ctx, axisX, Y(dynTop), Y(dynBottom), k, v);

    // String (sags when slack)
    ctx.save();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(axisX, Y(hookY));
    if (st.slack) ctx.bezierCurveTo(axisX + 1.8 * k, Y(hookY - 0.3), axisX + 1.8 * k, Y(bodyTop + 0.3), axisX, Y(bodyTop));
    else ctx.lineTo(axisX, Y(bodyTop));
    ctx.stroke();
    ctx.restore();

    // Cylinder with liquid
    const cx0 = axisX - (cylW / 2) * k;
    const cw = cylW * k;
    ctx.fillStyle = withAlpha(liquidColor(this.phys.rhoLiquid), pal.dark ? 0.45 : 0.35);
    ctx.fillRect(cx0, Y(level), cw, level * k);
    line(ctx, cx0, Y(level), cx0 + cw, Y(level), mix(liquidColor(this.phys.rhoLiquid), '#000000', 0.25), 1.5);

    // Body
    const bx = axisX - (st.side / 2) * k;
    ctx.fillStyle = bodyColor(this.phys.rhoBody);
    ctx.fillRect(bx, Y(bodyTop), st.side * k, st.side * k);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, Y(bodyTop), st.side * k, st.side * k);
    // Re-tint the submerged part
    if (st.hSub > 0) {
      ctx.fillStyle = withAlpha(liquidColor(this.phys.rhoLiquid), 0.3);
      ctx.fillRect(bx, Y(Math.min(level, bodyTop)), st.side * k, Math.min(st.hSub, st.side) * k);
    }

    // Glass
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx0, Y(CYL_HEIGHT));
    ctx.lineTo(cx0, Y(0));
    ctx.lineTo(cx0 + cw, Y(0));
    ctx.lineTo(cx0 + cw, Y(CYL_HEIGHT));
    ctx.stroke();
    ctx.fillStyle = pal.muted;
    ctx.fillRect(cx0 - 0.6 * k, Y(0), cw + 1.2 * k, 0.5 * k);
    // Graduation: every 50 cm^3, labels every 100 cm^3
    for (let vol = 50; vol <= CYL_AREA * CYL_HEIGHT; vol += 50) {
      const y = Y(vol / CYL_AREA);
      const major = vol % 100 === 0;
      line(ctx, cx0 + cw - (major ? 9 : 5), y, cx0 + cw, y, pal.ink, 1);
      if (major) text(ctx, String(vol), cx0 + cw + 4, y, { color: pal.muted, size: 9, mono: true });
    }
    const reading = this.cylinderReading(v.real, v.noise);
    text(ctx, `${fmt(reading, 0)} cm³`, cx0 + cw + 34, Y(level), { color: pal.ink, size: 12, mono: true, weight: 600, plate: pal.bg, clampW: w });

    // Forces on the body
    const fmax = Math.max(st.weight, st.buoyancy, 1e-9);
    const fk = Math.min(70, 4 * k) / fmax;
    const bc = Y(bodyBottom + st.side / 2);
    arrow(ctx, axisX + 6, bc, axisX + 6, bc + st.weight * fk, { color: pal.ink, width: 2 });
    text(ctx, 'mg', axisX + 12, bc + st.weight * fk, { color: pal.ink, size: 12, weight: 600 });
    if (st.buoyancy > 1e-6) {
      arrow(ctx, axisX - 6, bc, axisX - 6, bc - st.buoyancy * fk, { color: pal.blue, width: 2 });
      text(ctx, 'F_A', axisX - 12, bc - st.buoyancy * fk, { color: pal.blue, size: 12, weight: 600, align: 'right', plate: pal.bg });
    }

    text(ctx, `ρ liquid = ${fmt(this.phys.rhoLiquid, 0)} kg/m³ · ρ body = ${fmt(this.phys.rhoBody, 0)} kg/m³`, 10, 14, { color: pal.muted, size: 11, mono: true, clampW: w });
    if (st.slack) text(ctx, 'The body floats: the string is slack and the scale shows 0.', 10, 32, { color: pal.ink, size: 12, weight: 600, clampW: w });
  }

  private drawDynamometer(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBottom: number, k: number, v: View): void {
    const { pal } = v;
    const w = 1.9 * k;
    const range = DYNAMOMETER_RANGES.find((r) => this.st.weight <= r.max) ?? DYNAMOMETER_RANGES[DYNAMOMETER_RANGES.length - 1]!;
    ctx.fillStyle = pal.surface;
    ctx.fillRect(x - w / 2, yTop, w, yBottom - yTop);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - w / 2, yTop, w, yBottom - yTop);
    const s0 = yTop + 0.8 * k;
    const s1 = yBottom - 0.8 * k;
    const frac = Math.min(1, this.st.tension / range.max);
    const py = s0 + (s1 - s0) * frac;
    // Spring
    ctx.beginPath();
    const coils = 9;
    for (let i = 0; i <= coils * 2; i++) {
      const yy = yTop + 0.3 * k + ((py - yTop - 0.3 * k) * i) / (coils * 2);
      const xx = x + (i % 2 === 0 ? -1 : 1) * 0.35 * k;
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Scale ticks on the right edge
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const yy = s0 + ((s1 - s0) * i) / n;
      line(ctx, x + w / 2 - (i % 5 === 0 ? 7 : 4), yy, x + w / 2, yy, pal.ink, 1);
      if (i % 5 === 0) text(ctx, fmt((range.max * i) / n, range.max <= 5 ? 1 : 0), x + w / 2 + 3, yy, { color: pal.muted, size: 9, mono: true });
    }
    // Pointer
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 2, py);
    ctx.lineTo(x - w / 2 + 3, py - 4);
    ctx.lineTo(x - w / 2 + 3, py + 4);
    ctx.closePath();
    ctx.fill();
    // Hook
    line(ctx, x, yBottom, x, yBottom + 0.5 * k, pal.ink, 1.5);
    text(ctx, 'N', x, yTop - 8, { color: pal.muted, size: 10, mono: true, weight: 700, align: 'center' });
  }

  readouts(o: Pick<View, 'real' | 'noise'>): Readout[] {
    const st = this.st;
    return [
      { label: 'Submerged', unit: '%', text: fmt((st.Vsub / this.phys.V) * 100, 0) },
      { label: 'Buoyant force', symbol: 'F_A', unit: 'N', text: fmt(st.buoyancy, 3) },
      { label: 'Cylinder', symbol: 'V', unit: 'cm³', text: fmt(this.cylinderReading(o.real, o.noise), 0) },
      { label: 'State', unit: '', text: st.slack ? 'floats' : st.hSub <= 0 ? 'in air' : st.fullySubmerged ? 'under water' : 'partly in' },
    ];
  }

  describe(): string {
    const st = this.st;
    return `A ${fmt(this.phys.V, 0)} cubic centimetre body of density ${fmt(this.phys.rhoBody, 0)} hangs on a spring scale over a liquid of density ${fmt(this.phys.rhoLiquid, 0)}. ${fmt((st.Vsub / this.phys.V) * 100, 0)} percent is submerged; ${st.slack ? 'it floats.' : `the scale is stretched by ${fmt(st.tension, 2)} newtons.`} The cylinder shows ${fmt(V_LIQUID + st.Vsub, 0)} cubic centimetres.`;
  }
}
