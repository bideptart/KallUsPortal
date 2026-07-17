import { Link } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';

export default function KnowledgePage() {
  const { signup, updateSignup } = useApp();
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-3xl font-bold">What should your agent know?</h1>

        <div className="mt-8 form-card">
          <div className="text-xs text-teal-400 uppercase font-semibold mb-4">🏢 Company info</div>
          <textarea
            className="input"
            rows={14}
            placeholder={'ABOUT US\n...\n\nHOURS\nMon-Fri 9am-6pm PT.\n\nPRICING\n...'}
            value={signup.kbCompany}
            onChange={(e) => updateSignup({ kbCompany: e.target.value })}
          />
        </div>

        <div className="mt-6 form-card">
          <div className="text-xs text-teal-400 uppercase font-semibold mb-4">❓ FAQs (optional)</div>
          <textarea
            className="input"
            rows={14}
            placeholder={'Q: What are your hours?\nA: Mon-Fri 9am-6pm Pacific.\n\nQ: Do you offer refunds?\nA: Yes, 30-day money back.'}
            value={signup.kbFaqs}
            onChange={(e) => updateSignup({ kbFaqs: e.target.value })}
          />
          <div className="field-help mt-2">
            Format: <code>Q:</code> on one line, <code>A:</code> on next, blank line between pairs.
          </div>
        </div>

        <div className="mt-6 form-card">
          <div className="text-xs text-teal-400 uppercase font-semibold mb-4">📄 Upload documents (optional)</div>
          <div className="rounded-lg p-10 text-center text-sm text-mute" style={{ border: '2px dashed #2a2a2a' }}>
            <div className="text-4xl">📄</div>
            <div className="mt-2">Drag-and-drop or <span className="text-teal-400 cursor-pointer underline">browse</span></div>
            <div className="text-xs mt-1">PDF, DOCX, TXT · up to 10 MB</div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <Link to="/signup/agent" className="btn-ghost">← Back</Link>
          <Link to="/signup/account" className="btn-teal">Next: Your details →</Link>
        </div>
      </div>
    </section>
  );
}
