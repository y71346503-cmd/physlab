// Line icons, 24x24 grid, currentColor.

type P = { title?: string };

const svg = (body: preact.ComponentChildren, title?: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
    {title && <title>{title}</title>}
    {body}
  </svg>
);

export const IconPlay = ({ title }: P) => svg(<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />, title);
export const IconPause = ({ title }: P) => svg(<><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>, title);
export const IconStep = ({ title }: P) => svg(<><path d="M5 5v14l10-7z" fill="currentColor" stroke="none" /><path d="M19 5v14" /></>, title);
export const IconReset = ({ title }: P) => svg(<><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></>, title);
export const IconShare = ({ title }: P) => svg(<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>, title);
export const IconSun = ({ title }: P) => svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, title);
export const IconMoon = ({ title }: P) => svg(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />, title);
export const IconBack = ({ title }: P) => svg(<path d="M15 5l-7 7 7 7" />, title);
export const IconRuler = ({ title }: P) => svg(<><rect x="2" y="8" width="20" height="8" rx="1" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></>, title);
export const IconProtractor = ({ title }: P) => svg(<><path d="M3 17a9 9 0 0 1 18 0z" /><path d="M12 17l4-6" /></>, title);
export const IconStopwatch = ({ title }: P) => svg(<><circle cx="12" cy="13" r="8" /><path d="M12 13V9M10 2h4M19 6l-1.5 1.5" /></>, title);
export const IconTrash = ({ title }: P) => svg(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>, title);
export const IconDownload = ({ title }: P) => svg(<><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></>, title);
export const IconPlus = ({ title }: P) => svg(<path d="M12 5v14M5 12h14" />, title);

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)" />
      <path d="M8 7h16" stroke="var(--surface)" stroke-width="2" stroke-linecap="round" />
      <path d="M16 7l5 13" stroke="var(--surface)" stroke-width="1.6" />
      <circle cx="21.4" cy="21.2" r="3.6" fill="var(--accent)" />
      <path d="M16 7v15" stroke="var(--surface)" stroke-width="1" stroke-dasharray="1.5 2" opacity="0.6" />
    </svg>
  );
}
