// Experiments are discovered automatically: creating src/experiments/<id>/
// with meta.ts and index.ts is all it takes to register a new one.

import type { Experiment, ExperimentMeta, Section } from './types';

const metaModules = import.meta.glob<ExperimentMeta>('./*/meta.ts', { eager: true, import: 'meta' });
const loaders = import.meta.glob<Experiment>('./*/index.ts', { import: 'default' });

const folderOf = (path: string) => path.split('/')[1]!;

export const catalog: ExperimentMeta[] = Object.entries(metaModules)
  .map(([path, meta]) => {
    if (meta.id !== folderOf(path)) throw new Error(`meta.id "${meta.id}" must match folder "${folderOf(path)}"`);
    return meta;
  })
  .sort((a, b) => a.order - b.order);

export function findMeta(id: string): ExperimentMeta | undefined {
  return catalog.find((m) => m.id === id);
}

export function loadExperiment(id: string): Promise<Experiment> {
  const loader = loaders[`./${id}/index.ts`];
  if (!loader) return Promise.reject(new Error(`Unknown experiment: ${id}`));
  return loader();
}

export const SECTIONS: { key: Section; label: string }[] = [
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'optics', label: 'Optics' },
  { key: 'hydrostatics', label: 'Hydrostatics' },
];

export function sectionLabel(s: Section): string {
  return SECTIONS.find((x) => x.key === s)?.label ?? s;
}
