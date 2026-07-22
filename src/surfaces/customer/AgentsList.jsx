import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, MessageCircle, Copy, Check, FileText, ArrowDownLeft, Circle, Search, Filter, ChevronDown,
  Mic, LayoutGrid,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

// Sample voice agent shown only when /api/numbers returns nothing (no DB
// connected yet) — same "never overrides real data" rule as Overview.jsx.
const DEMO_NUMBERS = [
  {
    id: 'demo-1',
    value: '+27 82 555 0148',
    agentName: 'KallUS Agent',
    agentId: 'ce39a935-71e2-4b8a-9c2d-1a7f6e0b3d21',
    status: 'ready',
    provisionedAt: new Date('2026-07-16T13:19:00').toISOString(),
  },
];

// This account only ever has one real (voice) agent type today — there is no
// chat-agent feature in the backend. This single row is an explicit product
// preview, not live data, and is labeled as such everywhere it appears.
const PREVIEW_CHAT_AGENT = {
  id: 'preview-chat',
  name: 'My Agent',
  agentId: 'a0f48513-2c6d-4f11-8b9a-5e3c1d7f4a09',
  type: 'chat',
  status: 'enabled',
};

function StatusPill({ status }) {
  const map = {
    ready:         { label: 'Live',       cls: 'bg-lime-100 text-lime-700', filled: true },
    in_progress:   { label: 'Setting up', cls: 'bg-amber-100 text-amber-700', filled: true },
    failed:        { label: 'Failed',     cls: 'bg-red-100 text-red-700', filled: true },
    unprovisioned: { label: 'Not live',   cls: '', filled: false },
    enabled:       { label: 'Enabled',    cls: 'bg-lime-100 text-lime-700', filled: true },
  };
  const s = map[status] || map.unprovisioned;
  return (
    <span className={`pill ${s.cls}`} style={!s.cls ? { background: 'var(--line-2)', color: 'var(--ink-3)' } : undefined}>
      <Circle size={8} fill={s.filled ? 'currentColor' : 'none'} /> {s.label}
    </span>
  );
}

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  const short = id.length > 8 ? `${id.slice(0, 8)}…` : id;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(id).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }).catch(() => {});
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-mute hover:text-[var(--ink)]"
      title="Copy agent ID"
    >
      {short} {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

const TYPE_OPTIONS = [
  { value: 'all',     label: 'All types' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'chat',    label: 'Chat' },
];

// "Voice Agent" is the only option backed by a real provisioning flow — it
// routes to acquiring a new number. Chat Agent / Browse Templates still
// aren't real *creation* flows (no chat-agent or template system exists in
// the backend), but each now opens a real, honestly-labeled preview page
// instead of just showing a toast — Chat Agent opens the chat widget
// config preview, Browse Templates opens the template gallery preview.
const NEW_AGENT_OPTIONS = [
  {
    id: 'voice',
    Icon: Mic,
    title: 'Voice Agent',
    desc: 'For phone calls and voice interactions.',
    preview: false,
  },
  {
    id: 'chat',
    Icon: MessageCircle,
    title: 'Chat Agent',
    desc: 'For website messaging and live chats.',
    preview: true,
  },
  {
    id: 'templates',
    Icon: LayoutGrid,
    title: 'Browse Templates',
    desc: 'Start from a saved knowledge base.',
    preview: true,
  },
];

function NewAgentMenu({ onCreateVoice, onOpenChat, onOpenTemplates }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handlers = { voice: onCreateVoice, chat: onOpenChat, templates: onOpenTemplates };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-teal text-sm whitespace-nowrap"
        title="Create a new agent"
      >
        + New Agent
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 p-1.5">
          {NEW_AGENT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { setOpen(false); handlers[o.id]?.(); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[var(--surface-2)]"
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <o.Icon size={16} style={{ color: 'var(--primary)' }} />
              </span>
              <span className="min-w-0">
                <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{o.title}</span>
                <span className="block text-xs text-mute mt-0.5">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = TYPE_OPTIONS.find((o) => o.value === value) || TYPE_OPTIONS[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center gap-2"
        style={{ width: 160 }}
      >
        <Filter size={14} className="text-mute" />
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown size={14} className="text-mute" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 py-1"
        >
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
              style={o.value === value ? { color: 'var(--primary)', fontWeight: 700 } : { color: 'var(--ink-2)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentsList() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | inbound | chat

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api('/api/numbers');
        if (!cancelled) setNumbers(r.numbers || []);
      } catch {}
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!currentUser) return null;

  const isAdminTier = currentUser.userType === 'superadmin' || currentUser.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  const demoMode = loaded && numbers.length === 0;
  const voiceAgents = demoMode ? DEMO_NUMBERS : numbers;

  const rows = useMemo(() => {
    const voice = voiceAgents.map((n) => ({
      id: n.id,
      name: n.agentName || n.label || 'Unnamed agent',
      agentId: n.agentId || n.id,
      type: 'inbound',
      status: n.status || 'unprovisioned',
      phone: n.value || '—',
      lastEdited: n.provisionedAt || n.createdAt || null,
    }));
    const chat = [{
      id: PREVIEW_CHAT_AGENT.id,
      name: PREVIEW_CHAT_AGENT.name,
      agentId: PREVIEW_CHAT_AGENT.agentId,
      type: 'chat',
      status: PREVIEW_CHAT_AGENT.status,
      phone: null,
      lastEdited: null,
      preview: true,
    }];
    return [...voice, ...chat]
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return r.name.toLowerCase().includes(q) || r.agentId.toLowerCase().includes(q) || (r.phone || '').includes(q);
      });
  }, [voiceAgents, typeFilter, query]);

  return (
    <div>
      {/* Icon + "My Agents" title now live in the sticky top bar instead of
          here. This row keeps just the search + new-agent controls, pinned
          right since the icon+title sibling that used to balance it is gone. */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
            <input
              className="input"
              style={{ width: 260, paddingLeft: 32 }}
              placeholder="Search by name, ID, or number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <NewAgentMenu
            onCreateVoice={() => navigate(`${basePath}/numbers`)}
            onOpenChat={() => navigate(`${basePath}/agent-detail-chat?n=${encodeURIComponent(PREVIEW_CHAT_AGENT.id)}`)}
            onOpenTemplates={() => navigate(`${basePath}/templates`)}
          />
        </div>
      </div>

      <div className="mt-4">
        <TypeFilterDropdown value={typeFilter} onChange={setTypeFilter} />
      </div>

      <div className="mt-4 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Agent ID</th>
              <th>Editing mode</th>
              <th>Type</th>
              <th>Status</th>
              <th>Phone number</th>
              <th>Last edited</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-mute py-8">No agents match your search.</td></tr>
            )}
            {rows.map((r) => {
              const detailPath = r.type === 'chat' ? 'agent-detail-chat' : 'agent-detail';
              const openRow = () => navigate(`${basePath}/${detailPath}?n=${encodeURIComponent(r.id)}`);
              return (
              <tr
                key={r.id}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                onClick={openRow}
                onKeyDown={(e) => { if (e.key === 'Enter') openRow(); }}
              >
                <td>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                      {r.type === 'chat' ? <MessageCircle size={16} /> : <Phone size={16} />}
                    </span>
                    <span className="font-semibold">{r.name}</span>
                    {r.preview && (
                      <span className="pill text-[9px]" style={{ background: 'var(--line-2)', color: 'var(--ink-3)' }}>
                        preview
                      </span>
                    )}
                  </div>
                </td>
                <td><CopyId id={r.agentId} /></td>
                <td>
                  <span className="pill" style={{ background: 'var(--line-2)', color: 'var(--ink-2)' }}>
                    <FileText size={12} /> Prompt
                  </span>
                </td>
                <td>
                  {r.type === 'chat' ? (
                    <span className="pill" style={{ background: 'var(--line-2)', color: 'var(--ink-3)' }}>
                      <MessageCircle size={12} /> Chat
                    </span>
                  ) : (
                    <span className="pill bg-lime-100 text-lime-700">
                      <ArrowDownLeft size={12} /> Inbound
                    </span>
                  )}
                </td>
                <td><StatusPill status={r.status} /></td>
                <td className="font-mono text-xs whitespace-nowrap">{r.phone || '—'}</td>
                <td className="text-mute text-xs whitespace-nowrap">{r.lastEdited ? fmtDateTime(r.lastEdited) : '—'}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-mute">
        Voice and chat agents live here together. Click an agent to configure it.
        {' '}Chat agents are a preview — only inbound voice agents are live today.
      </p>
    </div>
  );
}
