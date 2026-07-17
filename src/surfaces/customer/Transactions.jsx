import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// =============================================================================
// Transactions — the customer's payment / wallet history. Combines plan
// purchases (per DID) with wallet top-ups and auto-recharge charges, sourced
// from GET /api/transactions.
// =============================================================================

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  const z = new Date(d);
  return isNaN(z.getTime()) ? '—' : z.toLocaleString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

const TYPE_PILL = {
  plan:         'bg-teal-100 text-teal-700',
  topup:        'bg-sky-100 text-sky-700',
  auto_recharge:'bg-indigo-100 text-indigo-700',
  adjustment:   'bg-amber-100 text-amber-700',
  refund:       'bg-rose-100 text-rose-700',
};
const typeLabel = (t) => ({
  plan: 'Plan + DID', topup: 'Wallet top-up', auto_recharge: 'Auto-recharge',
  adjustment: 'Adjustment', refund: 'Refund',
}[t] || (t || 'Transaction'));

const STATUS_PILL = {
  success: 'bg-emerald-100 text-emerald-700',
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed:  'bg-red-100 text-red-700',
};

export default function Transactions() {
  const [txns, setTxns] = useState(null);
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(true);

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

  const total = (txns || []).reduce((a, t) => a + (Number(t.amount) || 0), 0);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🧾 Transactions</h1>
          <p className="text-mute">
            Every plan purchase, wallet top-up and auto-recharge on your account.
            {txns && txns.length > 0 && (
              <> · <span className="font-semibold text-slate-900 dark:text-slate-100">{money(total)}</span> total</>
            )}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm">
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {err}</div>
      )}

      <div className="mt-6 form-card overflow-x-auto">
        {loading ? (
          <div className="text-center text-mute py-8">Loading transactions…</div>
        ) : (txns && txns.length === 0) ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">🧾</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">No transactions yet</div>
            <div className="text-sm text-mute mt-1">Your plan purchases and wallet top-ups will appear here.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-mute border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3 font-semibold">Date</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Description</th>
                <th className="py-2 pr-3 font-semibold text-right">Minutes</th>
                <th className="py-2 pr-3 font-semibold text-right">Amount</th>
                <th className="py-2 pr-3 font-semibold">Method</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(txns || []).map((t) => (
                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{fmtDate(t.date)}</td>
                  <td className="py-3 pr-3">
                    <span className={`pill text-xs ${TYPE_PILL[t.type] || 'bg-slate-100 text-slate-700'}`}>{typeLabel(t.type)}</span>
                  </td>
                  <td className="py-3 pr-3 text-slate-900 dark:text-slate-100">{t.description}</td>
                  <td className={`py-3 pr-3 text-right ${Number(t.minutes) < 0 ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                    {t.minutes ? (t.minutes > 0 ? `+${t.minutes}` : t.minutes) : '—'}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold text-slate-900 dark:text-slate-100">{money(t.amount)}</td>
                  <td className="py-3 pr-3 text-mute">{t.method || '—'}</td>
                  <td className="py-3">
                    <span className={`pill text-xs ${STATUS_PILL[String(t.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                      {t.status || 'success'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
