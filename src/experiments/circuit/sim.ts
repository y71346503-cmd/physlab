import { clear, line, text } from '../../shared/canvas';
import { decimalsOf, fmt } from '../../shared/format';
import { readMeter } from '../../shared/measure';
import type { ParamValues, Readout, SimInstance, View } from '../types';
import { LAMP } from '../../shared/constants';
import { SCHEMES, solveSetup, type CircuitSetup, type CircuitState, type Scheme } from './model';

export type ElemId = 'e1' | 'R2' | 'R3';
const ELEMS: ElemId[] = ['e1', 'R2', 'R3'];

/** Ammeter positions: 0 main line, 1..3 the branch of element 1..3. Voltmeter: 0 source, 1..3 across element. */
export const AMMETER_POS = ['Main line', 'Branch of element 1', 'Branch of R2', 'Branch of R3'];
export const VOLTMETER_POS = ['Across the source', 'Across element 1', 'Across R2', 'Across R3'];

/** School lab meters: auto-ranging, accuracy class 1.5. */
export const AMMETER_RANGES = [
  { max: 0.6, div: 0.02 },
  { max: 3, div: 0.1 },
  { max: 15, div: 0.5 },
];
export const VOLTMETER_RANGES = [
  { max: 3, div: 0.1 },
  { max: 6, div: 0.2 },
  { max: 15, div: 0.5 },
];
export const METER_CLASS = 1.5;

export function setupFrom(p: ParamValues): CircuitSetup {
  return { scheme: p.scheme as Scheme, emf: p.emf!, r: p.r!, lamp: p.elem === 1, R1: p.R1!, R2: p.R2!, R3: p.R3! };
}

/** Which elements exist in a scheme. */
export function hasElement(scheme: number, pos: number): boolean {
  if (pos <= 1) return true;
  if (pos === 2) return scheme >= 1;
  return scheme === 3;
}

type Pt = [number, number];
interface Layout {
  wires: Pt[][];
  elems: Partial<Record<ElemId, Pt>>;
  /** Ammeter slots for branch currents. */
  slots: Partial<Record<1 | 2 | 3, Pt>>;
  /** Voltmeter bridges: path from one node to the other, meter in the middle. */
  bridges: Partial<Record<0 | 1 | 2 | 3, { path: Pt[]; at: Pt; vertical?: boolean }>>;
}

const LOOP: Pt[] = [
  [1, 1],
  [11, 1],
  [11, 6],
  [1, 6],
  [1, 1],
];
const SOURCE_BRIDGE = {
  path: [
    [1, 2.4],
    [2.3, 2.4],
    [2.3, 4.6],
    [1, 4.6],
  ] as Pt[],
  at: [2.3, 3.5] as Pt,
  vertical: true,
};
const bridge = (x1: number, x2: number, yTop: number, yBottom: number) => ({
  path: [
    [x1, yTop],
    [x1, yBottom],
    [x2, yBottom],
    [x2, yTop],
  ] as Pt[],
  at: [(x1 + x2) / 2, yBottom] as Pt,
});

const LAYOUTS: Record<Scheme, Layout> = {
  0: {
    wires: [LOOP],
    elems: { e1: [6.5, 1] },
    slots: { 1: [3.2, 1] },
    bridges: { 0: SOURCE_BRIDGE, 1: bridge(4.6, 8.4, 1, 2.8) },
  },
  1: {
    wires: [LOOP],
    elems: { e1: [4.6, 1], R2: [8.6, 1] },
    slots: { 1: [2.1, 1], 2: [6.6, 1] },
    bridges: { 0: SOURCE_BRIDGE, 1: bridge(3.3, 5.9, 1, 2.8), 2: bridge(7.3, 9.9, 1, 2.8) },
  },
  2: {
    wires: [
      LOOP,
      [
        [3.4, 1],
        [3.4, 3.2],
        [9.4, 3.2],
        [9.4, 1],
      ],
    ],
    elems: { e1: [6.9, 1], R2: [6.9, 3.2] },
    slots: { 1: [4.6, 1], 2: [4.6, 3.2] },
    bridges: { 0: SOURCE_BRIDGE, 1: bridge(3.4, 9.4, 3.2, 4.9), 2: bridge(3.4, 9.4, 3.2, 4.9) },
  },
  3: {
    wires: [
      LOOP,
      [
        [5.4, 1],
        [5.4, 3.2],
        [10.2, 3.2],
        [10.2, 1],
      ],
    ],
    elems: { e1: [3.3, 1], R2: [8.1, 1], R3: [8.1, 3.2] },
    slots: { 1: [1.75, 1], 2: [6.4, 1], 3: [6.4, 3.2] },
    bridges: { 0: SOURCE_BRIDGE, 1: bridge(2.35, 4.4, 1, 2.6), 2: bridge(5.4, 10.2, 3.2, 4.9), 3: bridge(5.4, 10.2, 3.2, 4.9) },
  },
};

