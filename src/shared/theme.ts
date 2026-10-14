import { invalidatePalette } from './palette';
import { store } from './storage';

export type Theme = 'light' | 'dark';

export const THEME_EVENT = 'physlab:theme';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  store.update((s) => {
    s.prefs.theme = t;
  });
  invalidatePalette();
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Follow the system theme until the user picks one explicitly. */
export function watchSystemTheme(): void {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    if (store.get().prefs.theme) return;
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    invalidatePalette();
    window.dispatchEvent(new Event(THEME_EVENT));
  });
}
