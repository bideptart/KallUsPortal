import { useEffect, useMemo, useState } from 'react';
import {
  Search, Phone, CalendarDays, CheckCircle2, Circle, RefreshCw, Users,
  PieChart, ShoppingBag, MoreVertical, Mail, PhoneCall, Copy, ChevronRight,
  Wallet, Info,
} from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Resolve the symbol + format for the reseller's storefront currency.
const symbolFor = (cur) => (cur === 'USD' ? '$' : cur === 'USD' ? '$' : `${cur || '$'} `);
const fmtMoney = (n, cur) => {
  const sym = symbolFor(cur);
  return cur === 'USD'
    ? `${sym}${Number(n || 0).toLocaleString('en-US')}`
    : `${sym}${Number(n || 0).toFixed(2)}`;
};

// Same fallback logic as the admin tables: prefer `customer.numbers[]`
// (per-DID plan tiers from user_numbers JOIN); fall back to the legacy
// primary (users.plan_label + users.number_value) for any row that
// pre-dates the per-DID schema.
const didsFor = (c) => {
  if (Array.isArray(c.numbers) && c.numbers.length) return c.numbers;
  if (c.number) {
    return [{
      id: `legacy-${c.id}`,
      value: c.number,
      isPrimary: true,
      planCycle: 'monthly',
      plan: c.plan
        ? { ...c.plan, id: c.plan.label?.toLowerCase() || 'unknown' }
        : null,
    }];
  }
  return [];
};

// Two-letter monogram from a company/person name, e.g. "Acme Corp" -> "AC".
const initialsFor = (label) => {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'none',   label: 'No Plan' },
  { id: 'usage',  label: 'With Usage' },
];

const SORTS = [
  { id: 'newest', label: 'Sort by: Newest' },
  { id: 'oldest', label: 'Sort by: Oldest' },
  { id: 'name',   label: 'Sort by: Name (A–Z)' },
  { id: 'usage',  label: 'Sort by: Most usage' },
];

