import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, AlarmClock, Zap, Phone, AlertTriangle } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const fmtDuration = (s) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch {
    return '—';
  }
};

// Sample data shown only when the real API returns nothing (no DB/MCP
// connected yet, like in this sandbox) — never overrides real data, and the
// page always labels it "Sample data" so it can't be mistaken for the real
// thing once a database is actually connected.
const DEMO_NUMBERS = [
  {
    id: 'demo-1',
    value: '+27 82 555 0148',
    agentName: 'KallUS Agent',
    label: '',
    autoRechargeEnabled: false,
    nextRentalAt: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
    plan: { min: 250 },
  },
];
const DEMO_STATS = {
  callsToday: 0,
  callsThisMonth: 59,
  callsAllTime: 64,
  avgDurationSec: 49,
  minutesUsedThisMonth: 47.6,
  minutesUsedAllTime: 49,
  allTimeSpendInr: 577,
};
const DEMO_CALL_STATS = { total_calls: 64, answer_rate: 100, total_minutes: 51.6, avg_duration_seconds: 48 };
const DEMO_SENTIMENT = { sentiment_percentages: { positive: 0, neutral: 86, negative: 14 }, total_calls: 7, needFollowUp: 1 };
const DEMO_VOLUME = {
  daily_breakdown: [0, 0, 1, 3, 5, 4, 1, 0, 2, 0, 0, 0, 3, 0].map((count, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    count,
  })),
};

