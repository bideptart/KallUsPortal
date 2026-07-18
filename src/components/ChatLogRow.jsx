const fmtDuration = (s) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};

const fmtTime = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  return isNaN(d.getTime()) ? String(t) : d.toLocaleString();
};

// One row in the Chat Logs list — mirrors the Call Logs row layout (time,
// badges, right-aligned meta) but for a text chat session: session id
// instead of a from/to number pair, and no recording/audio player since
// chat sessions are text-only.
export default function ChatLogRow({ session, open, onToggle }) {
  const s = session;
  return (
    <div className="form-card">
      <button
        type="button"
        className="w-full flex flex-wrap items-start justify-between gap-3 text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-mute">{open ? '▾' : '▸'}</span>
            <span className="text-mute">{fmtTime(s.startTime)}</span>
            <span className="pill bg-purple-100 text-purple-700 text-xs">🤖 {s.agentName}</span>
            {s.hasTranscript ? (
              <span className="pill bg-lime-100 text-lime-700 text-xs">📝 transcript available</span>
            ) : (
              <span className="pill bg-slate-100 text-slate-500 text-xs">no transcript</span>
            )}
          </div>
          <div className="mt-2 font-mono text-xs text-mute break-all">{s.sessionId}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-slate-900">{fmtDuration(s.duration)}</div>
          <div className="text-xs text-mute">{s.endReason}</div>
        </div>
      </button>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="text-xs font-semibold text-mute uppercase tracking-wider mb-2">Transcript</div>
          {s.transcript.length === 0 ? (
            <div className="text-xs text-mute">Transcript is empty.</div>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {s.transcript.map((m, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold mt-1 text-lime-600">
                    {m.speaker === 'agent' ? 'Agent' : 'Caller'}
                  </span>
                  <span className="text-slate-700">{m.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
