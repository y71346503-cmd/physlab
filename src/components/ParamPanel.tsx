import { useEffect, useState } from 'preact/hooks';
import type { ParamDef, ParamValues } from '../experiments/types';
import { decimalsOf, fmt, parseNumber } from '../shared/format';

interface Props {
  defs: ParamDef[];
  values: ParamValues;
  onChange: (key: string, value: number) => void;
}

export function ParamPanel({ defs, values, onChange }: Props) {
  return (
    <div>
      {defs
        .filter((d) => !d.visible || d.visible(values))
        .map((d) => (
          <ParamRow key={d.key} def={d} value={values[d.key]!} values={values} onChange={onChange} />
        ))}
    </div>
  );
}

function ParamRow({ def, value, values, onChange }: { def: ParamDef; value: number; values: ParamValues; onChange: Props['onChange'] }) {
  const id = `p-${def.key}`;
  const hintId = def.hint ? `${id}-hint` : undefined;

  if (def.type === 'select') {
    const opts = (def.options ?? []).filter((o) => !def.optionAvailable || def.optionAvailable(o.value, values));
    return (
      <div class="param">
        <div class="param-top">
          <label class="param-name" for={id}>
            {def.label}
          </label>
          <select id={id} class="select" value={String(value)} aria-describedby={hintId} onChange={(e) => onChange(def.key, Number((e.currentTarget as HTMLSelectElement).value))}>
            {opts.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {def.hint && <div class="hint" id={hintId}>{def.hint}</div>}
      </div>
    );
  }

  if (def.type === 'toggle') {
    return (
      <div class="param">
        <label class="toggle param-name">
          <input type="checkbox" role="switch" checked={value === 1} aria-describedby={hintId} onChange={(e) => onChange(def.key, (e.currentTarget as HTMLInputElement).checked ? 1 : 0)} />
          {def.label}
        </label>
        {def.hint && <div class="hint" id={hintId}>{def.hint}</div>}
      </div>
    );
  }

  const digits = decimalsOf(def.step);
  const fill = ((value - def.min) / (def.max - def.min)) * 100;
  return (
    <div class="param">
      <div class="param-top">
        <label class="param-name" for={id}>
          {def.label}
          {def.symbol && <i>{def.symbol}</i>}
        </label>
        <NumberField def={def} value={value} digits={digits} onCommit={(v) => onChange(def.key, v)} />
      </div>
      <input
        id={id}
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        style={`--fill: ${fill}%`}
        aria-valuetext={`${fmt(value, digits)} ${def.unit}`}
        aria-describedby={hintId}
        onInput={(e) => onChange(def.key, Number((e.currentTarget as HTMLInputElement).value))}
      />
      {def.presets && (
        <div class="presets" role="group" aria-label={`${def.label} presets`}>
          {def.presets.map((p) => (
            <button key={p.label} type="button" aria-pressed={p.value === value} onClick={() => onChange(def.key, p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      {def.hint && <div class="hint" id={hintId}>{def.hint}</div>}
    </div>
  );
}

/** Text field that accepts "9.8" or "9,8"; commits on Enter or blur. */
function NumberField({ def, value, digits, onCommit }: { def: ParamDef; value: number; digits: number; onCommit: (v: number) => void }) {
  const shown = value.toFixed(digits);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const invalid = draft !== null && parseNumber(draft) === null;

  const commit = () => {
    if (draft === null) return;
    const v = parseNumber(draft);
    if (v !== null) onCommit(v);
    setDraft(null);
  };

  return (
    <span class={`num${invalid ? ' invalid' : ''}`}>
      <input
        inputMode="decimal"
        aria-label={`${def.label}, ${def.unit}`}
        value={draft ?? shown}
        onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setDraft(null);
        }}
      />
      <span class="unit">{def.unit}</span>
    </span>
  );
}
