import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import Signups from './Signups.jsx';
import Customers from './Customers.jsx';
import Resellers from './Resellers.jsx';
import Numbers from './Numbers.jsx';
import Payments from './Payments.jsx';
import Bulk from './Bulk.jsx';
import Logs from './Logs.jsx';
import Plans from './Plans.jsx';
import Settings from './Settings.jsx';
import Overview from '../customer/Overview.jsx';
import Logo from '../../components/Logo.jsx';
import TopBar from '../../components/TopBar.jsx';
import Footer from '../../components/Footer.jsx';

// Sidebar nav — unified across Admin/Customer to a common shape. Each entry
// maps onto the closest existing admin page; several concepts here (e.g.
// "Knowledge Base") don't have a dedicated admin screen, so they share a
// page with a nearby entry rather than inventing a new one.
const NAV_TABS = [
  { id: 'overview',     label: '📊 Overview' },
  { id: 'agents',       label: '🤖 Agents' },
  { id: 'playground',   label: '🧪 Playground' },
  { id: 'kb',           label: '📖 Knowledge Base' },
  { id: 'analytics',    label: '📈 Analytics' },
  { id: 'calls',        label: '⚡ Call Activity' },
  { id: 'reports',      label: '📄 Reports' },
  { id: 'billing',      label: '💳 Billing & minutes' },
  { id: 'transactions', label: '🧾 Transactions' },
  { id: 'account',      label: '👤 Account' },
];

// Legacy tab ids from the previous Operations/Reports/Setup layout — kept
// valid (but not shown in the sidebar) so any existing bookmark or deep link
// still resolves to the right page instead of 404ing.
const LEGACY_TABS = [
  { id: 'signups',   label: '🆕 Signups' },
  { id: 'customers', label: '👥 Customers' },
  { id: 'resellers', label: '🏷 Resellers' },
  { id: 'numbers',   label: '☎ Numbers inventory' },
  { id: 'payments',  label: '💳 Payments & revenue' },
  { id: 'bulk',      label: '📦 Bulk import' },
  { id: 'logs',      label: '📋 Activity logs' },
  { id: 'usage',     label: '📊 Usage analytics' },
  { id: 'health',    label: '🩺 System health' },
  { id: 'mcp',       label: '🔌 MCP browser' },
  { id: 'plans',     label: '💎 Plans & pricing' },
  { id: 'settings',  label: '🔌 Settings (credentials)' },
];

const VALID_TABS = new Set([...NAV_TABS, ...LEGACY_TABS].map((t) => t.id));

