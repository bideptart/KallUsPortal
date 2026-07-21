import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Bot, FlaskConical, BookOpen, TrendingUp, Zap,
  FileText, CreditCard, Receipt, User, Menu, Wrench, Ticket, LogOut,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import Overview from './Overview.jsx';
import Analytics from './Analytics.jsx';
import Calls from './Calls.jsx';
import Recordings from './Recordings.jsx';
import Reports from './Reports.jsx';
import Meetings from './Meetings.jsx';
import AgentsList from './AgentsList.jsx';
import AgentDetail from './AgentDetail.jsx';
import ChatAgentDetail from './ChatAgentDetail.jsx';
import Templates from './Templates.jsx';
import Playground from './Playground.jsx';
import KnowledgeBase from './KnowledgeBase.jsx';
import Numbers, { AddNumberModal } from './Numbers.jsx';
import Billing from './Billing.jsx';
import Transactions from './Transactions.jsx';
import Tools from './Tools.jsx';
import BookingHistory from './BookingHistory.jsx';
import Tickets from './Tickets.jsx';
import Account from './Account.jsx';
import Logo from '../../components/Logo.jsx';
import Footer from '../../components/Footer.jsx';
import BookingIcon from '../../components/BookingIcon.jsx';

// Sidebar nav — unified across Admin/Customer to a common shape. "Agents" is
// the agents-list/table page; clicking a row goes to the per-agent editor.
// "Knowledge Base" is a library view — each agent's live knowledge plus
// reusable saved templates. "Analytics" gets its own page.
// Split around "Call Activity" so the collapsible group renders inline,
// right where the flat "Call Activity" entry used to sit (between Analytics
// and Reports) instead of at the end of the list.
const NAV_TABS_BEFORE_CALLS = [
  { id: 'overview',    label: 'Overview',       Icon: LayoutDashboard, Component: Overview },
  { id: 'agents',      label: 'Agents',         Icon: Bot,             Component: AgentsList },
  { id: 'playground',  label: 'Playground',     Icon: FlaskConical,    Component: Playground },
  { id: 'kb',          label: 'Knowledge Base', Icon: BookOpen,        Component: KnowledgeBase },
  { id: 'analytics',   label: 'Analytics',      Icon: TrendingUp,      Component: Analytics },
];
const NAV_TABS_AFTER_CALLS = [
  { id: 'reports',      label: 'Reports',           Icon: FileText,   Component: Reports },
  { id: 'billing',      label: 'Billing & minutes', Icon: CreditCard, Component: Billing },
  { id: 'transactions', label: 'Transactions',      Icon: Receipt,    Component: Transactions },
  { id: 'account',      label: 'Account',           Icon: User,       Component: Account },
];
const NAV_TABS = [...NAV_TABS_BEFORE_CALLS, ...NAV_TABS_AFTER_CALLS];

// "Call Activity" is a collapsible sidebar group: its own page (Calls) plus
// three sub-pages that nest under it.
const CALL_ACTIVITY = { id: 'calls', label: 'Call Activity', Icon: Zap, Component: Calls };
const CALL_ACTIVITY_CHILDREN = [
  { id: 'booking-history', label: 'Booking History', Icon: BookingIcon, Component: BookingHistory },
  { id: 'tools',           label: 'Tools',           Icon: Wrench,      Component: Tools },
  { id: 'tickets',         label: 'Tickets',         Icon: Ticket,      Component: Tickets },
];

// Legacy tab ids from the previous 11-item layout — kept valid (but not
// shown in the sidebar) so any existing bookmark or deep link still
// resolves instead of bouncing to Overview.
const LEGACY_TABS = [
  { id: 'numbers',      label: 'Plan and Numbers',   Component: Numbers },
  { id: 'recordings',   label: 'Recordings',         Component: Recordings },
  { id: 'meetings',     label: 'Scheduled meetings', Component: Meetings },
  // Reached by clicking a row on the Agents list — not a nav item itself.
  { id: 'agent-detail',      label: 'Agent',            Component: AgentDetail },
  { id: 'agent-detail-chat', label: 'Chat Agent',       Component: ChatAgentDetail },
  { id: 'templates',         label: 'Browse Templates', Component: Templates },
];

const TABS = [...NAV_TABS, CALL_ACTIVITY, ...CALL_ACTIVITY_CHILDREN, ...LEGACY_TABS];

