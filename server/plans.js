export const YEARLY_DISCOUNT = 0.20;
export const yearlyPriceUsd = (monthly) => Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));

export const PLANS = [
  { id: 'scale', label: 'Scale', amount: 316, yearlyAmount: 3034, min: 3000, rate: 0.11, overage: 0.11, dids: 15, concurrent: 40, agents: 999, voiceStack: 'Realtime + premium voices', support: 'Dedicated + SLA', tag: null, sub: 'High-volume call centers.', perks: ['Unlimited AI voice agents', '3,000 included minutes', '$0.11/min effective rate', 'Inbound calling', 'Per-second billing', 'Realtime + premium voices', 'Call recording', 'Real-time transcription', 'Dedicated success manager + SLA'] },
  { id: 'growth', label: 'Growth', amount: 93, yearlyAmount: 893, min: 800, rate: 0.12, overage: 0.12, dids: 3, concurrent: 12, agents: 10, voiceStack: 'Standard + premium voices', support: 'Priority', tag: 'MOST POPULAR', sub: 'Most teams start here.', perks: ['10 AI voice agents', '800 included minutes', '$0.12/min effective rate', 'Inbound calling', 'Per-second billing', 'Standard + premium voices', 'Call recording', 'Real-time transcription', 'Priority support'] },
  { id: 'starter', label: 'Starter', amount: 31, yearlyAmount: 298, min: 250, rate: 0.13, overage: 0.13, dids: 1, concurrent: 3, agents: 2, voiceStack: 'Standard', support: 'Email', tag: null, sub: 'Pilot a single agent.', perks: ['2 AI voice agents', '250 included minutes', '$0.13/min effective rate', 'Inbound calling', 'Per-second billing', 'Standard voice stack', 'Call recording', 'Real-time transcription', 'Email support'] },
];

export const withYearly = (plans) => plans.map((p) => {
  const yearly = typeof p.yearlyAmount === 'number' ? p.yearlyAmount : yearlyPriceUsd(p.amount);
  return { ...p, yearlyAmount: yearly, yearlySavingsUsd: p.amount * 12 - yearly };
});
