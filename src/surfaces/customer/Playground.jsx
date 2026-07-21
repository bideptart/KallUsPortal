import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Mic, MessageCircle, ChevronDown, Phone, SlidersHorizontal,
  Send, Check,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { useVoicePreview } from '../../hooks/useVoicePreview.js';
import { VOICES, gradientFor } from './KbAgent.jsx';

// Sample voice agent shown only when /api/numbers returns nothing — same
// "never overrides real data" rule as AgentsList/AgentDetail.
const DEMO_NUMBER = {
  id: 'demo-1',
  value: '+27 82 555 0148',
  agentName: 'KallUS Agent',
  greeting: 'Hi, thanks for calling…',
  prompt: 'You are a helpful customer support assistant. Be concise, friendly, and professional.',
  kbCompany: '', kbFaqs: '',
  voice: 'Kore', language: 'en-US',
};

// Same single preview chat agent shown on the Agents list — this account
// doesn't have a real chat-agent backend, so its config here is local-only
// (see ChatAgentDetail.jsx for the fuller version of this same honesty note).
const PREVIEW_CHAT_AGENT = {
  id: 'preview-chat',
  agentName: 'My Agent',
  greeting: 'Hi! How can I help you today?',
  prompt: 'You are a helpful customer support assistant. Be concise, friendly, and professional.',
  kbCompany: '', kbFaqs: '',
};

const CONFIG_TABS = [
  { id: 'behavior',  label: 'Behavior' },
  { id: 'greeting',  label: 'Greeting' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'voice',     label: 'Voice' },
];

