import { useState } from 'react';
import { KeyRound, LogOut, Moon, Sun } from 'lucide-react';
import { lensNames, type Lens, type Mode } from './data';
import { IconButton, Modal } from './components';
import { authClient } from './auth-client';
import { staticSite } from './static-mode';

type Props = {
  onClose: () => void; lens: Lens; mode: Mode; setLens: (value: Lens) => void; setMode: (value: Mode) => void;
  reduced: boolean; contrast: boolean; setReduced: (value: boolean) => void; setContrast: (value: boolean) => void;
  user?: { name: string; email: string }; busy: boolean; onSignIn: () => void; onReset: () => void; onSignOut: () => void; onProfile: () => void;
};
export function SettingsDialog(props: Props) {
  const [name, setName] = useState(props.user?.name ?? '');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <Modal title="Settings" open onClose={() => { if (!working) props.onClose(); }} className="settings-dialog">
    <section aria-labelledby="appearance-heading"><h3 id="appearance-heading">Appearance</h3><div className="segmented lenses settings-lenses" role="group" aria-label="Design Lens">{(Object.keys(lensNames) as Lens[]).map(value => <button key={value} aria-pressed={props.lens === value} onClick={() => props.setLens(value)}><span className={`lens-swatch ${value}`} />{lensNames[value]}</button>)}</div><div className="mode-controls" role="group" aria-label="Color mode"><IconButton label="Light mode" aria-pressed={props.mode === 'light'} onClick={() => props.setMode('light')}><Sun size={18} /></IconButton><IconButton label="Dark mode" aria-pressed={props.mode === 'dark'} onClick={() => props.setMode('dark')}><Moon size={18} /></IconButton></div></section>
    <section aria-labelledby="accessibility-heading"><h3 id="accessibility-heading">Accessibility</h3><label className="check-label"><input type="checkbox" checked={props.reduced} onChange={event => props.setReduced(event.target.checked)} />Reduce motion</label><label className="check-label"><input type="checkbox" checked={props.contrast} onChange={event => props.setContrast(event.target.checked)} />High contrast</label></section>
    {staticSite ? <section aria-labelledby="account-heading"><h3 id="account-heading">Your data</h3><p className="muted">This is a demo site without accounts. Saved items and days are stored in this browser only.</p></section> : <section aria-labelledby="account-heading"><h3 id="account-heading">Account</h3>{props.user ? <form onSubmit={async event => {
      event.preventDefault(); if (working || props.busy) return; setWorking(true); setMessage(''); setError('');
      try { const result = await authClient.updateUser({ name: name.trim() }); if (result.error) throw new Error(); setMessage('Profile updated.'); props.onProfile(); }
      catch { setError('Could not update your profile. Please try again.'); } finally { setWorking(false); }
    }}><p className="muted small">{props.user.email}</p><label className="field">Display name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><button className="filter-button" disabled={working || props.busy || !name.trim() || name.trim() === props.user.name} type="submit">{working ? 'Saving...' : 'Save profile'}</button></form> : <><p className="muted">Browsing as a guest</p><button className="filter-button" onClick={props.onSignIn}>Sign in</button></>}
    <div className="dialog-actions"><button className="filter-button" disabled={working || props.busy} onClick={props.onReset}><KeyRound size={17} />Reset password</button>{props.user && <button className="filter-button" disabled={working || props.busy} onClick={props.onSignOut}><LogOut size={17} />Sign out</button>}</div>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}</section>}
  </Modal>;
}