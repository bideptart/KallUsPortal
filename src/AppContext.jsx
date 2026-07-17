import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const AppContext = createContext(null);

const emptySignup = () => ({
  plan: null, planAmount: 0, planMin: 0, planRate: 0, planAgents: 0, planLabel: '',
  planCycle: 'monthly',
  number: null, numberPrice: 5, numberLoc: '',
  voice: 'Kore', language: 'en-US',
  agentName: '', greeting: '', prompt: '',
  kbCompany: '', kbFaqs: '',
  meName: '', meCompany: '', meUsername: '', meEmail: '', mePhone: '', mePwd: '',
});

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [signup, setSignup] = useState(emptySignup);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Accept an auth token from the URL (?token=…). This is the hand-off
      // pattern external marketing sites use after they complete signup +
      // Stripe on www.9278.ai and redirect the user into the portal:
      //   https://voice.9278.ai/dashboard/overview?token=<bearer>
      // We promote it into localStorage and scrub the URL so it never sits
      // in browser history.
      try {
        const url = new URL(window.location.href);
        const urlToken = url.searchParams.get('token');
        if (urlToken) {
          setToken(urlToken);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        }
      } catch { /* non-browser env — ignore */ }

      const t = getToken();
      if (!t) { setBootstrapping(false); return; }
      try {
        const { user } = await api('/api/me');
        if (cancelled) return;
        setCurrentUser(user);
      } catch {
        setToken('');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateSignup = (patch) => setSignup((s) => ({ ...s, ...patch }));

  // Used by the Stripe checkout success handler to put the user straight
  // into a signed-in state after the payment is verified.
  const establishSession = ({ token, user }) => {
    setToken(token);
    setCurrentUser(user);
    setAuthError('');
  };

  const homeFor = (user) => (user?.role === 'admin' ? '/admin' : '/dashboard');

  const signinUser = async ({ identifier, password }) => {
    try {
      const { token, user } = await api('/api/signin', {
        method: 'POST', body: { identifier, password }, auth: false,
      });
      setToken(token);
      setCurrentUser(user);
      setAuthError('');
      // Honor ?next= so route guards round-trip correctly.
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : homeFor(user), { replace: true });
      return true;
    } catch (e) {
      setAuthError(e.message || 'Sign-in failed');
      return false;
    }
  };

  const signoutUser = async () => {
    try { await api('/api/signout', { method: 'POST' }); } catch {}
    setToken('');
    setCurrentUser(null);
    navigate('/', { replace: true });
  };

  // === Idle auto-logout ====================================================
  // Sign the user out after IDLE_MS of no activity. `lastActivity` lives in
  // localStorage so the timer survives reloads and is shared across tabs.
  // The server enforces the same window (sliding session expiry), so a token
  // can't be reused after idling even if this timer never runs.
  const IDLE_MS = 30 * 60 * 1000;          // 30 minutes
  const IDLE_KEY = '9278.lastActivity';

  const idleLogout = async () => {
    try { await api('/api/signout', { method: 'POST' }); } catch {}
    try { localStorage.removeItem(IDLE_KEY); } catch {}
    setToken('');
    setCurrentUser(null);
    navigate('/signin?timeout=1', { replace: true });
  };

  useEffect(() => {
    if (!currentUser) return;
    const stamp = () => { try { localStorage.setItem(IDLE_KEY, String(Date.now())); } catch {} };
    stamp();   // seed on login / mount

    let lastStamp = Date.now();
    let lastPing  = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastStamp > 5000) { lastStamp = now; stamp(); }   // throttle LS writes to 5s
      // Keepalive: slide the server session while the user is active even if
      // they're only reading (no other API calls). At most once / 5 min.
      if (now - lastPing > 5 * 60 * 1000) {
        lastPing = now;
        api('/api/session/ping', { method: 'POST' }).catch(() => {});
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      let last = 0;
      try { last = Number(localStorage.getItem(IDLE_KEY)) || 0; } catch {}
      if (last && Date.now() - last >= IDLE_MS) idleLogout();
    }, 30 * 1000);   // check every 30s

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const updateCurrentUser = async (patch) => {
    try {
      const { user } = await api('/api/me', { method: 'PATCH', body: patch });
      setCurrentUser(user);
      return true;
    } catch (e) {
      setAuthError(e.message || 'Update failed');
      return false;
    }
  };

  const changePassword = async ({ current, next }) => {
    try {
      await api('/api/me/password', { method: 'POST', body: { current, next } });
      setAuthError('');
      return true;
    } catch (e) {
      setAuthError(e.message || 'Password change failed');
      return false;
    }
  };

  const deleteCurrentAccount = async () => {
    try { await api('/api/twilio/number', { method: 'DELETE' }); } catch {}
    try { await api('/api/me', { method: 'DELETE' }); } catch {}
    setToken('');
    setCurrentUser(null);
    navigate('/', { replace: true });
  };

  return (
    <AppContext.Provider
      value={{
        bootstrapping,
        signup, updateSignup,
        establishSession,
        currentUser,
        signinUser, signoutUser, updateCurrentUser, changePassword, deleteCurrentAccount,
        authError, setAuthError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
