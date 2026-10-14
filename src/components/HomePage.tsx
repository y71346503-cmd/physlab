import { useEffect, useReducer, useState } from 'preact/hooks';
import { catalog, SECTIONS, sectionLabel } from '../experiments/registry';
import type { Section } from '../experiments/types';
import { progressOf, store } from '../shared/storage';
import { expLink } from '../shared/router';
import { CardArt } from './CardArt';

const TASKS_PER_EXPERIMENT = 5;

export function HomePage() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => store.subscribe(() => force(0)), []);
  const [grade, setGrade] = useState<number | null>(null);
  const [section, setSection] = useState<Section | null>(null);

  useEffect(() => {
    document.title = 'Physlab: virtual physics lab';
  }, []);

  const grades = [...new Set(catalog.map((m) => m.grade))].sort((a, b) => a - b);
  const sections = SECTIONS.filter((s) => catalog.some((m) => m.section === s.key));
  const shown = catalog.filter((m) => (grade === null || m.grade === grade) && (section === null || m.section === section));

  return (
    <>
      <section class="hero">
        <div class="label">Virtual physics lab · grades 7–11</div>
        <h1>Real experiments on any phone, even without internet.</h1>
        <p>
          Change the parameters, watch what happens, take measurements with a stopwatch, ruler and meters, plot the data and find physical constants the
          way you would in a school lab.
        </p>
        <div class="features">
          <div class="feature">
            <b>Lab work</b>Measurement table, graph, least-squares line and a result with its uncertainty.
          </div>
          <div class="feature">
            <b>Auto-checked tasks</b>Five tasks per experiment with short explanations.
          </div>
          <div class="feature">
            <b>Works offline</b>After the first visit everything runs without a connection.
          </div>
          <div class="feature">
            <b>Honest physics</b>Real formulas and SI units; simplifications are stated.
          </div>
        </div>
      </section>

      <div class="filters">
        <div class="filter-group" role="group" aria-label="Filter by grade">
          <span class="label">Grade</span>
          <button type="button" class="chip" aria-pressed={grade === null} onClick={() => setGrade(null)}>
            All
          </button>
          {grades.map((g) => (
            <button key={g} type="button" class="chip" aria-pressed={grade === g} onClick={() => setGrade(g)}>
              {g}
            </button>
          ))}
        </div>
        <div class="filter-group" role="group" aria-label="Filter by section">
          <span class="label">Section</span>
          <button type="button" class="chip" aria-pressed={section === null} onClick={() => setSection(null)}>
            All
          </button>
          {sections.map((s) => (
            <button key={s.key} type="button" class="chip" aria-pressed={section === s.key} onClick={() => setSection(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p class="empty">No experiments match these filters yet.</p>
      ) : (
        <div class="cards">
          {shown.map((m) => {
            const p = progressOf(m.id, TASKS_PER_EXPERIMENT);
            return (
              <a key={m.id} class="card" href={expLink(m.id)}>
                <CardArt id={m.id} />
                <div class="card-body">
                  <div class="card-top">
                    <span class="label">{sectionLabel(m.section)}</span>
                    <span class="label">Grade {m.grade}</span>
                  </div>
                  <h2>{m.title}</h2>
                  <p>{m.summary}</p>
                  <div class="progress" aria-label={`Progress: ${p.solved} of ${p.total} tasks solved${p.lab ? ', lab work done' : ''}`}>
                    <span class="leds" aria-hidden="true">
                      {Array.from({ length: p.total }, (_, i) => (
                        <span key={i} class={`led${i < p.solved ? ' on' : ''}`} />
                      ))}
                    </span>
                    <span class="mono" style="font-size: 12px; color: var(--muted)" aria-hidden="true">
                      {p.solved}/{p.total}
                    </span>
                    <span class={`lab-badge${p.lab ? ' on' : ''}`} aria-hidden="true">
                      LAB
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
