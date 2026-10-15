// Canvas helpers shared by all scenes.

export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
export const FONT_MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", Consolas, monospace';

/** Size the backing store for the device pixel ratio (capped at 2) and return a CSS-pixel context. */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(w * dpr));
  const H = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export interface ArrowOpts {
  color: string;
  width?: number;
  head?: number;
  dash?: number[];
}

export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, o: ArrowOpts): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return;
  const w = o.width ?? 2;
  const head = Math.min(o.head ?? 9, len * 0.6);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - head * Math.cos(ang);
  const by = y2 - head * Math.sin(ang);
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.setLineDash(o.dash ?? []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(bx + (head * 0.45) * Math.sin(ang), by - (head * 0.45) * Math.cos(ang));
  ctx.lineTo(bx - (head * 0.45) * Math.sin(ang), by + (head * 0.45) * Math.cos(ang));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export interface TextOpts {
  color: string;
  size?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number;
  mono?: boolean;
  /** Draw a background plate for legibility over lines. */
  plate?: string;
  /** Keep the text inside [0, clampW] horizontally. */
  clampW?: number;
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts): void {
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${o.size ?? 12}px ${o.mono ? FONT_MONO : FONT_UI}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'middle';
  if (o.clampW) {
    const tw = ctx.measureText(s).width;
    const a = ctx.textAlign;
    const left = a === 'center' ? x - tw / 2 : a === 'right' || a === 'end' ? x - tw : x;
    const shift = left < 4 ? 4 - left : left + tw > o.clampW - 4 ? o.clampW - 4 - (left + tw) : 0;
    x += shift;
  }
  if (o.plate) {
    const m = ctx.measureText(s);
    const size = o.size ?? 12;
    const w = m.width + 6;
    const h = size + 4;
    let bx = x - 3;
    if (ctx.textAlign === 'center') bx = x - w / 2;
    else if (ctx.textAlign === 'right' || ctx.textAlign === 'end') bx = x - w + 3;
    let by = y - h / 2;
    if (ctx.textBaseline === 'top') by = y - 2;
    else if (ctx.textBaseline === 'bottom' || ctx.textBaseline === 'alphabetic') by = y - h + 2;
    ctx.fillStyle = o.plate;
    ctx.fillRect(bx, by, w, h);
  }
  ctx.fillStyle = o.color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** Hatched band, e.g. a ceiling or the ground. */
export function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, step = 7): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -h; i < w + h; i += step) {
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1, dash: number[] = []): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, bg: string): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

/** Mix two hex colours (#rrggbb). t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function parseHex(c: string): number[] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex: string, alpha: number): string {
  const p = parseHex(hex);
  if (!p) return hex;
  return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${alpha})`;
}
