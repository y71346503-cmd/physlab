import { useEffect, useRef } from 'preact/hooks';
import type { Controller } from '../core/controller';

export function LiveGraph({ ctrl }: { ctrl: Controller }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const graphs = ctrl.exp.graphs ?? [];

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const size = () => ctrl.attachGraph(cv, cv.clientWidth, cv.clientHeight);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    return () => {
      ro.disconnect();
      ctrl.attachGraph(null);
    };
  }, [ctrl]);

  if (graphs.length === 0) return null;
  const current = graphs.find((g) => g.key === ctrl.graphKey) ?? graphs[0]!;
  return (
    <section class="panel graph" aria-label="Live graph">
      <div class="panel-head">
        <span class="label">Graph</span>
        <select class="select" aria-label="Quantity to plot" value={current.key} onChange={(e) => ctrl.setGraph((e.currentTarget as HTMLSelectElement).value)}>
          {graphs.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label} vs time
            </option>
          ))}
        </select>
      </div>
      <div style="padding: 6px 8px 8px">
        <canvas ref={canvas} role="img" aria-label={`Graph of ${current.label} against time`} />
      </div>
    </section>
  );
}
