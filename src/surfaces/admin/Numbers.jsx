import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BRAND_GRADIENT = 'bg-[linear-gradient(135deg,#0ea5e9_0%,#6366f1_55%,#8b5cf6_110%)]';

// =============================================================================
// Numbers inventory — superadmin's view of every DID in the pool. Shows
// busy vs. free, which customer holds each busy DID, and lets the admin
// register new DIDs.
// =============================================================================
export default function Numbers() {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState('');
  const [filter, setFilter] = useState('all');     // 'all' | 'busy' | 'free'
  const [search, setSearch] = useState('');

  // Add-number form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', locality: '', region: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [okMsg, setOkMsg]     = useState('');

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/admin/numbers');
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const numbers = data?.numbers || [];
  const totals  = data?.totals  || { total: 0, busy: 0, free: 0 };

  const filtered = numbers.filter((n) => {
    if (filter !== 'all' && n.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.value.toLowerCase().includes(q)
        && !(n.owner?.email || '').toLowerCase().includes(q)
        && !(n.owner?.label || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const addNumber = async (e) => {
    e.preventDefault();
    setFormErr(''); setOkMsg(''); setBusy(true);
    try {
      await api('/api/admin/numbers', { method: 'POST', body: form });
      setOkMsg(`✓ ${form.number} added to inventory`);
      setForm({ number: '', locality: '', region: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeNumber = async (n) => {
    if (n.source === 'env') {
      alert('Env-managed DIDs cannot be removed from the UI — pull them out of MANUAL_NUMBERS in .env and restart.');
      return;
    }
    if (!confirm(`Remove ${n.value} from the inventory? Only possible if no customer currently holds it.`)) return;
    try {
      await api(`/api/admin/numbers/${encodeURIComponent(n.value)}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(`Could not remove: ${e.message}`);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">☎ Numbers inventory</h1>
          <p className="text-mute text-sm mt-1">
            Every DID available to the platform — assigned (busy) or unassigned (free).
            Add new DIDs as you receive them from the carrier.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormErr(''); }}
          className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${BRAND_GRADIENT}`}
        >
          {showForm ? '× Cancel' : '+ Add DID'}
        </button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}
      {okMsg && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {okMsg}
        </div>
      )}

      {/* === Add DID form ============================================ */}
      {showForm && (
        <form onSubmit={addNumber} className="mt-6 form-card grid sm:grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
          <div>
            <label className="field-label">DID (E.164)</label>
            <input
              required
              className="input text-sm font-mono"
              placeholder="+918037683049"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Locality</label>
            <input className="input text-sm" placeholder="Bangalore" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Region</label>
            <input className="input text-sm" placeholder="Karnataka" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <button
              type="submit"
              disabled={busy}
              className={`w-full px-4 py-2 rounded-lg text-white text-sm font-semibold ${BRAND_GRADIENT}`}
            >
              {busy ? 'Adding…' : 'Add to inventory'}
            </button>
          </div>
          {formErr && (
            <div className="sm:col-span-4 text-xs text-red-600">⚠ {formErr}</div>
          )}
        </form>
      )}

      {/* === KPI cards ============================================== */}
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        <div className={`form-card cursor-pointer ${filter === 'all' ? 'ring-2 ring-lime-200' : ''}`} onClick={() => setFilter('all')}>
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total DIDs</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totals.total}</div>
        </div>
        <div className={`form-card cursor-pointer ${filter === 'busy' ? 'ring-2 ring-amber-200' : ''}`} onClick={() => setFilter('busy')}>
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Busy (assigned)</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{totals.busy}</div>
        </div>
        <div className={`form-card cursor-pointer ${filter === 'free' ? 'ring-2 ring-emerald-200' : ''}`} onClick={() => setFilter('free')}>
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Free (available)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{totals.free}</div>
        </div>
      </div>

      {/* === Search ================================================= */}
      <div className="mt-4 relative max-w-md">
        <input
          type="search"
          className="input pl-9 text-sm"
          placeholder="Filter by DID or owner email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none">🔍</span>
      </div>

      {/* === Inventory table ======================================== */}
      <div className="mt-4 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>DID</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Source</th>
              <th>Locality</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={7} className="text-center text-mute py-6">Loading…</td></tr>
            )}
            {data && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-mute py-6">No DIDs match the current filter.</td></tr>
            )}
            {filtered.map((n) => (
              <tr key={n.value}>
                <td className="font-mono text-sm">{n.value}</td>
                <td>
                  {n.status === 'busy'
                    ? <span className="pill bg-amber-500/15 text-amber-700">● Busy</span>
                    : <span className="pill bg-emerald-500/15 text-emerald-700">○ Free</span>
                  }
                </td>
                <td>
                  {n.owner
                    ? <>
                        <div className="text-xs font-medium">{n.owner.label || n.owner.email}</div>
                        <div className="text-[11px] text-mute">{n.owner.email}</div>
                      </>
                    : <span className="text-mute text-xs">—</span>
                  }
                </td>
                <td>
                  <span className={`pill text-[10px] uppercase tracking-wider ${
                    n.source === 'env' ? 'bg-slate-200 text-slate-700' : 'bg-lime-100 text-lime-700'
                  }`}>
                    {n.source === 'env' ? 'ENV' : 'DB'}
                  </span>
                </td>
                <td className="text-xs text-mute">
                  {[n.locality, n.region].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="text-xs text-mute">
                  {n.addedAt ? <>{fmtDate(n.addedAt)}<br /><span className="text-[10px]">by {n.addedBy || '—'}</span></> : '—'}
                </td>
                <td>
                  {n.source === 'db' && n.status === 'free' && (
                    <button className="btn-red text-xs" onClick={() => removeNumber(n)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
