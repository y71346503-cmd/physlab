import type { Readout } from '../experiments/types';

export function Readouts({ items }: { items: Readout[] }) {
  return (
    <div class="readouts">
      {items.map((r) => (
        <div class="readout" key={r.label}>
          <span class="label">
            {r.label}
            {r.symbol ? `, ${r.symbol}` : ''}
          </span>
          <span class="v">{r.text}</span>
          {r.unit && <span class="u">{r.unit}</span>}
        </div>
      ))}
    </div>
  );
}
