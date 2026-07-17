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

  // Open-access mode: the login and signup pages have been removed. The app
  // establishes a session automatically on boot using the built-in account
  // (overridable via VITE_DEMO_USER / VITE_DEMO_PASS), so anyone landing on
  // the URL is dropped straight into the dashboard with no sign-in step.
  const DEMO_IDENTIFIER = import.meta.env.VITE_DEMO_USER || 'admin@9278.ai';
  const DEMO_PASSWORD   = import.meta.env.VITE_DEMO_PASS || 'Admin1234';

  const establishAutoSession = async () => {
    const { token, user } = await api('/api/signin', {
      method: 'POST',
      body: { identifier: DEMO_IDENTIFIER, password: DEMO_PASSWORD },
      auth: false,
    });
    setToken(token);
    setCurrentUser(user);
    setAuthError('');
    return user;
  };

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

      try {
        const t = getToken();
        if (t) {
          // Reuse a still-valid session if one is already stored.
          const { user } = await api('/api/me');
          if (!cancelled) setCurrentUser(user);
        } else {
          throw new Error('no token');
        }
      } catch {
        // No token, or the stored one expired → auto-establish the open session.
        try {
          if (!cancelled) await establishAutoSession();
        } catch (e) {
          if (!cancelled) setAuthError(e.message || 'Could not start session');
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Open-access mode: there is no real session to end and no login page to
  // return to, so "Sign out" simply navigates back to the dashboard home.
  // The auto-established session stays intact.
  const signoutUser = () => {
    navigate('/', { replace: true });
  };

  // Idle auto-logout removed — with open access there is no sign-in screen to
  // fall back to, so expiring the session would just strand the user on a
  // blank page. The server-side sliding-session expiry is likewise moot here.

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
