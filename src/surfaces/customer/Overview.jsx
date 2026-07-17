import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const fmtDuration = (s) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

export default function Overview({ rechargeOn }) {
  const { currentUser } = useApp();
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  const [sentiment, setSentiment] = useState(null);
  const [mcpOverview, setMcpOverview] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');
  // Per-number agent list — drives the "Agent & number" card so each DID's
  // agent name shows up (customers on Growth+ have multiple numbers).
  const [numbers, setNumbers] = useState([]);

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
      // Sentiment + tenant-wide overview were leaking cross-tenant data because
      // MCP get_sentiment/get_overview don't filter by agent. Admin-only.
      if (currentUser?.role === 'admin') {
        try {
          const s = await api('/api/mcp/sentiment?days=30');
          if (!cancelled) setSentiment(s.data || null);
        } catch {}
        try {
          const o = await api('/api/mcp/overview');
          if (!cancelled) setMcpOverview(o.data || null);
        } catch {}
      }
      if (!cancelled) await refreshWallet();
      try {
        const r = await api('/api/numbers');
        if (!cancelled) setNumbers(r.numbers || []);
      } catch {}
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

  const company = currentUser.company || currentUser.name || 'there';
  const number = currentUser.number?.value || '— no number assigned —';
  const planMin = currentUser.plan?.min || 0;
  // ALL-TIME usage drives the "minutes left" math (per product spec). Monthly
  // is kept as a parenthetical secondary figure.
  const minUsedAllTime = stats?.minutesUsedAllTime ?? Number(currentUser.minutesUsed) ?? 0;
  const minUsedMonth   = stats?.minutesUsedThisMonth ?? 0;
  const planLeft = Math.max(0, planMin - minUsedAllTime);
  const walletMin = wallet?.walletMinutes ?? currentUser.walletMinutes ?? 0;
  const minLeft = Math.max(0, planLeft + walletMin);
  const minTotal = planMin + walletMin;
  const pct = minTotal > 0 ? Math.min(100, (minLeft / minTotal) * 100) : 0;
  const lowThreshold = wallet?.lowBalanceThreshold ?? currentUser.lowBalanceThreshold ?? 20;
  const isLow = minLeft <= lowThreshold;
  const autoTopupOn = wallet?.autoTopupEnabled ?? currentUser.autoTopupEnabled;

  return (
    <div>
      {/* "Welcome back, {company}" moved to the sidebar (below the logo) so
          it persists across every dashboard tab. The per-number "live at" line
          is dropped — customers can have multiple DIDs, so a single number
          there is misleading; the Numbers tab lists them all. */}

      {statsErr && (
        <div className="mt-4 text-xs text-amber-400">⚠ Live stats unavailable: {statsErr}</div>
      )}

      <ProvisioningBanner />
      {/* PlanExpiryBanner removed — plans are now per-number, so a single
          account-level expiry banner no longer applies. Per-DID renewal
          dates surface on the Numbers tab and the per-number Phone-number
          plan cards on Billing. */}

      {isLow && (
        <div className="mt-6 rounded-lg border-2 border-amber-500/60 bg-amber-500/10 p-4 flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-400">Low minutes — only {minLeft.toFixed(1)} left</div>
            <p className="text-sm text-mute mt-1">
              You're at or below your low-balance threshold ({lowThreshold} min).
              {autoTopupOn
                ? <> Auto-topup is <strong className="text-teal-400">ON</strong> — we'll charge your card for 100 more minutes shortly.</>
                : <> Top up now to keep your agent answering calls without interruption.</>}
            </p>
            <div className="mt-3 flex gap-2 items-center">
              {!autoTopupOn && (
                <button className="btn-teal text-sm" onClick={quickTopUp} disabled={topupBusy}>
                  {topupBusy ? 'Charging…' : '⚡ Top up 83 min ($1,000)'}
                </button>
              )}
              <Link to="/dashboard/billing" className="btn-ghost text-sm">Manage wallet →</Link>
              {topupMsg && <span className="text-xs text-mute ml-2">{topupMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/*
       * Auto-recharge warning relocated to /dashboard/account — kept here as
       * a reference. Overview is meant for at-a-glance status (minutes left,
       * call activity); long-form policy warnings belong on the account page.
       *
      {!rechargeOn && currentUser.number?.value && (
        <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-400">Your phone number is NOT on auto-recharge</div>
            <p className="text-sm text-mute mt-1">
              If your monthly ${Number(currentUser.number?.price || 0).toLocaleString('en-US')} charge fails or auto-recharge is off, <strong>your phone number will be deactivated</strong> within 7 days — and you won't be able to use any of your purchased minutes until you reactivate. Turn on auto-recharge to keep your number safe.
            </p>
            <Link to="/dashboard/billing" className="btn-teal mt-3 text-sm inline-block">Turn on auto-recharge →</Link>
          </div>
        </div>
      )}
       */}

      <div className="mt-6 grid sm:grid-cols-4 gap-4">
        <div className="form-card">
          <div className="text-sm text-mute">Minutes left</div>
          <div className={`mt-1 text-3xl font-bold ${isLow ? 'text-amber-400' : 'text-teal-400'}`}>
            {minLeft.toFixed(1)} <span className="text-sm font-normal text-mute">/ {minTotal}</span>
          </div>
          <div className="mt-2 h-2 bg-ink-800 rounded">
            <div className={`h-2 rounded ${isLow ? 'bg-amber-400' : 'bg-teal-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-mute mt-2">
            {planLeft.toFixed(1)} plan + {walletMin.toFixed(1)} wallet · {minUsedAllTime.toFixed(1)} used all-time ({minUsedMonth.toFixed(1)} this month)
          </div>
        </div>
        <div className="form-card">
          <div className="text-sm text-mute">Calls today</div>
          <div className="mt-1 text-3xl font-bold">
            {statsLoading ? <span className="text-slate-300">…</span> : (stats?.callsToday ?? 0)}
          </div>
          <div className="text-xs text-mute mt-2">{stats?.callsThisMonth ?? 0} this month</div>
        </div>
        <div className="form-card">
          <div className="text-sm text-mute">Avg duration</div>
          <div className="mt-1 text-3xl font-bold">
            {statsLoading ? <span className="text-slate-300">…</span> : fmtDuration(stats?.avgDurationSec || 0)}
          </div>
          <div className="text-xs text-mute mt-2">Across completed calls</div>
        </div>
        {currentUser?.role === 'admin' && sentiment ? (
          <div className="form-card">
            <div className="text-sm text-mute">Sentiment</div>
            <div className={`mt-1 text-3xl font-bold ${
              (sentiment?.avg_sentiment_score ?? 0) >= 0.3 ? 'text-sky-600'
              : (sentiment?.avg_sentiment_score ?? 0) <= -0.1 ? 'text-red-600'
              : 'text-amber-600'
            }`}>
              {sentiment ? (sentiment.avg_sentiment_score >= 0 ? '+' : '') + sentiment.avg_sentiment_score.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-mute mt-2">
              {`${sentiment.sentiment_percentages?.positive ?? 0}% positive · ${sentiment.total_calls} calls (tenant-wide)`}
            </div>
          </div>
        ) : (
          <div className="form-card">
            <div className="text-sm text-mute">Total minutes used</div>
            <div className="mt-1 text-3xl font-bold text-sky-600">
              {statsLoading ? (
                <span className="text-slate-300">…</span>
              ) : (
                <>
                  {Number(stats?.minutesUsedAllTime || 0).toFixed(1)}
                  <span className="text-sm font-normal text-mute"> min</span>
                  <span className="text-sm font-normal text-mute">
                    {' '}({Number(stats?.minutesUsedThisMonth || 0).toFixed(1)} this month)
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-mute mt-2">
              {stats?.allTimeSpendInr != null ? `≈ $${Number(stats.allTimeSpendInr).toLocaleString('en-US')} at $${stats.ratePerMin}/min` : 'All-time usage'}
            </div>
          </div>
        )}
      </div>

      {mcpOverview && (
        <div className="mt-4 rounded-lg border border-teal-500/20 bg-teal-500/5 p-4 text-sm flex items-center gap-6">
          <span className="text-xs text-teal-400 uppercase font-semibold">9278 dashboard</span>
          <span><span className="text-mute">Calls today:</span> <strong>{mcpOverview.calls_today}</strong></span>
          <span><span className="text-mute">Answer rate:</span> <strong>{mcpOverview.answer_rate}%</strong></span>
          <span><span className="text-mute">Running agents:</span> <strong>{mcpOverview.running_agents} / {mcpOverview.total_agents}</strong></span>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="form-card">
          <div className="font-medium">Agent &amp; number</div>
          <div className="mt-3 text-sm space-y-2 text-mute">
            <div className="flex justify-between"><span>Voice</span><span className="text-slate-900 dark:text-slate-100">{currentUser.voice || '—'}</span></div>

            {/* Per-number agent breakdown. On Growth+ each DID has its own
                agent name; on Starter (single number) we still show one row
                so the layout is consistent. Falls back to the legacy
                `currentUser.agentName` field when /api/numbers is empty. */}
            {numbers.length > 0 ? (
              <div className="space-y-1">
                <div className="text-slate-500 dark:text-slate-400">Agent name</div>
                <ul className="space-y-1 text-xs">
                  {numbers.map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-3">
                      <span className="font-mono text-slate-500 dark:text-slate-400 truncate">
                        {n.value}
                        {n.label ? ` · ${n.label}` : (n.isPrimary ? ' · primary' : '')}
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 truncate text-right">
                        {n.agentName || <span className="text-mute italic">not set</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Agent name</span>
                <span className="text-slate-900 dark:text-slate-100">{currentUser.agentName || '—'}</span>
              </div>
            )}

            {/* User-level plan row removed — plans are per-number now. The
                per-number plan tier is shown in the Numbers tab. */}
          </div>
        </div>
        <div className="form-card">
          <div className="font-medium">Quick actions</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Link to="/dashboard/kb" className="btn-ghost text-sm text-center">🧠 Edit Knowledge &amp; Agent</Link>
            <Link to="/dashboard/billing" className="btn-teal text-sm text-center">💳 Buy more minutes</Link>
            <Link to="/dashboard/calls" className="btn-ghost text-sm text-center col-span-2">📥 View call history</Link>
          </div>
          {currentUser?.number?.value && (
            <p className="mt-3 text-xs text-mute">
              📞 To test, dial <span className="font-mono text-slate-900">{currentUser.number.value}</span> from your phone.
            </p>
          )}
        </div>
      </div>
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

  // When the number is fully provisioned, the "● Live · taking calls" pill in
  // the page header already conveys that — no need for a verbose debug banner
  // exposing internal slug + room names to the customer.
  if (status === 'ready') return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
      <span className="text-2xl">📞</span>
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

// PlanExpiryBanner removed — plans are per-number now and don't share a
// single account-level expiry. Per-DID renewal dates surface on the
// Numbers tab and the per-number Phone-number plan cards on Billing.
