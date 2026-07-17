import { useState } from 'react';
import { api } from '../api.js';



// "Add a card" via hosted Stripe Checkout (mode: setup). One click here
// redirects the browser to checkout.stripe.com; after the user enters
// their card, Stripe redirects back to /dashboard/billing?session_id=...
// where Billing.jsx finalizes the save.
export default function AddCardForm({ onCancel }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    setBusy(true);
    setErr('');
    try {
      const { url } = await api('/api/stripe/checkout-session/setup', {
        method: 'POST',
        body: { returnPath: '/dashboard/billing' },
      });
      if (!url) throw new Error('Stripe did not return a checkout URL');
      window.location.href = url;
    } catch (e) {
      setErr(e.message || 'Could not start setup');
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="rounded-lg border border-line bg-ink-900 p-4 text-sm">
        <div className="font-medium mb-1">Add a card via Stripe</div>
        <p className="text-xs text-mute">
          You'll be redirected to Stripe's secure hosted page to enter your card.
          After saving, you'll come back to Billing automatically.
        </p>
      </div>

      {err && (
        <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
      )}

      <div className="mt-4 flex gap-2 justify-end">
        {onCancel && (
          <button type="button" className="btn-ghost text-sm" onClick={onCancel}>Cancel</button>
        )}
        <button type="button" className="btn-teal text-sm flex items-center gap-2" onClick={start} disabled={busy}>
          {busy ? 'Opening Stripe…' : <>🔗 Connect your card</>}
        </button>
      </div>
    </div>
  );
}
