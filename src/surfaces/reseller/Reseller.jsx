import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import Logo from '../../components/Logo.jsx';
import TopBar from '../../components/TopBar.jsx';
import Footer from '../../components/Footer.jsx';
import Customers from './Customers.jsx';
import Plans from './Plans.jsx';
import Purchases from './Purchases.jsx';
import SubResellers from './SubResellers.jsx';

// `resellerOnly` tabs are visible only to top-level resellers. Sub-resellers
// manage customers, not further sub-resellers, so the Sub-resellers tab is
// hidden for them (and the backend rejects the create call as a backstop).
const ALL_TABS = [
  { id: 'customers',     label: '👥 My customers' },
  { id: 'purchases',     label: '💳 Plan purchases' },
  { id: 'plans',         label: '⭐ My plans' },
  { id: 'sub-resellers', label: '🤝 Sub-resellers', resellerOnly: true },
];

// =============================================================================
// Reseller — top-level shell for reseller@portal accounts. Layout mirrors the
// Admin shell (sidebar + sticky top bar + footer at the bottom) so the
// dashboard reads as one product.
// =============================================================================
export default function Reseller() {
  const { currentUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [tab]);

  if (!currentUser) return null;

  // Only top-level resellers see the Sub-resellers tab; sub-resellers don't.
  const isReseller = currentUser.userType === 'reseller';
  const TABS = ALL_TABS.filter((t) => !t.resellerOnly || isReseller);
  const VALID = new Set(TABS.map((t) => t.id));
  // A sub-reseller hitting /reseller/sub-resellers directly is bounced home.
  if (!VALID.has(tab)) return <Navigate to="/reseller/customers" replace />;

  const activeLabel = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="dashboard-shell">
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <Link
          to="/reseller/customers"
          className="h-16 flex items-center gap-2 px-4 bg-white sticky top-0 z-30"
          aria-label="kallus.io home"
        >
          <Logo size={44} showWordmark={false} />
          <span className="font-mono text-sm lowercase text-mute tracking-tight">kallus.io</span>
        </Link>

        <div className="px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">
            Reseller
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
            {currentUser.company || currentUser.name}
          </div>
          {currentUser.resellerPortal && (
            <div className="mt-0.5 text-[11px] font-mono text-lime-600 truncate">
              {currentUser.resellerPortal}
            </div>
          )}
        </div>

        <div className="sidenav-section mt-3">Workspace</div>
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={`/reseller/${t.id}`}
            className={tab === t.id ? 'active' : ''}
          >
            {t.label}
          </Link>
        ))}
      </aside>

      <div className="dashboard-main">
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
          <div className="ml-auto">
            <TopBar />
          </div>
        </div>

        {tab === 'customers'     && <Customers />}
        {tab === 'purchases'     && <Purchases />}
        {tab === 'plans'         && <Plans />}
        {tab === 'sub-resellers' && <SubResellers />}

        <div className="pt-10 -mx-4 sm:-mx-6 lg:-mx-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
