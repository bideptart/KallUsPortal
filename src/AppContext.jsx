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

  // Shared demo-agent draft — when there's no real number (no DB connected,
  // like in this sandbox), Playground and the Agent editor both fall back to
  // the same record instead of two independent hardcoded copies, so a save
  // on one page shows up on the other without a real backend. Persisted to
  // localStorage (not just component state) so it also survives a full page
  // reload / direct navigation between the two pages.
  const DEMO_AGENT_KEY = '9278.demoAgentDraft';
  const [demoAgent, setDemoAgent] = useState(() => {
    const defaults = {
      greeting: 'Hi, thanks for calling…',
      prompt: 'You are a helpful customer support assistant. Be concise, friendly, and professional.',
      kbCompany: '', kbFaqs: '', voice: 'Kore', language: 'en-US',
    };
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_AGENT_KEY) || 'null');
      return saved ? { ...defaults, ...saved } : defaults;
    } catch { return defaults; }
  });
  const patchDemoAgent = (patch) => setDemoAgent((d) => {
    const next = { ...d, ...patch };
    try { localStorage.setItem(DEMO_AGENT_KEY, JSON.stringify(next)); } catch {}
    return next;
  });

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
        let user;
        try {
          ({ user } = await api('/api/me'));
          setAuthKind('real');
        } catch {
          ({ user } = await api('/api/auth/me'));
          setAuthKind('demo');
        }
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

  // Which auth system issued the current token — 'real' (Postgres-backed
  // /api/signin + /api/me, real data) or 'demo' (the stateless zero-setup
  // /api/auth/* accounts, always sample data). Signin tries real first and
  // falls back to demo; this flag remembers which one won so signout/ping/
  // session-restore hit the matching endpoint instead of guessing.
  const AUTH_KIND_KEY = '9278.authKind';
  const getAuthKind = () => { try { return localStorage.getItem(AUTH_KIND_KEY) || 'demo'; } catch { return 'demo'; } };
  const setAuthKind = (k) => { try { localStorage.setItem(AUTH_KIND_KEY, k); } catch {} };

  // Used by the Stripe checkout success handler to put the user straight
  // into a signed-in state after the payment is verified.
  const establishSession = ({ token, user }) => {
    setToken(token);
    setAuthKind('real');
    setCurrentUser(user);
    setAuthError('');
  };

  const homeFor = (user) => (
    user?.userType === 'superadmin' || user?.userType === 'admin' ? '/admin' : '/dashboard'
  );

  const signinUser = async ({ identifier, password }) => {
    // Try the real, Postgres-backed account first (real data everywhere);
    // fall back to the zero-setup demo accounts if this identifier isn't a
    // real row (or the database is unreachable) — same UX either way, the
    // difference is just which data the signed-in session ends up seeing.
    let result;
    let kind;
    try {
      result = await api('/api/signin', { method: 'POST', body: { identifier, password }, auth: false });
      kind = 'real';
    } catch (realErr) {
      try {
        result = await api('/api/auth/signin', { method: 'POST', body: { identifier, password }, auth: false });
        kind = 'demo';
      } catch (demoErr) {
        setAuthError(demoErr.message || realErr.message || 'Sign-in failed');
        return false;
      }
    }
    const { token, user } = result;
    setToken(token);
    setAuthKind(kind);
    setCurrentUser(user);
    setAuthError('');
    // Honor ?next= so route guards round-trip correctly.
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    navigate(next && next.startsWith('/') ? next : homeFor(user), { replace: true });
    return true;
  };

  const signoutUser = async () => {
    const path = getAuthKind() === 'real' ? '/api/signout' : '/api/auth/signout';
    try { await api(path, { method: 'POST' }); } catch {}
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
    const path = getAuthKind() === 'real' ? '/api/signout' : '/api/auth/signout';
    try { await api(path, { method: 'POST' }); } catch {}
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
        const pingPath = getAuthKind() === 'real' ? '/api/session/ping' : '/api/auth/session/ping';
        api(pingPath, { method: 'POST' }).catch(() => {});
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
        demoAgent, patchDemoAgent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
