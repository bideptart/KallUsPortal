import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import DateRangePicker, { todayRange } from '../../components/DateRangePicker.jsx';

const digitsOnly = (s) => String(s || '').replace(/\D+/g, '');

const fmtNumber = (s) => {
  if (!s) return '—';
  const m = String(s).match(/sip:([^@;]+)/);
  return m ? m[1] : s;
};

const fmtDuration = (s) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
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
  return isNaN(d.getTime()) ? String(t) : d.toLocaleString();
};

export default function Reports() {
  const { currentUser } = useApp();
  const [recordings, setRecordings] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Same filter triplet as the Recordings page. Default to TODAY so the
  // page lands showing the most recent activity instead of dumping every
  // call ever made.
  const [filterNumber, setFilterNumber] = useState('all');
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(() => todayRange());
  const [inboundSearch, setInboundSearch] = useState('');

  // Per-call lazy-loaded state.
  //   transcripts[callId] = { loading, messages, fullText, error, open }
  //   summaries[callId]   = { loading, data, error, open }
  const [transcripts, setTranscripts] = useState({});
  const [summaries, setSummaries] = useState({});

  const load = async ({ force = false } = {}) => {
    setLoading(true); setErr('');
    try {
      const [recsRes, numbersRes] = await Promise.all([
        api(`/api/recordings?limit=500${force ? '&refresh=1' : ''}`),
        api('/api/numbers').catch(() => ({ numbers: [] })),
      ]);
      setRecordings(recsRes.recordings || []);
      setNumbers(numbersRes.numbers || []);
    } catch (e) {
      setErr(e.message || 'Could not load calls');
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRecordings = useMemo(() => {
    if (!recordings) return [];
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const toTs   = dateTo   ? new Date(dateTo   + 'T23:59:59.999').getTime() : Infinity;
    const search = inboundSearch.replace(/\D+/g, '');
    return recordings.filter((r) => {
      const to = digitsOnly(fmtNumber(r.to));
      const from = digitsOnly(fmtNumber(r.from));
      if (filterNumber !== 'all') {
        const wanted = digitsOnly(filterNumber);
        if (to !== wanted && from !== wanted) return false;
      }
      const ts = r.startTime ? new Date(r.startTime).getTime() : 0;
      if (ts < fromTs || ts > toTs) return false;
      if (search && !from.includes(search) && !to.includes(search)) return false;
      return true;
    });
  }, [recordings, filterNumber, dateFrom, dateTo, inboundSearch]);

  const filtersActive = filterNumber !== 'all' || dateFrom || dateTo || inboundSearch;
  const clearFilters = () => {
    setFilterNumber('all'); setRange({ from: '', to: '' }); setInboundSearch('');
  };

  const toggleTranscript = async (callId) => {
    const existing = transcripts[callId];
    if (existing && (existing.messages || existing.error)) {
      setTranscripts((t) => ({ ...t, [callId]: { ...existing, open: !existing.open } }));
      return;
    }
    setTranscripts((t) => ({ ...t, [callId]: { loading: true, open: true } }));
    try {
      const r = await api(`/api/recordings/${encodeURIComponent(callId)}/transcript`);
      setTranscripts((t) => ({
        ...t,
        [callId]: { loading: false, open: true, messages: r.messages || [], fullText: r.fullText || '' },
      }));
    } catch (e) {
      setTranscripts((t) => ({
        ...t, [callId]: { loading: false, open: true, error: e.message || 'Failed to load' },
      }));
    }
  };

  const toggleSummary = async (callId) => {
    const existing = summaries[callId];
    if (existing && (existing.data || existing.error)) {
      setSummaries((s) => ({ ...s, [callId]: { ...existing, open: !existing.open } }));
      return;
    }
    setSummaries((s) => ({ ...s, [callId]: { loading: true, open: true } }));
    try {
      const data = await api(`/api/recordings/${encodeURIComponent(callId)}/summary`);
      setSummaries((s) => ({ ...s, [callId]: { loading: false, open: true, data } }));
    } catch (e) {
      setSummaries((s) => ({
        ...s, [callId]: { loading: false, open: true, error: e.message || 'Failed to load' },
      }));
    }
  };

  if (!currentUser) return null;

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📑 Reports</h1>
          <p className="text-mute">
            Every recorded call. Click <strong>Transcript</strong> or <strong>Summary</strong>{' '}
            on any row to load that call's text content.
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={() => load({ force: true })} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {err}
        </div>
      )}

      {/* Filter bar */}
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
                {numbers.map((n) => (
                  <option key={n.id} value={n.value}>
                    {n.value} {n.label ? `(${n.label})` : n.isPrimary ? '(primary)' : ''}
                  </option>
                ))}
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
              <strong className="text-slate-900">{filteredRecordings.length}</strong>{' '}
              of {recordings?.length || 0} calls
            </span>
            <button onClick={clearFilters} className="text-sky-600 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Call list — Transcript / Summary buttons per row */}
      <div className="mt-6 space-y-3">
        {loading && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="form-card animate-pulse">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-2 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && filteredRecordings.length === 0 && (
          <div className="form-card text-center text-mute">
            No calls match the current filter.
          </div>
        )}
        {filteredRecordings.map((r) => {
          const t = transcripts[r.callId];
          const s = summaries[r.callId];
          const transcriptOpen = t?.open;
          const summaryOpen = s?.open;
          return (
            <div key={r.callId} className="form-card">
              {/* Row header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-mute">{fmtTime(r.startTime)}</span>
                    <span className="pill bg-slate-100 text-slate-700 text-xs">{fmtDirection(r.direction)}</span>
                    {r.hasTranscript && (
                      <span className="pill bg-teal-100 text-teal-700 text-xs">📝 transcript available</span>
                    )}
                  </div>
                  <div className="mt-2 font-mono text-sm text-slate-900">
                    {fmtNumber(r.from)} <span className="text-mute">→</span> {fmtNumber(r.to)}
                  </div>
                  <div className="mt-1 text-xs text-mute">
                    {fmtDuration(r.duration)}
                    {r.agentName ? ` · ${r.agentName}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="btn-ghost text-xs py-1.5 px-3"
                    onClick={() => toggleTranscript(r.callId)}
                    disabled={!r.hasTranscript}
                    title={r.hasTranscript ? '' : 'No transcript for this call'}
                  >
                    {t?.loading
                      ? 'Loading…'
                      : transcriptOpen
                        ? 'Hide transcript ▲'
                        : '📝 Transcript'}
                  </button>
                  <button
                    className="btn-ghost text-xs py-1.5 px-3"
                    onClick={() => toggleSummary(r.callId)}
                  >
                    {s?.loading
                      ? 'Loading…'
                      : summaryOpen
                        ? 'Hide summary ▲'
                        : '✨ Summary'}
                  </button>
                </div>
              </div>

              {/* Transcript expansion */}
              {transcriptOpen && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-mute uppercase tracking-wider mb-2">Transcript</div>
                  {t.error ? (
                    <div className="text-xs text-red-500">⚠ {t.error}</div>
                  ) : (t.messages?.length === 0 && !t.fullText) ? (
                    <div className="text-xs text-mute">Transcript is empty.</div>
                  ) : (
                    <ol className="space-y-1.5 text-sm">
                      {(t.messages || []).map((m, i) => {
                        const speaker = m.speaker || m.role || 'speaker';
                        const isAgent = /agent|assistant|ai|bot/i.test(speaker);
                        return (
                          <li key={i} className="flex gap-3">
                            <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold mt-1 ${
                              isAgent ? 'text-teal-600' : 'text-sky-600'
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
              )}

              {/* Summary expansion */}
              {summaryOpen && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-mute uppercase tracking-wider">AI summary</div>
                    {s.data?.aiSummary?.sentiment && (
                      <span className={`pill text-xs ${
                        s.data.aiSummary.sentiment === 'positive' ? 'bg-teal-100 text-teal-700'
                        : s.data.aiSummary.sentiment === 'negative' ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.data.aiSummary.sentiment}
                      </span>
                    )}
                  </div>
                  {s.error ? (
                    <div className="text-xs text-red-500">⚠ {s.error}</div>
                  ) : !s.data?.aiSummary ? (
                    <div className="text-xs text-mute">Summary not available for this call.</div>
                  ) : s.data.aiSummary.error ? (
                    <div className="text-xs text-amber-600">⚠ {s.data.aiSummary.error}</div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {s.data.aiSummary.gist && (
                        <p className="text-slate-900 font-medium leading-relaxed">{s.data.aiSummary.gist}</p>
                      )}
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        {s.data.aiSummary.intent && (
                          <div>
                            <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Caller intent</div>
                            <div className="text-slate-700">{s.data.aiSummary.intent}</div>
                          </div>
                        )}
                        {s.data.aiSummary.outcome && (
                          <div>
                            <div className="text-mute font-semibold uppercase tracking-wider mb-0.5">Outcome</div>
                            <div className="text-slate-700">{s.data.aiSummary.outcome}</div>
                          </div>
                        )}
                      </div>
                      {Array.isArray(s.data.aiSummary.topics) && s.data.aiSummary.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.data.aiSummary.topics.map((tp, i) => (
                            <span key={i} className="pill bg-sky-100 text-sky-700 text-xs">{tp}</span>
                          ))}
                        </div>
                      )}
                      {Array.isArray(s.data.aiSummary.actionItems) && s.data.aiSummary.actionItems.length > 0 && (
                        <div>
                          <div className="text-xs text-mute font-semibold uppercase tracking-wider mb-1">Follow-ups</div>
                          <ul className="space-y-1 text-sm text-slate-700">
                            {s.data.aiSummary.actionItems.map((a, i) => (
                              <li key={i} className="flex gap-2"><span className="text-amber-500 shrink-0">→</span><span>{a}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
