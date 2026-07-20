import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bot, Info, Copy, Plus, X } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

// =============================================================================
// Knowledge Base — a library view on top of the per-agent knowledge editor
// (KbAgent.jsx, mounted at "Agents"). Two lists:
//  - "From your agents": each agent's live kbCompany/kbFaqs/prompt, read
//    straight from /api/numbers. "Edit on agent" jumps to the real editor;
//    "Save a copy" snapshots it into a reusable template.
//  - "Saved knowledge bases": reusable templates. No backend table for
//    these yet, so they're persisted to localStorage only — they don't sync
//    across devices, but survive reloads on this browser.
// =============================================================================
const STORAGE_KEY = 'kb_saved_templates_v1';

const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const persistSaved = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore quota errors */ }
};

const qaCount = (faqs) => (String(faqs || '').match(/^Q:/gm) || []).length;

// Shown only when the account has no real numbers yet, so the page still
// demonstrates the "from your agents" card layout. Fake name/phone/content.
const DEMO_NUMBERS = [
  {
    id: 'demo-1',
    value: '+10000000099',
    agentName: 'Sample Agent',
    prompt: 'I am your technical support assistant. Please provide your organization ID, the exact error code or log output, and a brief description of the workflow that failed so we can help quickly.',
    kbCompany: 'Sample Co. is a fictional support desk used only to preview this layout, showing how an agent knowledge base looks once real company info, hours, pricing, and policies are filled in. It operates Monday through Friday from nine in the morning until six in the evening, offering technical support, billing help, and general account assistance to.',
    kbFaqs: Array.from({ length: 10 }, (_, i) => `Q: Sample question ${i + 1}?\nA: Sample answer ${i + 1}.`).join('\n\n'),
  },
];

export default function KnowledgeBase() {
  const { currentUser } = useApp();
  const isAdminTier = currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  const [numbers, setNumbers] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [saved, setSaved] = useState(() => loadSaved());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', kbCompany: '', kbFaqs: '' });

  useEffect(() => {
    (async () => {
      try {
        const r = await api('/api/numbers');
        const real = r.numbers || [];
        if (real.length === 0) { setNumbers(DEMO_NUMBERS); setIsDemo(true); }
        else { setNumbers(real); setIsDemo(false); }
      } catch {
        setNumbers(DEMO_NUMBERS); setIsDemo(true);
      }
    })();
  }, []);

  const saveCopy = (n) => {
    const tpl = {
      id: `tpl-${saved.length}-${n.id}-${saved.length + 1}`,
      name: `${n.agentName || 'Agent'} copy`,
      kbCompany: n.kbCompany || '',
      kbFaqs: n.kbFaqs || '',
      prompt: n.prompt || '',
    };
    const next = [tpl, ...saved];
    setSaved(next);
    persistSaved(next);
  };

  const createTemplate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const tpl = {
      id: `tpl-custom-${saved.length + 1}`,
      name: form.name.trim(),
      kbCompany: form.kbCompany.trim(),
      kbFaqs: form.kbFaqs.trim(),
      prompt: '',
    };
    const next = [tpl, ...saved];
    setSaved(next);
    persistSaved(next);
    setForm({ name: '', kbCompany: '', kbFaqs: '' });
    setCreating(false);
  };

  const deleteTemplate = (id) => {
    const next = saved.filter((t) => t.id !== id);
    setSaved(next);
    persistSaved(next);
  };

  const NewButton = ({ className = '' }) => (
    <button
      onClick={() => setCreating(true)}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition ${className}`}
    >
      <Plus className="w-4 h-4" /> New knowledge base
    </button>
  );

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Knowledge Base</h1>
          <p className="text-mute mt-0.5">Reusable templates — a greeting, company info, and behavior you can apply to any agent.</p>
        </div>
      </div>

      <NewButton className="mt-4" />

      <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10 p-4 flex gap-3">
        <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Every agent already has its own knowledge base. Save one here to <strong>reuse it across numbers</strong> — then
          apply it from the <Link to={`${basePath}/agents`} className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">Agents</Link> page
          under <strong>Import from knowledge base</strong>. The agent keeps its own editable copy.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <h2 className="font-bold text-slate-900 dark:text-slate-100">From your agents</h2>
        <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs">{numbers.length}</span>
      </div>
      <p className="text-sm text-mute mt-0.5">Each agent's live knowledge — click a card to edit it, or save a copy to reuse elsewhere.</p>

      <div className="mt-4 space-y-3">
        {numbers.map((n) => (
          <div key={n.id} className="form-card border-sky-200 dark:border-sky-500/30 ring-1 ring-sky-500/10">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Bot className="w-4 h-4" />
              </div>
              <span className="pill bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" /> Live
              </span>
            </div>
            <div className="mt-2 font-bold text-slate-900 dark:text-slate-100">{n.agentName || 'Unnamed agent'}</div>
            <a href={`tel:${n.value}`} className="text-sm text-lime-600 dark:text-lime-400 font-mono hover:underline">{n.value}</a>
            {n.prompt && (
              <p className="mt-2 text-sm text-mute italic line-clamp-2">“{n.prompt}”</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                {(n.kbCompany || '').length.toLocaleString()} chars info
              </span>
              <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                {qaCount(n.kbFaqs)} Q&amp;A
              </span>
              {n.prompt && (
                <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                  behavior set
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Link to={`${basePath}/agents`} className="text-sm text-lime-600 dark:text-lime-400 font-semibold hover:underline">
                Edit on agent →
              </Link>
              <button onClick={() => saveCopy(n)} className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                <Copy className="w-3.5 h-3.5" /> Save a copy
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2">
        <h2 className="font-bold text-slate-900 dark:text-slate-100">Saved knowledge bases</h2>
        <span className="pill bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs">{saved.length}</span>
      </div>
      <p className="text-sm text-mute mt-0.5">Reusable templates you can apply to any agent.</p>

      {saved.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-14 px-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="mt-4 font-bold text-slate-900 dark:text-slate-100">No saved knowledge bases yet</div>
          <p className="mt-1 text-sm text-mute max-w-md mx-auto">
            Build one from scratch, or hit <strong>Save a copy</strong> on an agent above to turn its setup into a reusable template.
          </p>
          <NewButton className="mt-4" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {saved.map((t) => (
            <div key={t.id} className="form-card">
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-slate-900 dark:text-slate-100">{t.name}</div>
                <button onClick={() => deleteTemplate(t.id)} className="text-mute hover:text-slate-900 dark:hover:text-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                  {(t.kbCompany || '').length.toLocaleString()} chars info
                </span>
                <span className="pill bg-white text-slate-700 border border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700 text-xs">
                  {qaCount(t.kbFaqs)} Q&amp;A
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New knowledge base — a blank reusable template, saved locally. */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <form onSubmit={createTemplate} className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New knowledge base</h2>
            <p className="mt-1 text-sm text-mute">A reusable template you can apply to any agent later.</p>

            <label className="field-label mt-4">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Support desk template" />

            <label className="field-label mt-3">Company info</label>
            <textarea className="input" rows={4} value={form.kbCompany} onChange={(e) => setForm((f) => ({ ...f, kbCompany: e.target.value }))} placeholder="Hours, pricing, policies…" />

            <label className="field-label mt-3">FAQs</label>
            <textarea className="input" rows={4} value={form.kbFaqs} onChange={(e) => setForm((f) => ({ ...f, kbFaqs: e.target.value }))} placeholder={'Q: ...\nA: ...'} />

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
              <button type="submit" className="btn-teal text-sm py-2 px-4">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
