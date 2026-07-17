import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../../AppContext.jsx';

export default function AccountPage() {
  const { signup, updateSignup } = useApp();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const pwdStrength = (() => {
    const p = signup.mePwd || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  })();

  const missing = [];
  if (!signup.meName.trim()) missing.push('Full name');
  if (!signup.meCompany.trim()) missing.push('Company');
  if (!signup.meUsername.trim()) missing.push('Username');
  if (!/\S+@\S+\.\S+/.test(signup.meEmail.trim())) missing.push('valid Email');
  if (signup.mePwd.length < 8) missing.push('Password (8+ chars)');
  else if (!/[A-Z]/.test(signup.mePwd) || !/[a-z]/.test(signup.mePwd) || !/[0-9]/.test(signup.mePwd)) {
    missing.push('Password (need upper, lower, digit)');
  }

  const F = (key, props = {}) => (
    <input
      className="input"
      value={signup[key]}
      onChange={(e) => updateSignup({ [key]: e.target.value })}
      {...props}
    />
  );

  const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][pwdStrength];
  const strengthColor = ['#ef4444', '#f97316', '#eab308', '#0ea5e9', '#10b981'][pwdStrength];

  return (
    <section className="animate-fade-up">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* ============== LEFT: FORM ============== */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Your <span className="text-gradient">account.</span>
              </h1>
              <p className="text-mute mt-2 text-[15px]">
                We'll use this to email your dashboard login and welcome guide.
              </p>
            </div>

            <div className="gradient-border">
              <div className="rounded-[16px] p-7 md:p-8">
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-white"
                        style={{ background: 'linear-gradient(135deg, var(--grad-start), var(--grad-end))' }}>
                    👤
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Account details</div>
                    <div className="text-xs text-mute">Required to provision your portal</div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <label className="field-label field-required">Full name</label>
                    {F('meName', { placeholder: 'Jane Doe', autoComplete: 'name' })}
                  </div>
                  <div>
                    <label className="field-label field-required">Company name</label>
                    {F('meCompany', { placeholder: 'Acme Inc.', autoComplete: 'organization' })}
                  </div>
                  <div>
                    <label className="field-label field-required">Username</label>
                    {F('meUsername', { placeholder: 'jane_admin', autoComplete: 'username' })}
                    <div className="field-help">Letters, numbers, underscore.</div>
                  </div>
                  <div>
                    <label className="field-label field-required">Work email</label>
                    {F('meEmail', { placeholder: 'you@company.com', autoComplete: 'email', type: 'email' })}
                  </div>
                  <div>
                    <label className="field-label">Phone <span className="text-mute font-normal">(optional)</span></label>
                    {F('mePhone', { placeholder: '+1 ...', autoComplete: 'tel' })}
                  </div>
                  <div>
                    <label className="field-label field-required">Password</label>
                    <div className="relative">
                      <input
                        className="input pr-12"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={signup.mePwd}
                        onChange={(e) => updateSignup({ mePwd: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-mute hover:text-slate-900 px-2 py-1 rounded"
                      >
                        {showPwd ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {signup.mePwd.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-1.5 flex-1 rounded-full transition-colors"
                              style={{ background: i < pwdStrength ? strengthColor : '#e2e8f0' }}
                            />
                          ))}
                        </div>
                        <div className="mt-1.5 text-xs font-medium" style={{ color: strengthColor }}>
                          {strengthLabel}
                        </div>
                      </div>
                    )}
                    <div className="field-help">8+ chars · upper, lower, number.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <Link to="/signup/knowledge" className="btn-ghost">← Back</Link>
              <div className="flex items-center gap-3">
                {missing.length > 0 && (
                  <span className="hidden sm:inline text-xs text-amber-600 max-w-xs text-right">
                    Missing: {missing.join(', ')}
                  </span>
                )}
                <button
                  className="btn-teal"
                  disabled={missing.length > 0}
                  onClick={() => navigate('/signup/checkout')}
                >
                  Next: Checkout →
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-mute mt-6">
              Already have an account?{' '}
              <Link to="/signin" className="text-sky-600 font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          {/* ============== RIGHT: SUMMARY ============== */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="soft-card p-5">
                <div className="text-xs uppercase tracking-[0.12em] text-mute font-semibold mb-3">
                  Order summary
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-mute">Plan</span>
                    <span className="font-medium text-right text-slate-900">
                      {signup.planLabel || '—'}
                      {signup.planAmount ? <div className="text-xs text-mute">${signup.planAmount}/mo</div> : null}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-mute">Number</span>
                    <span className="font-medium text-right text-slate-900">
                      {signup.number || '—'}
                      {signup.numberLoc ? <div className="text-xs text-mute">{signup.numberLoc}</div> : null}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-mute">Agent</span>
                    <span className="font-medium text-right text-slate-900">
                      {signup.agentName || '—'}
                      {signup.voice ? <div className="text-xs text-mute">{signup.voice}</div> : null}
                    </span>
                  </div>
                </div>
              </div>

              <div className="soft-card p-5 mt-4">
                <div className="text-xs uppercase tracking-[0.12em] text-mute font-semibold mb-3">
                  Why 9278.ai
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-sky-500 font-bold">✓</span>
                    <span>Live in 30 seconds — no contracts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-500 font-bold">✓</span>
                    <span>Real phone numbers via Twilio</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-500 font-bold">✓</span>
                    <span>Wallet billing — only pay per minute</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-sky-500 font-bold">✓</span>
                    <span>Transcripts, sentiment, live analytics</span>
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-mute mt-4 leading-relaxed text-center">
                🔒 By creating an account you agree to our terms & privacy policy.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
