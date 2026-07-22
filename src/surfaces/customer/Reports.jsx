import { useEffect, useMemo, useState } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { api, getToken } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import DateRangePicker from '../../components/DateRangePicker.jsx';
import ChatLogRow from '../../components/ChatLogRow.jsx';
import SearchIcon from '../../components/SearchIcon.jsx';
import { buildMockChatSessions } from '../../utils/mockChatLogs.js';
import { buildMockCallRecordings } from '../../utils/mockCallLogs.js';

const digitsOnly = (s) => String(s || '').replace(/\D+/g, '');

const fmtNumber = (s) => {
  if (!s) return '—';
  const m = String(s).match(/sip:([^@;]+)/);
  return m ? m[1] : s;
};

const fmtDuration = (s) => {
  if (!s) return '—';
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

// Default range for this page — "Last 7 days" rather than the shared
// "today" default, so the log lands showing a week of activity like the
// reference report view.
const last7Range = () => {
  const to = new Date(); to.setHours(0, 0, 0, 0);
  const from = new Date(to); from.setDate(to.getDate() - 6);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: ymd(from), to: ymd(to) };
};

// Builds a CSV blob from the filtered rows and triggers a browser download —
// no server endpoint needed since everything shown is already client-side.
const downloadCsv = (rows) => {
  const header = ['Start time', 'Direction', 'From', 'To', 'Duration (s)', 'Agent', 'Has transcript', 'Has recording'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    const cells = [
      r.startTime || '',
      fmtDirection(r.direction),
      fmtNumber(r.from),
      fmtNumber(r.to),
      r.duration ?? '',
      r.agentName || '',
      r.hasTranscript ? 'yes' : 'no',
      r.audioUrl ? 'yes' : 'no',
    ];
    lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const { currentUser } = useApp();
  const [recordings, setRecordings] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [filterNumber, setFilterNumber] = useState('all');
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(() => last7Range());
  const [inboundSearch, setInboundSearch] = useState('');

  // "Call Logs" vs "Chat Logs" — chat sessions aren't wired up on this
  // portal yet, so that tab is present (matching the reference layout) but
  // inert until a chat-log API exists.
  const [logsTab, setLogsTab] = useState('call');
  // Within Call Logs: "recording" shows the audio player per row, like the
  // Recordings page; "transcript" shows the Transcript/Summary buttons.
  const [viewTab, setViewTab] = useState('recording');

  // Per-call lazy-loaded state.
  const [transcripts, setTranscripts] = useState({});
  const [summaries, setSummaries] = useState({});
  const [audioErrors, setAudioErrors] = useState({});

  // Chat Logs — placeholder data (see utils/mockChatLogs.js): this portal
  // doesn't have a website chat widget backend yet, so the tab shows demo
  // rows in the same shape a real /api/chat-logs response would return.
  const [chatSessions] = useState(() => buildMockChatSessions());
  const [openChats, setOpenChats] = useState({});

  // Call Logs demo fallback — only shown when the real /api/recordings call
  // fails (no backend running, expired session, etc.) so there's something
  // to click through — including a real playable/downloadable recording —
  // while testing without a live backend. Never shown when the API succeeds
  // with a genuinely empty list; that's a real "no calls yet" state.
  const [mockCallRecordings] = useState(() => buildMockCallRecordings());

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

  const usingMockRecordings = !!err && (!recordings || recordings.length === 0);
  const effectiveRecordings = usingMockRecordings ? mockCallRecordings : (recordings || []);

  const filteredRecordings = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const toTs   = dateTo   ? new Date(dateTo   + 'T23:59:59.999').getTime() : Infinity;
    const search = inboundSearch.replace(/\D+/g, '');
    return effectiveRecordings.filter((r) => {
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
  }, [effectiveRecordings, filterNumber, dateFrom, dateTo, inboundSearch]);

  const filteredChats = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
    const toTs   = dateTo   ? new Date(dateTo   + 'T23:59:59.999').getTime() : Infinity;
    const search = inboundSearch.trim().toLowerCase();
    return chatSessions.filter((s) => {
      const ts = s.startTime ? new Date(s.startTime).getTime() : 0;
      if (ts < fromTs || ts > toTs) return false;
      if (search && !s.sessionId.toLowerCase().includes(search) && !s.agentName.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [chatSessions, dateFrom, dateTo, inboundSearch]);

  const filtersActive = filterNumber !== 'all' || dateFrom || dateTo || inboundSearch;
  const clearFilters = () => {
    setFilterNumber('all'); setRange({ from: '', to: '' }); setInboundSearch('');
  };
  const toggleChat = (id) => setOpenChats((m) => ({ ...m, [id]: !m[id] }));

  const toggleTranscript = async (callId) => {
    const existing = transcripts[callId];
    if (existing && (existing.messages || existing.error)) {
      setTranscripts((t) => ({ ...t, [callId]: { ...existing, open: !existing.open } }));
      return;
    }
    // Mock demo rows carry their transcript locally — no network call.
    if (callId.startsWith('mock-call-')) {
      const mock = mockCallRecordings.find((r) => r.callId === callId);
      setTranscripts((t) => ({
        ...t, [callId]: { loading: false, open: true, messages: mock?.transcript || [], fullText: '' },
      }));
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
    // Mock demo rows carry their summary locally — no network call.
    if (callId.startsWith('mock-call-')) {
      const mock = mockCallRecordings.find((r) => r.callId === callId);
      setSummaries((s) => ({
        ...s, [callId]: { loading: false, open: true, data: { aiSummary: mock?.summary || null } },
      }));
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
      {/* Icon + "Reports" title now live in the sticky top bar instead of here. */}
      <p className="text-base font-semibold tracking-wide animate-fade-up" style={{ color: 'var(--ink-2)' }}>
        Call and chat history — recordings, transcripts, and AI summaries per record.
      </p>

      {err && (
        <div className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {err}
          {usingMockRecordings && ' — showing demo call data below so you can try the UI.'}
        </div>
      )}

      <div className="mt-5 grid lg:grid-cols-[1fr_260px] gap-5 items-start">
        {/* ============ MAIN COLUMN ============ */}
        <div className="min-w-0 space-y-5">
          <div className="form-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {logsTab === 'call' ? 'Call Logs' : 'Chat Logs'}
                </h2>
                <span className="pill bg-slate-100 text-slate-700">
                  {logsTab === 'call' ? filteredRecordings.length : filteredChats.length}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode={logsTab === 'call' ? 'tel' : 'text'}
                    placeholder={logsTab === 'call' ? 'Search by number' : 'Search by session or agent'}
                    className="input text-sm py-1.5 pl-9 w-44"
                    value={inboundSearch}
                    onChange={(e) => setInboundSearch(e.target.value)}
                  />
                </div>
                <button
                  className="btn-ghost text-xs py-1.5 px-3"
                  onClick={() => downloadCsv(logsTab === 'call' ? filteredRecordings : filteredChats)}
                >
                  ⬇ Export
                </button>
                <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => load({ force: true })} disabled={loading}>
                  {loading ? 'Loading…' : '↻ Refresh'}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <DateRangePicker
                from={dateFrom}
                to={dateTo}
                onChange={({ from, to }) => setRange({ from, to })}
                accent="green"
              />
            </div>

            {logsTab === 'call' && numbers.length > 1 && (
              <div className="mt-3 max-w-xs">
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

            <div className="mt-3 flex items-center gap-3 text-xs text-mute">
              <span>
                <strong className="text-slate-900">
                  {logsTab === 'call' ? filteredRecordings.length : filteredChats.length}
                </strong>{' '}
                of {logsTab === 'call' ? effectiveRecordings.length : chatSessions.length}{' '}
                {logsTab === 'call' ? 'calls' : 'chats'}
              </span>
              {filtersActive && (
                <button onClick={clearFilters} className="text-lime-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Recording / Transcript sub-tabs — call logs only; chat sessions
              are text-only so there's no recording view. Sits outside the
              filter card as its own row, not nested inside it. */}
          {logsTab === 'call' && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex rounded-full border border-slate-200 overflow-hidden">
                <button
                  className={`px-5 py-2 text-sm font-semibold transition ${
                    viewTab === 'recording' ? 'bg-[#3a5a0c] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setViewTab('recording')}
                >
                  Recording
                </button>
                <button
                  className={`px-5 py-2 text-sm font-semibold transition ${
                    viewTab === 'transcript' ? 'bg-[#3a5a0c] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setViewTab('transcript')}
                >
                  Transcript
                </button>
              </div>
              <span className="text-xs text-mute">
                {viewTab === 'recording' ? 'Listen back to any recorded call.' : "Open any call's transcript and AI summary."}
              </span>
            </div>
          )}

          {logsTab === 'chat' ? (
            /* Chat list — placeholder rows, see utils/mockChatLogs.js */
            <div className="space-y-3">
              {filteredChats.length === 0 && (
                <div className="form-card text-center text-mute">
                  No chats match the current filter.
                </div>
              )}
              {filteredChats.map((s) => (
                <ChatLogRow key={s.id} session={s} open={!!openChats[s.id]} onToggle={() => toggleChat(s.id)} />
              ))}
            </div>
          ) : (
          <>
          {/* Call list */}
          <div className="space-y-3">
            {loading && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="form-card animate-pulse">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 bg-slate-200 rounded" />
                        <div className="h-4 w-2/3 bg-slate-200 rounded" />
                        <div className="h-2 w-1/4 bg-slate-200 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-7 w-28 bg-slate-200 rounded" />
                        <div className="h-7 w-28 bg-slate-200 rounded" />
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
            {!loading && filteredRecordings.map((r) => {
              const t = transcripts[r.callId];
              const s = summaries[r.callId];
              const transcriptOpen = t?.open;
              const summaryOpen = s?.open;
              return (
                <div key={r.callId} className="form-card !p-4">
                  {/* Row header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-mute">{fmtTime(r.startTime)}</span>
                        <span className={`pill text-xs ${fmtDirection(r.direction) === 'Inbound' ? 'bg-blue-50 text-blue-700' : fmtDirection(r.direction) === 'Outbound' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{fmtDirection(r.direction)}</span>
                        {r.hasTranscript ? (
                          <span className="pill bg-[#3a5a0c] text-white text-xs">Transcript available</span>
                        ) : (
                          <span className="pill bg-[#98FB98] text-black text-xs">No transcript</span>
                        )}
                        {viewTab === 'recording' && (
                          r.audioUrl ? (
                            <span className="pill bg-teal-100 text-teal-700 text-xs ml-auto">recording</span>
                          ) : (
                            <span className="pill bg-orange-50 text-black text-xs ml-auto">no recording</span>
                          )
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

                    {viewTab === 'transcript' && (
                      <div className="flex flex-col items-end gap-2">
                        <button
                          className="btn-ghost text-xs py-1.5 px-3"
                          onClick={() => toggleTranscript(r.callId)}
                          disabled={!r.hasTranscript}
                          title={r.hasTranscript ? '' : 'No transcript for this call'}
                        >
                          {t?.loading ? 'Loading…' : transcriptOpen ? 'Hide transcript ▲' : 'Transcript'}
                        </button>
                        <button
                          className="btn-ghost text-xs py-1.5 px-3"
                          onClick={() => toggleSummary(r.callId)}
                        >
                          {s?.loading ? 'Loading…' : summaryOpen ? 'Hide summary ▲' : 'Summary'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recording tab — inline audio player */}
                  {viewTab === 'recording' && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="text-xs font-semibold text-mute uppercase tracking-wider mb-2">Recording</div>
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
                          <div className="flex items-center gap-3 flex-wrap">
                            <audio
                              controls
                              preload="none"
                              className="w-full max-w-xl h-9"
                              src={r.audioUrl.startsWith('/api/') ? `${r.audioUrl}?token=${encodeURIComponent(getToken())}` : r.audioUrl}
                              onError={() => setAudioErrors((m) => ({ ...m, [r.callId]: true }))}
                            >
                              Your browser can&apos;t play this recording.
                            </audio>
                            <div className="flex items-center gap-3 text-xs text-mute">
                              {r.audioSize && <span>{(r.audioSize / 1024 / 1024).toFixed(2)} MB</span>}
                              <a
                                href={r.audioUrl.startsWith('/api/') ? `${r.audioUrl}?token=${encodeURIComponent(getToken())}&download=1` : r.audioUrl}
                                download={r.audioFilename || `recording-${r.callId}.mp4`}
                                className="text-lime-600 hover:underline"
                              >
                                ⬇ Download
                              </a>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-mute">No recording available for this call.</div>
                      )}
                    </div>
                  )}

                  {/* Transcript expansion */}
                  {viewTab === 'transcript' && transcriptOpen && (
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
                                <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold mt-1 text-lime-600">
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
                  {viewTab === 'transcript' && summaryOpen && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-mute uppercase tracking-wider">AI summary</div>
                        {s.data?.aiSummary?.sentiment && (
                          <span className={`pill text-xs ${
                            s.data.aiSummary.sentiment === 'positive' ? 'bg-lime-100 text-lime-700'
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
                                <span key={i} className="pill bg-lime-100 text-lime-700 text-xs">{tp}</span>
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
        </>
        )}
        </div>

        {/* ============ SIDEBAR ============ */}
        <div className="space-y-4">
          <div className="form-card !p-3 space-y-1">
            <button
              className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition ${
                logsTab === 'call' ? 'bg-[rgba(77,124,15,0.08)] text-[#3a5a0c] font-bold' : 'text-slate-600 font-medium hover:bg-slate-50'
              }`}
              onClick={() => setLogsTab('call')}
            >
              <Phone className="w-4 h-4 shrink-0" />
              Call Logs
            </button>
            <button
              className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition ${
                logsTab === 'chat' ? 'bg-[rgba(77,124,15,0.08)] text-[#3a5a0c] font-bold' : 'text-slate-600 font-medium hover:bg-slate-50'
              }`}
              onClick={() => setLogsTab('chat')}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              Chat Logs
            </button>
          </div>

          <div className="form-card !p-4">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
              ⓘ Logs overview
            </div>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              A complete record of every conversation your agents handled — voice calls and
              website chats alike. Each entry keeps the full <strong>transcript</strong>, the AI{' '}
              <strong>summary</strong>, the call <strong>recording</strong>, exact timestamps,
              duration, and the reason the session ended. Use the filters and search to find a
              specific call or chat, expand any row to read what was said, and export the results
              to CSV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
