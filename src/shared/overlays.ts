// Draggable ruler and protractor drawn over the scene. Positions are in CSS pixels;
// the ruler converts to metres with the scene scale (px per metre).

import type { Palette } from './palette';
import { FONT_MONO, withAlpha } from './canvas';

export type OverlayKind = 'ruler' | 'protractor';

export interface OverlayItem {
  x: number;
  y: number;
  angle: number;
}

interface Drag {
  kind: OverlayKind;
  mode: 'move' | 'rotate';
  dx: number;
  dy: number;
}

const RULER_H = 34;
const PROT_R = 92;
const HANDLE_R = 11;

const NICE_LENGTHS = [0.05, 0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10, 20, 50];

export class Overlays {
  items: Partial<Record<OverlayKind, OverlayItem>> = {};
  /** The item that keyboard arrows move. */
  active: OverlayKind | null = null;
  rulerLength = 1;
  private drag: Drag | null = null;
  private scale = 0;

  has(kind: OverlayKind): boolean {
    return !!this.items[kind];
  }

  any(): boolean {
    return !!(this.items.ruler || this.items.protractor);
  }

  toggle(kind: OverlayKind, w: number, h: number): void {
    if (this.items[kind]) {
      delete this.items[kind];
      if (this.active === kind) this.active = this.items.ruler ? 'ruler' : this.items.protractor ? 'protractor' : null;
      return;
    }
    this.items[kind] = kind === 'ruler' ? { x: w * 0.12, y: h * 0.7, angle: 0 } : { x: w * 0.5, y: h * 0.55, angle: 0 };
    this.active = kind;
  }

  /** Ruler length in px for the current scale, kept within the scene. */
  private rulerPx(w: number): { meters: number; px: number } {
    if (!(this.scale > 0)) return { meters: 0, px: 0 };
    let meters = this.rulerLength;
    const maxPx = w * 0.82;
    if (meters * this.scale > maxPx) meters = [...NICE_LENGTHS].reverse().find((m) => m * this.scale <= maxPx) ?? 0.05;
    if (meters * this.scale < 120) meters = NICE_LENGTHS.find((m) => m * this.scale >= 120) ?? meters;
    return { meters, px: meters * this.scale };
  }

  draw(ctx: CanvasRenderingContext2D, w: number, scale: number | undefined, pal: Palette): void {
    this.scale = scale ?? 0;
    const r = this.items.ruler;
    if (r && this.scale > 0) this.drawRuler(ctx, r, w, pal);
    const p = this.items.protractor;
    if (p) this.drawProtractor(ctx, p, pal);
  }

