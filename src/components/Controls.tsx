import type { Controller } from '../core/controller';
import { IconPause, IconPlay, IconReset, IconShare, IconStep } from './Icons';

const SPEEDS = [0.25, 0.5, 1];

export function Controls({ ctrl, onShare }: { ctrl: Controller; onShare: () => void }) {
  const dynamic = ctrl.exp.kind === 'dynamic';
  return (
    <div class="controls">
      {dynamic && (
        <>
          <button type="button" class="btn btn-primary" onClick={() => ctrl.toggle()}>
            {ctrl.running ? <IconPause /> : <IconPlay />}
            {ctrl.running ? 'Pause' : ctrl.sim.done ? 'Again' : 'Start'}
          </button>
          <button type="button" class="btn btn-icon" onClick={() => ctrl.stepOnce()} aria-label="Step forward" title="Step forward (1/30 s)" disabled={ctrl.running}>
            <IconStep />
          </button>
          <button type="button" class="btn btn-icon" onClick={() => ctrl.reset()} aria-label="Reset" title="Reset">
            <IconReset />
          </button>
          <div class="seg" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <button key={s} type="button" aria-pressed={ctrl.speed === s} onClick={() => ctrl.setSpeed(s)} title={`Speed ${s}x`}>
                {s}×
              </button>
            ))}
          </div>
          <span class="mono" style="color: var(--muted); font-size: 13px">
            t = {ctrl.sim.t.toFixed(2)} s
          </span>
        </>
      )}
      <span class="spacer" />
      <button type="button" class="btn" onClick={onShare}>
        <IconShare />
        Share
      </button>
    </div>
  );
}
