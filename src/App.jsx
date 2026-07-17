import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import Terms from './surfaces/Terms.jsx';
import Privacy from './surfaces/Privacy.jsx';
import Customer from './surfaces/customer/Customer.jsx';
import Admin from './surfaces/admin/Admin.jsx';
import Reseller from './surfaces/reseller/Reseller.jsx';

function Loading() {
  return <main className="px-6 py-24 text-center text-mute text-sm">Loading…</main>;
}

// Open-access mode: the login/signup pages have been removed and the app
// auto-establishes a session on boot (see AppContext). This wrapper only waits
// for that bootstrap to finish, then renders the route — there is no sign-in
// redirect and no per-tier gate anymore.
function Ready({ children }) {
  const { bootstrapping } = useApp();
  if (bootstrapping) return <Loading />;
  return children;
}

function AppRoutes() {
  const { bootstrapping } = useApp();
  if (bootstrapping) return <Loading />;
  return (
    <Routes>
      {/* Land straight on the dashboard — the app is open, no login. */}
      <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />

      {/* Legal pages — public. */}
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Customer dashboard: /dashboard/<tab>. */}
      <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
      <Route path="/dashboard/:tab" element={<Ready><Customer /></Ready>} />

      {/* Reseller dashboard: /reseller/<tab>. */}
      <Route path="/reseller" element={<Navigate to="/reseller/customers" replace />} />
      <Route path="/reseller/:tab" element={<Ready><Reseller /></Ready>} />

      {/* Admin dashboard: /admin/<tab>. */}
      <Route path="/admin" element={<Navigate to="/admin/signups" replace />} />
      <Route path="/admin/:tab" element={<Ready><Admin /></Ready>} />

      <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
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
