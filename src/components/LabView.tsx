import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { Controller } from '../core/controller';
import type { LabResult, LabRow } from '../experiments/types';
import { fitCanvas } from '../shared/canvas';
import { drawChart, niceRange } from '../shared/chart';
import { fmt, fmtSig, fmtWithError } from '../shared/format';
import { linearFit } from '../shared/lsq';
import { palette } from '../shared/palette';
import { store } from '../shared/storage';
import { THEME_EVENT } from '../shared/theme';
import { toast } from '../shared/toast';
import { IconDownload, IconPlus, IconTrash } from './Icons';

export function LabView({ ctrl }: { ctrl: Controller }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => store.subscribe(() => force(0)), []);
  const exp = ctrl.exp;
  const lab = exp.lab;
  const id = exp.meta.id;
  const rows: LabRow[] = store.get().labs[id]?.rows ?? [];
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const xs = rows.map((r) => lab.x.get(r));
  const ys = rows.map((r) => lab.y.get(r));
  const fit = rows.length >= 2 ? linearFit(xs, ys) : null;
  const enough = rows.length >= lab.minPoints;
  const results: LabResult[] = fit && enough ? lab.results(fit, rows) : [];
  const notes = fit && enough && lab.notes ? lab.notes(fit, rows) : [];
  const done = results.length > 0;

  useEffect(() => {
    if (done && !store.get().labs[id]?.done) {
      store.update((s) => {
        s.labs[id] = { rows: s.labs[id]?.rows ?? [], done: true };
      });
    }
  }, [done, id]);

  const record = () => {
    const r = ctrl.recordLab();
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setError('');
    store.update((s) => {
      const st = (s.labs[id] ??= { rows: [], done: false });
      st.rows = [...st.rows, r];
    });
  };

  const removeRow = (i: number) =>
    store.update((s) => {
      const st = s.labs[id];
      if (st) st.rows = st.rows.filter((_, j) => j !== i);
    });

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    store.update((s) => {
      s.labs[id] = { rows: [], done: s.labs[id]?.done ?? false };
    });
  };

  const exportCsv = () => {
    const head = lab.columns.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label));
    const lines = [head.join(','), ...rows.map((r) => lab.columns.map((c) => r.values[c.key]!.toFixed(c.digits)).join(','))];
    const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `physlab-${id}-lab.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Table exported as CSV.');
  };

  return (
    <div class="lab">
      <div>
        <div class="label">Goal</div>
        <p style="margin: 4px 0 8px">{lab.goal}</p>
        <div class="label">Procedure</div>
        <ol>
          {lab.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <div class="lab-actions">
          <button type="button" class="btn btn-primary" onClick={record}>
            <IconPlus />
            Record measurement
          </button>
          <button type="button" class="btn" onClick={exportCsv} disabled={rows.length === 0}>
            <IconDownload />
            Export CSV
          </button>
          <button type="button" class="btn btn-ghost" onClick={clearAll} disabled={rows.length === 0}>
            <IconTrash />
            {confirmClear ? 'Click again to clear' : 'Clear table'}
          </button>
        </div>
        <div class="lab-error" role="alert">
          {error}
        </div>
        <div class="table-wrap">
          <table class="data">
            <caption class="sr-only">Measurements</caption>
            <thead>
              <tr>
                <th scope="col" style="text-align: left">#</th>
                {lab.columns.map((c) => (
                  <th scope="col" key={c.key}>
                    {c.label}
                    {c.unit ? `, ${c.unit}` : ''}
                  </th>
                ))}
                <th class="del">
                  <span class="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={lab.columns.length + 2} class="empty-row">
                    No measurements yet. Set up the experiment and press "Record measurement".
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style="text-align: left">{i + 1}</td>
                  {lab.columns.map((c) => (
                    <td key={c.key}>{fmt(r.values[c.key], c.digits)}</td>
                  ))}
                  <td class="del">
                    <button type="button" class="btn btn-ghost btn-icon btn-small" style="width: 32px" aria-label={`Delete row ${i + 1}`} onClick={() => removeRow(i)}>
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <LabPlot ctrl={ctrl} xs={xs} ys={ys} fit={fit ? { k: fit.k, b: fit.b } : null} />
        <div class="fit-info">
          {lab.model}
          {fit && (
            <>
              <br />k = {fmtWithError(fit.k, fit.sk).value} ± {fmtWithError(fit.k, fit.sk).err}, b = {fmtWithError(fit.b, fit.sb).value} ± {fmtWithError(fit.b, fit.sb).err}
              {Number.isFinite(fit.r2) && <>, r² = {fmt(fit.r2, 4)}</>}
            </>
          )}
        </div>
        {!enough && (
          <p style="color: var(--muted); font-size: 13.5px; margin: 10px 0 0">
            Record at least {lab.minPoints} points ({rows.length} so far) to calculate the result. More points give a smaller error.
          </p>
        )}
        {results.length > 0 && (
          <div class="results" aria-live="polite">
            {results.map((r) => (
              <ResultBox key={r.symbol} r={r} />
            ))}
          </div>
        )}
        {notes.length > 0 && (
          <ul class="notes">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultBox({ r }: { r: LabResult }) {
  const f = fmtWithError(r.value, r.error);
  const dev = r.reference !== null && r.reference !== 0 ? ((r.value - r.reference) / r.reference) * 100 : null;
  const within = r.reference !== null && Number.isFinite(r.error) && Math.abs(r.value - r.reference) <= 2 * r.error;
  return (
    <div class="result">
      <div class="label">{r.label}</div>
      <div class="big">
        {r.symbol} = {f.value} ± {f.err} {r.unit}
      </div>
      {r.reference !== null && dev !== null && (
        <div class="cmp">
          Reference: {fmtSig(r.reference, 4)} {r.unit}. Deviation {dev >= 0 ? '+' : '−'}
          {fmt(Math.abs(dev), 1)}%{within ? ', within the uncertainty (2σ).' : ', outside 2σ: look for a systematic error.'}
        </div>
      )}
    </div>
  );
}

function LabPlot({ ctrl, xs, ys, fit }: { ctrl: Controller; xs: number[]; ys: number[]; fit: { k: number; b: number } | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lab = ctrl.exp.lab;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(THEME_EVENT, on);
    const ro = new ResizeObserver(on);
    if (canvas.current) ro.observe(canvas.current);
    return () => {
      window.removeEventListener(THEME_EVENT, on);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (w <= 0) return;
    const ctx = fitCanvas(cv, w, h);
    // Include the origin when it is close: many lab dependences pass through (0, 0).
    let xMin = Math.min(...xs, 0);
    let xMax = Math.max(...xs, 0);
    let yMin = Math.min(...ys, 0);
    let yMax = Math.max(...ys, 0);
    if (!xs.length) {
      xMin = 0;
      xMax = 1;
      yMin = 0;
      yMax = 1;
    }
    const [x0, x1] = niceRange(xMin, xMax, 0.06);
    const [y0, y1] = niceRange(yMin, yMax, 0.08);
    drawChart(ctx, {
      w,
      h,
      pal: palette(),
      xLabel: `${lab.x.label}, ${lab.x.unit}`,
      yLabel: `${lab.y.label}, ${lab.y.unit}`,
      xMin: x0,
      xMax: x1,
      yMin: y0,
      yMax: y1,
      points: xs.map((x, i) => ({ x, y: ys[i]! })),
      line: fit,
    });
  }, [xs.join(','), ys.join(','), fit?.k, fit?.b, tick]);

  return (
    <div class="lab-plot">
      <canvas ref={canvas} role="img" aria-label={`Lab graph: ${lab.y.label} against ${lab.x.label}, ${xs.length} points`} />
    </div>
  );
}
