// GitHub Pages build: no server, so feeds come from build-time snapshots and saved days stay in this browser.
export const staticSite = import.meta.env.VITE_STATIC_SITE === 'true';

export function feedUrl(name: 'events' | 'music') {
  return staticSite ? `${import.meta.env.BASE_URL}data/${name}.json` : `/api/${name}`;
}
