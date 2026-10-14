import { useEffect, useRef, useState } from 'preact/hooks';
import { ExperimentPage } from './components/ExperimentPage';
import { HomePage } from './components/HomePage';
import { IconMoon, IconSun, Logo } from './components/Icons';
import { useRoute } from './shared/router';
import { currentTheme, setTheme, THEME_EVENT } from './shared/theme';
import { dismiss, onToasts, type ToastMsg } from './shared/toast';

export function App() {
  const route = useRoute();
  const main = useRef<HTMLElement>(null);
  const routeKey = route.name === 'exp' ? `exp:${route.id}` : route.name;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  return (
    <>
      <button type="button" class="skip-link" onClick={() => main.current?.focus()}>
        Skip to content
      </button>
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#/" aria-label="Physlab home">
            <Logo />
            <span class="brand-name">Physlab</span>
            <span class="brand-sub">virtual physics lab</span>
          </a>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {route.name === 'home' && <HomePage />}
        {route.name === 'exp' && <ExperimentPage id={route.id} query={route.query} />}
        {route.name === 'notfound' && (
          <div class="empty">
            <h1>Page not found</h1>
            <a class="btn" href="#/">
              All experiments
            </a>
          </div>
        )}
      </main>
      <footer class="footer">
        Physlab is free and open source. Progress is stored only in this browser. Works offline after the first visit.
      </footer>
      <Toasts />
    </>
  );
}

function ThemeToggle() {
  const [theme, setT] = useState(currentTheme());
  useEffect(() => {
    const on = () => setT(currentTheme());
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" class="btn btn-ghost btn-icon" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}

function Toasts() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => onToasts(setList), []);
  return (
    <div class="toasts" aria-live="polite">
      {list.map((m) => (
        <div class="toast" key={m.id} role="status">
          <span>{m.text}</span>
          {m.action && (
            <button
              type="button"
              class="btn btn-primary btn-small"
              onClick={() => {
                m.action!.run();
                dismiss(m.id);
              }}
            >
              {m.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
