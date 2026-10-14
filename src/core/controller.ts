// Runs one experiment outside of Preact: fixed-step integration decoupled from
// the frame rate, canvas rendering, stopwatch, instruments and graph history.
// UI components subscribe and re-render at most ~8 times per second.

import { useEffect, useReducer } from 'preact/hooks';
import type {
  Experiment,
  LabRow,
  MeterReading,
  NoiseFn,
  ParamValues,
  SimInstance,
  StopwatchState,
} from '../experiments/types';
import { fitCanvas } from '../shared/canvas';
import { drawChart, niceRange } from '../shared/chart';
import { makeNoise, readMeter } from '../shared/measure';
import { Overlays } from '../shared/overlays';
import { palette } from '../shared/palette';
import { snap } from '../shared/params';
import { randomSeed } from '../shared/rng';
import { THEME_EVENT } from '../shared/theme';

const MAX_STEPS_PER_FRAME = 400;
const GRAPH_WINDOW = 10; // s of simulation time
const EMIT_INTERVAL = 120; // ms
const SERIES_DASH: number[][] = [[], [7, 4], [2, 3], [10, 3, 2, 3]];

interface Surface {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export class Controller {
  readonly exp: Experiment;
  params: ParamValues;
  sim: SimInstance;
  running = false;
  speed = 1;
  real: boolean;
  sw: StopwatchState = { start: null, stop: null };
  readonly overlays = new Overlays();
  graphKey: string;
  noise: NoiseFn;

  private salt = randomSeed();
  private acc = 0;
  private last = -1;
  private raf = 0;
  private dirty = true;
  private subs = new Set<() => void>();
  private emitAt = 0;
  private pendingEmit = false;
  private scene: Surface | null = null;
  private graph: Surface | null = null;
  private histT: number[] = [];
  private hist = new Map<string, number[][]>();
  private yRanges = new Map<string, [number, number]>();

  constructor(exp: Experiment, params: ParamValues, real: boolean) {
    this.exp = exp;
    this.params = params;
    this.real = real;
    this.sim = exp.create(params);
    this.noise = makeNoise(this.setupKey());
    this.graphKey = exp.graphs?.[0]?.key ?? '';
    this.overlays.rulerLength = exp.instruments.ruler ?? 1;
    this.resetHistory();
  }

  // ---- subscription -------------------------------------------------------