// =============================================================================
// Reseller Customers — plain-language, card-based view of every
// `users.user_type='user'` row where reseller_id = me.id. Designed to be
// readable at a glance by non-technical resellers: a name-and-status card per
// customer, filter chips + sort instead of a table, and per-card quick
// actions (contact, profile, usage) built entirely from data the API already
// returns but the old table never surfaced (contact phone, username).
// =============================================================================
export default function Customers() {
  const { currentUser } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr]   = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [openPanel, setOpenPanel] = useState(null); // `${customerId}:${panel}` or null
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [copiedFor, setCopiedFor] = useState(null);

  const currency = currentUser?.displayCurrency || 'USD';

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/reseller/customers');
      setList(r.customers || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const totalDids = useMemo(
    () => (list || []).reduce((a, c) => a + didsFor(c).length, 0),
    [list],
  );
  const totalMinutesUsed = useMemo(
    () => (list || []).reduce((a, c) => a + Number(c.minutesUsed || 0), 0),
    [list],
  );

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    let rows = list.filter((c) => {
      if (q) {
        const hit = (c.company || '').toLowerCase().includes(q)
          || (c.name  || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      const hasPlan = didsFor(c).some((d) => d.plan);
      if (filter === 'active' && !hasPlan) return false;
      if (filter === 'none' && hasPlan) return false;
      if (filter === 'usage' && !(Number(c.minutesUsed || 0) > 0)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name')   return (a.company || a.name || '').localeCompare(b.company || b.name || '');
      if (sortBy === 'usage')  return Number(b.minutesUsed || 0) - Number(a.minutesUsed || 0);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });
    return rows;
  }, [list, search, filter, sortBy]);

  const togglePanel = (customerId, panel) => {
    const key = `${customerId}:${panel}`;
    setOpenPanel((cur) => (cur === key ? null : key));
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFor(key);
      setTimeout(() => setCopiedFor((cur) => (cur === key ? null : cur)), 1500);
    } catch { /* clipboard unavailable — silently ignore */ }
  };

  return (
    <div onClick={() => setMenuOpenFor(null)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="font-bold text-black text-[15px] max-w-lg">
          Everyone who signed up through your portal, with the plan and phone
          number they're using.
        </p>
        <button className="btn-ghost btn-ghost-accent text-sm flex items-center gap-1.5" onClick={load}>
          <RefreshCw size={14} strokeWidth={2} /> Refresh
        </button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}

      {/* Plain-language summary strip */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="form-card flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center"><Users size={17} strokeWidth={2} /></div>
          <div>
            <div className="text-xs text-mute uppercase tracking-wider font-semibold">Customers</div>
            <div className="mt-0.5 text-2xl font-bold text-slate-900">{list === null ? '—' : list.length}</div>
            <div className="text-xs text-mute mt-0.5">people signed up</div>
          </div>
        </div>
        <div className="form-card flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center"><Phone size={16} strokeWidth={2} /></div>
          <div>
            <div className="text-xs text-mute uppercase tracking-wider font-semibold">Phone numbers active</div>
            <div className="mt-0.5 text-2xl font-bold text-slate-900">
              {list === null ? '—' : list.reduce((a, c) => a + (c.numberCount || 0), 0)}
            </div>
            <div className="text-xs text-mute mt-0.5">numbers in use</div>
          </div>
        </div>
        <div className="form-card flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center"><ShoppingBag size={16} strokeWidth={2} /></div>
          <div>
            <div className="text-xs text-mute uppercase tracking-wider font-semibold">Plans sold</div>
            <div className="mt-0.5 text-2xl font-bold text-lime-600">{list === null ? '—' : totalDids}</div>
            <div className="text-xs text-mute mt-0.5">total plans</div>
          </div>
        </div>
        <div className="form-card flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center"><PieChart size={16} strokeWidth={2} /></div>
          <div>
            <div className="text-xs text-mute uppercase tracking-wider font-semibold">Minutes used</div>
            <div className="mt-0.5 text-2xl font-bold text-slate-900">{list === null ? '—' : totalMinutesUsed.toFixed(0)}</div>
            <div className="text-xs text-mute mt-0.5">across all customers</div>
          </div>
        </div>
      </div>

      {/* Search + filter chips + sort — the controls a non-technical reseller needs */}
      {list !== null && list.length > 0 && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
            <input
              type="search"
              className="input pl-9 text-sm"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`pill text-xs font-semibold border transition-colors ${
                  filter === f.id
                    ? 'bg-lime-50 text-lime-700 border-lime-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            className="input text-sm py-1.5 sm:max-w-[190px] ml-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Customer cards */}
      <div className="mt-4 space-y-3">
        {list === null && (
          <div className="form-card text-center text-mute py-10">Loading your customers…</div>
        )}

        {list?.length === 0 && (
          <div className="form-card text-center py-12">
            <div className="text-4xl mb-3">🌱</div>
            <div className="text-base font-semibold text-slate-900">No customers yet</div>
            <p className="text-sm text-mute mt-1 max-w-sm mx-auto">
              Once someone signs up through your portal link, they'll show up here
              automatically — no extra steps needed.
            </p>
          </div>
        )}

        {list && list.length > 0 && filtered.length === 0 && (
          <div className="form-card text-center text-mute py-10">
            No customers match your search or filter.
          </div>
        )}

        {filtered.map((c) => {
          const dids = didsFor(c);
          const hasPlan = dids.length > 0 && dids.some((d) => d.plan);
          const used = Number(c.minutesUsed || 0);
          const primary = dids.find((d) => d.isPrimary) || dids[0];
          const overageMin = primary?.plan ? Math.max(0, used - primary.plan.min) : 0;
          const overageCost = primary?.plan ? overageMin * Number(primary.plan.rate || 0) : 0;

          const profileKey = `${c.id}:profile`;
          const usageKey = `${c.id}:usage`;
          const manageKey = `${c.id}:manage`;

          return (
            <div
              key={c.id}
              className={`form-card !p-0 overflow-hidden border-l-4 ${hasPlan ? 'border-l-lime-500' : 'border-l-slate-300'}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 w-11 h-11 rounded-full bg-lime-100 text-lime-700 font-semibold flex items-center justify-center text-sm">
                      {initialsFor(c.company || c.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{c.company || c.name}</div>
                      <div className="text-xs text-mute truncate">{c.email}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-mute">
                        <CalendarDays size={12} strokeWidth={2} /> Joined {fmtDate(c.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`pill text-xs font-semibold ${
                      hasPlan ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {hasPlan ? <CheckCircle2 size={13} strokeWidth={2.2} /> : <Circle size={13} strokeWidth={2.2} />}
                      {hasPlan ? 'Active' : 'No plan yet'}
                    </span>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-mute hover:bg-slate-100"
                        onClick={() => setMenuOpenFor((cur) => (cur === c.id ? null : c.id))}
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} strokeWidth={2} />
                      </button>
                      {menuOpenFor === c.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 text-sm">
                          <a
                            href={`mailto:${c.email}`}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                          >
                            <Mail size={14} strokeWidth={2} /> Email customer
                          </a>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                            >
                              <PhoneCall size={14} strokeWidth={2} /> Call {c.phone}
                            </a>
                          )}
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 text-left"
                            onClick={() => { copyText(c.email, `menu-${c.id}`); setMenuOpenFor(null); }}
                          >
                            <Copy size={14} strokeWidth={2} /> Copy email
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {dids.length === 0 ? (
                  <div className="mt-4 text-sm text-mute border-t border-slate-100 pt-3">
                    This customer hasn't bought a plan or number yet.
                  </div>
                ) : (
                  <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
                    {dids.map((d) => {
                      const dUsed = d.isPrimary || dids.length === 1 ? used : null;
                      const pct = d.plan && d.plan.min > 0 && dUsed !== null
                        ? Math.min(100, Math.round((dUsed / d.plan.min) * 100))
                        : null;
                      return (
                        <div key={d.id} className={dids.length > 1 ? 'rounded-lg bg-slate-50 border border-slate-100 p-3' : ''}>
                          {d.isPrimary && dids.length > 1 && (
                            <span className="pill bg-lime-100 text-lime-700 text-[10px] uppercase tracking-wider mb-2">main number</span>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Number (DID)</div>
                              <div className="mt-0.5 text-sm font-mono flex items-center gap-1.5">
                                <Phone size={13} strokeWidth={2} className="text-mute shrink-0" />
                                {d.value || 'No number yet'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Plan</div>
                              <div className="mt-0.5 text-sm">
                                {d.plan ? (
                                  <>
                                    <span className="font-semibold">{d.plan.label}</span>
                                    <span className="text-mute"> · {fmtMoney(d.plan.amount, currency)}/mo</span>
                                  </>
                                ) : <span className="text-mute">No plan</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Cycle</div>
                              <div className="mt-0.5">
                                {d.plan ? (
                                  <span className={`pill text-[10px] uppercase tracking-wider ${
                                    d.planCycle === 'yearly' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                                  </span>
                                ) : <span className="text-sm text-mute">—</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Usage</div>
                              <div className="mt-0.5 text-sm">
                                {d.plan && dUsed !== null
                                  ? <>{dUsed.toFixed(0)} <span className="text-mute">/ {d.plan.min} min{pct !== null ? ` (${pct}%)` : ''}</span></>
                                  : <span className="text-mute">—</span>}
                              </div>
                            </div>
                          </div>

                          {pct !== null && (
                            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-lime-500" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  {hasPlan ? (
                    <>
                      <button
                        type="button"
                        className="btn-ghost text-xs !py-2 !px-3.5 flex items-center gap-1.5"
                        onClick={() => togglePanel(c.id, 'usage')}
                      >
                        <PieChart size={13} strokeWidth={2} /> Usage Details
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-xs !py-2 !px-3.5 flex items-center gap-1.5"
                        onClick={() => togglePanel(c.id, 'manage')}
                      >
                        <Wallet size={13} strokeWidth={2} /> Manage Plan
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost text-xs !py-2 !px-3.5 flex items-center gap-1.5"
                      onClick={() => togglePanel(c.id, 'manage')}
                    >
                      <Wallet size={13} strokeWidth={2} /> Assign Plan
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs font-semibold text-lime-700 flex items-center gap-0.5 ml-auto hover:underline"
                    onClick={() => togglePanel(c.id, 'profile')}
                  >
                    View Profile <ChevronRight size={13} strokeWidth={2.4} className={openPanel === profileKey ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  </button>
                </div>
              </div>

              {/* Expandable panels — real data the summary line doesn't have room for */}
              {openPanel === profileKey && (
                <div className="px-6 pb-5 pt-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Username</div>
                    <div className="mt-0.5 font-mono">{c.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Contact phone</div>
                    <div className="mt-0.5">
                      {c.phone ? <a href={`tel:${c.phone}`} className="text-lime-700 hover:underline">{c.phone}</a> : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Email</div>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate">
                      <a href={`mailto:${c.email}`} className="text-lime-700 hover:underline truncate">{c.email}</a>
                      <button type="button" onClick={() => copyText(c.email, `profile-${c.id}`)} className="text-mute hover:text-slate-700 shrink-0">
                        <Copy size={12} strokeWidth={2} />
                      </button>
                      {copiedFor === `profile-${c.id}` && <span className="text-[10px] text-lime-700">Copied</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Signed up via</div>
                    <div className="mt-0.5 font-mono text-xs">{currentUser?.resellerPortal || '—'}</div>
                  </div>
                </div>
              )}

              {openPanel === usageKey && primary?.plan && (
                <div className="px-6 pb-5 pt-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Included minutes</div>
                    <div className="mt-0.5 font-semibold">{primary.plan.min} min</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Used this cycle</div>
                    <div className="mt-0.5 font-semibold">{used.toFixed(0)} min</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Overage minutes</div>
                    <div className={`mt-0.5 font-semibold ${overageMin > 0 ? 'text-amber-600' : ''}`}>{overageMin.toFixed(0)} min</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Est. overage cost</div>
                    <div className={`mt-0.5 font-semibold ${overageCost > 0 ? 'text-amber-600' : ''}`}>{fmtMoney(overageCost, currency)}</div>
                  </div>
                </div>
              )}

              {openPanel === manageKey && (
                <div className="px-6 pb-5 pt-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2 text-sm text-mute">
                  <Info size={15} strokeWidth={2} className="shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    Plan changes are made by the customer from their own portal. Direct
                    plan assignment from the reseller dashboard isn't available yet — you
                    can reach out to {c.name || 'this customer'} using the actions above.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
