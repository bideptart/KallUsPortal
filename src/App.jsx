import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import Signin from './surfaces/Signin.jsx';
import Terms from './surfaces/Terms.jsx';
import Privacy from './surfaces/Privacy.jsx';
import Customer from './surfaces/customer/Customer.jsx';
import Admin from './surfaces/admin/Admin.jsx';
import Reseller from './surfaces/reseller/Reseller.jsx';

function Loading() {
  return <main className="px-6 py-24 text-center text-mute text-sm">Loading session…</main>;
}

// The seeded/legacy admin row can have role='admin' while userType still
// sits at the users.user_type column's default ('user') if it was never set
// explicitly on insert — effectiveTier folds that legacy field in so a
// route's tier check agrees with homeFor() instead of fighting it (that
// mismatch used to send this exact account into an infinite /admin <->
// /admin redirect loop).
const effectiveTier = (user) => {
  if (!user) return null;
  if (user.userType === 'superadmin' || user.userType === 'admin') return user.userType;
  if (user.role === 'admin') return 'admin';
  return user.userType || 'user';
};

// Where each tier lands after signin. Source of truth — used by GuestOnly,
// RequireAuth, and any other "go home" jump.
const homeFor = (user) => {
  if (!user) return '/signin';
  const tier = effectiveTier(user);
  if (tier === 'superadmin' || tier === 'admin') return '/admin';
  // Sub-resellers share the same surface as resellers — they see their own
  // customers / purchases / plans, and can on-board further sub-resellers.
  if (tier === 'reseller' || tier === 'sub-reseller') return '/reseller';
  return '/dashboard';
};

function RequireAuth({ children, allow }) {
  const { currentUser, bootstrapping } = useApp();
  const location = useLocation();
  if (bootstrapping) return <Loading />;
  if (!currentUser) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  // `allow` is a Set of tiers this route accepts. If the user's tier isn't in
  // it, bounce to their natural home.
  if (allow && !allow.has(effectiveTier(currentUser))) {
    return <Navigate to={homeFor(currentUser)} replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { currentUser, bootstrapping } = useApp();
  if (bootstrapping) return <Loading />;
  if (currentUser) return <Navigate to={homeFor(currentUser)} replace />;
  return children;
}

function AppRoutes() {
  const { bootstrapping } = useApp();
  if (bootstrapping) return <Loading />;
  return (
    <Routes>
      {/* Default landing is the signin page. Logged-in users get bounced to
          their dashboard by GuestOnly inside the Signin route. */}
      <Route path="/" element={<Navigate to="/signin" replace />} />

      <Route path="/signin" element={<GuestOnly><Signin /></GuestOnly>} />

      {/* Legal pages — public, accessible from any footer link. */}
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Signup happens exclusively on the marketing site at www.9278.ai/get-started.
          Any direct hit on /signup/* here redirects to the signin form so
          customers can't stumble into the legacy in-portal signup flow. */}
      <Route path="/signup" element={<Navigate to="/signin" replace />} />
      <Route path="/signup/:step" element={<Navigate to="/signin" replace />} />

      {/* Customer dashboard: /dashboard/<tab> — tier 'user' (and superadmins
          impersonating, which is admin-routed elsewhere). */}
      <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
      <Route
        path="/dashboard/:tab"
        element={
          <RequireAuth allow={new Set(['user', 'superadmin'])}>
            <Customer />
          </RequireAuth>
        }
      />

      {/* Reseller dashboard: /reseller/<tab> — tier 'reseller'. */}
      <Route path="/reseller" element={<Navigate to="/reseller/customers" replace />} />
      <Route
        path="/reseller/:tab"
        element={
          <RequireAuth allow={new Set(['reseller', 'sub-reseller', 'superadmin'])}>
            <Reseller />
          </RequireAuth>
        }
      />

      {/* Admin: /admin/<tab> — tiers 'superadmin' and 'admin'. The legacy
          role='admin' field on admin@9278.ai is still honoured. */}
      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route
        path="/admin/:tab"
        element={
          <RequireAuth allow={new Set(['superadmin', 'admin'])}>
            <Admin />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Header />
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
