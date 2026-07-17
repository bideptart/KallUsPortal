// Shared Stripe Elements config + loader. Anything that collects a card
// goes through here so the appearance and the loader memoization are
// consistent across CheckoutPage and Billing's AddCardForm.

import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;
export function getStripe(publishableKey) {
  if (!stripePromise && publishableKey) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

// Stripe Elements appearance. We keep this minimal — Stripe is strict and
// any unknown / malformed rule silently aborts Elements initialization (so
// PaymentElement never fires onReady and you see a blank box). All overrides
// here are the Stripe-documented variables only.
export const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#2dd4bf',
    colorBackground: '#0a0c12',
    colorText: '#f1f5f9',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '10px',
  },
};
// Options for Elements provider in setup (no-charge) mode — used for
// saving a card for future off-session charges.
//
// Stripe is strict: don't pass `payment_method_types` here — it's not the
// expected key for the Elements provider in deferred mode and Stripe will
// reject the options block, which makes PaymentElement render nothing.
// `paymentMethodCreation: 'manual'` lets us tokenize the card without
// needing a SetupIntent client_secret first.
export const setupModeOptions = (currency = 'usd') => ({
  mode: 'setup',
  currency,
  paymentMethodCreation: 'manual',
  appearance: STRIPE_APPEARANCE,
});
