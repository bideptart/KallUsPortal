import { useParams, Navigate } from 'react-router-dom';
import PlanPage from './PlanPage.jsx';
import NumberPage from './NumberPage.jsx';
import AgentPage from './AgentPage.jsx';
import KnowledgePage from './KnowledgePage.jsx';
import AccountPage from './AccountPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import SuccessPage from './SuccessPage.jsx';

// Step name ↔ URL slug. Order matters — used to highlight progress.
export const SIGNUP_STEPS = [
  { slug: 'plan',      label: 'Plan',      Component: PlanPage },
  { slug: 'number',    label: 'Number',    Component: NumberPage },
  { slug: 'agent',     label: 'Agent',     Component: AgentPage },
  { slug: 'knowledge', label: 'Knowledge', Component: KnowledgePage },
  { slug: 'account',   label: 'Your info', Component: AccountPage },
  { slug: 'checkout',  label: 'Checkout',  Component: CheckoutPage },
  { slug: 'success',   label: 'Done',      Component: SuccessPage },
];

export default function Signup() {
  const { step } = useParams();
  const idx = SIGNUP_STEPS.findIndex((s) => s.slug === step);

  if (idx < 0) return <Navigate to="/signup/plan" replace />;

  const { Component } = SIGNUP_STEPS[idx];
  const currentStep = idx + 1;

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-wide text-mute flex-wrap">
          {SIGNUP_STEPS.slice(0, 6).map((s, i) => (
            <span key={s.slug} className="contents">
              <span
                style={{
                  color: i + 1 <= currentStep ? '#0ea5e9' : '#94a3b8',
                  fontWeight: i + 1 === currentStep ? 700 : 500,
                }}
              >
                {i + 1} · {s.label}
              </span>
              {i < 5 && <span className="text-slate-300">─</span>}
            </span>
          ))}
        </div>
      </div>

      <Component />
    </>
  );
}
