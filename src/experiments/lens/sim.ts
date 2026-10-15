import { clear, line, text, withAlpha } from '../../shared/canvas';
import { fmt } from '../../shared/format';
import { quantize } from '../../shared/measure';
import type { NoiseFn, ParamValues, Readout, SimInstance, View } from '../types';
import { blurDiameter, characteristicRays, image, opticalPower, type ImageInfo } from './model';

/** Lens aperture (diameter), cm. */
export const APERTURE = 14;
/** Visible part of the optical bench, cm from the lens. */
const X_MIN = -65;
const X_MAX = 105;
/** Largest blur spot (cm) at which the image still counts as sharp for recording. */
export const SHARP_LIMIT = 0.8;

export function signedF(p: ParamValues): number {
  return p.type === 1 ? -p.F! : p.F!;
}

export class LensSim implements SimInstance {
  readonly F: number;
  readonly d: number;
  readonly h: number;
  readonly s: number;
  readonly img: ImageInfo;
  t = 0;
  scale = 0;

  constructor(readonly params: ParamValues) {
    this.F = signedF(params);
    this.d = params.d!;
    this.h = params.h!;
    this.s = params.s!;
    this.img = image(this.F, this.d);
  }

  /** Blur spot on the screen, cm (Infinity if no real image). */
  blur(): number {
    return blurDiameter(this.F, this.d, this.s, APERTURE);
  }

  /** Screen position read from the bench scale (1 mm division). */
  screenReading(real: boolean, noise: NoiseFn): number {
    return quantize(this.s + (real ? noise('screen', 0.15) : 0), 0.1);
  }

  screenState(): 'sharp' | 'blurred' | 'none' {
    const c = this.blur();
    if (!Number.isFinite(c) || c > 6) return 'none';
    return c <= 0.3 ? 'sharp' : 'blurred';
  }

