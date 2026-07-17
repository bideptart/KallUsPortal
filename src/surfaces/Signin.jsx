import { useState } from 'react';
import { useApp } from '../AppContext.jsx';
import Logo from '../components/Logo.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Superadmin', identifier: 'superadmin@9278.ai', password: 'SuperAdmin1234' },
  { label: 'Admin',      identifier: 'admin@9278.ai',       password: 'Admin1234' },
  { label: 'User',       identifier: 'user@9278.ai',        password: 'User1234' },
];

export default function Signin() {
  const { signinUser, authError, setAuthError } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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

  const fillDemo = (acc) => {
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    if (authError) setAuthError('');
  };

  return (
    <div className="nixxy-dark auth-dark min-h-screen flex items-center justify-center px-5 animate-fade-up">
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

          <div className="mb-6 rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-300 mb-2">Demo accounts</p>
            <div className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.identifier}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="text-left text-xs text-neutral-400 hover:text-teal-300 hover:underline"
                >
                  {acc.label}: <span className="font-mono">{acc.identifier}</span> / <span className="font-mono">{acc.password}</span>
                </button>
              ))}
            </div>
          </div>

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

            <button type="submit" className="btn-teal w-full py-3.5 text-[15px]" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-xs text-mute mt-8">
            🔒 Local demo login · sessions expire after 30 minutes of inactivity
          </p>
        </div>
      </section>
    </div>
  );
}
