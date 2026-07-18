import { useEffect, useState } from 'react';
import { api } from '../../api.js';

function StatusPill({ source }) {
  if (source === 'db') return <span className="pill bg-lime-500/20 text-lime-400">● Override</span>;
  if (source === 'env') return <span className="pill bg-blue-500/20 text-blue-400">● From .env</span>;
  return <span className="pill bg-amber-500/20 text-amber-400">○ Unset</span>;
}

function FieldRow({ field, draft, setDraft, editing }) {
  const value = draft[field.key];
  return (
    <div className="setting-row">
      <div>
        <div className="font-mono text-sm">{field.key}</div>
        <div className="field-help">{field.label}</div>
        {field.restartHint && (
          <div className="text-[11px] text-amber-400 mt-1">
            ⚠ Server restart required for this change to take effect.
          </div>
        )}
      </div>
      <div>
        {editing ? (
          <>
            <input
              className="input input-mono"
              type={field.secret ? 'password' : 'text'}
              value={value === undefined ? '' : value}
              placeholder={field.placeholder || (field.secret ? '••••' : '')}
              onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
              autoComplete="off"
            />
            {field.secret && (
              <div className="text-[11px] text-mute mt-1">
                Leave blank to keep the current value. Type a new value to replace it. Clear to fall back to the .env default.
              </div>
            )}
          </>
        ) : (
          <input
            className="input input-mono"
            value={field.masked || ''}
            placeholder={field.placeholder || '(empty)'}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

function SectionCard({ section, refresh }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const startEdit = () => {
    // Pre-fill non-secret fields with their actual masked-but-not-secret value;
    // secrets stay blank so admin must explicitly type them to change.
    const initial = {};
    for (const f of section.fields) {
      if (f.secret) initial[f.key] = '';
      else initial[f.key] = f.masked || '';
    }
    setDraft(initial);
    setMsg(''); setErr('');
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setDraft({}); setErr(''); setMsg(''); };

  const save = async () => {
    setBusy(true); setMsg(''); setErr('');
    try {
      // Only send keys the admin actually changed (non-blank for secrets,
      // any change for non-secret).
      const patch = {};
      for (const f of section.fields) {
        const v = draft[f.key];
        if (v === undefined) continue;
        if (f.secret) {
          if (v.trim() !== '') patch[f.key] = v;
        } else {
          if (v !== (f.masked || '')) patch[f.key] = v;
        }
      }
      if (!Object.keys(patch).length) {
        setMsg('Nothing to save.');
        setEditing(false);
        return;
      }
      await api('/api/admin/settings', { method: 'PATCH', body: patch });
      setMsg(`✓ Saved ${Object.keys(patch).length} setting${Object.keys(patch).length === 1 ? '' : 's'}.`);
      setEditing(false);
      await refresh();
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-card mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-lime-400">{section.sectionLabel}</div>
        {!editing ? (
          <button className="btn-ghost text-xs" onClick={startEdit}>✎ Edit</button>
        ) : (
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={cancel} disabled={busy}>Cancel</button>
            <button className="btn-teal text-xs" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {section.fields.map((f) => (
        <FieldRow key={f.key} field={f} draft={draft} setDraft={setDraft} editing={editing} />
      ))}

      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        {section.fields.map((f) => (
          <span key={f.key} className="flex items-center gap-1">
            <span className="text-mute font-mono">{f.key}</span>
            <StatusPill source={f.source} />
          </span>
        ))}
      </div>

      {msg && <div className="mt-3 text-sm text-lime-400">{msg}</div>}
      {err && <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}
    </div>
  );
}

export default function Settings() {
  const [sections, setSections] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const d = await api('/api/admin/settings');
      setSections(d.sections);
    } catch (e) {
      setErr(e.message);
      setSections([]);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings · credentials</h1>
          <p className="text-mute">
            Edit secrets and external-service URLs. Values you save here are stored encrypted in the
            database and override <code>.env</code>. Clearing a field falls back to the env value.
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={load}>↻ Refresh</button>
      </div>

      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {sections === null && <div className="mt-6 text-mute text-sm">Loading…</div>}

      {(sections || []).map((sec) => (
        <SectionCard key={sec.section} section={sec} refresh={load} />
      ))}

      <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="font-semibold text-amber-400">Notes</div>
        <ul className="mt-2 space-y-1 text-mute text-xs">
          <li>• <strong>Override</strong> — value lives in the <code>settings</code> table; takes precedence over <code>.env</code>.</li>
          <li>• <strong>From .env</strong> — value comes from the server's <code>.env</code> file; no DB override.</li>
          <li>• Secrets are stored as plain text in DB — make sure DB access is restricted (it is: only Postgres user <code>postgres</code> can read).</li>
          <li>• Settings flagged with ⚠ require a server restart because their SDK client (Stripe, MCP) is constructed at boot.</li>
        </ul>
      </div>
    </div>
  );
}