export class CircuitSim implements SimInstance {
  readonly setup: CircuitSetup;
  readonly state: CircuitState;
  readonly amm: number;
  readonly volt: number;
  t = 0;

  constructor(readonly params: ParamValues) {
    this.setup = setupFrom(params);
    this.state = solveSetup(this.setup);
    this.amm = params.amm!;
    this.volt = params.volt!;
  }

  /** True current through the ammeter, A. */
  ammeterValue(): number {
    const s = this.state.sol;
    if (this.amm === 0) return Math.abs(s.Isource);
    const id = ELEMS[this.amm - 1]!;
    return Math.abs(s.I[id] ?? 0);
  }

  /** True voltage across the voltmeter, V. */
  voltmeterValue(): number {
    if (this.volt === 0) return Math.abs(this.state.Uterm);
    return Math.abs(this.state.U[ELEMS[this.volt - 1]!] ?? 0);
  }

  /** Current through element 1 (what Ohm's law lab needs). */
  ammeterMeasuresElement1(): boolean {
    return this.amm === 1 || (this.amm === 0 && this.setup.scheme !== 2);
  }

  elementLabel(id: ElemId): string {
    if (id === 'e1') return this.setup.lamp ? 'Lamp' : 'R1';
    return id;
  }

  render(v: View): void {
    const { ctx, w, h, pal } = v;
    clear(ctx, w, h, pal.bg);
    const L = LAYOUTS[this.setup.scheme];
    const u = Math.min((w - 16) / 12, (h - 16) / 7);
    const ox = (w - 12 * u) / 2;
    const oy = (h - 7 * u) / 2;
    const P = ([x, y]: Pt): Pt => [ox + x * u, oy + y * u];
    const wire = pal.ink;

    const poly = (pts: Pt[], color = wire, width = 2) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = P(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    };
    const dot = (p: Pt) => {
      const [x, y] = P(p);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = wire;
      ctx.fill();
    };

    for (const wpath of L.wires) poly(wpath);
    // Junction dots where branches meet
    for (const wpath of L.wires.slice(1)) {
      dot(wpath[0]!);
      dot(wpath[wpath.length - 1]!);
    }

    const vb = L.bridges[this.volt as 0 | 1 | 2 | 3];
    if (vb) {
      poly(vb.path, pal.muted, 1.6);
      dot(vb.path[0]!);
      dot(vb.path[vb.path.length - 1]!);
    }

    // Battery on the left side
    {
      const [x, y] = P([1, 3.5]);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(x - 0.6 * u, y - 0.16 * u, 1.2 * u, 0.32 * u);
      line(ctx, x - 0.5 * u, y - 0.12 * u, x + 0.5 * u, y - 0.12 * u, wire, 2);
      line(ctx, x - 0.25 * u, y + 0.12 * u, x + 0.25 * u, y + 0.12 * u, wire, 5);
      text(ctx, '+', x - 0.62 * u, y - 0.32 * u, { color: pal.muted, size: 12, mono: true, align: 'center' });
      text(ctx, 'ε', x - 0.62 * u, y + 0.4 * u, { color: pal.ink, size: 14, align: 'center', weight: 600 });
    }

    // Elements
    for (const id of ELEMS) {
      const at = L.elems[id];
      if (!at) continue;
      const [x, y] = P(at);
      const isLamp = id === 'e1' && this.setup.lamp;
      const val = isLamp ? '' : `${fmt(id === 'e1' ? this.setup.R1 : id === 'R2' ? this.setup.R2 : this.setup.R3, 0)} Ω`;
      if (isLamp) this.drawLamp(ctx, x, y, u, v);
      else {
        const bw = 1.5 * u;
        const bh = 0.46 * u;
        ctx.fillStyle = pal.bg;
        ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.strokeStyle = wire;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
      }
      text(ctx, `${this.elementLabel(id)}${val ? ` = ${val}` : ''}`, x, y - 0.62 * u, { color: pal.ink, size: Math.max(11, Math.min(13, u * 0.24)), mono: true, align: 'center', plate: pal.bg });
    }

    // Meters
    const meter = (at: Pt, letter: string, reading: string) => {
      const [x, y] = P(at);
      const r = Math.max(11, 0.36 * u);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = pal.surface;
      ctx.fill();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, letter, x, y + 1, { color: pal.ink, size: Math.max(11, r * 0.95), mono: true, weight: 700, align: 'center' });
      text(ctx, reading, x, y + r + 9, { color: pal.accent, size: 11, mono: true, weight: 600, align: 'center', plate: pal.bg, clampW: w });
    };
    const ammAt: Pt = this.amm === 0 ? [11, 3.5] : (L.slots[this.amm as 1 | 2 | 3] ?? [11, 3.5]);
    const a = readMeter(this.ammeterValue(), this.ammeterValue(), AMMETER_RANGES, METER_CLASS, v.real, v.noise, 'amm');
    meter(ammAt, 'A', `${fmt(a.reading, decimalsOf(a.range.div))} A`);
    if (vb) {
      const u2 = readMeter(this.voltmeterValue(), this.voltmeterValue(), VOLTMETER_RANGES, METER_CLASS, v.real, v.noise, 'volt');
      meter(vb.at, 'V', `${fmt(u2.reading, decimalsOf(u2.range.div))} V`);
    }

