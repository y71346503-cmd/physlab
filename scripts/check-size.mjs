// Bundle budget: initial load of the home page <= 100 KB gzip,
// all JS and CSS except KaTeX <= 250 KB gzip. Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const INITIAL_BUDGET = 100 * 1024;
const TOTAL_BUDGET = 250 * 1024;

const gz = (file) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const initial = [...new Set([...html.matchAll(/(?:src|href)="(?:\.\/|\/[^"]*?)?(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))];
const initialSize = initial.reduce((s, f) => s + gz(f), 0);

const assets = readdirSync(join(DIST, 'assets')).filter((f) => /\.(js|css)$/.test(f));
const counted = assets.filter((f) => !/katex/i.test(f));
const rows = counted.map((f) => [f, gz(`assets/${f}`)]).sort((a, b) => b[1] - a[1]);
const total = rows.reduce((s, [, n]) => s + n, 0);

console.log('Gzipped JS/CSS (KaTeX excluded):');
for (const [f, n] of rows) console.log(`  ${kb(n).padStart(9)}  ${f}${initial.includes(`assets/${f}`) ? '  (initial)' : ''}`);
console.log(`Initial load: ${kb(initialSize)} / ${kb(INITIAL_BUDGET)}`);
console.log(`Total:        ${kb(total)} / ${kb(TOTAL_BUDGET)}`);

let failed = false;
if (initial.length === 0) {
  console.error('Could not find any initial assets in dist/index.html');
  failed = true;
}
if (initialSize > INITIAL_BUDGET) {
  console.error('Initial load is over budget.');
  failed = true;
}
if (total > TOTAL_BUDGET) {
  console.error('Total bundle is over budget.');
  failed = true;
}
process.exit(failed ? 1 : 0);