export default function Admin() {
  const { currentUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { setNavOpen(false); }, [tab]);

  if (!VALID_TABS.has(tab)) return <Navigate to="/admin/overview" replace />;

  const Side = ({ list }) => list.map((t) => (
    <Link
      key={t.id}
      to={`/admin/${t.id}`}
      className={tab === t.id ? 'active' : ''}
    >
      {t.label}
    </Link>
  ));

  const activeLabel = [...NAV_TABS, ...LEGACY_TABS].find((t) => t.id === tab)?.label || '';

  return (
    <div className="dashboard-shell">
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <Link
          to="/admin/overview"
          className="h-16 flex items-center gap-2 px-4 bg-white sticky top-0 z-30"
          aria-label="kallus.io home"
        >
          <Logo size={44} showWordmark={false} />
          <span className="font-mono text-sm lowercase text-mute tracking-tight">kallus.io</span>
        </Link>
        <div className="px-4 pb-3 border-t border-slate-100 pt-3">
          <div className="text-xs text-mute font-semibold uppercase tracking-wider">Admin</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 break-all">{currentUser?.email || ''}</div>
          <span className="pill pill-teal mt-2 inline-block">{currentUser?.role || 'Admin'}</span>
        </div>
        <div className="sidenav-section">Manage</div>
        <Side list={NAV_TABS} />
      </aside>

      <div className="dashboard-main">
        {/* Sticky top bar — same shape + height as the customer dashboard so
            the divider line under the sidebar logo continues across the
            entire page width. TopBar internally hides the Check Balance pill
            for admins (they have no plan), leaving just the user avatar
            dropdown with Sign out. */}
        <div className="sticky top-0 z-30 bg-white -mt-5 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 border-b border-slate-200 mb-6">
          <button
            className="mobile-nav-toggle lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <span>☰</span> Menu
          </button>
          <div className="lg:hidden text-xs text-mute font-semibold uppercase tracking-wider truncate">
            {activeLabel}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {tab === 'overview' && (
              <Link to="/admin/numbers" className="btn-teal text-sm whitespace-nowrap">+ Add plan / number</Link>
            )}
            {tab !== 'overview' && <TopBar />}
          </div>
        </div>

        {/* New nav ids map onto the closest existing page; legacy ids (kept
            valid so old links still work) render the same pages they always
            did. Resellers / Numbers inventory / Plans & pricing have no home
            in the new 10-item nav — still reachable at their legacy URLs.
            'overview' reuses the same Overview component as the Customer
            dashboard (per explicit request — same page for every tier); it
            renders mostly empty states for admin accounts since they don't
            carry their own number/plan/agent. 'signups' keeps the original
            admin landing page reachable at its legacy URL. */}
        {tab === 'overview'                             && <Overview />}
        {tab === 'signups'                              && <Signups />}
        {(tab === 'agents' || tab === 'customers')      && <Customers />}
        {(tab === 'playground' || tab === 'mcp')        && <McpBrowser />}
        {(tab === 'kb' || tab === 'bulk')               && <Bulk />}
        {(tab === 'analytics' || tab === 'usage')       && <Usage />}
        {(tab === 'calls' || tab === 'logs')            && <Logs />}
        {(tab === 'reports' || tab === 'health')        && <Health />}
        {(tab === 'billing' || tab === 'transactions' || tab === 'payments') && <Payments />}
        {(tab === 'account' || tab === 'settings')      && <Settings />}
        {tab === 'resellers' && <Resellers />}
        {tab === 'numbers'   && <Numbers />}
        {tab === 'plans'     && <Plans />}

        {/* Overview shares the Customer page, which is designed to end in a
            Footer — the other admin tabs (tables/tools) weren't, so they keep
            the invisible sink that absorbs `.dashboard-main > :last-child`'s
            auto margin without rendering anything. */}
        {tab === 'overview' ? (
          <div className="pt-10 -mx-4 sm:-mx-6 lg:-mx-8">
            <Footer />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}

      </div>
    </div>
  );
}

function Usage() {
  const [vol, setVol] = useState(null);
  const [perf, setPerf] = useState(null);
  const [days, setDays] = useState(7);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (d = days) => {
    setErr(''); setLoading(true);
    try {
      const [v, p] = await Promise.all([
        api(`/api/mcp/call-volume?days=${d}`),
        api(`/api/mcp/agent-performance?days=${d}`),
      ]);
      setVol(v.data || null);
      setPerf(Array.isArray(p.data) ? p.data : (p.data?.agents || []));
    } catch (e) {
      setErr(e.message);
      setVol(null); setPerf([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(days); }, [days]);

  const fmtSec = (s) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m ? `${m}m ${sec}s` : `${sec}s`;
  };
  const avgPerDay = vol && vol.total_calls != null
    ? (Number(vol.total_calls) / Math.max(1, days)).toFixed(1)
    : '—';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usage analytics</h1>
          <p className="text-mute mt-2">Per-agent performance pulled live from 9278 via MCP.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input"
            style={{ width: 130 }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="btn-ghost text-sm" onClick={() => load(days)} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>
      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className="mt-6 grid sm:grid-cols-4 gap-4">
        <Tile label={`Calls (${days}d)`}     value={vol?.total_calls ?? '—'} />
        <Tile label="Answer rate"            value={vol?.answer_rate != null ? `${vol.answer_rate}%` : '—'} />
        <Tile label="Avg per day"            value={avgPerDay} />
        <Tile label="Total minutes"          value={vol?.total_minutes != null ? Number(vol.total_minutes).toFixed(1) : '—'} />
      </div>

      {vol?.daily_breakdown?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Daily volume</h2>
          <div className="form-card p-0 overflow-x-auto">
            <table>
              <thead><tr><th>Date</th><th>Calls</th><th>Minutes</th></tr></thead>
              <tbody>
                {vol.daily_breakdown.map((d) => (
                  <tr key={d.date}>
                    <td className="font-mono text-xs">{d.date}</td>
                    <td>{d.count}</td>
                    <td>{Number(d.minutes || 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Agent performance</h2>
      <div className="mt-3 form-card p-0 overflow-x-auto">
        <table>
          <thead><tr><th>Agent</th><th>Calls</th><th>Answered</th><th>Avg duration</th><th>Success</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center text-mute py-6">Loading…</td></tr>}
            {!loading && (perf?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="text-center text-mute py-6">No agent activity in the last {days}d.</td></tr>
            )}
            {(perf || []).map((a, i) => (
              <tr key={a.agent_id || a.agent_name || i}>
                <td>{a.agent_name || a.name || a.slug || '—'}</td>
                <td>{a.total_calls ?? a.call_count ?? 0}</td>
                <td className="text-mute">{a.answered_calls ?? '—'}</td>
                <td>{fmtSec(a.avg_duration_seconds || a.avg_duration || 0)}</td>
                <td className={a.success_rate >= 90 ? 'text-lime-400' : a.success_rate >= 50 ? 'text-amber-400' : 'text-mute'}>
                  {a.success_rate != null ? `${a.success_rate}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="form-card">
      <div className="text-sm text-mute">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Health() {
  const [health, setHealth] = useState(null);
  const [mcpStatus, setMcpStatus] = useState(null);
  const [services, setServices] = useState(null);
  const [twilio, setTwilio] = useState(null);
  const [db, setDb] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [h, s, t, d, ms] = await Promise.all([
        api('/api/mcp/system-health').catch(() => null),
        api('/api/mcp/service-status').catch(() => null),
        api('/api/twilio/status', { auth: false }),
        api('/api/health', { auth: false }),
        api('/api/mcp/status').catch(() => null),
      ]);
      setHealth(h?.data || null);
      setMcpStatus(ms);
      setServices(s?.data || null);
      setTwilio(t); setDb(d);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const mcpOk = !!(health || mcpStatus?.configured);
  const mcpLabel = health ? '● Healthy' : mcpStatus?.configured ? '● Connected' : '○ Down';
  const mcpColor = mcpOk ? 'text-lime-400' : 'text-red-400';

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System health</h1>
        <button className="btn-ghost text-sm" onClick={load}>↻ Refresh</button>
      </div>
      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="form-card">
          <div className="text-sm text-mute">9278 MCP</div>
          <div className={`mt-1 text-xl font-semibold ${mcpColor}`}>
            {mcpLabel}
          </div>
          {health?.uptime && (
            <div className="text-xs text-mute mt-2">
              Uptime {health.uptime.days}d · CPU {health.cpu_avg?.['1min']} · {health.processes?.total} procs
            </div>
          )}
          {!health && mcpStatus?.configured && (
            <div className="text-xs text-mute mt-2">MCP connected · system stats unavailable</div>
          )}
        </div>
        <div className="form-card">
          <div className="text-sm text-mute">Twilio API</div>
          <div className={`mt-1 text-xl font-semibold ${twilio?.configured ? 'text-lime-400' : 'text-red-400'}`}>
            {twilio?.configured ? '● Healthy' : '○ Down'}
          </div>
          <div className="text-xs text-mute mt-2">{twilio?.defaultNumber || '—'}</div>
        </div>
        <div className="form-card">
          <div className="text-sm text-mute">Postgres</div>
          <div className={`mt-1 text-xl font-semibold ${db?.ok ? 'text-lime-400' : 'text-red-400'}`}>
            {db?.ok ? '● Healthy' : '○ Down'}
          </div>
          {db?.now && <div className="text-xs text-mute mt-2">{new Date(db.now).toLocaleTimeString()}</div>}
        </div>
      </div>

      {health && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">9278 server resources</h2>
          <div className="mt-3 grid sm:grid-cols-4 gap-4">
            <Tile label="CPU 1m" value={`${health.cpu_avg?.['1min'] ?? '—'}`} />
            <Tile label="Memory" value={`${health.memory?.used_percent ?? '—'}%`} />
            <Tile label="Disk" value={`${health.disk?.used_percent ?? '—'}%`} />
            <Tile label="Uptime" value={`${health.uptime?.days ?? 0}d ${health.uptime?.hours ?? 0}h`} />
          </div>
          <div className="mt-3 text-xs text-mute">
            Memory {health.memory?.used_gb}/{health.memory?.total_gb} GB · Disk {health.disk?.used_gb}/{health.disk?.total_gb} GB · Net rx {health.network?.rx_formatted} / tx {health.network?.tx_formatted}
          </div>
        </div>
      )}

      {services && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">9278 services</h2>
          <div className="mt-3 form-card">
            <pre className="text-xs leading-relaxed text-mute whitespace-pre-wrap">{JSON.stringify(services, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function McpBrowser() {
  const [endpoints, setEndpoints] = useState(null);    // list of { key, label, url, portal, source }
  const [endpoint, setEndpoint]   = useState('env');   // selected endpoint key
  const [tools, setTools]   = useState(null);
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState(null);
  const [args, setArgs]     = useState('{}');
  const [result, setResult] = useState(null);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  // Add/edit MCP creds modal — superadmin can wire up a reseller's
  // dashboard.<their-domain>/mcp without going to the DB.
  const [editing, setEditing] = useState(null);        // null | { resellerPortal, url, token }
  const [editErr, setEditErr] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  // Load every MCP server superadmin can pick from (env-level + every
  // reseller with mcp_url + mcp_token set).
  useEffect(() => {
    (async () => {
      try {
        const r = await api('/api/admin/mcp/endpoints');
        setEndpoints(r.endpoints || []);
      } catch (e) {
        setEndpoints([]);
        setErr(e.message);
      }
    })();
  }, []);

  // Re-fetch the tool catalog whenever the picked endpoint changes.
  useEffect(() => {
    setTools(null); setPicked(null); setResult(null); setErr('');
    (async () => {
      try {
        const r = await api(`/api/mcp/tools?endpoint=${encodeURIComponent(endpoint)}`);
        setTools(r.tools || []);
      } catch (e) {
        setErr(e.message);
        setTools([]);
      }
    })();
  }, [endpoint]);

  const run = async () => {
    setErr('');
    setBusy(true);
    setResult(null);
    let parsed = {};
    try { parsed = JSON.parse(args); }
    catch (e) { setErr('Args must be valid JSON: ' + e.message); setBusy(false); return; }
    try {
      const r = await api('/api/mcp/call', {
        method: 'POST',
        body: { name: picked, args: parsed, endpoint },
      });
      setResult(r.result);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const list   = (tools || []).filter((t) => !filter || t.name.toLowerCase().includes(filter.toLowerCase()));
  const active = (endpoints || []).find((e) => e.key === endpoint);

  const refreshEndpoints = async () => {
    const r = await api('/api/admin/mcp/endpoints');
    setEndpoints(r.endpoints || []);
  };

  const saveCreds = async () => {
    if (!editing) return;
    setEditErr(''); setEditBusy(true);
    try {
      await api('/api/admin/mcp/endpoints', {
        method: 'POST',
        body: {
          resellerPortal: editing.resellerPortal,
          url:   editing.url   || '',
          token: editing.token || '',
        },
      });
      setEditing(null);
      await refreshEndpoints();
    } catch (e) {
      setEditErr(e.message || 'Could not save MCP creds');
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">MCP browser</h1>
      <p className="text-mute">
        Run any tool exposed by a reseller's dashboard MCP server. Read-only tools are safe to explore.
      </p>

      {/* Endpoint picker — chips for every configured MCP server. */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-mute font-semibold">MCP server</div>
          <button
            onClick={() => setEditing({ resellerPortal: '', url: '', token: '' })}
            className="text-xs text-lime-600 hover:underline font-semibold"
          >
            + Add / update MCP for a reseller portal
          </button>
        </div>
        {endpoints === null ? (
          <div className="text-sm text-mute">Loading endpoints…</div>
        ) : endpoints.length === 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            No MCP servers configured.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {endpoints.map((ep) => {
              const isActive = ep.key === endpoint;
              return (
                <div
                  key={ep.key}
                  className={`px-3 py-2 rounded-lg text-left text-xs border transition relative ${
                    isActive
                      ? 'bg-lime-50 border-lime-400 text-lime-800 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-lime-300 text-slate-700'
                  }`}
                >
                  <button onClick={() => setEndpoint(ep.key)} className="block text-left w-full">
                    <div className="flex items-center gap-2">
                      <span className={`pill text-[9px] uppercase tracking-wider font-semibold ${
                        ep.source === 'env'
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : 'bg-purple-500/15 text-purple-700'
                      }`}>
                        {ep.source === 'env' ? 'default' : 'reseller'}
                      </span>
                      <span className="font-semibold">{ep.label}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-mute font-mono break-all pr-8">{ep.url}</div>
                  </button>
                  {ep.source === 'reseller' && (
                    <button
                      onClick={() => setEditing({
                        resellerPortal: ep.portal || '',
                        url:   ep.url || '',
                        token: '',
                      })}
                      className="absolute top-1 right-1 text-[10px] text-lime-600 hover:underline px-1"
                      title="Edit MCP URL / token for this reseller"
                    >
                      ✎ edit
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid lg:grid-cols-[300px_1fr] gap-6">
        <div>
          <input
            className="input"
            placeholder="Filter tools…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="mt-2 text-[11px] text-mute">
            {tools === null ? 'Loading tools…' : `${list.length} of ${tools.length} tools`}
            {active ? ` · ${active.label}` : ''}
          </div>
          <div className="mt-3 max-h-[480px] overflow-y-auto border border-line rounded">
            {tools === null && <div className="p-3 text-sm text-mute">Loading…</div>}
            {tools?.length === 0 && <div className="p-3 text-sm text-mute">No tools.</div>}
            {list.map((t) => (
              <div
                key={t.name}
                onClick={() => { setPicked(t.name); setArgs('{}'); setResult(null); }}
                className={`p-2 text-xs cursor-pointer border-b border-line ${picked === t.name ? 'bg-lime-50 text-lime-700' : 'hover:bg-slate-50'}`}
              >
                <div className="font-mono">{t.name}</div>
                <div className="text-mute mt-0.5 line-clamp-2">{(t.description || '').split('\n')[0].slice(0, 100)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          {!picked ? (
            <div className="text-mute text-sm">Pick a tool from the list to invoke it.</div>
          ) : (
            <>
              <div className="font-mono text-sm">{picked}</div>
              <label className="field-label mt-3">Arguments (JSON)</label>
              <textarea
                className="input font-mono text-xs"
                rows={5}
                value={args}
                onChange={(e) => setArgs(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button className="btn-teal text-sm" onClick={run} disabled={busy}>
                  {busy ? 'Running…' : '▶ Run tool'}
                </button>
              </div>
              {err && <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}
              {result !== null && (
                <pre className="mt-4 form-card text-xs leading-relaxed text-mute whitespace-pre-wrap overflow-x-auto max-h-[420px]">{JSON.stringify(result, null, 2)}</pre>
              )}
            </>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => !editBusy && setEditing(null)}
        >
          <div
            className="relative w-full max-w-lg mt-16 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold">Add / update reseller MCP</div>
            <div className="text-xs text-mute mt-1">
              Wire a reseller portal to its own <span className="font-mono">dashboard.&lt;domain&gt;/mcp</span>.
              Leave URL + token empty to clear (the reseller falls back to the default MCP).
            </div>

            <label className="field-label mt-4">Reseller portal slug *</label>
            <input
              className="input text-sm font-mono lowercase"
              required
              value={editing.resellerPortal}
              onChange={(e) => setEditing((p) => ({ ...p, resellerPortal: e.target.value.toLowerCase() }))}
              placeholder="9278.ai"
            />
            <div className="field-help">Must match an existing reseller's portal slug.</div>

            <label className="field-label mt-3">MCP URL</label>
            <input
              className="input text-sm font-mono"
              value={editing.url}
              onChange={(e) => setEditing((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://dashboard.9278.ai/mcp"
            />

            <label className="field-label mt-3">MCP token (Bearer)</label>
            <input
              type="password"
              className="input text-sm font-mono"
              value={editing.token}
              onChange={(e) => setEditing((p) => ({ ...p, token: e.target.value }))}
              placeholder="sk-mcp-…"
              autoComplete="new-password"
            />
            <div className="field-help">
              Paste the full Bearer token. Stored on the reseller's user row; never echoed back.
            </div>

            {editErr && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠ {editErr}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setEditing(null)}
                disabled={editBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCreds}
                disabled={editBusy || !editing.resellerPortal}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-[linear-gradient(135deg,#0ea5e9_0%,#6366f1_55%,#8b5cf6_110%)]"
              >
                {editBusy ? 'Saving…' : 'Save MCP creds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
