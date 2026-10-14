// A small Canvas chart: live time series and lab scatter plots with a fitted line.

import type { Palette } from './palette';
import { FONT_MONO, FONT_UI } from './canvas';
import { decimalsOf, fmt } from './format';

export interface ChartSeries {
  label: string;
  color: string;
  dash?: number[];
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
  /** Draw points [start, n). */
  start?: number;
  n: number;
}

export interface ChartOpts {
  w: number;
  h: number;
  pal: Palette;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  series?: ChartSeries[];
  points?: { x: number; y: number }[];
  line?: { k: number; b: number } | null;
  legend?: boolean;
}

export function niceStep(range: number, target: number): number {
  if (!(range > 0)) return 1;
  const raw = range / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nice * mag;
}

/** Expand [min, max] to "nice" bounds with some padding. */
export function niceRange(min: number, max: number, pad = 0.08): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    return [min - d, max + d];
  }
  const d = (max - min) * pad;
  return [min - d, max + d];
}

export function drawChart(ctx: CanvasRenderingContext2D, o: ChartOpts): void {
  const { w, h, pal } = o;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);

  const legendH = o.legend && o.series && o.series.length > 1 ? 20 : 0;
  const yStep = niceStep(o.yMax - o.yMin, Math.max(2, Math.floor(h / 48)));
  const yDec = Math.max(0, decimalsOf(Number(yStep.toPrecision(6))));
  ctx.font = `500 10px ${FONT_MONO}`;
  let maxLabel = 0;
  for (let v = Math.ceil(o.yMin / yStep) * yStep; v <= o.yMax + 1e-12; v += yStep) {
    maxLabel = Math.max(maxLabel, ctx.measureText(fmt(v, yDec)).width);
  }
  const L = Math.max(36, maxLabel + 22);
  const R = 10;
  const T = 10 + legendH;
  const B = 34;
  const pw = Math.max(10, w - L - R);
  const ph = Math.max(10, h - T - B);
  const X = (x: number) => L + ((x - o.xMin) / (o.xMax - o.xMin || 1)) * pw;
  const Y = (y: number) => T + ph - ((y - o.yMin) / (o.yMax - o.yMin || 1)) * ph;

  // Grid and ticks
  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.grid;
  ctx.fillStyle = pal.muted;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let v = Math.ceil(o.yMin / yStep) * yStep; v <= o.yMax + 1e-12; v += yStep) {
    const y = Math.round(Y(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L + pw, y);
    ctx.stroke();
    ctx.fillText(fmt(v, yDec), L - 6, y);
  }
  const xStep = niceStep(o.xMax - o.xMin, Math.max(2, Math.floor(w / 80)));
  const xDec = Math.max(0, decimalsOf(Number(xStep.toPrecision(6))));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = Math.ceil(o.xMin / xStep) * xStep; v <= o.xMax + 1e-12; v += xStep) {
    const x = Math.round(X(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x, T + ph);
    ctx.stroke();
    ctx.fillText(fmt(v, xDec), x, T + ph + 5);
  }
  // Zero line
  if (o.yMin < 0 && o.yMax > 0) {
    ctx.strokeStyle = pal.muted;
    ctx.beginPath();
    ctx.moveTo(L, Math.round(Y(0)) + 0.5);
    ctx.lineTo(L + pw, Math.round(Y(0)) + 0.5);
    ctx.stroke();
  }
  // Frame
  ctx.strokeStyle = pal.faint;
  ctx.strokeRect(L + 0.5, T + 0.5, pw, ph);

  // Axis labels
  ctx.font = `500 11px ${FONT_UI}`;
  ctx.fillStyle = pal.muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(o.xLabel, L + pw, h - 2);
  ctx.save();
  ctx.translate(11, T + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.yLabel, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(L, T, pw, ph);
  ctx.clip();

  for (const s of o.series ?? []) {
    const i0 = s.start ?? 0;
    if (s.n - i0 < 2) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash(s.dash ?? []);
    ctx.beginPath();
    ctx.moveTo(X(s.xs[i0]!), Y(s.ys[i0]!));
    for (let i = i0 + 1; i < s.n; i++) ctx.lineTo(X(s.xs[i]!), Y(s.ys[i]!));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (o.line) {
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(o.xMin), Y(o.line.k * o.xMin + o.line.b));
    ctx.lineTo(X(o.xMax), Y(o.line.k * o.xMax + o.line.b));
    ctx.stroke();
  }
  for (const p of o.points ?? []) {
    ctx.fillStyle = pal.ink;
    ctx.strokeStyle = pal.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();

  if (legendH) {
    ctx.font = `500 11px ${FONT_UI}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let x = L;
    for (const s of o.series!) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(s.dash ?? []);
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x + 18, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.ink;
      ctx.fillText(s.label, x + 23, 10);
      x += 23 + ctx.measureText(s.label).width + 16;
    }
  }
}
