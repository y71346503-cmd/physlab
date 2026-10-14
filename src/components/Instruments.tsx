import type { Controller } from '../core/controller';
import type { MeterDef, MeterReading } from '../experiments/types';
import { decimalsOf, fmt } from '../shared/format';
import { setReal } from './realMode';
import { IconProtractor, IconRuler } from './Icons';

export function InstrumentsPanel({ ctrl }: { ctrl: Controller }) {
  const inst = ctrl.exp.instruments;
  const readings = ctrl.meterReadings();
  const hasOverlays = !!inst.ruler || !!inst.protractor;
  return (
    <div class="stack" style="gap: 12px">
      {hasOverlays && (
        <div class="inst-toggles" role="group" aria-label="Measuring tools">
          {inst.ruler && (
            <button type="button" class="btn btn-small" aria-pressed={ctrl.overlays.has('ruler')} onClick={() => ctrl.toggleOverlay('ruler')}>
              <IconRuler />
              Ruler
            </button>
          )}
          {inst.protractor && (
            <button type="button" class="btn btn-small" aria-pressed={ctrl.overlays.has('protractor')} onClick={() => ctrl.toggleOverlay('protractor')}>
              <IconProtractor />
              Protractor
            </button>
          )}
        </div>
      )}
      {inst.stopwatch && <Stopwatch ctrl={ctrl} />}
      {inst.meters && inst.meters.length > 0 && (
        <div class="meters">
          {inst.meters.map((m) => (
            <Meter key={m.id} def={m} r={readings[m.id] ?? null} />
          ))}
        </div>
      )}
      <div>
        <label class="toggle" style="font-size: 13.5px; font-weight: 550">
          <input type="checkbox" role="switch" checked={ctrl.real} aria-describedby="real-hint" onChange={(e) => setReal(ctrl, (e.currentTarget as HTMLInputElement).checked)} />
          Realistic instruments
        </label>
        <div class="hint" id="real-hint">
          {ctrl.real ? 'Readings carry small random errors within the accuracy class.' : 'Ideal readings, rounded to the scale division.'}
        </div>
      </div>
    </div>
  );
}

function Stopwatch({ ctrl }: { ctrl: Controller }) {
  const running = ctrl.swRunning();
  const t = ctrl.swTime();
  const mm = Math.floor(t / 60);
  const ss = t - mm * 60;
  const display = `${String(mm).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`;
  return (
    <div class="stopwatch" role="group" aria-label="Stopwatch">
      <span class="time" aria-live="off" aria-label={`Stopwatch ${t.toFixed(2)} seconds`}>
        {display}
      </span>
      <button type="button" class="btn btn-small" onClick={() => (running ? ctrl.swStop() : ctrl.swStart())}>
        {running ? 'Stop' : 'Start'}
      </button>
      <button type="button" class="btn btn-small" onClick={() => ctrl.swReset()} disabled={running}>
        Reset
      </button>
      <span style="font-size: 11px; color: #9aa59f; flex-basis: 100%">Measures simulation time, 0.01 s division.</span>
    </div>
  );
}

const KIND_LETTER: Record<MeterDef<unknown>['kind'], string> = { dynamometer: 'N', ammeter: 'A', voltmeter: 'V' };

export function Meter({ def, r }: { def: MeterDef<any>; r: MeterReading | null }) {
  const max = r?.range.max ?? def.ranges[0]!.max;
  const div = r?.range.div ?? def.ranges[0]!.div;
  const n = Math.round(max / div);
  const majorEvery = n % 10 === 0 ? (n >= 50 ? 10 : 5) : n % 5 === 0 ? 5 : n % 3 === 0 ? 3 : 1;
  const cx = 100;
  const cy = 104;
  const R = 84;
  const ang = (v: number) => Math.PI - (Math.max(0, Math.min(max, v)) / max) * Math.PI;
  const ticks: preact.JSX.Element[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ang(i * div);
    const major = i % majorEvery === 0;
    const len = major ? 11 : 6;
    ticks.push(<line key={i} x1={cx + R * Math.cos(a)} y1={cy - R * Math.sin(a)} x2={cx + (R - len) * Math.cos(a)} y2={cy - (R - len) * Math.sin(a)} stroke="currentColor" stroke-width={major ? 1.4 : 0.8} />);
    if (major) {
      ticks.push(
        <text key={`l${i}`} x={cx + (R - 22) * Math.cos(a)} y={cy - (R - 22) * Math.sin(a) + 3.5} font-size="10" text-anchor="middle" fill="currentColor" font-family="var(--font-mono)">
          {Number((i * div).toFixed(6))}
        </text>,
      );
    }
  }
  const a = ang(r?.reading ?? 0);
  const digits = decimalsOf(div);
  return (
    <div class="meter" role="group" aria-label={def.label}>
      <div class="label" style="margin-bottom: 2px">{def.label}</div>
      <svg viewBox="0 0 200 118" aria-hidden="true" style="color: var(--ink)">
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="var(--line-strong)" stroke-width="1" />
        {ticks}
        <text x={cx} y={cy - 30} font-size="18" text-anchor="middle" fill="var(--muted)" font-family="var(--font-mono)" font-weight="700">
          {KIND_LETTER[def.kind]}
        </text>
        {r && <line x1={cx} y1={cy} x2={cx + (R - 6) * Math.cos(a)} y2={cy - (R - 6) * Math.sin(a)} stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" />}
        <circle cx={cx} cy={cy} r="4.5" fill="var(--ink)" />
      </svg>
      <div class="reading" aria-live="polite">
        {r ? `${fmt(r.reading, digits)} ${def.unit}` : 'not connected'}
      </div>
      <div class="range">
        range 0–{max} {def.unit}, division {fmt(div, digits)} {def.unit}
      </div>
      {r?.overload && <div class="over">Overload: off the scale</div>}
    </div>
  );
}
