// Student progress lives only in localStorage. If storage is unavailable
// (private mode, blocked), everything still works in memory for the session.

import type { LabRow } from '../experiments/types';
import { randomSeed } from './rng';

export interface TaskState {
  solved: boolean;
  tries: number;
  variant: number;
}

export interface LabState {
  rows: LabRow[];
  done: boolean;
}

export interface Store {
  v: 1;
  seed: number;
  tasks: Record<string, Record<string, TaskState>>;
  labs: Record<string, LabState>;
  prefs: { theme?: 'light' | 'dark'; real?: boolean };
}

const KEY = 'physlab:v1';
let mem: Store | null = null;
const subs = new Set<() => void>();

function fresh(): Store {
  return { v: 1, seed: randomSeed(), tasks: {}, labs: {}, prefs: {} };
}

function normalize(s: Partial<Store>): Store {
  return {
    v: 1,
    seed: typeof s.seed === 'number' ? s.seed : randomSeed(),
    tasks: s.tasks && typeof s.tasks === 'object' ? s.tasks : {},
    labs: s.labs && typeof s.labs === 'object' ? s.labs : {},
    prefs: s.prefs && typeof s.prefs === 'object' ? s.prefs : {},
  };
}

function load(): Store {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>;
      if (s && s.v === 1) {
        mem = normalize(s);
        return mem;
      }
    }
  } catch {
    /* storage unavailable or corrupted: start fresh */
  }
  mem = fresh();
  persist();
  return mem;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* quota or privacy mode: keep in memory */
  }
}

export const store = {
  get(): Store {
    return load();
  },
  update(fn: (s: Store) => void): void {
    fn(load());
    persist();
    subs.forEach((cb) => cb());
  },
  subscribe(cb: () => void): () => void {
    subs.add(cb);
    return () => subs.delete(cb);
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      mem = null;
      subs.forEach((cb) => cb());
    }
  });
}

export function taskState(expId: string, taskId: string): TaskState {
  return store.get().tasks[expId]?.[taskId] ?? { solved: false, tries: 0, variant: 0 };
}

export function setTaskState(expId: string, taskId: string, patch: Partial<TaskState>): void {
  store.update((s) => {
    const byExp = (s.tasks[expId] ??= {});
    byExp[taskId] = { ...(byExp[taskId] ?? { solved: false, tries: 0, variant: 0 }), ...patch };
  });
}

export function progressOf(expId: string, taskCount: number): { solved: number; total: number; lab: boolean } {
  const s = store.get();
  const tasks = s.tasks[expId] ?? {};
  const solved = Object.values(tasks).filter((t) => t.solved).length;
  return { solved: Math.min(solved, taskCount), total: taskCount, lab: !!s.labs[expId]?.done };
}
