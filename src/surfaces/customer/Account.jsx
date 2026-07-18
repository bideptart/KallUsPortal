import { useEffect, useState } from 'react';
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
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-mute">Your profile, login, and contact details.</p>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="form-card">
          <div className="text-xs text-lime-400 uppercase font-semibold mb-3">Profile</div>
          <label className="field-label">Full name</label>
          <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <label className="field-label mt-3">Company name</label>
          <input className="input" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          <label className="field-label mt-3">Email</label>
          <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <label className="field-label mt-3">Username</label>
          <input className="input" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
          <label className="field-label mt-3">Phone</label>
          <input className="input" placeholder="+1 ..." value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <button className="btn-teal mt-4" onClick={saveProfile} disabled={profileBusy}>
            {profileBusy ? 'Saving…' : 'Save profile'}
          </button>
          {profileMsg && <div className="mt-2 text-xs text-lime-400">{profileMsg}</div>}
        </div>

        <div className="form-card">
          <div className="text-xs text-lime-400 uppercase font-semibold mb-3">Password</div>
          <form onSubmit={submitPassword}>
            <label className="field-label">Current password</label>
            <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            <label className="field-label mt-3">New password</label>
            <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            <label className="field-label mt-3">Confirm new password</label>
            <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            <button type="submit" className="btn-teal mt-4" disabled={pwBusy}>
              {pwBusy ? 'Updating…' : 'Change password'}
            </button>
            {pwMsg && <div className="mt-2 text-xs text-lime-400">{pwMsg}</div>}
          </form>

          {authError && (
            <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {authError}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-line">
            <div className="text-xs text-red-400 uppercase font-semibold mb-2">Danger zone</div>
            {!confirmDelete ? (
              <button className="btn-red text-sm" onClick={() => setConfirmDelete(true)}>
                Delete account &amp; release number
              </button>
            ) : (
              <div className="rounded border border-red-500/40 bg-red-500/5 p-3">
                <div className="text-sm">Really delete your account? This cannot be undone.</div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-red text-sm" onClick={deleteCurrentAccount}>Yes, delete forever</button>
                  <button className="btn-ghost text-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            )}
            <p className="text-xs text-mute mt-2">Cancels your subscription, deletes your agent, and releases your phone number. Cannot be undone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
