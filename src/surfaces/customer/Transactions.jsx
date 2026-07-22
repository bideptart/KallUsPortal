import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import DateRangePicker, { todayRange } from '../../components/DateRangePicker.jsx';

// =============================================================================
// Transactions — the customer's payment history. Combines plan purchases (per
// DID) with wallet top-ups and auto-recharge charges from GET /api/transactions.
// Filterable by date range, kind, and free-text search, with CSV export.
// =============================================================================

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  const z = new Date(d);
  return isNaN(z.getTime()) ? '—' : z.toLocaleString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

// Local YYYY-MM-DD key for a timestamp — used to compare a row's date against
// the (from, to) range strings the DateRangePicker emits (also local).
const dateKey = (d) => {
  const z = new Date(d);
  if (isNaN(z.getTime())) return '';
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, '0');
  const day = String(z.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Human label + pill colour for each transaction kind. Covers both the wallet
// ledger kinds and the synthesised per-DID plan row.
const KIND_META = {
  plan:              { label: 'Plan + DID',      pill: 'bg-lime-100 text-lime-700' },
  'new-number-plan': { label: 'New plan + DID',  pill: 'bg-lime-100 text-lime-700' },
  'plan-change':     { label: 'Plan change',     pill: 'bg-lime-100 text-lime-700' },
  'plan-restart':    { label: 'Plan restart',    pill: 'bg-amber-100 text-amber-700' },
  topup:             { label: 'Wallet top-up',   pill: 'bg-emerald-100 text-emerald-700' },
  auto_recharge:     { label: 'Auto-recharge',   pill: 'bg-indigo-100 text-indigo-700' },
  'save-card':       { label: 'Card saved',      pill: 'bg-purple-100 text-purple-700' },
  signup:            { label: 'Signup',          pill: 'bg-fuchsia-100 text-fuchsia-700' },
  adjustment:        { label: 'Adjustment',      pill: 'bg-amber-100 text-amber-700' },
  refund:            { label: 'Refund',          pill: 'bg-rose-100 text-rose-700' },
  wallet:            { label: 'Wallet',          pill: 'bg-slate-100 text-slate-700' },
};
const kindMeta = (k) => KIND_META[k] || { label: k || 'Transaction', pill: 'bg-slate-100 text-slate-700' };

const STATUS_PILL = {
  success:   'bg-emerald-100 text-emerald-700',
  succeeded: 'bg-emerald-100 text-emerald-700',
  paid:      'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  failed:    'bg-red-100 text-red-700',
};

export default function Transactions() {
  const { currentUser } = useApp();
  const [txns, setTxns]       = useState(null);
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(true);

  // Filters — default to "Today" so the page lands on a tight, current view
  // (matching the reseller/report surfaces). Users widen with "All time".
  const [range, setRange]   = useState(todayRange);
  const [kind, setKind]     = useState('all');
  const [search, setSearch] = useState('');

  // Payment provider label for the "Total paid via …" line + Provider column.
  const [provider, setProvider] = useState('Razorpay');

  const portal = currentUser?.resellerPortal || 'kallus.io';

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const r = await api('/api/transactions');
      setTxns(r.transactions || []);
    } catch (e) {
      setErr(e.message || 'Could not load transactions');
      setTxns([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Resolve the active payment gateway once so the Provider column + subtitle
  // read the real value (Razorpay / Stripe). Falls back to Razorpay.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api('/api/payment/config', { auth: false });
        const g = cfg?.gateway;
        if (!cancelled && g && g !== 'none') {
          setProvider(g.charAt(0).toUpperCase() + g.slice(1));
        }
      } catch { /* keep default */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rows that pass the date-range + kind + search filters.
  const filtered = useMemo(() => {
    if (!txns) return [];
    const q = search.trim().toLowerCase();
    const { from, to } = range;
    return txns.filter((t) => {
      const dk = dateKey(t.date);
      if (from && dk && dk < from) return false;
      if (to && dk && dk > to) return false;
      if (kind !== 'all' && (t.type || 'wallet') !== kind) return false;
      if (!q) return true;
      return (
        (t.description || '').toLowerCase().includes(q) ||
        (t.ref || '').toLowerCase().includes(q) ||
        (t.method || '').toLowerCase().includes(q) ||
        kindMeta(t.type).label.toLowerCase().includes(q)
      );
    });
  }, [txns, range, kind, search]);

  // Distinct kinds present (across ALL rows, ignoring filters) with counts —
  // drives the Kind dropdown options.
  const kindCounts = useMemo(() => {
    const m = new Map();
    for (const t of txns || []) {
      const k = t.type || 'wallet';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()];
  }, [txns]);

  const totalPaid = filtered.reduce((a, t) => a + (Number(t.amount) || 0), 0);

  const exportCsv = () => {
    if (!filtered.length) return;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['When', 'Kind', 'Description', 'Amount', 'Status', 'Provider', 'Ref'];
    const lines = filtered.map((t) => [
      fmtDate(t.date), kindMeta(t.type).label, t.description,
      Number(t.amount || 0).toFixed(2), t.status || 'success',
      t.method || provider, t.ref || '',
    ].map(esc).join(','));
    const csv = [header.map(esc).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${dateKey(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Icon + "Transactions" title now live in the sticky top bar instead of here. */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <p className="text-base font-semibold tracking-wide animate-fade-up" style={{ color: 'var(--ink-2)' }}>
          Every payment from this account — plan purchases, plan changes, restarts, and wallet top-ups.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={!filtered.length} className="btn-teal text-sm transition duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-90">
            Export CSV
          </button>
          <button onClick={load} disabled={loading} className="btn-teal text-sm transition duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-90">
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {err}</div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Transactions</div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {txns === null ? '—' : filtered.length}
          </div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total paid</div>
          <div className="mt-2 text-3xl font-bold text-lime-600 dark:text-lime-400">
            {totalPaid > 0 ? money(totalPaid) : '—'}
          </div>
          <div className="text-xs text-mute mt-1">via {provider}</div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Portal</div>
          <div className="mt-2 text-2xl font-bold text-lime-600 dark:text-lime-400 font-mono break-all">
            {portal}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 form-card">
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Kind</label>
            <select className="input text-sm py-1.5" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All kinds ({txns ? txns.length : 0})</option>
              {kindCounts.map(([k, c]) => (
                <option key={k} value={k}>{kindMeta(k).label} ({c})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Search</label>
            <input
              type="search"
              className="input text-sm py-1.5"
              placeholder="description, ref, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr>
              <th className="w-[160px]">When</th>
              <th className="w-[140px]">Kind</th>
              <th>Description</th>
              <th className="w-[90px] text-right">Amount</th>
              <th className="w-[90px] text-center">Status</th>
              <th className="w-[100px]">Provider</th>
              <th className="w-[180px]">Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center text-mute py-10">Loading transactions…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-mute py-10">
                {(txns && txns.length === 0)
                  ? 'No transactions yet.'
                  : 'No transactions in this date range yet.'}
              </td></tr>
            )}
            {!loading && filtered.map((t) => {
              const meta = kindMeta(t.type);
              return (
                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{fmtDate(t.date)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${meta.pill}`}>{meta.label}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100 truncate">{t.description}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {t.amount ? money(t.amount) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`pill text-[10px] uppercase tracking-wider ${STATUS_PILL[String(t.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                      {t.status || 'success'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-mute whitespace-nowrap truncate">{t.method || provider}</td>
                  <td className="py-3 px-4 text-mute font-mono text-xs whitespace-nowrap">{t.ref || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="mt-3 text-right text-xs text-mute">
        Showing {filtered.length} of {txns ? txns.length : 0} transactions
      </div>
    </div>
  );
}
