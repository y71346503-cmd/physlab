// Task engine: variants from the student's seed and answer checking.

import type { NumericTask, Vars } from '../experiments/types';
import { parseNumber } from '../shared/format';
import { hashString, mulberry32 } from '../shared/rng';

export function variantVars(task: NumericTask, seed: number, expId: string, variant: number): Vars {
  return task.vars(mulberry32(hashString(`${seed}|${expId}|${task.id}|${variant}`)));
}

export type NumericVerdict = { kind: 'invalid' } | { kind: 'checked'; ok: boolean; answer: number };

export function checkNumeric(task: NumericTask, vars: Vars, input: string): NumericVerdict {
  const x = parseNumber(input);
  if (x === null) return { kind: 'invalid' };
  const answer = task.answer(vars);
  const tol = Math.max(Math.abs(answer) * task.tolerance, 1e-9);
  return { kind: 'checked', ok: Math.abs(x - answer) <= tol, answer };
}
