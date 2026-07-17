import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const inr = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

// Pretty-format E.164 US numbers — e.g. +918037683048 → +91 80 3768 3048
const formatUS = (e164) => {
  const d = String(e164).replace(/\D+/g, '');
  if (d.length === 12 && d.startsWith('91')) {
    return `+91 ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  }
  return e164;
};

export default function NumberPage() {
  const { signup, updateSignup } = useApp();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(''); setBusy(true);
      try {
        const [p, n] = await Promise.all([
          api('/api/twilio/pricing/US', { auth: false }).catch(() => null),
          api('/api/twilio/available-numbers?country=UScountry=IN&type=localtype=local', { auth: false }),
        ]);
        if (cancelled) return;
        setPricing(p);
        const fallbackPrice = p?.inr?.local ?? 0;
        setResults(
          (n.numbers || []).map((row) => ({
            n: row.phoneNumber,
            loc: [row.locality, row.region].filter(Boolean).join(', ') || 'United States',
            price: row.priceInr ?? fallbackPrice,
            priceUnknown: !(row.priceInr ?? fallbackPrice),
          })),
        );
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Could not load numbers');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pickNumber = (r) => {
    updateSignup({ number: r.n, numberLoc: r.loc, numberPrice: r.price });
  };

  return (
    <section className="animate-fade-up">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Choose your <span className="text-gradient">number.</span>
        </h1>
        <p className="text-mute mt-2">
          One country, one tap. All numbers are US-based and active.
        </p>

        {/* ============== COUNTRY CARD (locked to US) ============== */}
        <div className="mt-8 soft-card px-5 py-4 flex items-center justify-between bg-sky-50 border-sky-300">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">🇮🇳</span>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">United States</div>
              <div className="text-xs text-mute uppercase tracking-wider">Local · landline</div>
            </div>
          </div>
          {pricing?.inr?.local != null && (
            <div className="text-sm text-mute">
              <span className="font-semibold text-slate-900">{inr(pricing.inr.local)}</span>/mo
            </div>
          )}
        </div>

        {/* ============== NUMBER LIST ============== */}
        <div className="mt-6">
          {busy && (
            <div className="soft-card p-8 text-center text-sm text-mute">
              Loading available numbers…
            </div>
          )}

          {err && !busy && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              {err}
            </div>
          )}

          {!busy && !err && results.length === 0 && (
            <div className="soft-card p-8 text-center text-sm text-mute">
              No numbers available right now. Please check back shortly.
            </div>
          )}

          {!busy && results.length > 0 && (
            <>
              <div className="text-sm text-mute mb-2">{results.length} numbers available · pick one</div>
              <div className="soft-card overflow-hidden">
                {results.map((r, i) => (
                  <div key={i} className="num-row">
                    <div>
                      <div className="font-mono text-sm text-slate-900">{formatUS(r.n)}</div>
                      <div className="text-xs text-mute mt-0.5">{r.loc}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        {r.priceUnknown ? (
                          <span className="text-mute text-xs">price n/a</span>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-900">{inr(r.price)}</span>
                            <span className="text-mute text-xs">/mo</span>
                          </>
                        )}
                      </div>
                      <button
                        className="btn-teal text-sm py-1.5 px-3"
                        onClick={() => pickNumber(r)}
                      >
                        {signup.number === r.n ? 'Picked ✓' : 'Pick'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ============== SELECTED ============== */}
        {signup.number && (
          <div className="mt-6">
            <div className="rounded-lg border border-sky-500 bg-sky-50 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-sky-700 uppercase font-semibold tracking-wider">Selected</div>
                <div className="text-xl font-mono mt-1 text-slate-900">{formatUS(signup.number)}</div>
                <div className="text-xs text-mute mt-1">{signup.numberLoc}</div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {inr(signup.numberPrice)}
                <span className="text-sm font-normal text-mute">/mo</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Link to="/signup/plan" className="btn-ghost">← Back</Link>
          <button
            className="btn-teal"
            disabled={!signup.number}
            onClick={() => navigate('/signup/agent')}
          >
            Next: Set up your agent →
          </button>
        </div>
      </div>
    </section>
  );
}
