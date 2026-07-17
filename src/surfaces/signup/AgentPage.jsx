import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import { useVoicePreview } from '../../hooks/useVoicePreview.js';

const VOICES = {
  'Standard · Female': [
    { id: 'nova', name: 'Nova', desc: 'Warm, friendly' },
    { id: 'shimmer', name: 'Shimmer', desc: 'Bright, positive' },
  ],
  'Standard · Male': [
    { id: 'echo', name: 'Echo', desc: 'Deep, resonant' },
    { id: 'fable', name: 'Fable', desc: 'British, expressive' },
    { id: 'onyx', name: 'Onyx', desc: 'Authoritative' },
  ],
  'HD · Female': [
    { id: 'coral', name: 'Coral', desc: 'Balanced, clear' },
    { id: 'sage', name: 'Sage', desc: 'Wise, calm' },
  ],
};

function VoiceRow({ voice, selected, onSelect, playing, onPlay }) {
  return (
    <div className={`voice-row${selected ? ' selected' : ''}`} onClick={onSelect}>
      <div>
        <div className="voice-name font-medium text-sm">{voice.name}{selected ? ' ✓' : ''}</div>
        <div className="text-xs text-mute">{voice.desc}</div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className="ml-2 w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-teal-500/20"
        style={{
          color: playing ? '#06121a' : (selected ? '#5eead4' : '#94a3b8'),
          background: playing ? 'linear-gradient(135deg, #2dd4bf, #22d3ee)' : 'transparent',
        }}
        title={playing ? 'Stop preview' : 'Play 5-second preview'}
      >
        {playing ? '◼' : '▶'}
      </button>
    </div>
  );
}

export default function AgentPage() {
  const { signup, updateSignup } = useApp();
  const navigate = useNavigate();
  const { playingVoice, error: previewError, play } = useVoicePreview();
  const ok = signup.agentName.trim() && signup.greeting.trim() && signup.prompt.trim();

  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-3xl font-bold">Set up your agent</h1>

        <div className="mt-8 form-card">
          <div className="text-xs text-teal-400 uppercase font-semibold mb-4">🪪 Identity</div>
          <label className="field-label field-required">Agent name</label>
          <input
            className="input input-lg"
            placeholder="e.g. Acme Receptionist"
            value={signup.agentName}
            onChange={(e) => updateSignup({ agentName: e.target.value })}
          />

          <div className="mt-6">
            <label className="field-label field-required">Greeting</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Hi, thanks for calling [Company]. How can I help?"
              value={signup.greeting}
              onChange={(e) => updateSignup({ greeting: e.target.value })}
            />
          </div>
          <div className="mt-6">
            <label className="field-label field-required">Behavior &amp; routing instructions</label>
            <textarea
              className="input"
              rows={6}
              placeholder="You are the AI receptionist for [Company]..."
              value={signup.prompt}
              onChange={(e) => updateSignup({ prompt: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 form-card">
          <div className="text-xs text-teal-400 uppercase font-semibold mb-4">🗣 Voice</div>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-1">
            <div>
              {Object.entries(VOICES).slice(0, 2).map(([section, list]) => (
                <div key={section}>
                  <div className="voice-section-label">{section}</div>
                  {list.map((v) => (
                    <VoiceRow
                      key={v.id}
                      voice={v}
                      selected={signup.voice === v.id}
                      onSelect={() => updateSignup({ voice: v.id })}
                      playing={playingVoice === v.id}
                      onPlay={() => play(v.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div>
              <div className="voice-section-label">HD · Female</div>
              {VOICES['HD · Female'].map((v) => (
                <VoiceRow
                  key={v.id}
                  voice={v}
                  selected={signup.voice === v.id}
                  onSelect={() => updateSignup({ voice: v.id })}
                  playing={playingVoice === v.id}
                  onPlay={() => play(v.id)}
                />
              ))}
              <div className="mt-6 rounded-lg border border-line bg-ink-900 p-4 text-xs text-mute">
                <div className="text-teal-400 font-semibold mb-1">💡 Tip</div>
                Click ▶ to hear a 5-second preview of any voice. HD voices use the same minutes.
              </div>
              {previewError && (
                <div className="mt-3 text-xs text-amber-400">⚠ {previewError}</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <Link to="/signup/number" className="btn-ghost">← Back</Link>
          <button className="btn-teal" disabled={!ok} onClick={() => navigate('/signup/knowledge')}>Next: Add knowledge →</button>
        </div>
      </div>
    </section>
  );
}
