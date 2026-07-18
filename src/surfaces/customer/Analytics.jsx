import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const GREEN = '#3a5a0c';
const GREEN_TINT = 'rgba(77,124,15,0.08)';
const GREEN_BORDER = 'rgba(77,124,15,0.35)';

const fmtDuration = (s) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

const fmtNumber = (s) => {
  if (!s) return '—';
  const m = String(s).match(/sip:([^@;]+)/);
  return m ? m[1] : s;
};

const fmtDirection = (dir) => {
  if (!dir) return '—';
  if (dir === 'trunking-originating' || dir === 'inbound') return 'Inbound';
  if (dir === 'outbound-api' || dir === 'outbound-dial') return 'Outbound';
  return String(dir).replace(/-/g, ' ');
};

const fmtTime = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ', '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const ANSWERED = new Set(['completed', 'answered', 'in-progress']);

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Same six ranges as the Reports/Recordings date picker, kept local here since
// this page shows them as a single chip row with no manual date inputs
// (matching the reference layout) rather than DateRangePicker's stacked one.
const PRESETS = [
  { id: 'today', label: 'Today', range: () => { const t = startOfDay(new Date()); return { from: ymd(t), to: ymd(t) }; } },
  { id: 'yesterday', label: 'Yesterday', range: () => { const t = startOfDay(new Date()); t.setDate(t.getDate() - 1); return { from: ymd(t), to: ymd(t) }; } },
  { id: 'last7', label: 'Last 7 days', range: () => { const to = startOfDay(new Date()); const from = new Date(to); from.setDate(to.getDate() - 6); return { from: ymd(from), to: ymd(to) }; } },
  { id: 'thismonth', label: 'This month', range: () => { const now = new Date(); return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }; } },
  { id: 'lastmonth', label: 'Last month', range: () => { const now = new Date(); return { from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) }; } },
  { id: 'alltime', label: 'All time', range: () => ({ from: '', to: '' }) },
];

// Placeholder rows shown only when there's no real call/sentiment data (no
// DB/MCP connected), same "never overrides real data" rule as Overview.jsx's
// DEMO_* constants. Sentiment is baked in for a few rows since a live
// per-call sentiment lookup isn't cheap to bulk-fetch for a table.
const DEMO_CALLS = Array.from({ length: 15 }, (_, i) => {
  const rand = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  const inbound = i % 5 !== 3;
  const start = new Date(Date.now() - (i * 9 + Math.floor(rand(i) * 6)) * 3600 * 1000);
  const duration = 5 + Math.floor(rand(i * 7) * 115);
  const sentiments = [null, null, 'neutral', null, 'negative', null, 'neutral', null];
  return {
    sid: `demo-${i}`,
    startTime: start.toISOString(),
    direction: inbound ? 'inbound' : 'outbound-api',
    from: inbound ? `9${100000000 + Math.floor(rand(i * 3) * 899999999)}` : '918037683048',
    to: inbound ? '918037683048' : `9${100000000 + Math.floor(rand(i * 11) * 899999999)}`,
    duration,
    status: 'completed',
    sentiment: sentiments[i % sentiments.length],
  };
});

