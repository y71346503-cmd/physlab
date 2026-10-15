# Physlab: notes for working on the code

Free virtual physics lab for grades 7–11 (target: schools in Armenia). Static site, no backend, English UI.
Read SPEC.md (requirements, Russian), DECISIONS.md (why things are the way they are) and PROGRESS.md (state) first.

## Commands

```bash
npm run dev       # dev server on http://localhost:5173
npm run check     # typecheck + unit tests + build + bundle budget (must pass before every commit)
npm run e2e       # Playwright against `vite preview` (build first); PW_CHANNEL=msedge on Windows
npm run icons     # regenerate PWA icons in public/icons
```

Windows: in Git Bash set `MSYS_NO_PATHCONV=1` before passing `#/exp/...` arguments to scripts.

## Layout

```
src/
  main.tsx, app.tsx          entry, shell (header, routes, toasts), service worker registration
  core/controller.ts         runs one experiment: fixed-step loop, rendering, stopwatch, meters, graph history
  core/tasks.ts              task variants (seeded per student) and answer checking
  components/                Preact UI: ExperimentPage, Scene, ParamPanel, LabView, TasksView, ...
  shared/                    no experiment knowledge: lsq, format, measure, chart, canvas, overlays, storage, router, params
  experiments/
    types.ts                 THE CONTRACT (read it)
    registry.ts              auto-discovers experiments via import.meta.glob
    <id>/meta.ts             catalog entry, loaded eagerly
    <id>/index.ts            defineExperiment({...}), loaded lazily as its own chunk
    <id>/model.ts            pure physics, no DOM, fully unit-tested (model.test.ts)
    <id>/sim.ts              SimInstance: state + Canvas rendering + readouts
    <id>/tasks.ts            5 tasks: choice, numeric (seeded vars), target (checks the sim)
    <id>/lab.ts              lab work: record(), axes for the linear fit, results with references
    <id>/theory.en.md        theory; Markdown + $TeX$ rendered to HTML at build time
build/theory-plugin.ts       Vite plugin: .md -> HTML string (marked + KaTeX at build time)
tests/                       shared unit tests + contract test for every experiment
e2e/                         Playwright smoke tests (themes, 360 px, offline, lab flow)
```

## Adding an experiment

1. Create `src/experiments/<id>/` with `meta.ts` (`meta.id` must equal the folder name) and `index.ts` exporting `defineExperiment(...)` as default. No registration line is needed.
2. Put physics in `model.ts` as pure functions with SI units (or clearly stated units) and test them against analytic results.
3. `kind: 'dynamic'` experiments implement `step(h)` and set `dt`; `kind: 'static'` ones just render from parameters.
4. Set `sim.scale` (px per metre) in `render` if the ruler should work.
5. Five tasks with all three kinds; compute answers with model functions, never hard-code numbers.
6. The lab must be a straight-line fit: choose axes that linearise the law, and compute results with `derive(fit, f)` so errors propagate.
7. Add a drawing to `components/CardArt.tsx` and the id to the catalog list in `tests/contract.test.ts` and `e2e/smoke.spec.ts`.

## Conventions

- TypeScript strict; Preact 11 (use `class`, string style values with units).
- Parameter keys are stable: they are used in share links, tasks and saved lab rows.
- Canvas colours come from CSS variables via `palette()`; never hard-code theme colours in scenes.
- No allocations in the per-frame path where avoidable; the controller re-renders UI at most ~8 Hz.
- Instrument readings: round to the division (`quantize`), realistic mode adds deterministic noise via `view.noise(key, sigma)`.
- Inputs accept "2.5" and "2,5" (`parseNumber`). Display uses `fmt` (real minus sign).
- UI text is English. No emoji. Formulas in task texts are Unicode (T = 2π√(L/g)), KaTeX only in theory.
- Keep the bundle budget: home ≤ 100 KB gzip, all JS/CSS without KaTeX ≤ 250 KB gzip.