  subscribe(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  private emitNow(): void {
    this.pendingEmit = false;
    this.emitAt = performance.now();
    this.subs.forEach((cb) => cb());
  }

  invalidate(): void {
    this.dirty = true;
  }

  // ---- lifecycle ------------------------------------------------------------

  attach(): void {
    this.last = -1;
    this.raf = requestAnimationFrame(this.frame);
    window.addEventListener(THEME_EVENT, this.onTheme);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detach(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener(THEME_EVENT, this.onTheme);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private onTheme = () => {
    this.dirty = true;
  };

  private onVisibility = () => {
    // Hidden tabs get no frames; on return, do not catch up the missed time.
    this.last = -1;
    this.acc = 0;
  };

  attachScene(canvas: HTMLCanvasElement | null, w = 0, h = 0): void {
    this.scene = canvas ? { canvas, w, h } : null;
    this.dirty = true;
  }

  attachGraph(canvas: HTMLCanvasElement | null, w = 0, h = 0): void {
    this.graph = canvas ? { canvas, w, h } : null;
    this.dirty = true;
  }

  // ---- loop -----------------------------------------------------------------

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (this.last < 0) this.last = now;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    if (this.running && this.exp.kind === 'dynamic' && this.sim.step) {
      this.acc += dt * this.speed;
      const h = this.exp.dt ?? 1e-3;
      let n = 0;
      while (this.acc >= h && n < MAX_STEPS_PER_FRAME) {
        this.sim.step(h);
        this.acc -= h;
        n++;
        if (this.sim.done) {
          this.running = false;
          this.acc = 0;
          this.pendingEmit = true;
          break;
        }
      }
      if (n >= MAX_STEPS_PER_FRAME) this.acc = 0;
      if (n > 0) {
        this.sample();
        this.dirty = true;
        this.pendingEmit = true;
      }
    }

    if (this.dirty) {
      this.dirty = false;
      this.renderScene();
      this.renderGraph();
    }
    if (this.pendingEmit && now - this.emitAt > EMIT_INTERVAL) this.emitNow();
  };

  private renderScene(): void {
    const s = this.scene;
    if (!s || s.w <= 0 || s.h <= 0) return;
    const ctx = fitCanvas(s.canvas, s.w, s.h);
    const pal = palette();
    this.sim.render({ ctx, w: s.w, h: s.h, pal, sw: this.sw, real: this.real, noise: this.noise });
    this.overlays.draw(ctx, s.w, this.sim.scale, pal);
  }

  // ---- graph history --------------------------------------------------------

  private resetHistory(): void {
    this.histT = [];
    this.hist.clear();
    this.yRanges.clear();
    for (const g of this.exp.graphs ?? []) this.hist.set(g.key, g.series.map(() => []));
    this.sample();
  }

  private sample(): void {
    const graphs = this.exp.graphs;
    if (!graphs) return;
    this.histT.push(this.sim.t);
    for (const g of graphs) {
      const arrs = this.hist.get(g.key)!;
      for (let i = 0; i < g.series.length; i++) arrs[i]!.push(g.series[i]!.get(this.sim));
    }
    // Drop old samples in batches to keep the arrays short without per-frame shifting.
    if (this.histT.length > 3000) {
      const t0 = this.sim.t - GRAPH_WINDOW * 1.2;
      let cut = 0;
      while (cut < this.histT.length && this.histT[cut]! < t0) cut++;
      if (cut > 0) {
        this.histT.splice(0, cut);
        for (const arrs of this.hist.values()) for (const a of arrs) a.splice(0, cut);
      }
    }
  }

  setGraph(key: string): void {
    this.graphKey = key;
    this.dirty = true;
    this.emitNow();
  }

  private renderGraph(): void {
    const g = this.graph;
    const def = this.exp.graphs?.find((d) => d.key === this.graphKey);
    if (!g || !def || g.w <= 0 || g.h <= 0) return;
    const ctx = fitCanvas(g.canvas, g.w, g.h);
    const pal = palette();
    const tNow = this.histT.length ? this.histT[this.histT.length - 1]! : 0;
    const t1 = Math.max(GRAPH_WINDOW, tNow);
    const t0 = t1 - GRAPH_WINDOW;
    let lo = 0;
    let hi = this.histT.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.histT[mid]! < t0) lo = mid + 1;
      else hi = mid;
    }
    const start = Math.max(0, lo - 1);
    const arrs = this.hist.get(def.key)!;
    let mn = Infinity;
    let mx = -Infinity;
    for (const a of arrs) {
      for (let i = start; i < a.length; i++) {
        const v = a[i]!;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    // Expand-only autoscale so axes do not jitter during a run.
    const prev = this.yRanges.get(def.key);
    if (prev) {
      mn = Math.min(mn, prev[0]);
      mx = Math.max(mx, prev[1]);
    }
    if (Number.isFinite(mn)) this.yRanges.set(def.key, [mn, mx]);
    const [yMin, yMax] = niceRange(Number.isFinite(mn) ? mn : 0, Number.isFinite(mx) ? mx : 1);
    const colors = [pal.accent, pal.blue, pal.green, pal.violet];
    drawChart(ctx, {
      w: g.w,
      h: g.h,
      pal,
      xLabel: 't, s',
      yLabel: `${def.label}, ${def.unit}`,
      xMin: t0,
      xMax: t1,
      yMin,
      yMax,
      legend: def.series.length > 1,
      series: def.series.map((s, i) => ({
        label: s.label,
        color: colors[i % colors.length]!,
        dash: SERIES_DASH[i % SERIES_DASH.length],
        xs: this.histT,
        ys: arrs[i]!,
        start,
        n: this.histT.length,
      })),
    });
  }

  // ---- parameters -----------------------------------------------------------

  private setupKey(): string {
    return `${this.salt}|${JSON.stringify(this.params)}`;
  }

  setParam(key: string, value: number): void {
    const def = this.exp.params.find((d) => d.key === key);
    if (!def) return;
    const v = snap(def, value);
    if (this.params[key] === v) return;
    const next = { ...this.params, [key]: v };
    for (const d of this.exp.params) {
      if (d.type === 'select' && d.optionAvailable && !d.optionAvailable(next[d.key]!, next)) {
        next[d.key] = d.options?.find((o) => d.optionAvailable!(o.value, next))?.value ?? d.default;
      }
    }
    this.params = next;
    this.rebuild();
  }

  setParams(values: ParamValues): void {
    this.params = { ...values };
    this.rebuild();
  }

  private rebuild(): void {
    this.sim = this.exp.create(this.params, this.sim);
    this.sw = { start: null, stop: null };
    this.acc = 0;
    this.noise = makeNoise(this.setupKey());
    this.resetHistory();
    this.dirty = true;
    this.emitNow();
  }

  setReal(real: boolean): void {
    this.real = real;
    this.dirty = true;
    this.emitNow();
  }

  // ---- run controls -----------------------------------------------------------

  play(): void {
    if (this.exp.kind !== 'dynamic') return;
    if (this.sim.done) this.rebuild();
    this.running = true;
    this.last = -1;
    this.emitNow();
  }

  pause(): void {
    this.running = false;
    this.acc = 0;
    this.emitNow();
  }

  toggle(): void {
    if (this.running) this.pause();
    else this.play();
  }

  /** Advance by about 1/30 s of simulation time while paused. */
  stepOnce(): void {
    if (this.exp.kind !== 'dynamic' || !this.sim.step) return;
    if (this.sim.done) return;
    this.running = false;
    const h = this.exp.dt ?? 1e-3;
    const n = Math.max(1, Math.round(1 / 30 / h));
    for (let i = 0; i < n && !this.sim.done; i++) this.sim.step(h);
    this.sample();
    this.dirty = true;
    this.emitNow();
  }

  reset(): void {
    this.running = false;
    this.rebuild();
  }

  setSpeed(s: number): void {
    this.speed = s;
    this.emitNow();
  }

  // ---- stopwatch ----------------------------------------------------------------

  swRunning(): boolean {
    return this.sw.start !== null && this.sw.stop === null;
  }

  swStart(): void {
    this.sw = { start: this.sim.t, stop: null };
    this.dirty = true;
    this.emitNow();
  }

  swStop(): void {
    if (!this.swRunning()) return;
    this.sw = { ...this.sw, stop: this.sim.t };
    this.dirty = true;
    this.emitNow();
  }

  swReset(): void {
    this.sw = { start: null, stop: null };
    this.dirty = true;
    this.emitNow();
  }

  /** Elapsed stopwatch time in simulation seconds, rounded to the 0.01 s display. */
  swTime(): number {
    if (this.sw.start === null) return 0;
    const t = (this.sw.stop ?? this.sim.t) - this.sw.start;
    return Math.round(t * 100) / 100;
  }

  // ---- instruments and lab ----------------------------------------------------------

  meterReadings(): Record<string, MeterReading | null> {
    const out: Record<string, MeterReading | null> = {};
    for (const m of this.exp.instruments.meters ?? []) {
      const v = m.value(this.sim, this.params);
      if (v === null) {
        out[m.id] = null;
        continue;
      }
      const ref = m.rangeRef?.(this.sim, this.params) ?? v;
      out[m.id] = readMeter(v, ref, m.ranges, m.accuracyClass, this.real, this.noise, m.id);
    }
    return out;
  }

  recordLab(): LabRow | { error: string } {
    return this.exp.lab.record({
      params: this.params,
      sim: this.sim,
      sw: this.sw,
      meters: this.meterReadings(),
      real: this.real,
      noise: this.noise,
    });
  }

  // ---- overlays -------------------------------------------------------------------

  toggleOverlay(kind: 'ruler' | 'protractor'): void {
    const s = this.scene;
    this.overlays.toggle(kind, s?.w ?? 300, s?.h ?? 200);
    this.dirty = true;
    this.emitNow();
  }
}

/** Re-render a component whenever the controller emits. */
export function useController(ctrl: Controller): void {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => ctrl.subscribe(() => force(0)), [ctrl]);
}
