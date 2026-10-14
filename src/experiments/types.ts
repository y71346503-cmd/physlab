// The experiment contract. Every experiment folder exports `meta` from meta.ts
// (loaded eagerly for the catalog) and a default `Experiment` from index.ts
// (loaded lazily as its own chunk). See CLAUDE.md.

import type { Palette } from '../shared/palette';
import type { Fit } from '../shared/lsq';

export type Section = 'mechanics' | 'electricity' | 'optics' | 'hydrostatics';

export interface ExperimentMeta {
  id: string;
  title: string;
  grade: number;
  section: Section;
  summary: string;
  /** Position in the catalog. */
  order: number;
}

export type ParamValues = Record<string, number>;

export interface Option {
  label: string;
  value: number;
}

export interface ParamDef {
  /** Stable key: used in share links, tasks and saved lab rows. Never rename. */
  key: string;
  label: string;
  symbol?: string;
  /** Display unit. Values are stored in display units. */
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** 'range' (slider + input, default), 'select' (options), 'toggle' (0/1). */
  type?: 'range' | 'select' | 'toggle';
  options?: Option[];
  /** Hide options that make no sense for the current setup. */
  optionAvailable?: (value: number, p: ParamValues) => boolean;
  /** Quick-set buttons for a range parameter. */
  presets?: Option[];
  visible?: (p: ParamValues) => boolean;
  hint?: string;
}

export interface Readout {
  label: string;
  symbol?: string;
  unit: string;
  /** Pre-formatted value. */
  text: string;
}

/** Stopwatch state in simulation time; the student starts and stops it. */
export interface StopwatchState {
  start: number | null;
  stop: number | null;
}

export interface View {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels. */
  w: number;
  h: number;
  pal: Palette;
  sw: StopwatchState;
  /** Instruments in realistic mode (affects built-in displays). */
  real: boolean;
  noise: NoiseFn;
}

/**
 * Deterministic measurement noise: same setup and key give the same error,
 * so a reading does not jitter, but every new setup gets a fresh one.
 */
export type NoiseFn = (key: string, sigma: number) => number;

export interface SimInstance {
  /** Simulation time, s. */
  t: number;
  /** Advance by a fixed step h (dynamic experiments only). */
  step?(h: number): void;
  /** True when the run is over (e.g. ball landed); the runner pauses itself. */
  done?: boolean;
  render(view: View): void;
  /** World scale of the last render, px per metre (enables the ruler). */
  scale?: number;
  readouts(view: Pick<View, 'real' | 'noise' | 'sw'>): Readout[];
  /** Short text alternative for the canvas. */
  describe(): string;
}

export interface GraphSeries<S> {
  label: string;
  get: (sim: S) => number;
}

export interface GraphDef<S> {
  key: string;
  label: string;
  unit: string;
  series: GraphSeries<S>[];
}

export interface MeterRange {
  max: number;
  div: number;
}

export interface MeterDef<S> {
  id: string;
  kind: 'dynamometer' | 'ammeter' | 'voltmeter';
  label: string;
  unit: string;
  ranges: MeterRange[];
  /** Accuracy class: max error as % of full scale (used in realistic mode). */
  accuracyClass: number;
  /** True value; null when the meter is not connected. */
  value: (sim: S, p: ParamValues) => number | null;
  /** Value used to choose the range (defaults to `value`). */
  rangeRef?: (sim: S, p: ParamValues) => number | null;
}

export interface Instruments<S> {
  stopwatch?: boolean;
  /** Ruler length in metres (needs `sim.scale`). */
  ruler?: number;
  protractor?: boolean;
  meters?: MeterDef<S>[];
}

export interface MeterReading {
  reading: number;
  range: MeterRange;
  overload: boolean;
}

export interface LabContext<S> {
  params: ParamValues;
  sim: S;
  sw: StopwatchState;
  meters: Record<string, MeterReading | null>;
  real: boolean;
  noise: NoiseFn;
}

export interface LabColumn {
  key: string;
  label: string;
  unit: string;
  digits: number;
}

export interface LabRow {
  values: Record<string, number>;
  /** Hidden data saved with the row (setup used), for checks and references. */
  meta: Record<string, number>;
}

export interface LabResult {
  label: string;
  symbol: string;
  unit: string;
  value: number;
  error: number;
  /** Reference value to compare with; null if there is none. */
  reference: number | null;
}

export interface LabAxis {
  label: string;
  unit: string;
  get: (row: LabRow) => number;
}

export interface LabDef<S> {
  goal: string;
  steps: string[];
  columns: LabColumn[];
  record(ctx: LabContext<S>): LabRow | { error: string };
  x: LabAxis;
  y: LabAxis;
  minPoints: number;
  /** Fit model description shown under the graph. */
  model: string;
  results(fit: Fit, rows: LabRow[]): LabResult[];
  notes?(fit: Fit, rows: LabRow[]): string[];
}

export type TaskLevel = 1 | 2 | 3;

export interface ChoiceTask {
  kind: 'choice';
  id: string;
  level: TaskLevel;
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

export type Vars = Record<string, number>;

export interface NumericTask {
  kind: 'numeric';
  id: string;
  level: TaskLevel;
  /** Generate the numbers of this variant; values must be already rounded as shown. */
  vars: (rng: () => number) => Vars;
  prompt: (v: Vars) => string;
  unit: string;
  answer: (v: Vars) => number;
  /** Relative tolerance, e.g. 0.02 for 2%. */
  tolerance: number;
  explain: (v: Vars) => string;
}

export interface TargetTask<S> {
  kind: 'target';
  id: string;
  level: TaskLevel;
  prompt: string;
  /** Check the current state of the simulation. */
  check: (p: ParamValues, sim: S) => { ok: boolean; message?: string };
  explain: string;
}

export type TaskDef<S> = ChoiceTask | NumericTask | TargetTask<S>;

export interface Experiment<S extends SimInstance = SimInstance> {
  meta: ExperimentMeta;
  kind: 'dynamic' | 'static';
  /** Fixed integration step, s (dynamic only). */
  dt?: number;
  /** Scene height / width. */
  aspect?: number;
  params: ParamDef[];
  /** Build a fresh simulation. `prev` lets a sim keep things like old trajectories. */
  create(p: ParamValues, prev?: S): S;
  graphs?: GraphDef<S>[];
  instruments: Instruments<S>;
  tasks: TaskDef<S>[];
  lab: LabDef<S>;
  /** Pre-rendered HTML (theory.en.md). */
  theory: string;
}

/** Identity helper that keeps the sim type inside one experiment and erases it for the registry. */
export function defineExperiment<S extends SimInstance>(e: Experiment<S>): Experiment {
  return e as unknown as Experiment;
}