export default function Analytics() {
  const { currentUser } = useApp();
  const [calls, setCalls] = useState(null);
  const [sentimentAgg, setSentimentAgg] = useState(null);
  const [err, setErr] = useState('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(() => PRESETS[2].range());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          api('/api/twilio/calls?limit=500').catch(() => ({ calls: [] })),
          api('/api/mcp/sentiment?days=30').catch(() => null),
        ]);
        if (cancelled) return;
        setCalls(c.calls || []);
        setSentimentAgg(s?.data || null);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Could not load analytics');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const demoMode = !calls || calls.length === 0;
  const rawCalls = demoMode ? DEMO_CALLS : calls;

  const activePresetId = useMemo(() => {
    for (const p of PRESETS) {
      const r = p.range();
      if (r.from === (dateFrom || '') && r.to === (dateTo || '')) return p.id;
    }
    return null;
  }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : Infinity;
    return rawCalls.filter((c) => {
      if (typeFilter === 'inbound' && fmtDirection(c.direction) !== 'Inbound') return false;
      if (typeFilter === 'outbound' && fmtDirection(c.direction) !== 'Outbound') return false;
      const t = new Date(c.startTime || 0).getTime();
      if (!isNaN(t) && (t < fromTs || t > toTs)) return false;
      return true;
    });
  }, [rawCalls, typeFilter, dateFrom, dateTo]);

  const total = filtered.length;
  const answered = filtered.filter((c) => ANSWERED.has(c.status)).length;
  const failed = total - answered;
  const answerRate = total ? Math.round((answered / total) * 100) : 0;
  const totalSeconds = filtered.reduce((sum, c) => sum + (Number(c.duration) || 0), 0);
  const totalMinutes = totalSeconds / 60;
  const avgDuration = total ? totalSeconds / total : 0;
  const inboundCount = filtered.filter((c) => fmtDirection(c.direction) === 'Inbound').length;
  const outboundCount = total - inboundCount;

  const sentimentRows = filtered.filter((c) => c.sentiment);
  const positive = sentimentRows.filter((c) => c.sentiment === 'positive').length;
  const neutral = sentimentRows.filter((c) => c.sentiment === 'neutral').length;
  const negative = sentimentRows.filter((c) => c.sentiment === 'negative').length;
  const classified = sentimentRows.length;
  const pct = (n) => (classified ? Math.round((n / classified) * 100) : 0);
  const positivePct = sentimentAgg ? (sentimentAgg.sentiment_percentages?.positive ?? 0) : pct(positive);
  const neutralPct = sentimentAgg ? (sentimentAgg.sentiment_percentages?.neutral ?? 0) : pct(neutral);
  const negativePct = sentimentAgg ? (sentimentAgg.sentiment_percentages?.negative ?? 0) : pct(negative);
  const totalClassified = sentimentAgg?.total_calls ?? classified;
  const needFollowUp = sentimentAgg?.needFollowUp ?? negative;

  // 14-day volume, bucketed by calendar day for whatever's in `filtered`.
  const volumeDays = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i)); d.setHours(0, 0, 0, 0);
      return { date: d, count: 0 };
    });
    filtered.forEach((c) => {
      const t = new Date(c.startTime || 0);
      if (isNaN(t.getTime())) return;
      const day = days.find((d) => d.date.toDateString() === t.toDateString());
      if (day) day.count += 1;
    });
    return days;
  }, [filtered]);
  const maxVolume = Math.max(1, ...volumeDays.map((d) => d.count));

  const failedCalls = filtered.filter((c) => !ANSWERED.has(c.status));

  if (!currentUser) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
      <p className="text-mute">Your call history and activity across all your numbers.</p>

      {err && !demoMode && (
        <div className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>
      )}

      <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-full border border-slate-200 overflow-hidden">
          {[['all', 'All types'], ['inbound', 'Inbound'], ['outbound', 'Outbound']].map(([id, label]) => (
            <button
              key={id}
              className={`px-4 py-1.5 text-sm font-semibold transition ${
                typeFilter === id ? 'text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              style={typeFilter === id ? { background: GREEN } : undefined}
              onClick={() => setTypeFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const active = activePresetId === p.id;
            return (
              <button
                key={p.id}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={active
                  ? { background: GREEN_TINT, borderColor: GREEN_BORDER, color: GREEN }
                  : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
                onClick={() => setRange(p.range())}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Total calls" value={total} />
        <StatTile label="Answered" value={answered} color={GREEN} />
        <StatTile label="Failed / no-answer" value={failed} color="#dc2626" />
        <StatTile label="Answer rate" value={`${answerRate}%`} color={GREEN} />
        <StatTile label="Total minutes" value={totalMinutes.toFixed(1)} color={GREEN} />
        <StatTile label="Avg duration" value={fmtDuration(avgDuration)} />
      </div>
      <div className="mt-2 text-xs text-mute">
        Showing <strong className="text-slate-900">{PRESETS.find((p) => p.id === activePresetId)?.label || 'custom range'}</strong> · answer rate is over completed calls
      </div>

      {/* Caller sentiment */}
      <div className="mt-6 form-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-900">Caller sentiment</div>
            <div className="text-xs text-mute mt-0.5">How callers felt across {totalClassified} classified calls.</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: GREEN }}>{positivePct}%</div>
            <div className="text-[10px] uppercase tracking-wide text-mute">Positive</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-mute">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} /> {positive} Positive ({positivePct}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> {neutral} Neutral ({neutralPct}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> {negative} Negative ({negativePct}%)</span>
        </div>

        <div className="mt-2 h-2.5 rounded-full overflow-hidden flex bg-slate-100">
          <div className="h-full" style={{ width: `${positivePct}%`, background: GREEN }} />
          <div className="h-full bg-slate-300" style={{ width: `${neutralPct}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${negativePct}%` }} />
        </div>

        {needFollowUp > 0 && (
          <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
            <strong>{needFollowUp}</strong> call ended negative — worth a callback. Open the call to read its transcript.
          </div>
        )}
      </div>

      {/* Call volume */}
      <div className="mt-6 form-card">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-slate-900">Call volume</div>
          <div className="text-xs text-mute">{inboundCount} inbound · {outboundCount} outbound</div>
        </div>
        <div className="mt-5 flex items-end gap-2" style={{ height: 90 }}>
          {volumeDays.map((d, i) => {
            const barPx = Math.max(2, Math.round((d.count / maxVolume) * 80));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date.toDateString()}: ${d.count} calls`}>
                <div className="w-full flex items-end" style={{ height: 80 }}>
                  <div className="w-full rounded-t" style={{ height: barPx, background: GREEN }} />
                </div>
                <div className="text-[9px] text-mute">{d.date.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-mute mt-2">Tip: click a bar to see that period's calls.</div>
      </div>

      {/* Recent activity + Failed/no-answer */}
      <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="form-card p-0 overflow-x-auto">
          <div className="px-5 pt-5 pb-3 text-lg font-bold text-slate-900">Recent activity</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-mute py-8">No calls in this range.</td></tr>
              )}
              {filtered.slice(0, 15).map((c) => (
                <tr key={c.sid}>
                  <td className="whitespace-nowrap">{fmtTime(c.startTime)}</td>
                  <td className="text-mute">{fmtDirection(c.direction)}</td>
                  <td className="font-mono">{fmtNumber(c.from)}</td>
                  <td className="font-mono">{fmtNumber(c.to)}</td>
                  <td>{fmtDuration(c.duration)}</td>
                  <td>
                    <span className="pill" style={{ background: GREEN_TINT, color: GREEN }}>
                      {ANSWERED.has(c.status) ? 'answered' : c.status || 'failed'}
                    </span>
                  </td>
                  <td>
                    {c.sentiment ? (
                      <span className={`pill ${c.sentiment === 'negative' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                        {c.sentiment[0].toUpperCase() + c.sentiment.slice(1)}
                      </span>
                    ) : <span className="text-mute">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-card">
          <div className="text-lg font-bold text-slate-900">Failed / no-answer ({failedCalls.length})</div>
          {failedCalls.length === 0 ? (
            <div className="text-center text-mute text-sm py-10">No failed calls</div>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {failedCalls.slice(0, 10).map((c) => (
                <li key={c.sid} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{fmtNumber(c.from)}</span>
                  <span className="text-xs text-mute">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, color }) {
  return (
    <div className="form-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-mute">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
