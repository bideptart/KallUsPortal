import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import Overview from './Overview.jsx';
import Calls from './Calls.jsx';
import Recordings from './Recordings.jsx';
import Reports from './Reports.jsx';
import Meetings from './Meetings.jsx';
import KbAgent from './KbAgent.jsx';
import Numbers from './Numbers.jsx';
import Billing from './Billing.jsx';
import Transactions from './Transactions.jsx';
import Tools from './Tools.jsx';
import Account from './Account.jsx';
import TopBar from '../../components/TopBar.jsx';
import Logo from '../../components/Logo.jsx';
import Footer from '../../components/Footer.jsx';

const TABS = [
  { id: 'overview',   label: '📊 Overview',          Component: Overview },
  { id: 'numbers',    label: '📱 Plan and Numbers',           Component: Numbers },
  { id: 'calls',      label: '📞 Call history',      Component: Calls },
  { id: 'recordings', label: '🎙 Recordings',        Component: Recordings },
  { id: 'reports',    label: '📑 Transcript & Summary', Component: Reports },
  { id: 'meetings',   label: '📅 Scheduled meetings',Component: Meetings },
  { id: 'kb',         label: '🧠 Knowledge & Agent', Component: KbAgent },
  { id: 'tools',      label: '🛠 Tools',             Component: Tools },
  { id: 'billing',    label: '💳 Billing & minutes', Component: Billing },
  { id: 'transactions', label: '🧾 Transactions',    Component: Transactions },
  { id: 'account',    label: '👤 Account',           Component: Account },
];

export default function Customer() {
  const { currentUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);

  // Close drawer when route changes
  useEffect(() => { setNavOpen(false); }, [tab]);

  if (!currentUser) return null;

  const active = TABS.find((t) => t.id === tab);
  if (!active) return <Navigate to="/dashboard/overview" replace />;
  const Component = active.Component;

  const numberDisplay = currentUser.number?.value || '— no number yet —';
  const company = currentUser.company || currentUser.name || 'Your account';

  return (
    <div className="dashboard-shell">
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <Link
          to="/dashboard/overview"
          className="h-16 flex items-center px-4 bg-white sticky top-0 z-30"
          aria-label="9278.ai home"
        >
          <Logo size={50} showWordmark={false} />
        </Link>

        {/* Persistent "Welcome back" line — replaces the per-page Overview
            heading so it stays visible across every dashboard tab. */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">
            Welcome back
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {company}
          </div>
        </div>

        <div className="sidenav-section mt-3">Manage</div>
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={`/dashboard/${t.id}`}
            className={tab === t.id ? 'active' : ''}
          >
            {t.label}
          </Link>
        ))}
      </aside>

      <div className="dashboard-main">
        {/* Sticky top bar — same 64px height as the sidebar logo so the
            shared border-b draws one continuous line across the page. The
            negative margins cancel dashboard-main's responsive padding so
            the bar (and its bg-white) extends edge-to-edge. */}
        <div className="sticky top-0 z-30 bg-white -mt-5 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 border-b border-slate-200 mb-6">
          <button
            className="mobile-nav-toggle lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <span>☰</span> Menu
          </button>
          <div className="lg:hidden text-xs text-mute font-semibold uppercase tracking-wider">
            {active.label}
          </div>
          <div className="ml-auto">
            <TopBar />
          </div>
        </div>

        <Component />

        {/* Footer wrapper — `margin-top: auto` from .dashboard-main pins
            this to the bottom of the viewport on short pages, and lets it
            sit at the natural end of content on tall pages. Do NOT add
            Tailwind margin-top utilities here, they would override that. */}
        <div className="pt-10 -mx-4 sm:-mx-6 lg:-mx-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
