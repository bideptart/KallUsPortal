import { useEffect, useState } from 'react';
import { User, Lock, Save, KeyRound, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

export default function Account() {
  const { currentUser, updateCurrentUser, changePassword, deleteCurrentAccount, authError, setAuthError } = useApp();

  const [profile, setProfile] = useState({
    name: '', company: '', email: '', username: '', phone: '',
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);

  // One physical card, two faces — Password & Danger zone live on the back,
  // flipped to via the arrow instead of sitting in a second column.
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setProfile({
      name: currentUser.name || '',
      company: currentUser.company || '',
      email: currentUser.email || '',
      username: currentUser.username || '',
      phone: currentUser.phone || '',
    });
  }, [currentUser]);

  if (!currentUser) return null;

  const saveProfile = async () => {
    if (profileBusy) return;
    setProfileBusy(true);
    setProfileMsg('');
    setAuthError('');
    const ok = await updateCurrentUser(profile);
    setProfileBusy(false);
    setProfileMsg(ok ? '✓ Profile saved.' : '');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setAuthError('');
    if (pw.next.length < 8) { setAuthError('Password must be 8+ chars'); return; }
    if (pw.next !== pw.confirm) { setAuthError('New passwords do not match'); return; }
    setPwBusy(true);
    const ok = await changePassword({ current: pw.current, next: pw.next });
    setPwBusy(false);
    if (ok) {
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg('✓ Password changed.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold">Account</h1>
      <p className="text-mute mt-1">Your profile, login, and contact details.</p>

      <div className="mt-6 flip-card mx-auto" style={{ maxWidth: 720, height: 460 }}>
        <div className={`flip-card-inner${flipped ? ' is-flipped' : ''}`}>
          {/* === Front — Profile ===================================== */}
          <div className="flip-card-face form-card">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono uppercase font-semibold inline-flex items-center gap-2" style={{ color: 'var(--primary)', letterSpacing: '0.09em' }}>
                <User size={14} /> Profile
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-[var(--surface-2)] flex-shrink-0"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => setFlipped(true)}
                aria-label="Show password & security"
                title="Password & security"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <label className="field-label mt-4">Full name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <label className="field-label mt-3">Company name</label>
            <input className="input" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            <label className="field-label mt-3">Email</label>
            <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <label className="field-label mt-3">Username</label>
            <input className="input" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
            <div className="field-help">Your sign-in handle.</div>
            <label className="field-label mt-3">Phone</label>
            <input className="input" placeholder="+1 ..." value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <button className="btn-teal mt-4 inline-flex items-center gap-1.5" onClick={saveProfile} disabled={profileBusy}>
              <Save size={14} /> {profileBusy ? 'Saving…' : 'Save profile'}
            </button>
            {profileMsg && <div className="mt-2 text-xs font-semibold text-lime-700">{profileMsg}</div>}
          </div>

          {/* === Back — Password & danger zone ======================== */}
          <div className="flip-card-face flip-card-back form-card">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-[var(--surface-2)] flex-shrink-0"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => setFlipped(false)}
                aria-label="Back to profile"
                title="Back to profile"
              >
                <ArrowUp size={14} />
              </button>
              <div className="text-xs font-mono uppercase font-semibold inline-flex items-center gap-2" style={{ color: 'var(--primary)', letterSpacing: '0.09em' }}>
                <Lock size={14} /> Password
              </div>
            </div>
            <form onSubmit={submitPassword}>
              <label className="field-label mt-4">Current password</label>
              <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
              <label className="field-label mt-3">New password</label>
              <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
              <label className="field-label mt-3">Confirm new password</label>
              <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button type="submit" className="btn-teal inline-flex items-center gap-1.5" disabled={pwBusy}>
                  <KeyRound size={14} /> {pwBusy ? 'Updating…' : 'Change password'}
                </button>
                {!confirmDelete && (
                  <button type="button" className="btn-red text-sm inline-flex items-center gap-1.5" style={{ borderRadius: 9999 }} onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={14} /> Delete account &amp; release number
                  </button>
                )}
              </div>
              {pwMsg && <div className="mt-2 text-xs font-semibold text-lime-700">{pwMsg}</div>}
            </form>

            {authError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}

            <div className="mt-4">
              {confirmDelete && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="text-sm text-red-900">Really delete your account? This cannot be undone.</div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-red text-sm inline-flex items-center gap-1.5" onClick={deleteCurrentAccount}>
                      <Trash2 size={14} /> Yes, delete forever
                    </button>
                    <button className="btn-ghost text-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <p className="text-xs text-mute mt-2">Cancels your subscription, deletes your agent, and releases your phone number. Cannot be undone.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
