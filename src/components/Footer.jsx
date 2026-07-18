import { Link } from 'react-router-dom';

// Lightweight footer used on the signin page + below the customer dashboard.
// Brand + legal-entity line on the left, legal links on the right, year
// auto-updates.
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          © {year} <strong>kallus.io</strong> · operated by <strong>TKOS</strong>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/terms" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline">
            Terms &amp; Conditions
          </Link>
          <Link to="/privacy" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline">
            Privacy Policy
          </Link>
          <a
            href="mailto:support@9278.ai"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
