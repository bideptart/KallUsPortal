import { useState } from 'react';
import { useApp } from '../AppContext.jsx';
import Logo from '../components/Logo.jsx';

export default function Signin() {
  const { signinUser, authError, setAuthError } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const timedOut = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('timeout') === '1';

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    await signinUser({ identifier, password });
    setBusy(false);
  };

  return (
    <div className="nixxy-dark auth-dark min-h-screen flex items-center justify-center px-5 animate-fade-up">
      {/* === CENTERED LOGIN FORM (nixxy.com dark theme) ================== */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo white size={38} showWordmark={false} />
          </div>
          <div className="mb-7">
            <h1 className="text-3xl md:text-4xl font-display tracking-tight text-white">
              Sign in to your{' '}
              <span className="italic text-teal-400">portal.</span>
            </h1>
            <p className="text-neutral-400 mt-2 text-[15px]">
              Sign in to your dashboard.
            </p>
          </div>

          {timedOut && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              ⏱ You were signed out after 30 minutes of inactivity. Please sign in again.
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="field-label">Email or username</label>
              <input
                className="input input-lg"
                placeholder="you@company.com"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); if (authError) setAuthError(''); }}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label !mb-0">Password</label>
                <a
                  href="#"
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  className="input input-lg pr-12"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (authError) setAuthError(''); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 hover:text-white px-2 py-1 rounded"
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {authError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <span className="text-red-500">⚠</span>
                <span>{authError}</span>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-teal-500 w-4 h-4"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="text-sm text-neutral-300">Keep me signed in</span>
            </label>

            <button type="submit" className="btn-teal w-full py-3.5 text-[15px]" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-xs text-mute mt-8">
            🔒 End-to-end encrypted · sessions expire after 30 minutes of inactivity
          </p>
        </div>
      </section>
    </div>
  );
}
