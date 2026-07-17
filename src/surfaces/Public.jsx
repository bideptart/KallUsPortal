import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.jsx';

const FEATURES = [
  { icon: '📞', title: 'Real phone numbers', desc: 'Pick any local or toll-free number — purchased and routed instantly via Twilio.' },
  { icon: '🧠', title: 'Knowledge that learns', desc: 'Drop in your company info, FAQs and PDFs. Your agent answers from your own content.' },
  { icon: '⚡', title: 'Live in 30 seconds', desc: 'No code, no contracts. Pick a plan, pick a number, drop in a greeting — calls flow.' },
  { icon: '📊', title: 'Real-time analytics', desc: 'Sentiment, intents, transcripts and live spend — all from your dashboard.' },
];

const STATS = [
  { value: '< 300 ms', label: 'Time to live' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '$10', label: '/min at scale' },
  { value: '24 / 7', label: 'Always answering' },
];

export default function Public() {
  const { currentUser, bootstrapping } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (bootstrapping) return;
    if (currentUser) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [bootstrapping, currentUser, navigate]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center animate-fade-up">
          <span className="pill pill-teal">
            <span className="live-dot"></span>
            AI-native · Pay as you go · No contracts
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            AI voice agents that<br />
            <span className="text-gradient">answer every call.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-mute max-w-2xl mx-auto">
            NIXXY gives your business a phone line that answers itself. Pick a number,
            drop in your knowledge base, choose a voice — and go live in seconds.
          </p>
          <div className="mt-10 flex justify-center gap-3 flex-wrap">
            <Link to="/signup/plan" className="btn-teal text-base px-7 py-3">
              Get started →
            </Link>
            <Link to="/signin" className="btn-ghost text-base px-7 py-3">
              I already have an account
            </Link>
          </div>
        </div>

        {/* glow under hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-32 h-64 blur-3xl opacity-30"
          style={{
            background:
              'radial-gradient(closest-side, rgba(45,212,191,0.6), transparent 70%)',
          }}
        />
      </section>

      {/* STAT STRIP */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="form-card text-center py-6">
              <div className="text-3xl font-extrabold text-gradient">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-mute mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything your phone line needs.
          </h2>
          <p className="mt-3 text-mute">No telephony team required.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="form-card hover:-translate-y-1 transition-transform">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold">{f.title}</div>
              <p className="mt-2 text-sm text-mute leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="gradient-border">
          <div className="rounded-[14px] p-10 md:p-14 text-center bg-white">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
              Ready to <span className="text-gradient">stop missing calls?</span>
            </h3>
            <p className="mt-4 text-mute max-w-xl mx-auto">
              Spin up your AI receptionist in under a minute. Free preview, real number,
              real voice. Cancel any time.
            </p>
            <Link to="/signup/plan" className="btn-teal mt-8 text-base px-8 py-3 inline-block">
              Start free →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
