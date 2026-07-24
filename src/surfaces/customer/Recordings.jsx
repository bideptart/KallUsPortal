import { useEffect, useMemo, useState } from 'react';
import { api, getToken } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import CallDetailModal from '../../components/CallDetailModal.jsx';
import DateRangePicker, { todayRange } from '../../components/DateRangePicker.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtNumber = (s) => {
  if (!s) return '—';
  const m = String(s).match(/sip:([^@;]+)/);
  return m ? m[1] : s;
};

const digitsOnly = (s) => String(s || '').replace(/\D+/g, '');

const fmtDirection = (dir) => {
  if (!dir) return '—';
  if (dir === 'trunking-originating' || dir === 'trunking originating') return 'Inbound';
  if (dir === 'inbound') return 'Inbound';
  if (dir === 'outbound-api' || dir === 'outbound-dial') return 'Outbound';
  return String(dir).replace(/-/g, ' ');
};

const fmtDuration = (s) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

const fmtTime = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleString();
};

const NUMBER_TINTS = [
  'bg-lime-100 text-lime-700',
  'bg-lime-100 text-lime-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

export default function Recordings() {
  const { currentUser } = useApp();
  const [recordings, setRecordings] = useState(() => readCache('recordings.recordings', currentUser?.id));
  const [numbers, setNumbers] = useState(() => readCache('recordings.numbers', currentUser?.id) ?? []);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterNumber, setFilterNumber] = useState('all');
  // Default to today's date so the page lands on the most recent activity
  // instead of dumping every recording ever made.
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(() => todayRange());
  const [inboundSearch, setInboundSearch] = useState('');
  const [dashboardBase, setDashboardBase] = useState('https://dashboard.9278.ai');

  // callId -> { loading, messages, error }
  const [transcripts, setTranscripts] = useState({});
  // callId -> true once the <audio> element fired an error event
  const [audioErrors, setAudioErrors] = useState({});
  // callId -> { loading, data, error, collapsed }
  const [summaries, setSummaries] = useState({});
  // The recording currently shown in the floating CallDetailModal.
  const [openRec, setOpenRec] = useState(null);

  // force=true bypasses the server's 30s recordings cache — used by the
  // Refresh button so a just-finished call's recording shows without waiting
  // for the cache window (or the call to age out of it) to expire.
  const load = async (force = false) => {
    setLoading(true);
    setErr('');
    try {
      const [recsRes, numbersRes] = await Promise.all([
        api(`/api/recordings?limit=500${force ? '&refresh=1' : ''}`),
        api('/api/numbers').catch(() => ({ numbers: [] })),
      ]);
      const nextRecordings = recsRes.recordings || [];
      setRecordings(nextRecordings);
      writeCache('recordings.recordings', currentUser?.id, nextRecordings);
      setDashboardBase(recsRes.dashboardBase || 'https://dashboard.9278.ai');
      const nextNumbers = numbersRes.numbers || [];
      setNumbers(nextNumbers);
      writeCache('recordings.numbers', currentUser?.id, nextNumbers);
    } catch (e) {
      setErr(e.message || 'Could not load recordings');
      setRecordings((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const numberMeta = useMemo(() => {
    const m = new Map();
    numbers.forEach((n, i) => {
      m.set(digitsOnly(n.value), {
        value: n.value,
        label: n.label || (n.isPrimary ? 'Primary' : `Number ${i + 1}`),
        tint: NUMBER_TINTS[i % NUMBER_TINTS.length],
      });
    });
    return m;
  }, [numbers]);

  const ownedSideOf = (r) => {
    const to = digitsOnly(fmtNumber(r.to));
    const from = digitsOnly(fmtNumber(r.from));
    if (numberMeta.has(to)) return to;
    if (numberMeta.has(from)) return from;
    return null;
  };

  // Apply all three filters in one pass (DID + date range + caller number).
  const filteredRecordings = useMemo(() => {
    if (!recordings) return [];
    // Parse date filters once. Empty strings → no bound. Treat dateFrom as
    // start-of-day and dateTo as end-of-day in the browser's local tz so the
    // pickers behave intuitively.
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const toTs   = dateTo   ? new Date(dateTo   + 'T23:59:59.999').getTime() : Infinity;
    const search = inboundSearch.replace(/\D+/g, '');
    return recordings.filter((r) => {
      if (filterNumber !== 'all' && ownedSideOf(r) !== digitsOnly(filterNumber)) return false;
      const ts = r.startTime ? new Date(r.startTime).getTime() : 0;
      if (ts < fromTs || ts > toTs) return false;
      if (search) {
        const from = digitsOnly(fmtNumber(r.from));
        const to   = digitsOnly(fmtNumber(r.to));
        if (!from.includes(search) && !to.includes(search)) return false;
      }
      return true;
    });
  }, [recordings, filterNumber, dateFrom, dateTo, inboundSearch, numberMeta]);

  const filtersActive = filterNumber !== 'all' || dateFrom || dateTo || inboundSearch;
  const clearFilters = () => {
    setFilterNumber('all'); setRange({ from: '', to: '' }); setInboundSearch('');
  };

  const toggleSummary = async (callId) => {
    const existing = summaries[callId];
    if (existing && (existing.data || existing.error)) {
      setSummaries((s) => ({
        ...s,
        [callId]: { ...existing, collapsed: !existing.collapsed },
      }));
      return;
    }
    setSummaries((s) => ({ ...s, [callId]: { loading: true, collapsed: false } }));
    try {
      const data = await api(`/api/recordings/${encodeURIComponent(callId)}/summary`);
      setSummaries((s) => ({
        ...s,
        [callId]: { loading: false, data, collapsed: false },
      }));
    } catch (e) {
      setSummaries((s) => ({
        ...s,
        [callId]: { loading: false, error: e.message || 'Failed to load', collapsed: false },
      }));
    }
  };

  const toggleTranscript = async (callId) => {
    const existing = transcripts[callId];
    if (existing && (existing.messages || existing.error)) {
      // Already loaded — just collapse/expand
      setTranscripts((t) => ({
        ...t,
        [callId]: { ...existing, collapsed: !existing.collapsed },
      }));
      return;
    }
    setTranscripts((t) => ({ ...t, [callId]: { loading: true, collapsed: false } }));
    try {
      const r = await api(`/api/recordings/${encodeURIComponent(callId)}/transcript`);
      setTranscripts((t) => ({
        ...t,
        [callId]: { loading: false, messages: r.messages || [], collapsed: false },
      }));
    } catch (e) {
      setTranscripts((t) => ({
        ...t,
        [callId]: { loading: false, error: e.message || 'Failed to load', collapsed: false },
      }));
    }
  };

  const total = filteredRecordings.length;

  if (!currentUser) return null;

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🎙 Recordings</h1>
          <p className="text-mute">
            Every call we recorded — with transcripts and a direct playback link on the dashboard.
            {loading && recordings !== null && <span className="font-normal text-xs text-mute ml-2">Refreshing…</span>}
          </p>
        </div>
        <button className="btn-ghost btn-ghost-accent text-sm" onClick={() => load(true)} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Filter bar — quick date chips + DID + caller search */}
      <div className="mt-5 form-card">
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={({ from, to }) => setRange({ from, to })}
          className="mb-4"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          {numbers.length > 1 && (
            <div>
              <label className="field-label">Your number</label>
              <select
                className="input text-sm py-1.5"
                value={filterNumber}
                onChange={(e) => setFilterNumber(e.target.value)}
              >
                <option value="all">All numbers ({recordings?.length || 0})</option>
                {numbers.map((n) => {
                  const d = digitsOnly(n.value);
                  const count = (recordings || []).filter((r) => ownedSideOf(r) === d).length;
                  return (
                    <option key={n.id} value={n.value}>
                      {n.value} {n.label ? `(${n.label})` : n.isPrimary ? '(primary)' : ''} · {count}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Inbound number</label>
            <input
              type="text"
              inputMode="tel"
              className="input text-sm py-1.5 font-mono"
              placeholder="e.g. 9876543210"
              value={inboundSearch}
              onChange={(e) => setInboundSearch(e.target.value)}
            />
          </div>
        </div>
        {filtersActive && (
          <div className="mt-3 flex items-center gap-3 text-xs text-mute">
            <span>
              Showing <strong className="text-slate-900">{filteredRecordings.length}</strong>{' '}
              of {recordings?.length || 0} recordings
            </span>
            <button onClick={clearFilters} className="text-lime-600 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {err}
        </div>
      )}


      <div className="mt-6 space-y-3">
        {recordings === null && (
          <div className="form-card text-center text-mute">Loading recordings…</div>
        )}
        {recordings !== null && total === 0 && (
          <div className="form-card text-center text-mute">
            No recordings yet. As soon as a call comes in, it'll show up here.
          </div>
        )}
        {filteredRecordings.map((r) => {
          const ownedDigits = ownedSideOf(r);
          const meta = ownedDigits ? numberMeta.get(ownedDigits) : null;
          const t = transcripts[r.callId];
          const transcriptOpen = t && !t.collapsed && (t.messages || t.error);
          return (
            <div key={r.callId} className="form-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer rounded-lg -mx-2 -my-1 px-2 py-1 hover:bg-lime-50 dark:hover:bg-slate-800 transition"
                  onClick={() => setOpenRec(r)}
                  title="View recording, summary, and transcript"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-mute">{fmtTime(r.startTime)}</span>
                    <span className="pill bg-slate-100 text-slate-600 text-xs">{fmtDirection(r.direction)}</span>
                    {meta && <span className={`pill ${meta.tint} text-xs`}>{meta.value}</span>}
                    {r.hasTranscript && (
                      <span className="pill bg-lime-100 text-lime-700 text-xs">📝 transcript</span>
                    )}
                  </div>
                  <div className="mt-2 font-mono text-sm text-slate-900 dark:text-slate-100">
                    {fmtNumber(r.from)} <span className="text-mute">→</span> {fmtNumber(r.to)}
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {fmtDuration(r.duration)}
                    {r.price ? ` · $${Number(r.price).toFixed(2)}` : ''}
                    {r.agentName ? ` · ${r.agentName}` : ''}
                    <span className="ml-2 text-lime-600 font-semibold">› details</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="btn-ghost text-xs py-1 px-2"
                    onClick={() => toggleSummary(r.callId)}
                  >
                    {summaries[r.callId]?.loading
                      ? 'Loading…'
                      : summaries[r.callId]?.data && !summaries[r.callId]?.collapsed
                        ? 'Hide summary ▲'
                        : '📊 Summary'}
                  </button>
                  {r.hasTranscript && (
                    <button
                      className="btn-ghost text-xs py-1 px-2"
                      onClick={() => toggleTranscript(r.callId)}
                    >
                      {t?.loading
                        ? 'Loading…'
                        : transcriptOpen
                          ? 'Hide transcript ▲'
                          : 'Show transcript ▼'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline audio — streamed through the portal proxy
                  (/api/recordings/:callId/audio), which logs into the dashboard
                  and pipes the egress file with native Range/seek support.
                  ?token=<session> auths the request since <audio> can't send
                  an Authorization header. */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {r.audioUrl ? (
                  audioErrors[r.callId] ? (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 max-w-xl">
                      ⚠ Playback failed. The recording may still be processing —{' '}
                      <button
                        className="text-lime-700 underline"
                        onClick={() => {
                          setAudioErrors((m) => { const c = { ...m }; delete c[r.callId]; return c; });
                          load();
                        }}
                      >
                        refresh
                      </button>{' '}
                      to get a fresh one.
                    </div>
                  ) : (
                    <audio
                      controls
                      preload="none"
                      className="w-full max-w-xl h-9"
                      src={`${r.audioUrl}?token=${encodeURIComponent(getToken())}`}
                      onError={() => setAudioErrors((m) => ({ ...m, [r.callId]: true }))}
                    >
                      Your browser can&apos;t play this recording.
                    </audio>
                  )
                ) : (
                  <span className="text-xs text-mute">Audio not available</span>
                )}
                <div className="flex items-center gap-3 text-xs text-mute">
                  {r.audioSize && (
                    <span>{(r.audioSize / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  {r.audioUrl && (
                    <a
                      href={`${r.audioUrl}?token=${encodeURIComponent(getToken())}&download=1`}
                      download={r.audioFilename || `recording-${r.callId}.mp4`}
                      className="text-lime-600 hover:underline"
                    >
                      ⬇ Download
                    </a>
                  )}
                </div>
              </div>
              {/* Summary panel — metrics, latency bars, token usage, event chart */}
              {summaries[r.callId] && !summaries[r.callId].collapsed && (
                <SummaryPanel state={summaries[r.callId]} />
              )}

              {transcriptOpen && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {t.error ? (
                    <div className="text-xs text-red-500">⚠ {t.error}</div>
                  ) : t.messages.length === 0 ? (
                    <div className="text-xs text-mute">Transcript is empty.</div>
                  ) : (
                    <ol className="space-y-2 text-sm">
                      {t.messages.map((m, i) => {
                        const role = m.role || m.speaker || m.from || 'speaker';
                        const text = m.text || m.content || m.message || '';
                        const isAgent = /agent|assistant|ai|bot/i.test(role);
                        return (
                          <li key={i} className="flex gap-3">
                            <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold mt-1 ${
                              isAgent ? 'text-lime-600' : 'text-lime-600'
                            }`}>
                              {isAgent ? 'Agent' : 'Caller'}
                            </span>
                            <span className="text-slate-700">{text}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openRec && (
        <CallDetailModal
          call={{
            callId:        openRec.callId,
            from:          openRec.from,
            to:            openRec.to,
            direction:     openRec.direction,
            startTime:     openRec.startTime,
            duration:      openRec.duration,
            price:         openRec.price,
            agentName:     openRec.agentName,
            audioUrl:      openRec.audioUrl,
            audioFilename: openRec.audioFilename,
            audioSize:     openRec.audioSize,
            hasTranscript: openRec.hasTranscript,
          }}
          onClose={() => setOpenRec(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// ReportsSection — two tabs (Transcripts / Summaries) that bulk-load + render
// the text payload for every recording currently visible. Used by the Reports
// page; exported so the standalone page can re-use the exact same component.
// =============================================================================
export function ReportsSection({ recordings }) {
  const [tab, setTab] = useState(null);            // null | 'transcripts' | 'summaries'
  const [rows, setRows] = useState({});             // { [callId]: { transcript, summary, loading, error } }
  const [busy, setBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState('');

  // Lazy-load EVERY visible recording's data when a tab activates.
  const loadFor = async (which) => {
    setBusy(true); setBulkErr('');
    const pool = recordings.filter((r) => {
      if (which === 'transcripts') return r.hasTranscript;
      return true; // summaries available for any recording
    });
    try {
      const results = await Promise.all(pool.map(async (r) => {
        try {
          const url = which === 'transcripts'
            ? `/api/recordings/${encodeURIComponent(r.callId)}/transcript`
            : `/api/recordings/${encodeURIComponent(r.callId)}/summary`;
          const data = await api(url);
          return [r.callId, { data, error: null }];
        } catch (e) {
          return [r.callId, { data: null, error: e.message }];
        }
      }));
      setRows(Object.fromEntries(results));
    } catch (e) {
      setBulkErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pickTab = (next) => {
    if (tab === next) { setTab(null); return; }   // toggle off
    setTab(next);
    setRows({});
    if (recordings.length) loadFor(next);
  };

  return (
    <div className="mt-10 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">📑 Reports</h2>
          <p className="text-xs text-mute mt-1">
            Bulk view across {recordings.length} filtered recording{recordings.length === 1 ? '' : 's'}.
            Transcripts come straight from the call; summaries are AI-generated and cached.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm font-medium transition ${
              tab === 'transcripts'
                ? 'bg-lime-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => pickTab('transcripts')}
          >
            📝 Transcripts
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium transition border-l border-slate-200 ${
              tab === 'summaries'
                ? 'bg-lime-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => pickTab('summaries')}
          >
            ✨ Summaries
          </button>
        </div>
      </div>

      {bulkErr && (
        <div className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {bulkErr}
        </div>
      )}

      {tab && busy && (
        <div className="mt-6 form-card text-center text-mute">
          Loading {tab}… ({recordings.length} call{recordings.length === 1 ? '' : 's'})
        </div>
      )}

      {tab && !busy && Object.keys(rows).length === 0 && (
        <div className="mt-6 form-card text-center text-mute">
          Nothing to report for the current filter.
        </div>
      )}

      {tab === 'transcripts' && !busy && Object.keys(rows).length > 0 && (
        <div className="mt-6 space-y-4">
          {recordings.filter((r) => rows[r.callId]).map((r) => {
            const row = rows[r.callId];
            const messages = row.data?.messages || [];
            const text = row.data?.fullText || '';
            return (
              <div key={r.callId} className="form-card">
                <ReportHeader r={r} />
                {row.error && <div className="mt-2 text-xs text-red-500">⚠ {row.error}</div>}
                {!row.error && messages.length === 0 && !text && (
                  <div className="mt-2 text-xs text-mute">Transcript is empty.</div>
                )}
                {!row.error && messages.length > 0 && (
                  <ol className="mt-3 space-y-1.5 text-sm">
                    {messages.map((m, i) => {
                      const speaker = m.speaker || m.role || 'speaker';
                      const isAgent = /agent|assistant|ai|bot/i.test(speaker);
                      return (
                        <li key={i} className="flex gap-3">
                          <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold mt-1 ${
                            isAgent ? 'text-lime-600' : 'text-lime-600'
                          }`}>
                            {isAgent ? 'Agent' : 'Caller'}
                          </span>
                          <span className="text-slate-700">{m.text || m.content || ''}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'summaries' && !busy && Object.keys(rows).length > 0 && (
        <div className="mt-6 space-y-4">
          {recordings.filter((r) => rows[r.callId]).map((r) => {
            const row = rows[r.callId];
            const ai = row.data?.aiSummary;
            return (
              <div key={r.callId} className="form-card">
                <ReportHeader r={r} sentiment={ai?.sentiment} />
                {row.error && <div className="mt-2 text-xs text-red-500">⚠ {row.error}</div>}
                {!row.error && !ai && (
                  <div className="mt-2 text-xs text-mute">Summary not available.</div>
                )}
                {!row.error && ai && ai.error && (
                  <div className="mt-2 text-xs text-amber-600">⚠ {ai.error}</div>
                )}
                {!row.error && ai && !ai.error && (
                  <div className="mt-3 space-y-3 text-sm">
                    {ai.gist && (
                      <p className="text-slate-900 font-medium leading-relaxed">{ai.gist}</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      {ai.intent && (
                        <div>
                          <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Caller intent</div>
                          <div className="text-slate-700">{ai.intent}</div>
                        </div>
                      )}
                      {ai.outcome && (
                        <div>
                          <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Outcome</div>
                          <div className="text-slate-700">{ai.outcome}</div>
                        </div>
                      )}
                    </div>
                    {Array.isArray(ai.topics) && ai.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ai.topics.map((t, i) => (
                          <span key={i} className="pill bg-lime-100 text-lime-700 text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(ai.actionItems) && ai.actionItems.length > 0 && (
                      <div>
                        <div className="text-xs text-mute font-semibold uppercase tracking-wider mb-1">Follow-ups</div>
                        <ul className="space-y-1 text-sm text-slate-700">
                          {ai.actionItems.map((a, i) => (
                            <li key={i} className="flex gap-2"><span className="text-amber-500 shrink-0">→</span><span>{a}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportHeader({ r, sentiment }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-mute">{r.startTime ? new Date(r.startTime).toLocaleString() : ''}</span>
      <span className="text-slate-500">·</span>
      <span className="font-mono text-slate-700">
        {fmtNumber(r.from)} <span className="text-mute">→</span> {fmtNumber(r.to)}
      </span>
      {fmtDuration(r.duration) && (
        <>
          <span className="text-slate-500">·</span>
          <span className="text-mute">{fmtDuration(r.duration)}</span>
        </>
      )}
      {sentiment && (
        <span className={`pill text-xs ml-auto ${
          sentiment === 'positive' ? 'bg-lime-100 text-lime-700'
          : sentiment === 'negative' ? 'bg-red-100 text-red-700'
          : 'bg-slate-100 text-slate-700'
        }`}>
          {sentiment}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// SummaryPanel — AI-generated summary for a single recording. Lazy-loaded by
// the parent via toggleSummary() which fetches /api/recordings/:callId/summary.
// =============================================================================
function SummaryPanel({ state }) {
  if (state.loading) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-mute">
        Loading summary…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-red-500">
        ⚠ {state.error}
      </div>
    );
  }
  const d = state.data;
  if (!d) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-4 space-y-5">
      {/* AI summary card — top of the panel */}
      {d.aiSummary && !d.aiSummary.error && (
        <div className="rounded-xl border border-lime-200 bg-gradient-to-br from-lime-50 to-purple-50/40 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-lime-700 flex items-center gap-1.5">
              ✨ AI summary
            </div>
            {d.aiSummary.sentiment && (
              <span className={`pill text-xs ${
                d.aiSummary.sentiment === 'positive' ? 'bg-lime-100 text-lime-700'
                : d.aiSummary.sentiment === 'negative' ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
              }`}>
                {d.aiSummary.sentiment}
              </span>
            )}
          </div>
          {d.aiSummary.gist && (
            <p className="text-sm text-slate-900 font-medium leading-relaxed">
              {d.aiSummary.gist}
            </p>
          )}
          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
            {d.aiSummary.intent && (
              <div>
                <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Caller intent</div>
                <div className="text-slate-700">{d.aiSummary.intent}</div>
              </div>
            )}
            {d.aiSummary.outcome && (
              <div>
                <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Outcome</div>
                <div className="text-slate-700">{d.aiSummary.outcome}</div>
              </div>
            )}
          </div>
          {Array.isArray(d.aiSummary.topics) && d.aiSummary.topics.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-mute font-semibold uppercase tracking-wider mb-1">Topics</div>
              <div className="flex flex-wrap gap-1.5">
                {d.aiSummary.topics.map((t, i) => (
                  <span key={i} className="pill bg-white border border-slate-200 text-slate-700 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(d.aiSummary.actionItems) && d.aiSummary.actionItems.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-mute font-semibold uppercase tracking-wider mb-1">Follow-ups</div>
              <ul className="space-y-1 text-sm text-slate-700">
                {d.aiSummary.actionItems.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500 shrink-0">→</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {d.aiSummary?.error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠ AI summary unavailable: {d.aiSummary.error}
        </div>
      )}
    </div>
  );
}