  render(v: View): void {
    const { ctx, w, h, pal } = v;
    clear(ctx, w, h, pal.bg);
    const sx = (w - 16) / (X_MAX - X_MIN);
    const benchH = 30;
    const axisY = (h - benchH) / 2 + 6;
    const sy = Math.max(sx, Math.min((axisY - 30) / 9, (h - benchH - axisY - 8) / 9));
    this.scale = sx * 100; // px per metre along the bench
    const X = (x: number) => 8 + (x - X_MIN) * sx;
    const Y = (y: number) => axisY - y * sy;

    // Optical axis
    line(ctx, 0, axisY, w, axisY, pal.muted, 1, [6, 5]);

    // Focal points
    const Fa = Math.abs(this.F);
    for (const [x, label] of [
      [-Fa, 'F'],
      [Fa, 'F'],
      [-2 * Fa, '2F'],
      [2 * Fa, '2F'],
    ] as const) {
      if (x < X_MIN || x > X_MAX) continue;
      ctx.beginPath();
      ctx.arc(X(x), axisY, 3, 0, Math.PI * 2);
      ctx.fillStyle = pal.ink;
      ctx.fill();
      text(ctx, label, X(x), axisY + 13, { color: pal.muted, size: 11, mono: true, align: 'center' });
    }

    // Screen
    const scX = X(this.s);
    ctx.fillStyle = withAlpha(pal.dark ? '#7d8882' : '#9aa49e', 0.45);
    ctx.fillRect(scX - 2, Y(9), 5, 18 * sy);
    this.drawScreenImage(ctx, scX, Y, sy, pal.accent);

    // Rays
    const rays = characteristicRays(this.F, this.d, this.h);
    const colors = [pal.accent, pal.blue, pal.green];
    const tipX = X(-this.d);
    const tipY = Y(this.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h - benchH);
    ctx.clip();
    rays.forEach((r, i) => {
      const c = colors[i]!;
      const lx = X(0);
      const ly = Y(r.yLens);
      line(ctx, tipX, tipY, lx, ly, c, 1.6);
      // Refracted ray to the right edge
      const t = (X_MAX - 0) / r.dx;
      line(ctx, lx, ly, X(X_MAX), Y(r.yLens + r.dy * t), c, 1.6);
      // Virtual image: dashed extension back to the image
      if (this.img.exists && !this.img.real) {
        const tb = this.img.f / r.dx; // negative: backwards
        line(ctx, lx, ly, X(this.img.f), Y(r.yLens + r.dy * tb), c, 1, [4, 4]);
      }
    });
    ctx.restore();

    // Lens
    const top = Y(7);
    const bottom = Y(-7);
    const lx = X(0);
    line(ctx, lx, top, lx, bottom, pal.ink, 2.5);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const a = 7;
    if (this.F > 0) {
      ctx.moveTo(lx - a, top + a);
      ctx.lineTo(lx, top);
      ctx.lineTo(lx + a, top + a);
      ctx.moveTo(lx - a, bottom - a);
      ctx.lineTo(lx, bottom);
      ctx.lineTo(lx + a, bottom - a);
    } else {
      ctx.moveTo(lx - a, top - a);
      ctx.lineTo(lx, top);
      ctx.lineTo(lx + a, top - a);
      ctx.moveTo(lx - a, bottom + a);
      ctx.lineTo(lx, bottom);
      ctx.lineTo(lx + a, bottom + a);
    }
    ctx.stroke();

    // Object
    this.drawArrow(ctx, X(-this.d), axisY, Y(this.h), pal.ink, false);

    // Image
    const img = this.img;
    if (img.exists) {
      const H = img.m * this.h;
      if (img.f >= X_MIN && img.f <= X_MAX && Math.abs(H) < 40) {
        this.drawArrow(ctx, X(img.f), axisY, Y(H), pal.accent, !img.real);
      } else {
        const right = img.f > 0;
        text(ctx, `image at f = ${fmt(img.f, 0)} cm ${right ? '→' : '←'}`, right ? w - 10 : 10, 34, { color: pal.accent, size: 12, mono: true, align: right ? 'right' : 'left', plate: pal.bg });
      }
    } else {
      text(ctx, 'Object in the focal plane: refracted rays are parallel, no image', w / 2, 34, { color: pal.ink, size: 12, align: 'center', plate: pal.bg, clampW: w });
    }

    this.drawBench(ctx, w, h, benchH, X, sx, pal, scX);

    const exaggeration = sy / sx;
    const kind = w < 520 ? '' : `${this.F > 0 ? 'Converging' : 'Diverging'} lens, `;
    text(ctx, `${kind}F = ${fmt(this.F, 1)} cm${exaggeration > 1.05 ? ` · vertical scale ×${fmt(exaggeration, 1)}` : ''}`, 10, 14, {
      color: pal.muted,
      size: 11,
      mono: true,
    });
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, color: string, dashed: boolean): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    const dir = y1 < y0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - 6, y1 + dir * 10);
    ctx.lineTo(x + 6, y1 + dir * 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawScreenImage(ctx: CanvasRenderingContext2D, scX: number, Y: (y: number) => number, sy: number, color: string): void {
    const c = this.blur();
    if (!Number.isFinite(c) || c > 6) return;
    const yc = (-this.h * this.s) / this.d;
    if (Math.abs(yc) > 9.5) return;
    ctx.save();
    ctx.globalAlpha = 1 / (1 + c / 1.2);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.min(40, c * sy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + Math.min(10, c * sy * 0.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(scX + 0.5, Y(0));
    ctx.lineTo(scX + 0.5, Y(yc));
    ctx.stroke();
    ctx.restore();
  }

  private drawBench(ctx: CanvasRenderingContext2D, w: number, h: number, benchH: number, X: (x: number) => number, sx: number, pal: View['pal'], scX: number): void {
    const y = h - benchH + 4;
    ctx.fillStyle = pal.dark ? '#1c2220' : '#eef0eb';
    ctx.fillRect(0, y, w, benchH - 4);
    line(ctx, 0, y, w, y, pal.faint);
    const minor = sx >= 3 ? 1 : 5;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(X_MIN / minor) * minor; x <= X_MAX; x += minor) {
      const px = Math.round(X(x)) + 0.5;
      const len = x % 10 === 0 ? 8 : x % 5 === 0 ? 5 : 3;
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + len);
    }
    ctx.stroke();
    const labelStep = sx >= 4 ? 10 : 20;
    for (let x = Math.ceil(X_MIN / labelStep) * labelStep; x <= X_MAX && X(x) < w - 26; x += labelStep) {
      text(ctx, String(x), X(x), y + 17, { color: pal.muted, size: 9, mono: true, align: 'center' });
    }
    // Carriages
    for (const [px, color] of [
      [X(-this.d), pal.ink],
      [X(0), pal.ink],
      [scX, pal.muted],
    ] as const) {
      ctx.fillStyle = color;
      ctx.fillRect(px - 4, y - 5, 8, 5);
    }
    text(ctx, 'cm', w - 6, y + 17, { color: pal.muted, size: 9, mono: true, align: 'right' });
  }

  readouts(): Readout[] {
    const img = this.img;
    const kind = !img.exists ? 'none' : img.real ? 'real' : 'virtual';
    return [
      { label: 'Optical power', symbol: 'D', unit: 'dpt', text: fmt(opticalPower(this.F), 1) },
      { label: 'Image', unit: '', text: kind },
      { label: 'Orientation', unit: '', text: img.exists ? (img.upright ? 'upright' : 'inverted') : '—' },
      { label: 'Size', unit: '', text: img.exists ? (Math.abs(Math.abs(img.m) - 1) < 1e-9 ? 'same' : img.enlarged ? 'enlarged' : 'reduced') : '—' },
      { label: 'On the screen', unit: '', text: this.screenState() === 'none' ? 'no image' : this.screenState() },
    ];
  }

  describe(): string {
    const img = this.img;
    const what = !img.exists
      ? 'The object is in the focal plane, there is no image.'
      : `The image is ${img.real ? 'real' : 'virtual'}, ${img.upright ? 'upright' : 'inverted'} and ${img.enlarged ? 'enlarged' : 'reduced'}.`;
    return `${this.F > 0 ? 'Converging' : 'Diverging'} lens with focal length ${fmt(Math.abs(this.F), 1)} cm, object at ${fmt(this.d, 1)} cm. ${what} Screen at ${fmt(this.s, 1)} cm: ${this.screenState() === 'none' ? 'no image' : this.screenState()}.`;
  }
}
