// Build-time Markdown + KaTeX: theory files become plain HTML strings,
// so neither a Markdown parser nor the KaTeX runtime ends up in the bundle.
// Only KaTeX CSS and fonts are needed at runtime (loaded lazily by TheoryView).
import type { Plugin } from 'vite';
import { Marked } from 'marked';
import katex from 'katex';

const marked = new Marked({ gfm: true });

export function renderTheory(src: string): string {
  const math: string[] = [];
  const stash = (html: string) => `@@MATH${math.push(html) - 1}@@`;

  // $$ display $$ first, then $inline$. Placeholders keep Markdown away from TeX.
  let text = src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) =>
    `\n\n${stash(katex.renderToString(tex.trim(), { displayMode: true, throwOnError: true }))}\n\n`,
  );
  text = text.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_m, pre: string, tex: string) =>
    pre + stash(katex.renderToString(tex.trim(), { throwOnError: true })),
  );

  let html = marked.parse(text, { async: false }) as string;
  html = html.replace(/<p>@@MATH(\d+)@@<\/p>/g, (_m, i: string) => `<div class="math-display">${math[Number(i)]}</div>`);
  html = html.replace(/@@MATH(\d+)@@/g, (_m, i: string) => math[Number(i)]!);
  return html;
}

export function theoryPlugin(): Plugin {
  return {
    name: 'physlab-theory',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.md')) return null;
      return { code: `export default ${JSON.stringify(renderTheory(code))};`, map: null };
    },
  };
}
