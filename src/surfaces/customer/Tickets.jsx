import { useMemo, useState } from 'react';
import { Search, Clock, RefreshCw, Plus, Phone, User, IdCardLanyard, ChevronRight, X } from 'lucide-react';

// =============================================================================
// Tickets — issues the AI agent captured on calls, or filed manually.
//
// No backend yet: this renders anonymized sample tickets (clearly fake
// names/phones) so the page demonstrates its full layout — filter chips,
// search, SLA/overdue tracking, New ticket form — entirely in local state.
// Wire this up to a real /api/tickets endpoint once one exists; the shape
// below (status/priority/category/caller/agent/timestamps) is what that
// endpoint should return.
// =============================================================================

const STATUS_META = {
  open:        { label: 'Open',        dot: 'bg-amber-400',   pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  in_progress: { label: 'In progress', dot: 'bg-sky-400',     pill: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  resolved:    { label: 'Resolved',    dot: 'bg-emerald-400', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  closed:      { label: 'Closed',      dot: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

const DEMO_TICKETS = [
  {
    id: 'TKT-2026-0042',
    subject: 'Request for callback due to service delay',
    description: 'Caller expressed strong dissatisfaction with the wait time for support.',
    status: 'open',
    priority: 'Normal',
    category: 'Callback request',
    callerName: '',
    callerPhone: '+10000000011',
    agentName: 'Sample Agent',
    createdAt: hoursAgo(71),
    updatedAt: hoursAgo(48),
  },
  {
    id: 'TKT-2026-0039',
    subject: 'Portal link not opening with 401 error',
    description: 'Caller reports the portal link is not opening, seeing a 401 error.',
    status: 'open',
    priority: 'Normal',
    category: 'Callback request',
    callerName: 'Sample Caller A',
    callerPhone: '+10000000012',
    agentName: 'Sample Agent',
    createdAt: hoursAgo(173),
    updatedAt: hoursAgo(24),
  },
  {
    id: 'TKT-2026-0038',
    subject: 'Issue accessing services',
    description: '',
    status: 'resolved',
    priority: 'Normal',
    category: '',
    callerName: 'Sample Caller B',
    callerPhone: '+10000000013',
    agentName: 'Sample Agent',
    createdAt: hoursAgo(220),
    updatedAt: hoursAgo(216),
  },
  {
    id: 'TKT-2026-0034',
    subject: 'Pothole complaint on highway ramp',
    description: 'Reported a road hazard on the highway ramp just before the signal.',
    status: 'in_progress',
    priority: 'Normal',
    category: '',
    callerName: 'Sample Caller C',
    callerPhone: '+10000000014',
    agentName: 'Sample Agent',
    createdAt: hoursAgo(191),
    updatedAt: hoursAgo(190),
  },
];

const FILTERS = [
  { key: 'all',         label: 'All',          dot: 'bg-slate-400',   text: 'text-slate-900 dark:text-slate-100' },
  { key: 'open',        label: 'Open',         dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
  { key: 'in_progress', label: 'In progress',  dot: 'bg-sky-400',     text: 'text-sky-600 dark:text-sky-400' },
  { key: 'resolved',    label: 'Resolved',     dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'closed',      label: 'Closed',       dot: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-400' },
  { key: 'overdue',     label: 'Overdue',      dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400' },
];

const fmtUpdated = (iso) => {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 1) return 'just now';
  if (diffH < 72) return `${Math.floor(diffH / 24) || 1}d ago`;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const overdueHours = (t, slaHours) => {
  if (t.status === 'resolved' || t.status === 'closed') return 0;
  const ageH = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
  return Math.max(0, Math.floor(ageH - slaHours));
};

export default function Tickets() {
  const [tickets, setTickets] = useState(DEMO_TICKETS);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [slaHours, setSlaHours] = useState(3);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaDraft, setSlaDraft] = useState(String(slaHours));
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', callerName: '', callerPhone: '', category: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [openTicket, setOpenTicket] = useState(null);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, in_progress: 0, resolved: 0, closed: 0, overdue: 0 };
    tickets.forEach((t) => {
      c[t.status] = (c[t.status] || 0) + 1;
      if (overdueHours(t, slaHours) > 0) c.overdue += 1;
    });
    return c;
  }, [tickets, slaHours]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter === 'overdue') list = list.filter((t) => overdueHours(t, slaHours) > 0);
    else if (filter !== 'all') list = list.filter((t) => t.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => [t.id, t.subject, t.callerName, t.callerPhone]
        .some((f) => (f || '').toLowerCase().includes(q)));
    }
    return list;
  }, [tickets, filter, search, slaHours]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const nextTicketId = () => {
    const n = tickets.length + 43;
    return `TKT-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
  };

  const submitNewTicket = (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    const now = new Date().toISOString();
    setTickets((prev) => [{
      id: nextTicketId(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      status: 'open',
      priority: 'Normal',
      category: form.category.trim(),
      callerName: form.callerName.trim(),
      callerPhone: form.callerPhone.trim(),
      agentName: '— filed manually —',
      createdAt: now,
      updatedAt: now,
    }, ...prev]);
    setForm({ subject: '', description: '', callerName: '', callerPhone: '', category: '' });
    setNewTicketOpen(false);
    setFilter('all');
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tickets</h1>
        <p className="text-mute">
          Issues your AI agent captured on calls — or filed manually. Resolution target{' '}
          <button onClick={() => { setSlaDraft(String(slaHours)); setSlaModalOpen(true); }} className="text-lime-600 dark:text-lime-400 font-semibold underline decoration-dotted underline-offset-2">
            {slaHours}h
          </button>.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button onClick={() => { setSlaDraft(String(slaHours)); setSlaModalOpen(true); }} className="btn-ghost text-sm inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> SLA
        </button>
        <button onClick={refresh} disabled={refreshing} className="btn-ghost text-sm inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
        <button onClick={() => setNewTicketOpen(true)} className="btn-teal text-sm inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New ticket
        </button>
      </div>

      {/* Status filter chips */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`form-card text-left relative p-4 transition ${
              filter === f.key
                ? 'border-sky-400 ring-2 ring-sky-500/25'
                : 'hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${f.dot}`} />
            <div className={`text-2xl font-bold ${f.text}`}>{counts[f.key] ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mt-0.5">{f.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          className="input pl-10"
          placeholder="Search ticket #, subject, caller name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Ticket table */}
      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Caller</th>
              <th>Agent</th>
              <th>Updated</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-mute py-8">No tickets match this filter.</td></tr>
            )}
            {filtered.map((t) => {
              const over = overdueHours(t, slaHours);
              const meta = STATUS_META[t.status] || STATUS_META.open;
              return (
                <tr
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className={`cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${over > 0 ? 'bg-red-50/40 dark:bg-red-500/5' : ''}`}
                >
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      {t.id}
                    </div>
                    {over > 0 && (
                      <span className="mt-1 inline-flex items-center whitespace-nowrap pill bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-[10px]">
                        <Clock className="w-3 h-3" /> {over}h over
                      </span>
                    )}
                  </td>
                  <td className="max-w-[260px]">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{t.subject}</div>
                    {t.description && <div className="text-xs text-mute truncate">{t.description}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`pill text-xs ${meta.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="text-sm text-mute whitespace-nowrap">{t.priority}</td>
                  <td className="whitespace-nowrap">{t.category ? <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">{t.category}</span> : <span className="text-mute">—</span>}</td>
                  <td className="text-sm">
                    {t.callerName && (
                      <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <User className="w-3.5 h-3.5 text-mute" /> {t.callerName}
                      </div>
                    )}
                    {t.callerPhone && (
                      <div className="flex items-center gap-1.5 text-mute font-mono text-xs mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {t.callerPhone.replace(/^\+/, '')}
                      </div>
                    )}
                  </td>
                  <td className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <IdCardLanyard className="w-4 h-4" /> {t.agentName}
                    </div>
                  </td>
                  <td className="text-xs text-mute whitespace-nowrap">{fmtUpdated(t.updatedAt)}</td>
                  <td className="text-mute"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ticket detail modal */}
      {openTicket && (() => {
        const over = overdueHours(openTicket, slaHours);
        const meta = STATUS_META[openTicket.status] || STATUS_META.open;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
            onClick={() => setOpenTicket(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                  {openTicket.id}
                </div>
                <button onClick={() => setOpenTicket(null)} className="text-mute hover:text-slate-900 dark:hover:text-slate-100"><X className="w-4 h-4" /></button>
              </div>

              <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{openTicket.subject}</h2>
              {openTicket.description && <p className="mt-1 text-sm text-mute">{openTicket.description}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`pill text-xs ${meta.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                  {meta.label}
                </span>
                {openTicket.category && (
                  <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                    {openTicket.category}
                  </span>
                )}
                {over > 0 && (
                  <span className="pill bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-xs">
                    <Clock className="w-3 h-3" /> {over}h over
                  </span>
                )}
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Caller</div>
                  {openTicket.callerName && (
                    <div className="mt-1 flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                      <User className="w-3.5 h-3.5 text-mute" /> {openTicket.callerName}
                    </div>
                  )}
                  {openTicket.callerPhone && (
                    <div className="flex items-center gap-1.5 text-mute font-mono text-xs mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> {openTicket.callerPhone.replace(/^\+/, '')}
                    </div>
                  )}
                  {!openTicket.callerName && !openTicket.callerPhone && <div className="mt-1 text-mute">—</div>}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Agent</div>
                  <div className="mt-1 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <IdCardLanyard className="w-4 h-4" /> {openTicket.agentName}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Priority</div>
                  <div className="mt-1 text-mute">{openTicket.priority}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Updated</div>
                  <div className="mt-1 text-mute">{fmtUpdated(openTicket.updatedAt)}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end">
                <button onClick={() => setOpenTicket(null)} className="btn-ghost text-sm py-2 px-4">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SLA modal */}
      {slaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Resolution target (SLA)</h2>
            <p className="mt-1 text-sm text-mute">Tickets older than this, still open or in progress, are flagged overdue.</p>
            <label className="field-label mt-4">Hours</label>
            <input
              className="input"
              type="number"
              min="1"
              value={slaDraft}
              onChange={(e) => setSlaDraft(e.target.value)}
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setSlaModalOpen(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
              <button
                onClick={() => { setSlaHours(Math.max(1, Number(slaDraft) || 3)); setSlaModalOpen(false); }}
                className="btn-teal text-sm py-2 px-4"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New ticket modal */}
      {newTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <form onSubmit={submitNewTicket} className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New ticket</h2>
            <p className="mt-1 text-sm text-mute">File an issue manually — not tied to a specific call.</p>

            <label className="field-label mt-4">Subject *</label>
            <input className="input" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />

            <label className="field-label mt-3">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Caller name</label>
                <input className="input" value={form.callerName} onChange={(e) => setForm((f) => ({ ...f, callerName: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Caller phone</label>
                <input className="input" value={form.callerPhone} onChange={(e) => setForm((f) => ({ ...f, callerPhone: e.target.value }))} placeholder="+14018677668" />
              </div>
            </div>

            <label className="field-label mt-3">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Callback request" />

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setNewTicketOpen(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
              <button type="submit" className="btn-teal text-sm py-2 px-4">Create ticket</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