export default function Customer() {
  const { currentUser, signoutUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);   // desktop-only: hides the sidebar entirely
  const [showAddPlan, setShowAddPlan] = useState(false);
  const callActivityActive = tab === CALL_ACTIVITY.id || CALL_ACTIVITY_CHILDREN.some((t) => t.id === tab);
  const [callActivityOpen, setCallActivityOpen] = useState(callActivityActive);

  // Close drawer when route changes
  useEffect(() => { setNavOpen(false); }, [tab]);

  // Auto-expand the group whenever navigation lands on it or one of its children.
  useEffect(() => { if (callActivityActive) setCallActivityOpen(true); }, [callActivityActive]);

  if (!currentUser) return null;

  const active = TABS.find((t) => t.id === tab);
  if (!active) return <Navigate to="/dashboard/overview" replace />;
  const Component = active.Component;

  const numberDisplay = currentUser.number?.value || '— no number yet —';
  const company = currentUser.company || currentUser.name || 'Your account';

  return (
    <div className={`dashboard-shell ${navCollapsed ? 'nav-collapsed' : ''}`}>
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <div className="h-16 flex items-center gap-1.5 px-3 bg-white sticky top-0 z-30">
          <Link to="/dashboard/overview" className="flex items-center gap-2 min-w-0" aria-label="kallus.io home">
            <Logo size={36} showWordmark={false} />
            <span className="font-mono text-sm lowercase text-mute tracking-tight whitespace-nowrap">kallus.io</span>
          </Link>
          <button
            type="button"
            className="hidden lg:inline-flex ml-auto shrink-0 w-6 h-6 items-center justify-center rounded-md text-mute hover:bg-slate-100 hover:text-slate-900 text-xs"
            onClick={() => setNavCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            «
          </button>
        </div>

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
        {NAV_TABS_BEFORE_CALLS.map((t) => (
          <Link
            key={t.id}
            to={`/dashboard/${t.id}`}
            className={tab === t.id ? 'active' : ''}
          >
            <t.Icon size={16} strokeWidth={2} /> {t.label}
          </Link>
        ))}

        <div className="nav-group">
          <button
            type="button"
            onClick={() => setCallActivityOpen((v) => !v)}
            className={`nav-group-toggle ${tab === CALL_ACTIVITY.id ? 'active' : ''}`}
            aria-expanded={callActivityOpen}
          >
            <CALL_ACTIVITY.Icon size={16} strokeWidth={2} />
            <span className="flex-1">{CALL_ACTIVITY.label}</span>
            <span
              className={`nav-group-chevron ${callActivityOpen ? 'is-open' : ''}`}
              aria-label={callActivityOpen ? 'Collapse Call Activity' : 'Expand Call Activity'}
            >
              ⌄
            </span>
          </button>
          {callActivityOpen && (
            <div className="nav-group-children">
              {CALL_ACTIVITY_CHILDREN.map((t) => (
                <Link
                  key={t.id}
                  to={`/dashboard/${t.id}`}
                  className={tab === t.id ? 'active' : ''}
                >
                  <t.Icon size={16} strokeWidth={2} /> {t.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {NAV_TABS_AFTER_CALLS.map((t) => (
          <Link
            key={t.id}
            to={`/dashboard/${t.id}`}
            className={tab === t.id ? 'active' : ''}
          >
            <t.Icon size={16} strokeWidth={2} /> {t.label}
          </Link>
        ))}

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={signoutUser} className="nav-group-toggle">
            <LogOut size={16} strokeWidth={2} /> Log out
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        {/* Sticky top bar — same 64px height as the sidebar logo so the
            shared border-b draws one continuous line across the page. The
            negative margins cancel dashboard-main's responsive padding so
            the bar (and its bg-white) extends edge-to-edge. No user-avatar
            widget here anymore (removed on request) — Sign Out, My Profile,
            Change Password, and Add Minutes are no longer reachable from
            the UI; Account settings still work via the Account nav tab. */}
        <div className="sticky top-0 z-30 bg-white -mt-5 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 border-b border-slate-200 mb-6">
          <button
            className="mobile-nav-toggle lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} /> Menu
          </button>
          {navCollapsed && (
            <button
              type="button"
              className="sidenav-expand-btn"
              onClick={() => setNavCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              »
            </button>
          )}
          <div className="lg:hidden flex items-center gap-1.5 text-xs text-mute font-semibold uppercase tracking-wider">
            {active.Icon && <active.Icon size={14} strokeWidth={2} />} {active.label}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" className="btn-teal text-sm whitespace-nowrap" onClick={() => setShowAddPlan(true)}>+ Add plan / number</button>
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

      {showAddPlan && (
        <AddNumberModal
          currentUser={currentUser}
          onClose={() => setShowAddPlan(false)}
          onAdded={() => setShowAddPlan(false)}
        />
      )}
    </div>
  );
}
