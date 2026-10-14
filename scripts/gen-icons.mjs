// Generates PWA icons (PNG) without dependencies: a tiny rasterizer + PNG encoder.
// Design: dark rounded square, pivot bar, string and an orange bob (matches favicon.svg).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [22, 26, 24];
const FG = [242, 243, 239];
const ACCENT = [255, 122, 46];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const distToSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

/** Coverage-based antialiasing via 4x4 supersampling. */
function icon(size, { maskable }) {
  const s = size / 32;
  const inset = maskable ? 0 : 1 * s;
  const radius = maskable ? 0 : 7 * s;
  // In the maskable variant keep the drawing inside the 80% safe zone.
  const k = maskable ? 0.72 : 1;
  const ox = maskable ? (size - 32 * s * k) / 2 : 0;
  const P = (v) => v * s * k;
  const shape = (x, y) => {
    const inRect = (() => {
      if (maskable) return true;
      const qx = Math.max(Math.abs(x - size / 2) - (size / 2 - inset - radius), 0);
      const qy = Math.max(Math.abs(y - size / 2) - (size / 2 - inset - radius), 0);
      return Math.hypot(qx, qy) <= radius;
    })();
    if (!inRect) return null;
    const lx = x - ox;
    const ly = y - ox;
    if (Math.hypot(lx - P(21.4), ly - P(21.2)) <= P(3.8)) return ACCENT;
    if (distToSeg(lx, ly, P(8), P(7), P(24), P(7)) <= P(1.1)) return FG;
    if (distToSeg(lx, ly, P(16), P(7), P(21.4), P(21.2)) <= P(0.8)) return FG;
    return BG;
  };
  return png(size, (x, y) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const c = shape(x - 0.5 + (i + 0.5) / 4, y - 0.5 + (j + 0.5) / 4);
        if (c) {
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        }
      }
    }
    if (a === 0) return [0, 0, 0, 0];
    return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round((a / 16) * 255)];
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192, { maskable: false }));
writeFileSync('public/icons/icon-512.png', icon(512, { maskable: false }));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, { maskable: true }));
console.log('Icons written to public/icons');
