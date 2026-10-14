import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';

export interface TabDef {
  key: string;
  label: string;
}

export function Tabs({ tabs, active, onSelect, children }: { tabs: TabDef[]; active: string; onSelect: (k: string) => void; children: ComponentChildren }) {
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === active);
    let j = i;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    else return;
    e.preventDefault();
    onSelect(tabs[j]!.key);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[j]?.focus();
  };
  return (
    <>
      <div class="tabs" role="tablist" ref={list} onKeyDown={onKey}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={t.key === active}
            aria-controls={`panel-${t.key}`}
            tabIndex={t.key === active ? 0 : -1}
            onClick={() => onSelect(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div class="tab-panel" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0}>
        {children}
      </div>
    </>
  );
}
