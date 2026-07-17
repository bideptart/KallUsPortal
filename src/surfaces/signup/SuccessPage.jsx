import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const inr = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

export default function SuccessPage() {
  const { currentUser } = useApp();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');  // Stripe

  const [status, setStatus] = useState(paymentId ? 'finalizing' : 'idle');
  const [steps, setSteps] = useState([]);
  const [user, setUser] = useState(currentUser);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!paymentId || ranRef.current) return;
    ranRef.current = true;

    setSteps([
      { ok: true,  label: 'Payment confirmed by Stripe ✓' },
      { ok: true,  label: 'Account created ✓' },
      { ok: null, key: 'number', label: 'Reserving your phone number…' },
      { ok: null, key: 'agent',  label: 'Provisioning your AI agent on 9278…' },
    ]);

    (async () => {
      const deadline = Date.now() + 60_000;
      let lastUser = currentUser;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const me = await api('/api/me');
          if (!me?.user) continue;
          lastUser = me.user;
          if (me.user.twilioSid || me.user.number?.value) {
            setSteps((s) => updateByKey(s, 'number', { ok: true, label: 'Phone number reserved ✓' }));
          }
          const ps = me.user.provisioning?.status;
          if (ps === 'ready') {
            setSteps((s) => updateByKey(s, 'agent', { ok: true, label: 'AI agent provisioned ✓' }));
            setUser(me.user);
            setStatus('done');
            return;
          }
          if (ps === 'failed') {
            const reason = me.user.provisioning?.error || 'see admin';
            setSteps((s) => updateByKey(s, 'agent', { ok: false, label: `Agent provisioning failed: ${reason}` }));
            setUser(me.user);
            setStatus('done');
            return;
          }
        } catch {
          // Non-fatal — try again next tick.
        }
      }
      if (!lastUser?.number?.value) {
        setSteps((s) => updateByKey(s, 'number', { ok: null, label: 'Number reservation still pending — check your dashboard.' }));
      }
      setSteps((s) => updateByKey(s, 'agent', { ok: null, label: 'Agent provisioning still running — check your dashboard.' }));
      setStatus('done');
    })();
  }, [paymentId, currentUser]);

  const dashboardPath = (user || currentUser)?.role === 'admin' ? '/admin' : '/dashboard';

  if (status === 'idle') {
    return (
      <section className="animate-fade-up">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-extrabold text-slate-900">Almost there</h1>
          <p className="mt-4 text-mute text-lg">Your account is created only after payment completes.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/signup/checkout" className="btn-teal px-6 py-3 text-base">Go to checkout →</Link>
            <Link to="/" className="btn-ghost px-6 py-3 text-base">Home</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="text-6xl mb-4">{status === 'done' ? '🎉' : '⏳'}</div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          {status === 'done' ? "You're all set!" : 'Finalizing your account…'}
        </h1>
        <p className="mt-4 text-mute text-lg">
          {status === 'done'
            ? 'Payment confirmed. Your AI receptionist is being configured.'
            : "Talking to Stripe — please don't close this tab."}
        </p>

        {steps.length > 0 && (
          <div className="mt-8 form-card text-left">
            <div className="font-semibold text-slate-900 mb-3">What just happened</div>
            <ul className="space-y-2 text-sm">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={s.ok === true ? 'text-green-600' : s.ok === false ? 'text-red-600' : 'text-mute'}>
                    {s.ok === true ? '✓' : s.ok === false ? '✗' : '⏳'}
                  </span>
                  <span className={s.ok === false ? 'text-red-700' : s.ok === null ? 'text-mute' : 'text-slate-700'}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
            {paymentId && (
              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-mute font-mono break-all">
                Stripe payment id: {paymentId}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link to={dashboardPath} className="btn-teal px-7 py-3 text-base">
            Go to your dashboard →
          </Link>
        </div>
      </div>
    </section>
  );
}

function updateByKey(steps, key, patch) {
  return steps.map((s) => (s.key === key ? { ...s, ...patch } : s));
}