    // Direction of current in the main line
    const [ax, ay] = P([11, 2.2]);
    ctx.fillStyle = pal.muted;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 6);
    ctx.lineTo(ax - 5, ay - 4);
    ctx.lineTo(ax + 5, ay - 4);
    ctx.closePath();
    ctx.fill();
    text(ctx, 'I', ax + 10, ay, { color: pal.muted, size: 12, weight: 600 });

    text(ctx, `${SCHEMES[this.setup.scheme]} · ε = ${fmt(this.setup.emf, 1)} V, r = ${fmt(this.setup.r, 1)} Ω`, 10, 12, { color: pal.muted, size: 11, mono: true });
  }

  private drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, v: View): void {
    const { pal } = v;
    const r = 0.42 * u;
    const T = this.state.lamp?.T ?? LAMP.roomT;
    const glow = Math.max(0, Math.min(1, (T - 1000) / 1600));
    if (glow > 0) {
      const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
      const c = T > 2200 ? '255, 236, 170' : '255, 170, 80';
      g.addColorStop(0, `rgba(${c}, ${0.85 * glow})`);
      g.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = glow > 0 ? `rgba(255, 214, 120, ${0.25 + 0.6 * glow})` : pal.bg;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    const d = r * 0.7;
    line(ctx, x - d, y - d, x + d, y + d, pal.ink, 1.6);
    line(ctx, x - d, y + d, x + d, y - d, pal.ink, 1.6);
  }

  readouts(): Readout[] {
    const s = this.state;
    const Rext = Math.abs(s.sol.Isource) > 1e-12 ? s.Uterm / s.sol.Isource : NaN;
    const P1 = Math.abs((s.U.e1 ?? 0) * (s.sol.I.e1 ?? 0));
    const out: Readout[] = [
      { label: 'Ext. resistance', symbol: 'R', unit: 'Ω', text: fmt(Rext, 2) },
      { label: 'Element 1 power', symbol: 'P', unit: 'W', text: fmt(P1, 3) },
      { label: 'Source power', symbol: 'P', unit: 'W', text: fmt(this.setup.emf * Math.abs(s.sol.Isource), 3) },
    ];
    if (s.lamp) {
      out.push({ label: 'Lamp resistance', symbol: 'R', unit: 'Ω', text: fmt(s.lamp.R, 2) });
      out.push({ label: 'Filament temp.', symbol: 'T', unit: 'K', text: fmt(s.lamp.T, 0) });
    }
    return out;
  }

  describe(): string {
    return `${SCHEMES[this.setup.scheme]} circuit, EMF ${fmt(this.setup.emf, 1)} V. Ammeter (${AMMETER_POS[this.amm]}) shows ${fmt(this.ammeterValue(), 3)} A, voltmeter (${VOLTMETER_POS[this.volt]}) shows ${fmt(this.voltmeterValue(), 2)} V.`;
  }
}

