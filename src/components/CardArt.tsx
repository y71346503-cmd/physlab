// Small line drawings for catalog cards, in the scene palette.

const ink = 'var(--scene-ink)';
const muted = 'var(--scene-muted)';
const accent = 'var(--accent)';

const ART: Record<string, preact.JSX.Element> = {
  pendulum: (
    <>
      <path d="M120 14h80" stroke={ink} stroke-width="2" />
      <path d="M126 14l-6 -6M136 14l-6-6M146 14l-6-6M156 14l-6-6M166 14l-6-6M176 14l-6-6M186 14l-6-6M196 14l-6-6" stroke={muted} stroke-width="1" />
      <path d="M160 14v58" stroke={muted} stroke-dasharray="3 4" />
      <path d="M160 14l26 52" stroke={ink} stroke-width="1.6" />
      <circle cx="187" cy="68" r="8" fill={accent} />
      <path d="M160 40 a26 26 0 0 0 11.6 -2.7" fill="none" stroke={muted} />
      <path d="M128 66 q32 18 64 0" fill="none" stroke={muted} stroke-dasharray="2 4" />
    </>
  ),
  projectile: (
    <>
      <path d="M40 76h240" stroke={ink} stroke-width="2" />
      <path d="M54 76 Q150 -18 248 76" fill="none" stroke={accent} stroke-width="2" />
      <path d="M54 76 Q120 20 196 76" fill="none" stroke={muted} stroke-dasharray="4 4" />
      <circle cx="151" cy="29" r="5" fill={ink} />
      <path d="M54 76l16 -16" stroke={ink} stroke-width="5" stroke-linecap="round" />
    </>
  ),
  incline: (
    <>
      <path d="M80 78h170L80 22z" fill="none" stroke={ink} stroke-width="2" />
      <g transform="rotate(18.3 138 44)">
        <rect x="124" y="30" width="28" height="18" fill={accent} />
      </g>
      <path d="M140 47v24" stroke={ink} stroke-width="1.6" />
      <path d="M136 67l4 6 4-6" fill={ink} />
      <path d="M220 78 a30 30 0 0 0 -3 -12" fill="none" stroke={muted} />
    </>
  ),
  circuit: (
    <>
      <path d="M90 20h140v58H90z" fill="none" stroke={ink} stroke-width="1.8" />
      <rect x="140" y="12" width="40" height="16" fill="var(--scene-bg)" stroke={ink} stroke-width="1.8" />
      <path d="M84 44h12M87 52h6" stroke={ink} stroke-width="2.2" />
      <rect x="84" y="40" width="12" height="16" fill="var(--scene-bg)" stroke="none" />
      <path d="M82 44h16M86 52h8" stroke={ink} stroke-width="2.4" />
      <circle cx="230" cy="49" r="11" fill="var(--scene-bg)" stroke={ink} stroke-width="1.8" />
      <text x="230" y="53.5" font-size="12" text-anchor="middle" fill={ink} font-family="var(--font-mono)" font-weight="700">A</text>
      <circle cx="160" cy="78" r="10" fill={accent} opacity="0.25" />
      <circle cx="160" cy="78" r="7" fill="var(--scene-bg)" stroke={ink} stroke-width="1.6" />
      <path d="M155 73l10 10M165 73l-10 10" stroke={ink} stroke-width="1.4" />
    </>
  ),
  lens: (
    <>
      <path d="M30 50h260" stroke={muted} stroke-dasharray="5 4" />
      <path d="M160 14v72M154 20l6-6 6 6M154 80l6 6 6-6" fill="none" stroke={ink} stroke-width="1.8" />
      <path d="M90 50V26" stroke={ink} stroke-width="2.4" />
      <path d="M86 30l4-6 4 6" fill={ink} />
      <path d="M90 26h70l70 44" fill="none" stroke={accent} stroke-width="1.6" />
      <path d="M90 26l140 44" fill="none" stroke={accent} stroke-width="1.6" opacity="0.7" />
      <path d="M230 50v20" stroke={accent} stroke-width="2.4" />
    </>
  ),
  archimedes: (
    <>
      <path d="M130 30v54h60V30" fill="none" stroke={ink} stroke-width="1.8" />
      <rect x="131" y="52" width="58" height="31" fill="#5aa9e6" opacity="0.35" />
      <path d="M131 52h58" stroke="#3f8fc9" />
      <path d="M160 6v32" stroke={ink} stroke-width="1.2" />
      <rect x="148" y="38" width="24" height="24" fill={accent} />
      <path d="M200 40v40M196 44l4-4 4 4" fill="none" stroke={muted} />
    </>
  ),
};

export function CardArt({ id }: { id: string }) {
  return (
    <svg class="card-art" viewBox="0 0 320 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {ART[id] ?? null}
    </svg>
  );
}
