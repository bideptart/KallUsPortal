import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const fmtTs = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

export default function Logs() {
  const [calls, setCalls] = useState(null);
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [c, u] = await Promise.all([
        api('/api/twilio/calls?limit=50'),
        api('/api/admin/users'),
      ]);
      setCalls(c.calls || []);
      setUsers(u.users || []);
    } catch (e) {
      setErr(e.message);
      setCalls([]); setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const events = [];
  for (const u of users || []) {
    if (u.createdAt) {
      events.push({ ts: u.createdAt, line: `signup: ${u.email} (${u.role})${u.plan ? ` plan=${u.plan.label} $${u.plan.amount}` : ''}` });
    }
    if (u.twilioSid) {
      events.push({ ts: u.createdAt, line: `twilio.buy_number ${u.number} ${u.twilioSid} attached_to=${u.email}` });
    }
  }
  for (const c of calls || []) {
    events.push({
      ts: c.startTime,
      line: `call.${c.direction || 'inbound'} from=${c.from || '?'} to=${c.to || '?'} status=${c.status} dur=${c.duration}s sid=${c.sid}`,
    });
  }
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provisioning &amp; activity logs</h1>
          <p className="text-mute">Live signup events and Twilio call activity.</p>
        </div>
        <button className="btn-ghost text-sm" onClick={load}>↻ Refresh</button>
      </div>

      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <pre className="mt-6 form-card text-xs text-teal-400 overflow-x-auto whitespace-pre-wrap">
        {events.length === 0
          ? (calls === null ? 'Loading…' : 'No events yet.')
          : events.map((e) => `[${fmtTs(e.ts)}] ${e.line}`).join('\n')}
      </pre>
    </div>
  );
}
