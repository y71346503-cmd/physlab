import { useEffect, useMemo, useState } from 'preact/hooks';
import { Controller, useController } from '../core/controller';
import { findMeta, loadExperiment, sectionLabel } from '../experiments/registry';
import type { Experiment } from '../experiments/types';
import { decodeParams, encodeParams } from '../shared/params';
import { replaceQuery } from '../shared/router';
import { store } from '../shared/storage';
import { toast } from '../shared/toast';
import { Controls } from './Controls';
import { IconBack } from './Icons';
import { InstrumentsPanel } from './Instruments';
import { LabView } from './LabView';
import { LiveGraph } from './LiveGraph';
import { ParamPanel } from './ParamPanel';
import { Readouts } from './Readouts';
import { Scene } from './Scene';
import { Tabs } from './Tabs';
import { TasksView } from './TasksView';
import { TheoryView } from './TheoryView';

export function ExperimentPage({ id, query }: { id: string; query: string }) {
  const meta = findMeta(id);
  const [exp, setExp] = useState<Experiment | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setExp(null);
    setFailed(false);
    loadExperiment(id)
      .then((e) => alive && setExp(e))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    document.title = meta ? `${meta.title} · Physlab` : 'Physlab';
  }, [meta]);

  if (!meta) {
    return (
      <div class="empty">
        <h1>Experiment not found</h1>
        <a class="btn" href="#/">
          Back to all experiments
        </a>
      </div>
    );
  }
  return (
    <>
      <div class="exp-head">
        <div>
          <div class="crumbs label">
            <a href="#/" style="display: inline-flex; align-items: center; gap: 4px">
              <span style="width: 14px; height: 14px; display: inline-flex">
                <IconBack />
              </span>
              All experiments
            </a>
            <span aria-hidden="true">/</span>
            <span>Grade {meta.grade}</span>
            <span aria-hidden="true">/</span>
            <span>{sectionLabel(meta.section)}</span>
          </div>
          <h1>{meta.title}</h1>
        </div>
      </div>
      {failed && <div class="empty">Could not load this experiment. Check the connection and reload the page.</div>}
      {!exp && !failed && <div class="loading">Loading the experiment…</div>}
      {exp && <ExperimentView key={id} exp={exp} query={query} />}
    </>
  );
}

function useWide(): boolean {
  const mq = '(min-width: 960px)';
  const [wide, setWide] = useState(() => matchMedia(mq).matches);
  useEffect(() => {
    const m = matchMedia(mq);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function ExperimentView({ exp, query }: { exp: Experiment; query: string }) {
  const ctrl = useMemo(() => new Controller(exp, decodeParams(exp.params, query), store.get().prefs.real ?? false), [exp]);
  useController(ctrl);
  const wide = useWide();
  const [tab, setTab] = useState('theory');

  useEffect(() => {
    ctrl.attach();
    return () => ctrl.detach();
  }, [ctrl]);

  // A pasted link to the same experiment with other parameters.
  useEffect(() => {
    if (query !== encodeParams(exp.params, ctrl.params)) ctrl.setParams(decodeParams(exp.params, query));
  }, [query]);

  // Keep the address bar in sync, so a reload or "Share" keeps the setup.
  const encoded = encodeParams(exp.params, ctrl.params);
  useEffect(() => {
    replaceQuery(exp.meta.id, encoded);
  }, [encoded]);

  const share = async () => {
    const url = location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ title: `${exp.meta.title} · Physlab`, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied. It opens the experiment with these settings.');
    } catch {
      toast(`Copy this link: ${url}`, { sticky: true, action: { label: 'OK', run: () => undefined } });
    }
  };

  const scene = (
    <div class="stack" style="gap: 10px">
      <Scene ctrl={ctrl} aspect={exp.aspect ?? 0.58} />
      <Controls ctrl={ctrl} onShare={share} />
    </div>
  );
  const params = (
    <section class="panel" aria-labelledby="params-title">
      <div class="panel-head">
        <span class="label" id="params-title">
          Parameters
        </span>
      </div>
      <div class="panel-body" style="padding-top: 2px; padding-bottom: 4px">
        <ParamPanel defs={exp.params} values={ctrl.params} onChange={(k, v) => ctrl.setParam(k, v)} />
      </div>
    </section>
  );
  const readouts = (
    <section class="panel" aria-labelledby="readouts-title">
      <div class="panel-head">
        <span class="label" id="readouts-title">
          Readouts
        </span>
      </div>
      <div class="panel-body">
        <Readouts items={ctrl.sim.readouts({ real: ctrl.real, noise: ctrl.noise, sw: ctrl.sw })} />
      </div>
    </section>
  );
  const instruments = (
    <section class="panel" aria-labelledby="inst-title">
      <div class="panel-head">
        <span class="label" id="inst-title">
          Instruments
        </span>
      </div>
      <div class="panel-body">
        <InstrumentsPanel ctrl={ctrl} />
      </div>
    </section>
  );
  const graph = exp.graphs && exp.graphs.length > 0 ? <LiveGraph ctrl={ctrl} /> : null;

  return (
    <>
      {wide ? (
        <div class="exp-grid">
          <div class="stack">
            {scene}
            {readouts}
            {graph}
          </div>
          <aside class="stack side">
            {params}
            {instruments}
          </aside>
        </div>
      ) : (
        <div class="stack">
          {scene}
          {params}
          {readouts}
          {instruments}
          {graph}
        </div>
      )}
      <section class="panel" style="margin-top: 14px" aria-label="Theory, tasks and lab work">
        <Tabs
          tabs={[
            { key: 'theory', label: 'Theory' },
            { key: 'tasks', label: `Tasks (${exp.tasks.length})` },
            { key: 'lab', label: 'Lab work' },
          ]}
          active={tab}
          onSelect={setTab}
        >
          {tab === 'theory' && <TheoryView html={exp.theory} />}
          {tab === 'tasks' && <TasksView ctrl={ctrl} />}
          {tab === 'lab' && <LabView ctrl={ctrl} />}
        </Tabs>
      </section>
    </>
  );
}
