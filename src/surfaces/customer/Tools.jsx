import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

// =============================================================================
// Tools — per-agent call settings. Currently: the call-forwarding (blind
// transfer) destination. When the agent hands a caller off to a human, it
// dials this number. Backed by the dashboard MCP set_/get_transfer_number
// tools via /api/numbers/:id/transfer.
//
// Numbers/agents are picked from a card grid (one per plan/number) rather
// than a dropdown — tapping "Configure →" on a card reveals its tools below.
//
// Saving uses the same two-step flow as the Knowledge & Agent page: a
// confirmation modal explaining the ~2-minute propagation window, then a
// countdown that locks the form until the change has gone live.
// =============================================================================
const PROPAGATION_SECONDS = 120;

// Shown only when the account has no real plans/numbers yet, so the page
// still demonstrates its card-grid layout instead of sitting empty. Fake
// name/phone/slug — not a real customer. "Configure" on this card works
// locally (no backend call) since there's no real number id to save against.
const DEMO_NUMBERS = [
  { id: 'demo-1', value: '+10000000099', label: '', agentName: 'Sample Agent', agentSlug: 'sample-agent', plan: { label: 'Starter' } },
];

export default function Tools() {
  const [numbers, setNumbers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Per-selection transfer state.
  const [current, setCurrent] = useState(null);   // { number, source } | null
  const [curLoading, setCurLoading] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Two-step save + propagation countdown (mirrors KbAgent).
  const [pendingSave, setPendingSave] = useState(null);   // the number awaiting confirmation
  const [propagating, setPropagating] = useState(null);   // { secondsLeft, totalSeconds } | null
  const propagationLocked = !!propagating && propagating.secondsLeft > 0;

  useEffect(() => {
    if (!propagating || propagating.secondsLeft <= 0) return;
    const t = setTimeout(() => {
      setPropagating((p) => p && { ...p, secondsLeft: p.secondsLeft - 1 });
    }, 1000);
    return () => clearTimeout(t);
  }, [propagating]);

  const loadNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const r = await api('/api/numbers');
      const real = r.numbers || [];
      if (real.length === 0) {
        setNumbers(DEMO_NUMBERS);
        setIsDemo(true);
      } else {
        setNumbers(real);
        setIsDemo(false);
      }
    } catch (e) {
      setNumbers(DEMO_NUMBERS);
      setIsDemo(true);
    }
    finally { setLoadingNumbers(false); }
  };
  useEffect(() => { loadNumbers(); }, []);

  const selected = useMemo(() => numbers.find((n) => n.id === selectedId) || null, [numbers, selectedId]);

  const loadCurrent = async (id) => {
    if (!id) return;
    setErr(''); setMsg('');
    // Demo card — no real number id to look up. Start blank, entirely local.
    if (id.startsWith('demo-')) {
      setCurrent(null);
      setInput('');
      return;
    }
    setCurLoading(true);
    try {
      const r = await api(`/api/numbers/${id}/transfer`);
      setCurrent(r);
      setInput(r.number || '');
    } catch (e) {
      setErr(e.message || 'Could not load forwarding number');
      setCurrent(null);
    } finally {
      setCurLoading(false);
    }
  };
  // Switching agents while a save is propagating would be confusing — the lock
  // covers the selector too, so this only fires between saves.
  useEffect(() => { if (selectedId) loadCurrent(selectedId); /* eslint-disable-next-line */ }, [selectedId]);

  // Step 1 — open the confirmation modal.
  const requestSave = () => {
    setErr(''); setMsg('');
    setPendingSave(input.trim());
  };

  // Step 2 — actually persist, then start the propagation countdown.
  const confirmSave = async () => {
    const number = pendingSave;
    setPendingSave(null);
    setErr(''); setMsg('');
    // Demo card — nothing to save server-side; just reflect it locally.
    if (selectedId.startsWith('demo-')) {
      setCurrent({ number, source: 'sample' });
      setMsg('✓ Saved locally — connect a real plan/number to apply this to a live agent.');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/numbers/${selectedId}/transfer`, { method: 'POST', body: { number } });
      setMsg('✓ Saved — applying the forwarding number to your agent.');
      setPropagating({ secondsLeft: PROPAGATION_SECONDS, totalSeconds: PROPAGATION_SECONDS });
      await loadCurrent(selectedId);
    } catch (e) {
      setErr(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const fmtTime = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tools</h1>
        <p className="text-mute mt-1">
          Pick a plan / number below, then configure its tools — call transfer, booking notifications, more soon.
          Changes take effect on the next call (no restart needed).
        </p>
      </div>

      <div className="mt-4">
        <button onClick={loadNumbers} disabled={loadingNumbers} className="btn-ghost text-sm">
          {loadingNumbers ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Propagation banner — shown after a save while the change goes live. */}
      {propagating && (
        <div className={`mt-4 rounded-xl border p-4 ${propagationLocked ? 'border-lime-300 bg-lime-50' : 'border-green-300 bg-green-50'}`}>
          {propagationLocked ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-lime-700">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeDashoffset="20" />
                </svg>
                Updating your agent …
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Applying the new call-forwarding number and restarting your voice agent.{' '}
                <strong>Please wait {fmtTime(propagating.secondsLeft)} before placing a test call.</strong>
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-lime-100 overflow-hidden">
                <div
                  className="h-full bg-lime-500 transition-all"
                  style={{ width: `${((propagating.totalSeconds - propagating.secondsLeft) / propagating.totalSeconds) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold text-green-700">
                ✓ Ready — call forwarding is live
                {selected?.value && <span className="font-normal text-slate-700"> · dial <span className="font-mono">{selected.value}</span> to test</span>}
              </div>
              <button onClick={() => setPropagating(null)} className="text-xs text-mute hover:text-slate-900">dismiss</button>
            </div>
          )}
        </div>
      )}

      {numbers.length === 0 ? (
        <div className="mt-6 form-card text-center text-mute py-10">
          No numbers yet. Add one from Plan &amp; Numbers to configure tools.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-6 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-mute font-semibold">Your plans &amp; numbers</span>
            {isDemo && (
              <span className="pill bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] uppercase tracking-wider">
                Sample data
              </span>
            )}
          </div>
          {isDemo && (
            <p className="text-xs text-mute -mt-1 mb-3">
              No plans/numbers connected yet — showing a sample card so you can preview the layout.
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {numbers.map((n) => (
              <div
                key={n.id}
                className={`form-card transition ${selectedId === n.id ? 'border-lime-400 ring-2 ring-lime-500/30' : ''}`}
              >
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {n.agentName || n.label || 'Unnamed agent'}
                </div>
                <a href={`tel:${n.value}`} className="mt-0.5 block text-sm text-lime-600 dark:text-lime-400 hover:underline font-mono">
                  {n.value}
                </a>
                {n.agentSlug && (
                  <div className="mt-0.5 text-xs text-mute font-mono truncate">{n.agentSlug}</div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider font-semibold">
                    {n.plan?.label || 'Starter'}
                  </span>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    disabled={propagationLocked}
                    className="btn-teal text-xs py-1.5 px-3"
                  >
                    Configure →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!selected ? (
            <p className="mt-4 text-sm text-mute italic">↑ Tap a card above to configure its tools.</p>
          ) : (
            <div className="mt-6 form-card">
              <div className="flex items-center gap-2">
                <span className="text-lg">📞</span>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">Call forwarding (transfer to human)</div>
              </div>
              <p className="text-sm text-mute mt-1">
                When a caller asks to speak to a person, <span className="font-mono">{selected.value}</span>’s
                agent will blind-transfer the call to this number.
              </p>

              <div className="mt-4">
                <label className="field-label">Forwarding number (E.164)</label>
                <input
                  className="input"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setMsg(''); setErr(''); }}
                  placeholder="+14018677668"
                  disabled={curLoading || busy || propagationLocked}
                />
                <div className="text-[11px] text-mute mt-1">
                  Include the country code, e.g. <span className="font-mono">+1</span> for US.
                  You can’t forward to one of your own inbound numbers.
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button className="btn-teal" onClick={requestSave} disabled={busy || curLoading || propagationLocked || !input.trim()}>
                  {propagationLocked ? `⏳ Locked · ${propagating.secondsLeft}s` : (busy ? 'Saving…' : '💾 Save forwarding number')}
                </button>
                {curLoading ? (
                  <span className="text-xs text-mute">Loading current…</span>
                ) : current?.number ? (
                  <span className="text-xs text-mute">
                    Current: <span className="font-mono text-slate-900 dark:text-slate-100">{current.number}</span>
                    {current.source && /no override/i.test(current.source) && <span> · using account default</span>}
                  </span>
                ) : (
                  <span className="text-xs text-mute">No forwarding number set yet.</span>
                )}
              </div>

              {msg && <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">{msg}</div>}
              {err && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {err}</div>}
            </div>
          )}
        </>
      )}

      {/* Save-confirmation modal — explains the 2-minute propagation window
          BEFORE the change is sent. Proceed applies it and starts the
          countdown; Cancel dismisses with no change. */}
      {pendingSave !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">⏱️</span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Allow up to 2 minutes for changes to go live
                </h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  After you save, the dashboard needs around <strong>2 minutes</strong> to apply the new
                  call-forwarding number and restart your agent. Please don’t place a test call to{' '}
                  {selected?.value ? <span className="font-mono">{selected.value}</span> : 'your number'}{' '}
                  before the countdown finishes — calls placed earlier may still use the previous setting.
                </p>
                <p className="mt-3 text-xs text-mute">
                  Forwarding to: <span className="font-mono text-slate-900 dark:text-slate-100">{pendingSave}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => setPendingSave(null)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
              <button onClick={confirmSave} className="btn-teal text-sm py-2 px-4" autoFocus>
                Proceed → start 2-minute window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
