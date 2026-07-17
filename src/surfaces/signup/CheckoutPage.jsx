import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

export default function CheckoutPage() {
  const { signup, establishSession } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bootErr, setBootErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const startedRef = useRef(false);

  const total = (Number(signup.planAmount) || 0) + (signup.number ? Number(signup.numberPrice) || 0 : 0);

  useEffect(() => {
    if (startedRef.current) return;
    if (!signup.planLabel || !signup.meEmail) return;
    startedRef.current = true;
    (async () => {
      try {
        const cfg = await api('/api/stripe/config', { auth: false });
        if (!cfg.configured) throw new Error('Payment gateway is not configured on the server');
        setStripeReady(true);
      } catch (e) {
        setBootErr(e.message || 'Could not start checkout');
        startedRef.current = false;
      }
    })();
  }, [signup]);

  const startCheckout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const session = await api('/api/stripe/checkout-session/signup', {
        method: 'POST', auth: false,
        body: {
          name: signup.meName, company: signup.meCompany,
          username: signup.meUsername, email: signup.meEmail,
          phone: signup.mePhone, password: signup.mePwd,
          planLabel: signup.planLabel, planAmount: signup.planAmount,
          planMin: signup.planMin, planRate: signup.planRate, planAgents: signup.planAgents,
          planCycle: signup.planCycle || 'monthly',
          number: signup.number, numberLoc: signup.numberLoc, numberPrice: signup.numberPrice,
          voice: signup.voice, language: signup.language || 'en-US',
          agentName: signup.agentName, greeting: signup.greeting,
          prompt: signup.prompt, kbCompany: signup.kbCompany, kbFaqs: signup.kbFaqs,
        },
      });
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      setBootErr(e.message || 'Could not start checkout');
      setBusy(false);
    }
  };

  return (
    <section className="animate-fade-up">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <OrderSummary signup={signup} total={total} />

          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">Pay securely with Stripe</h2>
            <p className="text-sm text-mute mb-6">Cards · Apple Pay · Google Pay</p>

            <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm flex items-center justify-between shadow-sm">
              <div>
                <div className="text-mute text-xs">Account (created after payment)</div>
                <div className="font-semibold text-slate-900">{signup.meName || '—'}</div>
                <div className="text-xs text-mute">{signup.meEmail || '—'}</div>
              </div>
              <Link to="/signup/account" className="text-xs font-medium text-sky-600 hover:underline">Edit</Link>
            </div>

            {bootErr && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{bootErr}</div>
            )}

            {!stripeReady ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-10 bg-slate-100 rounded" />
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
                <p className="text-xs text-mute mt-4">{bootErr ? '' : 'Preparing secure payment…'}</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-mute">You'll pay</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{usd(total)}</div>
                </div>

                <button
                  type="button"
                  onClick={startCheckout}
                  className="btn-teal w-full mt-5 py-4 text-base flex items-center justify-center gap-2"
                  disabled={busy}
                >
                  {busy ? 'Redirecting to Stripe…' : `Pay ${usd(total)} →`}
                </button>
              </>
            )}

            <p className="text-[11px] text-mute text-center pt-3">
              Secure checkout · PCI-DSS compliant
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderSummary({ signup, total }) {
  return (
    <div>
      <Link to="/signup/account" className="text-sm text-mute hover:text-slate-900 mb-6 inline-block">← Back</Link>
      <div className="text-sm text-mute">Subscribe to your plan</div>
      <div className="mt-1">
        <span className="text-5xl font-extrabold text-slate-900">{usd(total)}</span>
        <span className="text-mute ml-2">USD</span>
      </div>
      <div className="text-xs text-mute mt-1">One-time charge · credited to your wallet.</div>

      <div className="mt-6 space-y-3 text-sm">
        <Row label="Plan" value={`${signup.planLabel} — ${signup.planMin} min`} />
        <Row label="Plan credit" value={usd(signup.planAmount)} />
        {signup.number && <Row label="Phone number" value={signup.number} />}
        {signup.number && <Row label="Number (monthly)" value={usd(signup.numberPrice)} />}
        <div className="border-t pt-3 flex justify-between font-bold text-slate-900">
          <span>Total</span><span>{usd(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span><span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
