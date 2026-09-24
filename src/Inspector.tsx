import { useEffect, useState } from 'react';
import { Code2, ExternalLink } from 'lucide-react';
import { lensNames, type Lens, type Mode } from './data';
import { Modal } from './components';

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
  const channels = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function Inspector({ open, onClose, lens, mode, reduced, setReduced, contrast, setContrast }: { open: boolean; onClose: () => void; lens: Lens; mode: Mode; reduced: boolean; setReduced: (value: boolean) => void; contrast: boolean; setContrast: (value: boolean) => void }) {
  const [component, setComponent] = useState('PlaceCard');
  const [snapshot, setSnapshot] = useState({ width: 0, height: 0, container: 0, containerHeight: 0, tokens: {} as Record<string, string>, state: '', reduced: false, forced: false });
  useEffect(() => {
    if (!open) return;
    const inspect = () => {
      const style = getComputedStyle(document.documentElement);
      const element = document.querySelector<HTMLElement>(`[data-component="${component}"]`);
      const bounds = element?.getBoundingClientRect();
      const tokens = Object.fromEntries(['canvas', 'surface', 'text', 'muted', 'border', 'accent', 'accent-ink', 'danger', 'focus', 'display', 'body', 'radius', 'duration'].map(token => [token, style.getPropertyValue(`--${token}`).trim()]));
      setSnapshot({ width: innerWidth, height: innerHeight, container: Math.round(bounds?.width ?? 0), containerHeight: Math.round(bounds?.height ?? 0), tokens, state: element?.className || 'Not mounted', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, forced: matchMedia('(forced-colors: active)').matches });
    };
    inspect();
    const observer = new ResizeObserver(inspect);
    observer.observe(document.documentElement);
    const element = document.querySelector(`[data-component="${component}"]`);
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [open, lens, mode, component, reduced, contrast]);
  const foreground = luminance(snapshot.tokens.text || '#000000');
  const background = luminance(snapshot.tokens.canvas || '#ffffff');
  const ratio = ((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toFixed(2);
  return <Modal title="System Inspector" open={open} onClose={onClose} className="inspector-dialog">
    <p className="eyebrow"><Code2 size={15} />Elsewhere / design system</p><div className="inspector-title">{lensNames[lens]}<span>{mode}</span></div>
    <label className="field">Component<select value={component} onChange={event => setComponent(event.target.value)}>{['PlaceCard', 'DiscoveryMap', 'DayPlanner', 'DayBalance'].map(name => <option key={name}>{name}</option>)}</select></label>
    <dl className="inspector-facts"><div><dt>Viewport</dt><dd>{snapshot.width} x {snapshot.height}</dd></div><div><dt>First instance</dt><dd>{snapshot.container} x {snapshot.containerHeight}</dd></div><div><dt>Container state</dt><dd>{snapshot.container < 400 ? 'Narrow' : snapshot.container < 800 ? 'Moderate' : 'Spacious'}</dd></div><div><dt>Variant / state</dt><dd>{snapshot.state}</dd></div><div><dt>Text / canvas contrast</dt><dd>{ratio}:1</dd></div><div><dt>OS reduced motion</dt><dd>{snapshot.reduced ? 'Active' : 'Inactive'}</dd></div><div><dt>OS forced colors</dt><dd>{snapshot.forced ? 'Active' : 'Inactive'}</dd></div></dl>
    <h3>Semantic tokens</h3><div className="token-list">{Object.entries(snapshot.tokens).map(([name, value]) => <div key={name}><span className="token-swatch" style={{ background: value.startsWith('#') ? value : 'transparent' }} /><code>--{name}</code><code>{value}</code></div>)}</div>
    <h3>Preference previews</h3><label className="check-label"><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />Reduce motion</label><label className="check-label"><input type="checkbox" checked={contrast} onChange={event => setContrast(event.target.checked)} />High-contrast palette preview</label><p className="muted small">Palette preview is not OS forced-colors emulation. Contrast shown is the solid text/canvas token pair, not a full conformance check.</p>
    <a className="documentation-link" href={`${import.meta.env.BASE_URL}system.html`} target="_blank" rel="noreferrer">Component documentation and accessibility contracts<ExternalLink size={16} /></a>
  </Modal>;
}