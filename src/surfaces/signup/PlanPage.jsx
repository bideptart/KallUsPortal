import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';

// Yearly = 12 months at 20% off. The included-minutes / rate / agents allotments
// stay per-month — only the billing cadence and total upfront price change.
const YEARLY_DISCOUNT = 0.20;
const yearlyPrice = (monthly) => Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));

// India pricing — credit-model: pay upfront, consumed at per-minute rate.
// Per-minute rate reflects realistic Indian voice-AI cost (telephony + LLM +
// TTS + STT) plus a healthy margin. Round-rupee credit values keep the look
// conversion-friendly.
const PLANS = [
  {
    id: 'scale',
    label: 'Scale',
    amount: 29999,
    yearlyAmount: 287999,
    min: 3000,
    rate: 10,
    overage: 10,
    dids: 15,
    concurrent: 40,
    agents: 999,            // displayed as "Unlimited"
    voiceStack: 'Realtime + premium voices',
    support: 'Dedicated + SLA',
    tag: null,
    sub: 'High-volume call centers.',
    perks: [
      'Unlimited AI voice agents',
      '3,000 included minutes',
      '$10/min effective rate',
      '15 phone numbers (DIDs)',
      '40 concurrent calls',
      'Inbound calling',
      'Per-second billing (no minute-rounding)',
      'Realtime + premium voices',
      'Call recording',
      'Real-time transcription',
      'Dedicated success manager + SLA',
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    amount: 8799,
    yearlyAmount: 84479,
    min: 800,
    rate: 11,
    overage: 11,
    dids: 3,
    concurrent: 12,
    agents: 10,
    voiceStack: 'Standard + premium voices',
    support: 'Priority',
    tag: 'MOST POPULAR',
    sub: 'Most teams start here.',
    perks: [
      '10 AI voice agents',
      '800 included minutes',
      '$11/min effective rate',
      '3 phone numbers (DIDs)',
      '12 concurrent calls',
      'Inbound calling',
      'Per-second billing (no minute-rounding)',
      'Standard + premium voices',
      'Call recording',
      'Real-time transcription',
      'Priority support',
    ],
  },
  {
    id: 'starter',
    label: 'Starter',
    amount: 2999,
    yearlyAmount: 28799,
    min: 250,
    rate: 12,           // effective $/min
    overage: 12,        // overage $/min
    dids: 1,
    concurrent: 3,
    agents: 2,
    voiceStack: 'Standard',
    support: 'Email',
    tag: null,
    sub: 'Pilot a single agent.',
    perks: [
      '2 AI voice agents',
      '250 included minutes',
      '$12/min effective rate',
      '1 phone number (DID)',
      '3 concurrent calls',
      'Inbound calling',
      'Per-second billing (no minute-rounding)',
      'Standard voice stack',
      'Call recording',
      'Real-time transcription',
      'Email support',
    ],
  },
];

const inr = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
const agentsLabel = (n) => (n >= 999 ? 'Unlimited' : `${n} agent${n === 1 ? '' : 's'}`);

export default function PlanPage() {
  const { signup, updateSignup } = useApp();
  const navigate = useNavigate();
  // Honor a previously-saved cadence so users who go back/forward through the
  // signup flow see what they picked. Default to monthly for first-time visits.
  const [cycle, setCycle] = useState(signup.planCycle || 'monthly');

  // Honor an explicit yearlyAmount when present (keeps the $…99 price ladder).
  // Falls back to the 20%-off auto-derivation when not set.
  const yearlyFor = (p) => (typeof p.yearlyAmount === 'number' ? p.yearlyAmount : yearlyPrice(p.amount));
  const priceFor = (p) => (cycle === 'yearly' ? yearlyFor(p) : p.amount);

  const pickPlan = (p) => {
    updateSignup({
      plan: p.id,
      planAmount: priceFor(p),
      planMin: p.min,
      planRate: p.rate,
      planAgents: p.agents,
      planLabel: p.label,
      planCycle: cycle,
    });
  };

  // Re-pick whenever the user toggles the cadence — keeps the cart amount in
  // sync without making them click the plan card again.
  const setCycleAndRefresh = (next) => {
    setCycle(next);
    const current = PLANS.find((p) => p.id === signup.plan);
    if (current) {
      updateSignup({
        planAmount: next === 'yearly' ? yearlyFor(current) : current.amount,
        planCycle: next,
      });
    }
  };

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Pick your <span className="text-gradient">plan.</span>
        </h1>
        <p className="mt-3 text-mute">
          All plans include inbound calling, call recording, and real-time
          transcription — and bill by the <strong>second</strong>, not the minute.
          Prices in $, billed once as wallet credit.
        </p>

        {/* Billing-cycle toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setCycleAndRefresh('monthly')}
              className={`px-4 py-1.5 rounded-full transition ${
                cycle === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycleAndRefresh('yearly')}
              className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 ${
                cycle === 'yearly' ? 'bg-teal-500 text-white' : 'text-slate-700'
              }`}
            >
              Yearly
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                cycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
              }`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Per-second billing callout — the competitive moat. Nobody else in the
            Indian market bills by the second, so this gets a prominent badge. */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">
          <span>⏱️</span>
          <span><strong>Per-second billing</strong> — a 30-second call costs half a minute, not a full one. Industry first in India.</span>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((p) => {
            const selected = signup.plan === p.id;
            const cls = ['plan-card', p.tag ? 'popular' : '', selected ? 'selected' : '']
              .filter(Boolean).join(' ');
            const price = priceFor(p);
            return (
              <button key={p.id} className={cls} onClick={() => pickPlan(p)}>
                {p.tag && (
                  <span className="absolute -top-3 left-6 pill pill-teal">{p.tag}</span>
                )}
                <div className="text-lg font-semibold text-slate-900">{p.label}</div>
                <div className="text-sm text-mute mt-1">{p.sub}</div>

                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-slate-900">{inr(price)}</span>
                  <span className="text-mute text-sm ml-2">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                {cycle === 'yearly' && (
                  <div className="text-xs text-teal-600 mt-1">
                    Save {inr(p.amount * 12 - price)} vs monthly · ${Math.round(price / 12).toLocaleString('en-US')}/mo equivalent
                  </div>
                )}
                <div className="text-xs text-mute mt-1">
                  {p.min.toLocaleString('en-US')} included min · {inr(p.rate)}/min eff. ·{' '}
                  {agentsLabel(p.agents)}
                </div>

                <ul className="mt-6 space-y-2 text-sm text-slate-700 text-left">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="check shrink-0">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-mute">
          🇮🇳 GST charged at checkout. Top-ups available from $500. Cancel any time.
        </p>

        <div className="mt-8">
          <button
            className="btn-teal"
            disabled={!signup.plan}
            onClick={() => navigate('/signup/number')}
          >
            Next: Choose your number →
          </button>
        </div>
      </div>
    </section>
  );
}
