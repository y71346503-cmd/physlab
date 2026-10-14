import { useEffect } from 'preact/hooks';

/** Theory is pre-rendered at build time; only KaTeX styles and fonts load here. */
export function TheoryView({ html }: { html: string }) {
  useEffect(() => {
    void import('../shared/katex-styles');
  }, []);
  return <div class="theory" dangerouslySetInnerHTML={{ __html: html }} />;
}
