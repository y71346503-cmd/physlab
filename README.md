# Physlab

A free virtual physics lab for grades 7–11. Students change parameters, watch the result, take measurements with a stopwatch, ruler, protractor and meters, plot the data, fit a straight line by least squares and find physical constants with an uncertainty, just like in a school lab. Every experiment also has theory and five auto-checked tasks.

Made for schools that lack lab equipment (first of all in Armenia). It is a static website: no accounts, no server, no tracking. After the first visit it works completely offline, also on low-end phones.

## Experiments

| Experiment | Grade | Lab work |
|---|---|---|
| Simple pendulum | 9 | find g from T² against L (also on the Moon, Mars and an unknown planet) |
| Projectile motion | 9 | range against sin 2α, launch speed; with and without air resistance |
| Inclined plane | 10 | friction coefficient μ from a photogate timer, unknown surfaces |
| Electric circuit | 8 | Ohm's law and the I–V curve of a resistor and of a filament lamp |
| Thin lenses | 8 | focal length from 1/f against 1/d with a screen |
| Archimedes' principle | 7 | densities of a liquid and a body from spring-scale readings |

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Other commands:

- `npm run check` — type check, unit tests, production build and bundle size budget
- `npm run e2e` — browser tests against the production build (themes, 360 px width, offline). On Windows you can use the built-in Edge: `PW_CHANNEL=msedge npm run e2e`; elsewhere run `npx playwright install chromium` once.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: all checks, then deployment to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**. The site appears at `https://<user>.github.io/<repo>/`.

## Add a new experiment

Create a folder `src/experiments/<id>/` with `meta.ts` and `index.ts` — it is picked up automatically. The contract is described in `src/experiments/types.ts` and in [CLAUDE.md](CLAUDE.md); any existing experiment (the pendulum is the reference one) is a good template.

## Content review

Theory, tasks and grade levels were written to follow the usual grades 7–11 curriculum and should be reviewed by a physics teacher. The interface is in English only; adding Armenian or Russian would require moving texts into dictionaries (see DECISIONS.md).

## License

Code: MIT (see [LICENSE](LICENSE)). Texts of theory and tasks: CC BY 4.0.