export default function Overview({ rechargeOn }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  const [wallet, setWallet] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');
  const [numbers, setNumbers] = useState([]);

  // Call analytics card — call-statistics / sentiment / call-volume are all
  // auto-scoped to this customer's own agent server-side (PER_AGENT_TOOLS in
  // server/index.js), so they're safe to call directly, unlike /api/mcp/overview
  // which is tenant-wide and stays admin-only.
  const [callStats, setCallStats] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [volume, setVolume] = useState(null);

  const refreshWallet = async () => {
    try {
      const w = await api('/api/wallet');
      setWallet(w.wallet);
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api('/api/twilio/stats');
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setStatsErr(e.message);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
      if (!cancelled) await refreshWallet();
      try {
        const r = await api('/api/numbers');
        if (!cancelled) setNumbers(r.numbers || []);
      } catch {}
      try {
        const [cs, sent, vol] = await Promise.all([
          api('/api/mcp/call-statistics?days=30').catch(() => null),
          api('/api/mcp/sentiment?days=30').catch(() => null),
          api('/api/mcp/call-volume?days=14').catch(() => null),
        ]);
        if (cancelled) return;
        setCallStats(cs?.data || null);
        setSentiment(sent?.data || null);
        setVolume(vol?.data || null);
      } catch {
        // Falls back to sample data in render — nothing to surface here.
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.role]);

  const quickTopUp = async () => {
    setTopupBusy(true);
    setTopupMsg('');
    try {
      const r = await api('/api/wallet/topup', { method: 'POST', body: { pack: 'starter' } });
      setTopupMsg(`✓ +${r.charged.minutes} min added · charged $${Number(r.charged.amountUsd || 0).toLocaleString('en-US')} to ${r.charged.descriptor}`);
      await refreshWallet();
    } catch (e) {
      setTopupMsg(`✗ ${e.message}`);
    } finally {
      setTopupBusy(false);
    }
  };

  if (!currentUser) return null;

  // No live number/stats data at all (no DB/MCP connected) → fall back to
  // sample data so the page shows what it looks like populated, rather than
  // an all-empty page. Never hides real data — the moment either endpoint
  // returns something, that takes over.
  const demoMode = numbers.length === 0 && !stats;
  const displayNumbers   = demoMode ? DEMO_NUMBERS   : numbers;
  const displayStats     = demoMode ? DEMO_STATS     : stats;
  const displayCallStats = !callStats && !sentiment && !volume ? DEMO_CALL_STATS : callStats;
  const displaySentiment = !callStats && !sentiment && !volume ? DEMO_SENTIMENT : sentiment;
  const displayVolume    = !callStats && !sentiment && !volume ? DEMO_VOLUME    : volume;

  const planMin = demoMode ? (DEMO_NUMBERS[0].plan.min) : (currentUser.plan?.min || 0);
  const minUsedAllTime = displayStats?.minutesUsedAllTime ?? Number(currentUser.minutesUsed) ?? 0;
  const minUsedMonth   = displayStats?.minutesUsedThisMonth ?? 0;
  const planLeft = Math.max(0, planMin - minUsedAllTime);
  const walletMin = demoMode ? 0 : (wallet?.walletMinutes ?? currentUser.walletMinutes ?? 0);
  const minLeft = Math.max(0, planLeft + walletMin);
  const minTotal = planMin + walletMin;
  const lowThreshold = wallet?.lowBalanceThreshold ?? currentUser.lowBalanceThreshold ?? 20;
  const isLow = !demoMode && minLeft <= lowThreshold;
  const autoTopupOn = wallet?.autoTopupEnabled ?? currentUser.autoTopupEnabled;

  // Per-row usage breakdown is only exact when the customer has a single DID
  // — /api/twilio/stats aggregates across every number, so with more than
  // one it can't be attributed to a specific row without new backend work.
  const singleNumber = displayNumbers.length === 1;

  const testNumber = displayNumbers[0]?.value || currentUser.number?.value;

  // This component renders under both /dashboard (Customer) and /admin
  // (Admin/Superadmin, since they share the same Overview page) — links must
  // resolve against whichever shell is actually mounted.
  const isAdminTier = currentUser.userType === 'superadmin' || currentUser.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  return (
    <div>
      {demoMode && (
        <div className="flex items-start">
          <span className="pill" style={{ background: 'var(--line-2)', color: 'var(--ink-3)' }}>
            <Sparkles size={12} /> Sample data — connect a database for live numbers
          </span>
        </div>
      )}

      {statsErr && !demoMode && (
        <div className="mt-4 text-xs text-amber-400 inline-flex items-center gap-1"><AlertTriangle size={12} /> Live stats unavailable: {statsErr}</div>
      )}

      <ProvisioningBanner />

      {isLow && (
        <div className="mt-6 rounded-lg border-2 border-amber-500/60 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlarmClock size={22} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-amber-400">Low minutes — only {minLeft.toFixed(1)} left</div>
            <p className="text-sm text-mute mt-1">
              You're at or below your low-balance threshold ({lowThreshold} min).
              {autoTopupOn
                ? <> Auto-topup is <strong className="text-lime-600">ON</strong> — we'll charge your card for 100 more minutes shortly.</>
                : <> Top up now to keep your agent answering calls without interruption.</>}
            </p>
            <div className="mt-3 flex gap-2 items-center">
              {!autoTopupOn && (
                <button className="btn-teal text-sm inline-flex items-center gap-1.5" onClick={quickTopUp} disabled={topupBusy}>
                  {topupBusy ? 'Charging…' : <><Zap size={14} /> Top up 83 min ($1,000)</>}
                </button>
              )}
              <Link to={`${basePath}/billing`} className="btn-ghost text-sm">Manage wallet →</Link>
              {topupMsg && <span className="text-xs text-mute ml-2">{topupMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* === Numbers & plans table ================================== */}
      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Product</th>
              <th>Auto-recharge</th>
              <th>Exp date</th>
              <th>Min left</th>
              <th>Today<div className="normal-case font-normal text-[10px] text-mute">calls · min</div></th>
              <th>Month<div className="normal-case font-normal text-[10px] text-mute">calls · min</div></th>
              <th>Avg duration</th>
            </tr>
          </thead>
          <tbody>
            {displayNumbers.length === 0 && (
              <tr><td colSpan={8} className="text-center text-mute py-8">No numbers yet — add a plan to get started.</td></tr>
            )}
            {displayNumbers.map((n) => {
              const rowLeft  = singleNumber ? minLeft   : null;
              const rowTotal = n.plan?.min || 0;
              const rowPct   = rowTotal > 0 && rowLeft != null ? Math.min(100, (rowLeft / rowTotal) * 100) : null;
              return (
                <tr
                  key={n.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  onClick={() => navigate(`${basePath}/agents`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`${basePath}/agents`); }}
                >
                  <td className="font-mono text-xs whitespace-nowrap">{n.value}</td>
                  <td className="font-semibold">{n.agentName || n.label || '—'}</td>
                  <td>
                    <span className={`pill ${n.autoRechargeEnabled ? 'pill-teal' : ''}`} style={!n.autoRechargeEnabled ? { background: 'var(--line-2)', color: 'var(--ink-3)' } : undefined}>
                      {n.autoRechargeEnabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-mute">{fmtDate(n.nextRentalAt)}</td>
                  <td style={{ minWidth: 130 }}>
                    {rowLeft != null ? (
                      <>
                        <div><strong>{rowLeft.toFixed(0)}</strong> <span className="text-mute">/ {rowTotal} min</span></div>
                        <div className="mt-1 h-1.5 bg-line-2 rounded" style={{ background: 'var(--line-2)' }}>
                          <div className="h-1.5 rounded bg-lime-500" style={{ width: `${rowPct}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-mute">{rowTotal} min plan</span>
                    )}
                  </td>
                  <td className="text-right">
                    {singleNumber ? (<><strong>{displayStats?.callsToday ?? 0}</strong><div className="text-xs text-mute">{minUsedMonth ? '' : '0m'}</div></>) : '—'}
                  </td>
                  <td className="text-right">
                    {singleNumber ? (<><strong>{displayStats?.callsThisMonth ?? 0}</strong><div className="text-xs text-mute">{fmtDuration((minUsedMonth || 0) * 60)}</div></>) : '—'}
                  </td>
                  <td className="text-right">{singleNumber ? fmtDuration(displayStats?.avgDurationSec || 0) : '—'}</td>
                </tr>
              );
            })}
            {displayNumbers.length > 0 && (
              <tr className="bg-lime-50/40" style={{ background: 'var(--surface-2)' }}>
                <td colSpan={2} className="font-semibold uppercase text-xs tracking-wide text-mute">
                  Across all numbers
                  {displayStats?.allTimeSpendInr != null && (
                    <span className="normal-case font-normal ml-2 text-mute">· ≈ R{Number(displayStats.allTimeSpendInr).toLocaleString('en-ZA')} used</span>
                  )}
                </td>
                <td colSpan={2} />
                <td style={{ minWidth: 130 }}>
                  <div><strong>{minLeft.toFixed(0)}</strong> <span className="text-mute">/ {minTotal} min</span></div>
                  <div className="mt-1 h-1.5 rounded" style={{ background: 'var(--line-2)' }}>
                    <div className="h-1.5 rounded bg-lime-500" style={{ width: `${minTotal > 0 ? Math.min(100, (minLeft / minTotal) * 100) : 0}%` }} />
                  </div>
                </td>
                <td className="text-right"><strong>{displayStats?.callsToday ?? 0}</strong></td>
                <td className="text-right"><strong>{displayStats?.callsThisMonth ?? 0}</strong></td>
                <td className="text-right">{fmtDuration(displayStats?.avgDurationSec || 0)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === Call analytics =========================================== */}
      <div className="mt-6 form-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display font-semibold text-lg">Call analytics</div>
            <div className="text-xs text-mute mt-0.5">
              {displayCallStats?.total_calls != null ? `Last ${displayCallStats.total_calls} calls` : 'Last 30 days'} · all numbers — pick a date range on Analytics
            </div>
          </div>
          <Link to={`${basePath}/analytics`} className="text-sm text-lime-700 hover:underline whitespace-nowrap">View analytics →</Link>
        </div>

        <div className="mt-5 grid sm:grid-cols-4 gap-4">
          <Stat label="Calls" value={displayCallStats?.total_calls ?? displayStats?.callsAllTime ?? '—'} />
          <Stat label="Answer rate" value={displayCallStats?.answer_rate != null ? `${displayCallStats.answer_rate}%` : '—'} />
          <Stat label="Total minutes" value={displayCallStats?.total_minutes != null ? Number(displayCallStats.total_minutes).toFixed(1) : (minUsedMonth ? minUsedMonth.toFixed(1) : '—')} />
          <Stat label="Avg duration" value={displayCallStats?.avg_duration_seconds != null ? fmtDuration(displayCallStats.avg_duration_seconds) : fmtDuration(displayStats?.avgDurationSec || 0)} />
        </div>

        {displaySentiment && (
          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--line-2)' }}>
            <div className="flex items-start justify-between">
              <div className="text-xs font-mono uppercase tracking-wide text-mute">Caller sentiment · last 30 days</div>
              <div className="flex flex-col items-end gap-1.5">
                <Link to={`${basePath}/analytics`} className="text-xs text-lime-700 hover:underline">Details →</Link>
                {!!displaySentiment.needFollowUp && (
                  <span className="pill" style={{ background: 'rgba(248,113,113,0.14)', color: '#b91c1c' }}>
                    {displaySentiment.needFollowUp} need follow-up
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-lime-700">
                {displaySentiment.sentiment_percentages?.positive ?? 0}% <span className="text-sm font-normal text-mute">positive</span>
              </div>
            </div>
            <div className="mt-2 h-2 rounded overflow-hidden flex" style={{ background: 'var(--line-2)' }}>
              <div className="h-2 bg-lime-500" style={{ width: `${displaySentiment.sentiment_percentages?.positive ?? 0}%` }} />
              <div className="h-2" style={{ width: `${displaySentiment.sentiment_percentages?.neutral ?? 0}%`, background: 'var(--ink-4)' }} />
              <div className="h-2 bg-red-400" style={{ width: `${displaySentiment.sentiment_percentages?.negative ?? 0}%` }} />
            </div>
            <div className="mt-2 text-xs text-mute">
              {displaySentiment.total_calls != null ? (
                <>
                  {Math.round(((displaySentiment.sentiment_percentages?.positive ?? 0) / 100) * displaySentiment.total_calls)} positive
                  {' · '}{Math.round(((displaySentiment.sentiment_percentages?.neutral ?? 0) / 100) * displaySentiment.total_calls)} neutral
                  {' · '}{Math.round(((displaySentiment.sentiment_percentages?.negative ?? 0) / 100) * displaySentiment.total_calls)} negative
                  {' · '}{displaySentiment.total_calls} classified
                </>
              ) : (
                <>{(displaySentiment.sentiment_percentages?.positive ?? 0)}% positive</>
              )}
            </div>
          </div>
        )}

        {displayVolume?.daily_breakdown?.length > 0 && (
          <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--line-2)' }}>
            <div className="text-xs font-mono uppercase tracking-wide text-mute mb-3">Call volume · last 14 days</div>
            <div className="flex items-end gap-2">
              {displayVolume.daily_breakdown.map((d) => {
                const max = Math.max(1, ...displayVolume.daily_breakdown.map((x) => Number(x.count || x.calls || 0)));
                const v = Number(d.count || d.calls || 0);
                // Fixed pixel track (not a %) — a % height only resolves against
                // a parent with an explicit height, and this column's parent is
                // auto-sized, so a % here silently collapses to 0.
                const barPx = Math.max(2, Math.round((v / max) * 80));
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${v} calls`}>
                    <div className="w-full flex items-end" style={{ height: 80 }}>
                      <div className="w-full rounded-t bg-lime-400" style={{ height: barPx }} />
                    </div>
                    <div className="text-[9px] text-mute">{new Date(d.date).getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-mute mt-2">
              Based on your {displayCallStats?.total_calls ?? displayVolume.daily_breakdown.reduce((a, d) => a + Number(d.count || d.calls || 0), 0)} most recent calls across all your numbers.
            </div>
          </div>
        )}
      </div>

      {/* === Quick actions ============================================ */}
      <div className="mt-6 form-card">
        <div className="font-display font-semibold text-lg">Quick actions</div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <Link to={`${basePath}/agents`} className="btn-ghost text-center">Edit agent</Link>
          <Link to={`${basePath}/billing`} className="btn-teal text-center">Buy more minutes</Link>
          <Link to={`${basePath}/analytics`} className="btn-ghost text-center sm:col-span-2">View analytics</Link>
        </div>
        {testNumber && (
          <p className="mt-4 text-xs text-mute">
            To test, dial <span className="font-mono text-[var(--ink)]">{testNumber}</span> from your phone.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wide text-mute">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ProvisioningBanner() {
  const { currentUser } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [localStatus, setLocalStatus] = useState(currentUser?.provisioning?.status || 'unprovisioned');
  const [localErr, setLocalErr] = useState(currentUser?.provisioning?.error || null);

  if (!currentUser?.number?.value) return null;

  const status = localStatus;
  const error = localErr;

  const provision = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await api('/api/provision/me', { method: 'POST' });
      setMsg('✓ ' + (r.log || []).join(' · '));
      setLocalStatus('ready');
      setLocalErr(null);
    } catch (e) {
      setMsg('✗ ' + e.message);
      setLocalStatus('failed');
      setLocalErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'ready') return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
      <Phone size={22} className="text-amber-500 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-semibold text-amber-400">
          Inbound calling: {status === 'in_progress' ? 'in progress…' : status === 'failed' ? 'failed' : 'not provisioned yet'}
        </div>
        <p className="text-sm text-mute mt-1">
          {status === 'failed'
            ? <>Last error: {error || 'unknown'}. Retry to recreate the SIP trunk + dispatch rule + agent on 9278.</>
            : <>Click below to set up your inbound calling, routing, and voice agent.</>
          }
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-teal text-sm" onClick={provision} disabled={busy}>
            {busy ? 'Provisioning…' : 'Provision inbound now'}
          </button>
          {msg && <span className="text-xs text-mute">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
