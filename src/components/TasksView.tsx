import { useEffect, useMemo, useReducer, useState } from 'preact/hooks';
import type { Controller } from '../core/controller';
import { checkNumeric, variantVars } from '../core/tasks';
import type { ChoiceTask, NumericTask, TargetTask, TaskDef, TaskLevel } from '../experiments/types';
import { fmtSig } from '../shared/format';
import { setTaskState, store, taskState } from '../shared/storage';

function useStore(): void {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => store.subscribe(() => force(0)), []);
}

export function TasksView({ ctrl }: { ctrl: Controller }) {
  useStore();
  const id = ctrl.exp.meta.id;
  const solved = ctrl.exp.tasks.filter((t) => taskState(id, t.id).solved).length;
  return (
    <div class="tasks">
      <p style="margin: 0; color: var(--ink-2)">
        Solved {solved} of {ctrl.exp.tasks.length}. Tasks marked "simulation" are checked against the current state of the experiment above.
      </p>
      {ctrl.exp.tasks.map((t, i) => (
        <TaskCard key={t.id} n={i + 1} task={t} ctrl={ctrl} />
      ))}
    </div>
  );
}

type Feedback = { ok: boolean; text: string; explain?: string } | null;

function Level({ level }: { level: TaskLevel }) {
  return (
    <span class="level" aria-label={`Difficulty ${level} of 3`} role="img">
      {[1, 2, 3].map((i) => (
        <span key={i} class={i <= level ? 'on' : ''} />
      ))}
    </span>
  );
}

function TaskCard({ n, task, ctrl }: { n: number; task: TaskDef<any>; ctrl: Controller }) {
  const expId = ctrl.exp.meta.id;
  const st = taskState(expId, task.id);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const kindLabel = task.kind === 'target' ? 'simulation' : task.kind === 'numeric' ? 'calculation' : 'choice';

  const record = (ok: boolean) => {
    setTaskState(expId, task.id, { solved: st.solved || ok, tries: st.tries + 1 });
  };

  return (
    <article class={`task${st.solved ? ' solved' : ''}`} aria-labelledby={`task-${task.id}`}>
      <div class="task-head">
        <span class="label" id={`task-${task.id}`}>
          Task {n} · {kindLabel}
        </span>
        <Level level={task.level} />
        <span class={`task-status${st.solved ? ' ok' : ''}`}>{st.solved ? 'Solved' : st.tries > 0 ? `${st.tries} attempt${st.tries > 1 ? 's' : ''}` : ''}</span>
      </div>
      {task.kind === 'choice' && <ChoiceBody task={task} onResult={(ok, fb) => (record(ok), setFeedback(fb))} />}
      {task.kind === 'numeric' && (
        <NumericBody
          task={task}
          expId={expId}
          variant={st.variant}
          onResult={(ok, fb) => (record(ok), setFeedback(fb))}
          onNewVariant={() => {
            setTaskState(expId, task.id, { variant: st.variant + 1 });
            setFeedback(null);
          }}
        />
      )}
      {task.kind === 'target' && <TargetBody task={task} ctrl={ctrl} tries={st.tries} onResult={(ok, fb) => (record(ok), setFeedback(fb))} />}
      {feedback && (
        <div class={`feedback ${feedback.ok ? 'ok' : 'bad'}`} role="status">
          <strong>{feedback.text}</strong>
          {feedback.explain && <div class="explain">{feedback.explain}</div>}
        </div>
      )}
    </article>
  );
}

function ChoiceBody({ task, onResult }: { task: ChoiceTask; onResult: (ok: boolean, fb: Feedback) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const name = `opt-${task.id}`;
  return (
    <>
      <p>{task.prompt}</p>
      <div class="options" role="radiogroup">
        {task.options.map((o, i) => (
          <label class="option" key={i}>
            <input type="radio" name={name} checked={sel === i} onChange={() => setSel(i)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        class="btn"
        disabled={sel === null}
        onClick={() => {
          const ok = sel === task.correct;
          onResult(ok, { ok, text: ok ? 'Correct.' : 'Not quite.', explain: task.explain });
        }}
      >
        Check
      </button>
    </>
  );
}

function NumericBody({ task, expId, variant, onResult, onNewVariant }: { task: NumericTask; expId: string; variant: number; onResult: (ok: boolean, fb: Feedback) => void; onNewVariant: () => void }) {
  const seed = store.get().seed;
  const vars = useMemo(() => variantVars(task, seed, expId, variant), [task, seed, expId, variant]);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    setInput('');
    setWrong(false);
  }, [variant]);

  const check = () => {
    const v = checkNumeric(task, vars, input);
    if (v.kind === 'invalid') {
      onResult(false, { ok: false, text: 'Enter a number, for example 2.5 or 2,5.' });
      return;
    }
    setWrong(!v.ok);
    onResult(v.ok, {
      ok: v.ok,
      text: v.ok ? `Correct: ${fmtSig(v.answer, 3)} ${task.unit}.` : `Not quite. The answer is ${fmtSig(v.answer, 3)} ${task.unit}.`,
      explain: task.explain(vars),
    });
  };

  return (
    <>
      <p>{task.prompt(vars)}</p>
      <div class="answer-row">
        <span class="num">
          <input
            inputMode="decimal"
            aria-label={`Answer in ${task.unit}`}
            value={input}
            disabled={wrong}
            onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && !wrong && check()}
          />
          <span class="unit">{task.unit}</span>
        </span>
        {!wrong && (
          <button type="button" class="btn" onClick={check} disabled={!input.trim()}>
            Check
          </button>
        )}
        <button type="button" class="btn btn-ghost btn-small" onClick={onNewVariant}>
          {wrong ? 'Try a new variant' : 'New numbers'}
        </button>
      </div>
    </>
  );
}

function TargetBody({ task, ctrl, tries, onResult }: { task: TargetTask<any>; ctrl: Controller; tries: number; onResult: (ok: boolean, fb: Feedback) => void }) {
  return (
    <>
      <p>{task.prompt}</p>
      <button
        type="button"
        class="btn"
        onClick={() => {
          const r = task.check(ctrl.params, ctrl.sim);
          onResult(r.ok, { ok: r.ok, text: r.ok ? 'Done: the setup meets the goal.' : r.message ?? 'Not yet: the setup does not meet the goal.', explain: r.ok ? task.explain : tries >= 1 ? `Hint: ${task.explain}` : undefined });
        }}
      >
        Check the simulation
      </button>
    </>
  );
}
