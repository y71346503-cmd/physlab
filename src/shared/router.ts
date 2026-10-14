// Hash routing: GitHub Pages has no SPA fallback, and hash URLs work the same
// online, offline and in share links. Routes: #/  and  #/exp/<id>?<params>

import { useEffect, useState } from 'preact/hooks';

export type Route = { name: 'home' } | { name: 'exp'; id: string; query: string } | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  const [path = '', query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'exp' && parts[1] && /^[a-z0-9-]+$/.test(parts[1])) return { name: 'exp', id: parts[1], query };
  return { name: 'notfound' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Update the query of the current experiment URL without adding history entries. */
export function replaceQuery(id: string, query: string): void {
  const hash = `#/exp/${id}${query ? `?${query}` : ''}`;
  if (location.hash !== hash) history.replaceState(history.state, '', hash);
}

export function expLink(id: string, query = ''): string {
  return `#/exp/${id}${query ? `?${query}` : ''}`;
}
