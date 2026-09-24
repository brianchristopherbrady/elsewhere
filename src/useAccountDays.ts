import { useEffect, useRef, useState } from 'react';
import { authClient } from './auth-client';
import { validSavedDays, type SavedDay } from './saved-days';
import { staticSite } from './static-mode';

async function requestDays(method = 'GET', path = '/api/days', days?: SavedDay[], signal?: AbortSignal) {
  const response = await fetch(path, { method, credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' }, body: days ? JSON.stringify({ days }) : undefined });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Could not access your saved days. Please try again.');
  if (!validSavedDays(body.days)) throw new Error('The server returned invalid saved days. Please try again.');
  return body.days;
}

function useServerAccountDays() {
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const userId = session?.user.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const version = useRef(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ owner?: string; days: SavedDay[]; loading: boolean; error: string }>({ days: [], loading: false, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    const generation = ++version.current;
    if (!userId) { setState({ days: [], loading: false, error: '' }); return; }
    setState({ owner: userId, days: [], loading: true, error: '' });
    void requestDays('GET', '/api/days', undefined, controller.signal).then(days => {
      if (generation === version.current && currentUser.current === userId) setState({ owner: userId, days, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted && generation === version.current) setState({ owner: userId, days: [], loading: false, error: error instanceof Error ? error.message : 'Could not load saved days.' });
    });
    return () => controller.abort();
  }, [userId, revision]);
  async function mutate(method: string, path: string, days?: SavedDay[]) {
    if (!userId) throw new Error('Sign in to save your days.');
    ++version.current;
    setBusy(true);
    try {
      const result = await requestDays(method, path, days);
      if (currentUser.current !== userId) throw new Error('Your account changed. Please sign in again.');
      setState({ owner: userId, days: result, loading: false, error: '' });
    } catch (error) {
      void refetch();
      setRevision(value => value + 1);
      throw error;
    } finally { setBusy(false); }
  }
  return {
    session, isPending, busy, refetch,
    days: userId && state.owner === userId ? state.days : [],
    loading: isPending || !!(userId && (state.owner !== userId || state.loading)),
    error: sessionError ? 'Could not check your account. Please try again.' : state.owner === userId ? state.error : '',
    retry: () => { void refetch(); setRevision(value => value + 1); },
    save: (days: SavedDay[]) => mutate('POST', '/api/days', days),
    update: (day: SavedDay) => mutate('PUT', `/api/days/${encodeURIComponent(day.id)}`, [day]),
    remove: (id: string) => mutate('DELETE', `/api/days/${encodeURIComponent(id)}`),
  };
}

type AccountDays = ReturnType<typeof useServerAccountDays>;
const unavailable = () => Promise.reject(new Error('Accounts are not available on this demo site.'));
const noAccount: AccountDays = { session: null, isPending: false, busy: false, refetch: (() => Promise.resolve()) as unknown as AccountDays['refetch'], days: [], loading: false, error: '', retry: () => undefined, save: unavailable, update: unavailable, remove: unavailable };

// Chosen at build time, so the hook order never changes between renders.
export const useAccountDays: () => AccountDays = staticSite ? () => noAccount : useServerAccountDays;