  private drawRuler(ctx: CanvasRenderingContext2D, r: OverlayItem, w: number, pal: Palette): void {
    const { meters, px } = this.rulerPx(w);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.fillStyle = withAlpha(pal.dark ? '#2a2f2c' : '#fff8e8', 0.88);
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1;
    ctx.fillRect(0, 0, px, RULER_H);
    ctx.strokeRect(0.5, 0.5, px, RULER_H);
    const minorOptions = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
    const minor = minorOptions.find((m) => m * this.scale >= 4) ?? 1;
    const labelEvery = minor * 10;
    const useCm = labelEvery < 1;
    ctx.strokeStyle = pal.ink;
    ctx.fillStyle = pal.ink;
    ctx.font = `500 9px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const n = Math.round(meters / minor);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = Math.round(i * minor * this.scale) + 0.5;
      const len = i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, len);
    }
    ctx.stroke();
    for (let i = 0; i <= n; i += 10) {
      const v = i * minor;
      const label = useCm ? String(Math.round(v * 100)) : String(Number(v.toFixed(3)));
      ctx.fillText(label, i * minor * this.scale, 14);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.muted;
    ctx.fillText(useCm ? 'cm' : 'm', 4, RULER_H - 11);
    ctx.restore();
    this.drawHandle(ctx, r, px + HANDLE_R + 4, RULER_H / 2, pal);
  }

  private drawProtractor(ctx: CanvasRenderingContext2D, p: OverlayItem, pal: Palette): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = withAlpha(pal.dark ? '#2a2f2c' : '#fff8e8', 0.78);
    ctx.strokeStyle = pal.muted;
    ctx.beginPath();
    ctx.arc(0, 0, PROT_R, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = 0; d <= 180; d++) {
      const a = Math.PI + (d * Math.PI) / 180;
      const len = d % 10 === 0 ? 11 : d % 5 === 0 ? 7 : 4;
      ctx.moveTo(Math.cos(a) * PROT_R, Math.sin(a) * PROT_R);
      ctx.lineTo(Math.cos(a) * (PROT_R - len), Math.sin(a) * (PROT_R - len));
    }
    ctx.stroke();
    ctx.fillStyle = pal.ink;
    ctx.font = `500 9px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = 0; d <= 180; d += 10) {
      const a = Math.PI + (d * Math.PI) / 180;
      ctx.fillText(String(d), Math.cos(a) * (PROT_R - 20), Math.sin(a) * (PROT_R - 20));
    }
    ctx.strokeStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-PROT_R, 0);
    ctx.lineTo(PROT_R, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.restore();
    this.drawHandle(ctx, p, PROT_R + HANDLE_R + 4, 0, pal);
  }

  private drawHandle(ctx: CanvasRenderingContext2D, it: OverlayItem, lx: number, ly: number, pal: Palette): void {
    const [hx, hy] = toWorld(it, lx, ly);
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, HANDLE_R - 3, 0, Math.PI * 2);
    ctx.fillStyle = pal.surface;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    // Rotation glyph
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, -Math.PI * 0.2, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  private handlePos(kind: OverlayKind, it: OverlayItem, w: number): [number, number] {
    return kind === 'ruler'
      ? toWorld(it, this.rulerPx(w).px + HANDLE_R + 4, RULER_H / 2)
      : toWorld(it, PROT_R + HANDLE_R + 4, 0);
  }

  hit(x: number, y: number, w: number): { kind: OverlayKind; mode: 'move' | 'rotate' } | null {
    const order: OverlayKind[] = this.active === 'ruler' ? ['ruler', 'protractor'] : ['protractor', 'ruler'];
    for (const kind of order) {
      const it = this.items[kind];
      if (!it) continue;
      const [hx, hy] = this.handlePos(kind, it, w);
      if (Math.hypot(x - hx, y - hy) <= HANDLE_R + 8) return { kind, mode: 'rotate' };
      const [lx, ly] = toLocal(it, x, y);
      if (kind === 'ruler') {
        const px = this.rulerPx(w).px;
        if (lx >= -4 && lx <= px + 4 && ly >= -4 && ly <= RULER_H + 4) return { kind, mode: 'move' };
      } else if (ly <= 6 && ly >= -PROT_R - 4 && Math.hypot(lx, ly) <= PROT_R + 4) {
        return { kind, mode: 'move' };
      }
    }
    return null;
  }

  pointerDown(x: number, y: number, w: number): boolean {
    const h = this.hit(x, y, w);
    if (!h) return false;
    const it = this.items[h.kind]!;
    this.active = h.kind;
    this.drag = { kind: h.kind, mode: h.mode, dx: x - it.x, dy: y - it.y };
    return true;
  }

  pointerMove(x: number, y: number, w: number, h: number): boolean {
    const d = this.drag;
    if (!d) return false;
    const it = this.items[d.kind];
    if (!it) return false;
    if (d.mode === 'move') {
      it.x = Math.max(0, Math.min(w, x - d.dx));
      it.y = Math.max(0, Math.min(h, y - d.dy));
    } else {
      const ly = d.kind === 'ruler' ? RULER_H / 2 : 0;
      // Angle from the item origin to the pointer, minus the handle's own offset angle.
      const lx = d.kind === 'ruler' ? this.rulerPx(w).px + HANDLE_R + 4 : PROT_R + HANDLE_R + 4;
      it.angle = Math.atan2(y - it.y, x - it.x) - Math.atan2(ly, lx);
    }
    return true;
  }

  pointerUp(): void {
    this.drag = null;
  }

  dragging(): boolean {
    return this.drag !== null;
  }

  /** Arrow keys move, Shift+arrows rotate by 1 degree. Returns true if handled. */
  key(e: KeyboardEvent): boolean {
    const it = this.active ? this.items[this.active] : undefined;
    if (!it) return false;
    const step = e.altKey ? 1 : 5;
    const rot = (Math.PI / 180) * (e.altKey ? 0.2 : 1);
    switch (e.key) {
      case 'ArrowLeft':
        if (e.shiftKey) it.angle -= rot;
        else it.x -= step;
        return true;
      case 'ArrowRight':
        if (e.shiftKey) it.angle += rot;
        else it.x += step;
        return true;
      case 'ArrowUp':
        if (e.shiftKey) it.angle -= rot;
        else it.y -= step;
        return true;
      case 'ArrowDown':
        if (e.shiftKey) it.angle += rot;
        else it.y += step;
        return true;
      default:
        return false;
    }
  }
}

function toWorld(it: OverlayItem, lx: number, ly: number): [number, number] {
  const c = Math.cos(it.angle);
  const s = Math.sin(it.angle);
  return [it.x + lx * c - ly * s, it.y + lx * s + ly * c];
}

function toLocal(it: OverlayItem, x: number, y: number): [number, number] {
  const c = Math.cos(it.angle);
  const s = Math.sin(it.angle);
  const dx = x - it.x;
  const dy = y - it.y;
  return [dx * c + dy * s, -dx * s + dy * c];
}
