import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { authClient } from './auth-client';
import { IconButton, Modal } from './components';
import { maximumPasswordLength, minimumPasswordLength, passwordRequirements, validNewPassword } from './password-policy';

export function AuthDialog({ onClose, onSignedIn, initialMode = 'signin', initialEmail = '' }: { onClose: () => void; onSignedIn: () => void; initialMode?: 'signin' | 'forgot'; initialEmail?: string }) {
  const [trigger] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => () => { queueMicrotask(() => { if (trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus(); }); }, [trigger]);
  const [link] = useState(() => new URLSearchParams(location.search));
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot' | 'reset' | 'verify'>(() => link.get('account') === 'reset' ? 'reset' : initialMode);
  const [emailDelivery, setEmailDelivery] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => link.has('error') ? 'This email link is invalid or expired. Request a new link.' : '');
  const [notice, setNotice] = useState(() => link.get('account') === 'verified' && !link.has('error') ? 'Email verified. Sign in to continue.' : '');
  useEffect(() => {
    if (link.has('account')) {
      const url = new URL(location.href);
      for (const key of ['account', 'token', 'error']) url.searchParams.delete(key);
      history.replaceState(null, '', url);
    }
    const controller = new AbortController();
    void fetch('/api/auth/capabilities', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const body = await response.json();
      setEmailDelivery(body.emailDelivery === true);
    }).catch(() => { if (!controller.signal.aborted) setEmailDelivery(false); });
    return () => controller.abort();
  }, [link]);
  function changeMode(next: typeof mode) {
    setMode(next); setPassword(''); setConfirmation(''); setShowPassword(false); setError(''); setNotice('');
  }
  const title = { signin: 'Sign in', register: 'Create account', forgot: 'Reset password', reset: 'Choose a new password', verify: 'Resend verification email' }[mode];
  const hasPassword = mode === 'signin' || mode === 'register' || mode === 'reset';
  const newPassword = mode === 'register' || mode === 'reset';
  const sendsEmail = mode === 'forgot' || mode === 'verify';
  function accountError(reason: { status?: number; code?: string; message?: string }, fallback: string) {
    if (reason.status === 429) return 'Too many attempts. Try again in a minute.';
    if (reason.status !== undefined && reason.status >= 500) return 'The account service is temporarily unavailable. Your details have been kept so you can try again.';
    if (reason.code === 'INVALID_ORIGIN' || reason.code === 'INVALID_CALLBACK_URL') return 'This site address is not allowed by the account service. Open the app at its configured address and try again.';
    return fallback;
  }
  async function submit() {
    if (busy) return;
    if (newPassword && !validNewPassword(password)) { setError(passwordRequirements); return; }
    if (mode === 'reset' && password !== confirmation) { setError('Passwords do not match.'); return; }
    if (mode === 'reset' && !link.get('token')) { setError('This reset link is invalid or expired. Request a new link.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'register') {
        const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: `${location.origin}/?account=verified` });
        if (result.error) { setError(accountError(result.error, result.error.message || 'Could not create an account. Please try again.')); return; }
        changeMode('signin'); setNotice(emailDelivery ? 'Registration received. Check your email to verify your account, then sign in.' : 'Registration received. Sign in with your email and password.');
      } else if (mode === 'forgot' || mode === 'verify') {
        const result = mode === 'forgot'
          ? await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/?account=reset` })
          : await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: `${location.origin}/?account=verified` });
        if (result.error) { setError(result.error.status === 429 ? 'Too many attempts. Try again in a minute.' : 'Could not send email. Please try again later.'); return; }
        setNotice('If this address has an eligible account, an email is on its way. Check your inbox and spam folder.');
      } else if (mode === 'reset') {
        const result = await authClient.resetPassword({ token: link.get('token')!, newPassword: password });
        if (result.error) { setError('This reset link is invalid or expired. Request a new link.'); return; }
        changeMode('signin'); setNotice('Password updated. Sign in with your new password.');
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) { setError(accountError(result.error, result.error.code === 'EMAIL_NOT_VERIFIED' ? 'Verify your email before signing in. You can request another verification email below.' : 'Unable to sign in. Check your email and password and try again.')); return; }
        setPassword(''); onSignedIn();
      }
    } catch { setError('Could not reach the account service. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Modal title={title} open onClose={() => { if (!busy) onClose(); }} className="auth-dialog">
    <div className="segmented auth-modes" role="group" aria-label="Account access">
      <button disabled={busy} aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')}>Sign in</button>
      <button disabled={busy} aria-pressed={mode === 'register'} onClick={() => changeMode('register')}>Create account</button>
    </div>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} aria-busy={busy}>
      {mode === 'register' && <label className="field">Name<input autoComplete="name" value={name} maxLength={100} required disabled={busy} onChange={event => setName(event.target.value)} /></label>}
      {mode !== 'reset' && <label className="field">Email<input type="email" autoComplete="email" value={email} maxLength={254} required disabled={busy} onChange={event => setEmail(event.target.value)} /></label>}
      {hasPassword && <label className="field">Password<span className="password-field"><input aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} value={password} minLength={newPassword ? minimumPasswordLength : undefined} maxLength={maximumPasswordLength} required disabled={busy} aria-describedby={newPassword ? 'password-requirements' : undefined} onChange={event => setPassword(event.target.value)} /><IconButton label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</IconButton></span></label>}
      {newPassword && <p id="password-requirements" className="muted small">{passwordRequirements}</p>}
      {mode === 'reset' && <label className="field">Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} required disabled={busy} maxLength={128} onChange={event => setConfirmation(event.target.value)} /></label>}
      {sendsEmail && emailDelivery === false && <p role="status">Account email is currently unavailable. Please try again later.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="dialog-actions"><button className="button" type="submit" disabled={busy || (sendsEmail && emailDelivery !== true) || (mode === 'register' && (!name.trim() || emailDelivery === null))}>{mode === 'register' ? <UserPlus size={17} /> : sendsEmail ? <Mail size={17} /> : mode === 'reset' ? <KeyRound size={17} /> : <LogIn size={17} />}{busy ? 'Please wait...' : sendsEmail ? 'Send email' : mode === 'reset' ? 'Update password' : title}</button><button className="text-button" type="button" disabled={busy} onClick={onClose}>Continue as guest</button></div>
      {(mode === 'signin' || mode === 'reset') && <div className="dialog-actions"><button className="text-button" type="button" disabled={busy} onClick={() => changeMode('forgot')}>{mode === 'reset' ? 'Request a new reset link' : 'Forgot password?'}</button>{mode === 'signin' && <button className="text-button" type="button" disabled={busy} onClick={() => changeMode('verify')}>Resend verification email</button>}</div>}
    </form>
  </Modal>;
}