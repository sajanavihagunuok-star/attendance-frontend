// src/pages/SAProfile.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_SESSION_KEY = 'app_user_v1';
const LS_SUPERADMINS_KEY = 'app_super_admins_v1';

function readSession() {
  try {
    const s = localStorage.getItem(LS_SESSION_KEY) || sessionStorage.getItem(LS_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function lsReadSuperAdmins() { try { return JSON.parse(localStorage.getItem(LS_SUPERADMINS_KEY) || '[]'); } catch { return []; } }
function lsSaveSuperAdmins(list) { try { localStorage.setItem(LS_SUPERADMINS_KEY, JSON.stringify(list)); } catch {} }

export default function SAProfile() {
  const { user, token, setUser } = useAuth();
  const session = readSession();
  const [profile, setProfile] = useState({ id: null, name: '', email: '' });
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Prefer server /me to populate authoritative profile
        const res = await api.get('/me').catch(() => ({ data: null }));
        const me = res && res.data ? res.data : null;
        if (me && mounted) {
          setProfile({ id: me.id || null, name: me.name || me.displayName || '', email: me.email || '' });
          setLoading(false);
          return;
        }

        // Fallback: use super-admins list in localStorage or session
        const sa = lsReadSuperAdmins().find(s => s.email === (session?.email || (user && (user.email || user.name)))) || {};
        if (mounted) {
          setProfile({
            id: sa.id || null,
            name: sa.name || session?.displayName || user?.name || '',
            email: sa.email || session?.email || user?.email || ''
          });
        }
      } catch (e) {
        if (mounted) {
          setError('Unable to load profile from server, using local session.');
          const sa = lsReadSuperAdmins().find(s => s.email === (session?.email || user?.email)) || {};
          setProfile({
            id: sa.id || null,
            name: sa.name || session?.displayName || user?.name || '',
            email: sa.email || session?.email || user?.email || ''
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, session]);

  function flash(text, type = 'info') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  function validateProfile(p) {
    if (!p.name || !p.name.trim()) return 'Name required';
    if (!p.email || !p.email.trim()) return 'Email required';
    return null;
  }

  async function saveProfile() {
    const p = { ...profile, name: (profile.name || '').trim(), email: (profile.email || '').trim() };
    const v = validateProfile(p);
    if (v) return flash(v, 'error');

    setSaving(true);
    setError(null);
    try {
      // Prefer PUT -> /super-admins/:id then /users/:id as fallback
      if (p.id) {
        const payload = { name: p.name, email: p.email };
        const res = await api.put(`/super-admins/${p.id}`, payload).catch(async () => {
          return await api.put(`/users/${p.id}`, payload);
        });
        const updated = res?.data || { id: p.id, ...payload };
        // update AuthContext user if /me changed
        if (setUser && updated) setUser(updated);
        flash('Profile saved');
      } else {
        // no id: try update via /me or create patch endpoint
        const tryMe = await api.put('/me', { name: p.name, email: p.email }).catch(() => null);
        if (tryMe && tryMe.data) {
          flash('Profile saved');
          if (setUser) setUser(tryMe.data);
        } else {
          // fallback local
          const list = lsReadSuperAdmins();
          const idx = list.findIndex(s => s.email === p.email);
          if (idx >= 0) { list[idx] = { ...list[idx], name: p.name, email: p.email }; lsSaveSuperAdmins(list); flash('Profile saved locally'); }
          else { flash('Profile saved locally'); }
        }
      }
    } catch (err) {
      // local fallback
      const list = lsReadSuperAdmins();
      const idx = list.findIndex(s => s.email === p.email);
      if (idx >= 0) { list[idx] = { ...list[idx], name: p.name, email: p.email }; lsSaveSuperAdmins(list); flash('Saved locally (server error)', 'warn'); }
      else { flash('Saved locally (server error)', 'warn'); }
      setError('Server update failed, profile stored locally.');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!newPass) return flash('Enter new password', 'error');
    if (newPass !== confirm) return flash('Passwords do not match', 'error');

    setSaving(true);
    setError(null);
    try {
      // Prefer backend password change: POST /auth/change-password or PUT /super-admins/:id/password
      if (profile.id) {
        const res = await api.put(`/super-admins/${profile.id}/password`, { password: newPass }).catch(async () => {
          return await api.post('/auth/change-password', { password: newPass });
        });
        if (res && (res.status >= 200 && res.status < 300)) {
          setNewPass(''); setConfirm('');
          flash('Password updated');
          return;
        }
      } else {
        // try /auth/change-password even without id
        const res2 = await api.post('/auth/change-password', { password: newPass }).catch(() => null);
        if (res2 && (res2.status >= 200 && res2.status < 300)) {
          setNewPass(''); setConfirm('');
          flash('Password updated');
          return;
        }
      }

      // fallback local store (dev only)
      const list = lsReadSuperAdmins();
      const idx = list.findIndex(s => s.email === profile.email);
      if (idx >= 0) { list[idx].password = newPass; lsSaveSuperAdmins(list); setNewPass(''); setConfirm(''); flash('Password updated locally (dev only)', 'warn'); }
      else { flash('Password stored locally (dev only)', 'warn'); }
    } catch (e) {
      setError('Password update failed, stored locally.');
      flash('Password update failed, local fallback used', 'warn');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 760 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Super Admin Profile</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
      </header>

      {msg && <div style={{ marginBottom: 8, color: msg.type === 'error' ? 'crimson' : msg.type === 'warn' ? '#b45309' : '#065f46' }}>{msg.text}</div>}
      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}
      {loading ? <div>Loading profile…</div> : null}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '180px 1fr', alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>Name</label>
        <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />

        <label style={{ fontSize: 13 }}>Email</label>
        <input value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />

        <label style={{ fontSize: 13 }}>New Password</label>
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />

        <label style={{ fontSize: 13 }}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={saveProfile} disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Saving...' : 'Save Profile'}</button>
        <button onClick={resetPassword} disabled={saving} style={{ marginLeft: 8, padding: '8px 12px' }}>Reset Password</button>
        {msg && <span style={{ marginLeft: 12, color: '#10b981' }}>{msg.text}</span>}
      </div>

      <div style={{ marginTop: 12, color: '#6b7280' }}>Password reset persists to server when available; local fallback used for quick dev/testing only.</div>
    </div>
  );
}