function AgentPicker({ agents, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const current = agents.find((a) => a.id === selectedId) || agents[0];
  if (!current) return null;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center gap-2.5"
        style={{ minWidth: 220 }}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ background: gradientFor(current.id) }}
        >
          {(current.agentName || '?')[0].toUpperCase()}
        </span>
        <span className="flex-1 text-left min-w-0">
          <span className="block font-semibold text-sm truncate">{current.agentName}</span>
          <span className="block text-xs text-mute truncate">{current.type === 'chat' ? 'Chat agent' : current.value}</span>
        </span>
        <ChevronDown size={14} className="text-mute flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 py-1">
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: gradientFor(a.id) }}
              >
                {(a.agentName || '?')[0].toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-sm truncate">{a.agentName}</span>
                <span className="block text-xs text-mute truncate">{a.type === 'chat' ? 'Chat agent' : a.value}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Playground() {
  const { currentUser, demoAgent, patchDemoAgent } = useApp();
  const navigate = useNavigate();
  const { playingVoice, error: previewError, play } = useVoicePreview();

  const [numbers, setNumbers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState('voice');
  const [selectedId, setSelectedId] = useState(null);
  const [configOpen, setConfigOpen] = useState(true);
  const [configTab, setConfigTab] = useState('behavior');
  const [draft, setDraft] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Live Conversation transcript — simulated (no live speech-to-text
  // pipeline wired up yet, same "isn't wired up yet" state as the voice
  // test itself), but appended progressively like a real conversation so
  // the panel demos properly.
  const [transcript, setTranscript] = useState([]);
  const transcriptScrollRef = useRef(null);
  const transcriptTimers = useRef([]);

  useEffect(() => () => { transcriptTimers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Live Voice Status — 'listening'/'processing' are simulated (brief
  // transitional phases right after clicking Start), but 'speaking' and
  // 'error' track the real playingVoice/previewError signals from
  // useVoicePreview, so those two always win over the simulated phase.
  const [voiceStatus, setVoiceStatus] = useState('ready');
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const listeningTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const sessionStartRef = useRef(null);

  useEffect(() => {
    if (previewError) { setVoiceStatus('error'); return; }
    if (playingVoice) { setVoiceStatus('speaking'); return; }
    if (!testing) setVoiceStatus('ready');
  }, [testing, playingVoice, previewError]);

  useEffect(() => {
    if (voiceStatus === 'ready') {
      if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
      sessionStartRef.current = null;
      setSessionElapsedMs(0);
      return;
    }
    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
      sessionTimerRef.current = setInterval(() => {
        setSessionElapsedMs(Date.now() - sessionStartRef.current);
      }, 250);
    }
  }, [voiceStatus]);

  useEffect(() => () => {
    clearTimeout(listeningTimerRef.current);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
  }, []);

  const fmtSessionDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const VOICE_STATUS_CONFIG = {
    ready:      { dot: 'bg-emerald-500', title: 'Ready' },
    listening:  { dot: 'bg-blue-500 animate-pulse', title: 'Listening...' },
    processing: { dot: 'bg-amber-400 animate-pulse', title: 'Thinking...' },
    speaking:   { dot: 'bg-lime-500 animate-pulse', title: 'Speaking...' },
    error:      { dot: 'bg-red-500', title: 'Voice test error' },
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api('/api/numbers');
        if (!cancelled) setNumbers(r.numbers || []);
      } catch {}
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const demoMode = loaded && numbers.length === 0;
  const voiceAgents = useMemo(() => (demoMode ? [{ ...DEMO_NUMBER, ...demoAgent }] : numbers).map((n) => ({
    id: n.id, type: 'voice', agentName: n.agentName || n.label || 'Unnamed agent', value: n.value,
    greeting: n.greeting || '', prompt: n.prompt || '', kbCompany: n.kbCompany || '', kbFaqs: n.kbFaqs || '',
    voice: n.voice || 'Kore', language: n.language || 'en-US',
  })), [numbers, demoMode, demoAgent]);

  const agents = useMemo(() => [
    ...voiceAgents,
    { id: PREVIEW_CHAT_AGENT.id, type: 'chat', agentName: PREVIEW_CHAT_AGENT.agentName, value: null,
      greeting: PREVIEW_CHAT_AGENT.greeting, prompt: PREVIEW_CHAT_AGENT.prompt,
      kbCompany: PREVIEW_CHAT_AGENT.kbCompany, kbFaqs: PREVIEW_CHAT_AGENT.kbFaqs, voice: null, language: null },
  ], [voiceAgents]);

  // Mode governs which agent type is testable — switching modes jumps the
  // picker to the first matching agent instead of showing a mismatched one.
  useEffect(() => {
    if (!loaded) return;
    const wantType = mode === 'chat' ? 'chat' : 'voice';
    const stillValid = agents.find((a) => a.id === selectedId && a.type === wantType);
    if (!stillValid) setSelectedId(agents.find((a) => a.type === wantType)?.id || null);
  }, [mode, loaded]);

  const selected = agents.find((a) => a.id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const d = { greeting: selected.greeting, prompt: selected.prompt, kbCompany: selected.kbCompany, kbFaqs: selected.kbFaqs, voice: selected.voice };
    setDraft(d);
    setSavedDraft(d);
    setChatLog([]);
  }, [selectedId]);

  useEffect(() => { if (!playingVoice) setTesting(false); }, [playingVoice]);
  useEffect(() => { if (previewError) setTesting(false); }, [previewError]);

  if (!currentUser || !draft) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  // Was JSON.stringify(draft) !== JSON.stringify(savedDraft) — re-serializing
  // the whole draft (prompt/company/FAQs can run up to 50,000 chars each) on
  // every render made every keystroke in those fields laggy. A per-field
  // comparison is O(1) for the untouched fields instead.
  const dirty = draft.greeting !== savedDraft.greeting
    || draft.prompt !== savedDraft.prompt
    || draft.kbCompany !== savedDraft.kbCompany
    || draft.kbFaqs !== savedDraft.kbFaqs
    || draft.voice !== savedDraft.voice;
  const isChatAgent = selected.type === 'chat';
  const isAdminTier = currentUser.userType === 'superadmin' || currentUser.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  const save = async () => {
    if (isChatAgent) return; // no real backend for the chat agent — stays a local preview
    // No real backend to save to in demo mode — write into the shared
    // demo-agent record instead, so the Agent editor picks up the same values.
    if (demoMode) {
      patchDemoAgent(draft);
      setSavedDraft(draft);
      return;
    }
    setSaving(true);
    try {
      const r = await api(`/api/numbers/${selected.id}`, {
        method: 'PATCH',
        body: { greeting: draft.greeting, prompt: draft.prompt, kbCompany: draft.kbCompany, kbFaqs: draft.kbFaqs, voice: draft.voice },
      });
      setNumbers((ns) => ns.map((n) => (n.id === selected.id ? r.number : n)));
      setSavedDraft(draft);
    } catch {
      // Save bar below shows dirty state persisting on failure — same
      // pattern as AgentDetail.jsx's save().
    } finally {
      setSaving(false);
    }
  };

  const appendTranscript = (from, text) => {
    setTranscript((t) => [...t, { from, text, time: new Date() }]);
  };

  const startVoiceTest = () => {
    setTesting(true);
    setVoiceStatus('listening');
    play(draft.voice, selected.language || 'en-US');

    clearTimeout(listeningTimerRef.current);
    listeningTimerRef.current = setTimeout(() => {
      setVoiceStatus((s) => (s === 'listening' ? 'processing' : s));
    }, 600);

    transcriptTimers.current.forEach(clearTimeout);
    transcriptTimers.current = [];
    setTranscript([]);
    transcriptTimers.current.push(setTimeout(() => {
      appendTranscript('agent', draft.greeting || 'Hello! How can I help you today?');
    }, 300));
    transcriptTimers.current.push(setTimeout(() => {
      appendTranscript('user', "I'd like to book an appointment.");
    }, 1800));
    transcriptTimers.current.push(setTimeout(() => {
      appendTranscript('agent', 'Sure! What date would you prefer?');
    }, 3200));
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatLog((log) => [...log, { from: 'user', text }, { from: 'system', text: "Live chat testing isn't wired up yet — this agent isn't connected to a model." }]);
    setChatInput('');
  };

  const fullEditorPath = isChatAgent ? `${basePath}/agent-detail-chat?n=${encodeURIComponent(selected.id)}` : `${basePath}/agent-detail?n=${encodeURIComponent(selected.id)}`;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
          <FlaskConical size={20} color="#fff" />
        </span>
        <div>
          <h1 className="text-2xl font-display font-bold">Playground</h1>
          <p className="text-mute mt-0.5 text-sm">Test your agents and tune them right here — no page hopping. Free, no plan minutes used.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            {[{ id: 'voice', label: 'Voice', Icon: Mic }, { id: 'chat', label: 'Chat', Icon: MessageCircle }].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1.5"
                style={mode === m.id ? { background: '#fff', color: 'var(--ink)', boxShadow: '0 1px 2px rgba(15,23,42,.08)' } : { color: 'var(--ink-3)' }}
              >
                <m.Icon size={14} /> {m.label}
              </button>
            ))}
          </div>
          <AgentPicker agents={agents.filter((a) => a.type === mode)} selectedId={selectedId} onChange={setSelectedId} />
        </div>
        <button type="button" className="btn-ghost text-sm inline-flex items-center gap-1.5" onClick={() => setConfigOpen((v) => !v)}>
          <SlidersHorizontal size={14} /> {configOpen ? 'Hide config' : 'Show config'}
        </button>
      </div>

      <div className={`mt-4 grid gap-6 items-start ${configOpen ? 'lg:grid-cols-[1fr_380px]' : ''}`}>
        {/* === Test panel ================================================ */}
        <div className="form-card">
          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: gradientFor(selected.id) }}
            >
              {(selected.agentName || '?')[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{selected.agentName}</div>
              <div className="text-xs text-mute truncate">
                {isChatAgent ? 'Chat agent' : selected.value}{!isChatAgent && draft.voice ? ` · ${draft.voice}` : ''}
              </div>
            </div>
          </div>

          {mode === 'voice' ? (
            <div className="mt-8 flex flex-col items-center text-center py-6">
              {/* Live Voice Status — listening/processing are brief
                  simulated phases right after Start; speaking/error track
                  the real playingVoice/previewError signals from
                  useVoicePreview, so those two always take priority. */}
              <div
                className="w-full max-w-xs rounded-xl border bg-white px-4 py-3 text-left transition-all duration-300"
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${VOICE_STATUS_CONFIG[voiceStatus].dot}`} />
                  <span className="text-sm font-semibold text-slate-900">{VOICE_STATUS_CONFIG[voiceStatus].title}</span>
                </div>
                <div className="mt-1 text-xs text-mute space-y-0.5">
                  {voiceStatus === 'ready' && (
                    <>
                      <div>Microphone connected</div>
                      <div>Voice: {draft.voice}</div>
                    </>
                  )}
                  {voiceStatus === 'listening' && <div>Waiting for user input</div>}
                  {voiceStatus === 'processing' && <div>Generating response</div>}
                  {voiceStatus === 'speaking' && <div>AI is responding</div>}
                  {voiceStatus === 'error' && <div>{previewError || 'Please connect your microphone.'}</div>}
                </div>
                {voiceStatus !== 'ready' && (
                  <div className="mt-2 pt-2 border-t text-[11px] text-mute space-y-0.5" style={{ borderColor: 'var(--line-2)' }}>
                    {(voiceStatus === 'processing' || voiceStatus === 'speaking') && <div>Latency: 220 ms</div>}
                    {voiceStatus === 'speaking' && <div>Response time: 1.3 s</div>}
                    {voiceStatus !== 'error' && <div>Session duration: {fmtSessionDuration(sessionElapsedMs)}</div>}
                  </div>
                )}
              </div>

              <div className="relative w-36 h-36 rounded-full flex items-center justify-center mt-6" style={{ background: 'var(--surface-tint)' }}>
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl ${testing ? 'animate-pulse' : ''}`}
                  style={{ background: gradientFor(selected.id) }}
                >
                  {(selected.agentName || '?')[0].toUpperCase()}
                </div>
              </div>

              {/* Live Conversation transcript — simulated (no live
                  speech-to-text pipeline yet), appended progressively so it
                  reads like a real conversation while the voice sample plays. */}
              <div className="mt-6 w-full max-w-sm text-left rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--line)' }}>
                <div className="px-3 py-2 border-b text-xs font-semibold text-slate-900" style={{ borderColor: 'var(--line)' }}>
                  Live Conversation
                </div>
                <div ref={transcriptScrollRef} className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 300 }}>
                  {transcript.length === 0 ? (
                    <p className="text-xs text-mute">
                      Your conversation transcript will appear here once the voice test begins.
                    </p>
                  ) : (
                    transcript.map((m, i) => (
                      <div key={i} className={`animate-fade-up flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                          <div className="text-[10px] text-mute mb-1">
                            {m.from === 'user' ? 'User' : 'Agent'} · {m.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <div
                            className={`inline-block rounded-xl px-3 py-2 text-sm text-left ${
                              m.from === 'user'
                                ? 'bg-slate-100 text-slate-900 rounded-tr-sm'
                                : 'bg-lime-50 text-slate-900 rounded-tl-sm'
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-teal mt-6 inline-flex items-center gap-2"
                onClick={startVoiceTest}
                disabled={!draft.voice}
              >
                <Phone size={15} /> {testing ? 'Playing…' : 'Start voice test'}
              </button>
              <p className="mt-3 text-xs text-mute max-w-xs">
                Plays a sample of {draft.voice}'s voice — live two-way voice testing from your browser isn't wired up yet.
              </p>
              {previewError && <p className="mt-1 text-xs text-red-600">{previewError}</p>}
            </div>
          ) : (
            <div className="mt-5">
              <div className="min-h-[220px] max-h-[320px] overflow-y-auto rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                <div className="max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 text-sm bg-white" style={{ color: 'var(--ink)' }}>
                  {draft.greeting || 'Hi! How can I help you today?'}
                </div>
                {chatLog.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === 'user' ? 'ml-auto rounded-tr-sm text-white' : 'rounded-tl-sm bg-white'}`}
                    style={m.from === 'user' ? { background: 'var(--primary)' } : { color: 'var(--ink-3)', fontStyle: 'italic' }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                />
                <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }} onClick={sendChatMessage}>
                  <Send size={15} color="#fff" />
                </button>
              </div>
              <p className="mt-2 text-xs text-mute">Free, no plan minutes used.</p>
            </div>
          )}
        </div>

        {/* === Configure panel =========================================== */}
        {configOpen && (
          <div className="form-card lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold inline-flex items-center gap-1.5"><SlidersHorizontal size={15} /> Configure</div>
              <span className="pill text-[9px]" style={{ background: 'var(--line-2)', color: 'var(--ink-3)' }}>
                {isChatAgent ? 'CHAT AGENT' : 'VOICE AGENT'}
              </span>
            </div>

            <div className="mt-3 flex border-b" style={{ borderColor: 'var(--line-2)' }}>
              {CONFIG_TABS.filter((t) => !(isChatAgent && t.id === 'voice')).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConfigTab(t.id)}
                  className="flex-1 py-2.5 text-xs font-semibold border-b-2"
                  style={configTab === t.id ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { borderColor: 'transparent', color: 'var(--ink-3)' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {configTab === 'behavior' && (
                <>
                  <label className="field-label">System prompt</label>
                  <textarea className="input" rows={10} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
                  <div className="field-help">{draft.prompt.length.toLocaleString()} / 50,000</div>
                </>
              )}
              {configTab === 'greeting' && (
                <>
                  <label className="field-label">{isChatAgent ? 'Welcome message' : 'Greeting (first line on every call)'}</label>
                  <textarea className="input" rows={4} value={draft.greeting} onChange={(e) => set({ greeting: e.target.value })} />
                </>
              )}
              {configTab === 'knowledge' && (
                <>
                  <label className="field-label">Company info</label>
                  <textarea className="input" rows={5} value={draft.kbCompany} onChange={(e) => set({ kbCompany: e.target.value })} placeholder="About your company…" />
                  <label className="field-label mt-3">FAQ pairs</label>
                  <textarea className="input" rows={5} value={draft.kbFaqs} onChange={(e) => set({ kbFaqs: e.target.value })} placeholder={'Q: What are your hours?\nA: Mon–Fri 9–6.'} />
                </>
              )}
              {configTab === 'voice' && !isChatAgent && (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {VOICES.map((v) => {
                    const sel = draft.voice === v.value;
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => set({ voice: v.value })}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left"
                        style={sel ? { background: 'var(--surface-tint)' } : undefined}
                      >
                        <span>
                          <span className="block text-sm font-semibold">{v.label}</span>
                          <span className="block text-xs text-mute">{v.desc}</span>
                        </span>
                        {sel && <Check size={14} style={{ color: 'var(--primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--line-2)' }}>
              <span className="text-xs text-mute inline-flex items-center gap-1">
                {isChatAgent ? "Preview — not saved" : dirty ? 'Unsaved' : (<><Check size={12} className="text-lime-600" /> Saved</>)}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost text-sm" disabled={!dirty} onClick={() => setDraft(savedDraft)}>Reset</button>
                <button type="button" className="btn-teal text-sm" disabled={!dirty || saving || isChatAgent} onClick={save}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {!isChatAgent && (
              <p className="mt-3 text-xs text-mute">
                Voice changes take ~2 min to go live, then restart the test to hear them.{' '}
                <button type="button" className="font-semibold" style={{ color: 'var(--primary)' }} onClick={() => navigate(fullEditorPath)}>
                  Full editor →
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
