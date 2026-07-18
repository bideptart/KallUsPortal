import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../AppContext.jsx';

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
};

const firstNameOf = (name) => {
  if (!name) return 'there';
  return String(name).trim().split(/\s+/)[0];
};

export default function TopBar() {
  const { currentUser, signoutUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Outside-click to close the avatar dropdown menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (!currentUser) return null;

  const planMin   = Number(currentUser.plan?.min) || 0;
  const minUsed   = Number(currentUser.minutesUsed) || 0;
  const planLeft  = Math.max(0, planMin - minUsed);
  const walletMin = Number(currentUser.walletMinutes) || 0;
  const totalLeft = planLeft + walletMin;

  const fullName = currentUser.name || currentUser.company || currentUser.email || 'Account';
  const initials = initialsOf(fullName);
  // Prefer the new four-tier user_type for the badge text so resellers and
  // superadmins don't show as "CUSTOMER". Falls back to legacy role.
  const role     = (currentUser.userType || currentUser.role || 'user').toUpperCase();
  // Admins/superadmins/resellers don't have a plan/minutes — suppress the
  // Check Balance pill so the top-right cluster collapses to just the
  // avatar + dropdown.
  const isCustomerTier = !['admin', 'superadmin', 'reseller', 'sub-reseller'].includes(currentUser.userType) && currentUser.role !== 'admin';
  const showBalance = isCustomerTier && currentUser.plan;

  // "● Live · taking calls" is shown for customers with a provisioned number.
  // Suppressed for admins (no DID) and for accounts whose provisioning hasn't
  // finished (status !== 'ready').
  const showLive = currentUser.role !== 'admin'
    && currentUser.number?.value
    && (currentUser.provisioning?.status || 'ready') === 'ready';

  return (
    <div className="flex items-center justify-end gap-2 sm:gap-3 relative">
      {/* Live pill — global indicator that the agent is taking calls. */}
      {showLive && (
        <span
          className="hidden sm:inline-flex pill bg-lime-100 text-lime-700 whitespace-nowrap text-xs font-semibold"
          title={`Live on ${currentUser.number.value}`}
        >
          ● Live · taking calls
        </span>
      )}

      {/* Check Balance — direct link to the billing page. The plan-period
          ring and remaining-days indicator have been removed; the pill is
          now a plain text link. */}
      {showBalance && (
        <Link
          to="/dashboard/billing"
          title="Go to Billing"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-50 hover:bg-lime-100 text-lime-700 text-sm font-semibold border border-lime-200 transition"
        >
          <span className="hidden sm:inline">💳 Check Balance</span>
          <span className="sm:hidden">{totalLeft.toFixed(0)}m</span>
        </Link>
      )}

      {/* User chip + dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          <span className="w-8 h-8 rounded-full bg-lime-500 text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-slate-900 leading-tight">Hi, {firstNameOf(fullName)}</div>
            <div className="text-[10px] text-mute uppercase tracking-wide">{role}</div>
          </div>
          <span className="text-mute text-xs">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
            {/* Profile header */}
            <div className="bg-lime-50 px-6 py-5 text-center">
              <div className="w-16 h-16 rounded-full bg-lime-500 text-white text-lg font-bold flex items-center justify-center mx-auto">
                {initials}
              </div>
              <div className="mt-2 text-xs text-lime-700 font-semibold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-500"></span> Online
              </div>
            </div>

            {/* Contact details */}
            <div className="px-5 py-4 text-sm space-y-2 border-b border-slate-100">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-slate-400 w-4">👤</span>
                <span className="truncate">{fullName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-slate-400 w-4">✉</span>
                <span className="truncate">{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="text-slate-400 w-4">📞</span>
                <span>{currentUser.phone || 'Not set'}</span>
              </div>
            </div>

            {/* Menu actions — customers get Profile/Password/Add Minutes;
                admins get only Sign out (their per-tab admin nav is the sidebar). */}
            {currentUser.role !== 'admin' && (
              <>
                <Link
                  to="/dashboard/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-sm text-slate-800"
                >
                  <span className="text-slate-400">📇</span> My Profile
                </Link>
                <Link
                  to="/dashboard/account?section=password"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-sm text-slate-800"
                >
                  <span className="text-slate-400">🔑</span> Change Password
                </Link>
                <Link
                  to="/dashboard/billing"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-sm text-slate-800"
                >
                  <span className="text-slate-400">💼</span> Add Minutes
                </Link>
              </>
            )}
            <button
              onClick={() => { setMenuOpen(false); signoutUser(); }}
              className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-red-50 text-sm text-red-500 border-t border-slate-100"
            >
              <span>↗</span> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
