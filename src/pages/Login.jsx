import React, { useEffect, useState } from 'react';
import { verifyPasswordSync } from '../utils/bcryptHelper';
import { authFetch } from '../lib/api';;

const SESSION_KEY = 'app_user_v1';
const OWNER_KEY = 'app_owner_user_v1';
const SUPERADMINS_KEY = 'app_super_admins_v1';
const ADMINS_KEY = 'app_admins_v1';
const LECTURERS_KEY = 'app_lecturers_v1';

function readArray(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function readObject(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function isBcryptHash(s) { return typeof s === 'string' && s.startsWith('$2'); }

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const any =
      !!readObject(OWNER_KEY) ||
      readArray(SUPERADMINS_KEY).length > 0 ||
      readArray(ADMINS_KEY).length > 0 ||
      readArray(LECTURERS_KEY).length > 0;
    setHasData(!!any);
  }, []);

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }

  function persistSession(userObj) {
    const session = {
      id: userObj.id || ('u_' + Date.now()),
      displayName: userObj.name || userObj.displayName || userObj.email,
      email: userObj.email,
      role: userObj.role || 'student'
    };
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error('session persist error', e);
    }
  }

  async function submitLocalAuth(found, role, redirectHash) {
    const ok = isBcryptHash(found.password) ? verifyPasswordSync(password, found.password) : password === found.password;
    if (ok) {
      persistSession({ id: found.id, name: found.name, email: found.email, role });
      window.location.hash = redirectHash;
      return true;
    } else {
      showError('Invalid credentials');
      return false;
    }
  }

  async function onSubmit(e) {
    e && e.preventDefault();
    if (!email.trim()) return showError('Email required');
    if (!password) return showError('Password required');

    // Local fallback accounts (dev helpers)
    const owner = readObject(OWNER_KEY);
    if (owner && owner.email === email.trim()) {
      if (await submitLocalAuth(owner, 'owner', '#/dashboard/owner')) return;
    }
    const foundSA = readArray(SUPERADMINS_KEY).find(s => s.email === email.trim());
    if (foundSA) { if (await submitLocalAuth(foundSA, 'superadmin', '#/dashboard/superadmin')) return; }
    const foundAdmin = readArray(ADMINS_KEY).find(a => a.email === email.trim());
    if (foundAdmin) { if (await submitLocalAuth(foundAdmin, 'admin', '#/dashboard/admin')) return; }
    const foundL = readArray(LECTURERS_KEY).find(l => l.email === email.trim());
    if (foundL) { if (await submitLocalAuth(foundL, 'lecturer', '#/dashboard/lecturer')) return; }

    // Remote backend auth
    try {
      const data = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (!data || !data.token) return showError('Login failed: no token returned');
      localStorage.setItem('token', data.token);
      persistSession(data.user || { id: data.user?.id, email: data.user?.email, role: data.user?.role });
      window.location.hash = '#/dashboard';
    } catch (err) {
      showError(err.message || 'Login failed');
    }
  }

  // helper to create unhashed test accounts (fast)
  function createTestAccounts() {
    const owner = { id: 'owner_1', name: 'Owner Sajana', email: 'owner@example.com', password: 'ownerpass', role: 'owner' };
    const sa = { id: 'sa_1', name: 'Hari', email: 'hari@example.com', password: 'superpass', role: 'superadmin' };
    const adm = { id: 'adm_1', name: 'Admin Sigma', email: 'admin@example.com', password: 'adminpass', role: 'admin' };
    const lec = { id: 'lec_1', name: 'Lecturer One', email: 'lecturer@example.com', password: 'lectpass', role: 'lecturer' };

    localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
    localStorage.setItem(SUPERADMINS_KEY, JSON.stringify([sa]));
    localStorage.setItem(ADMINS_KEY, JSON.stringify([adm]));
    localStorage.setItem(LECTURERS_KEY, JSON.stringify([lec]));
    setHasData(true);
    showError('Test accounts created (plain-text). For production, run migration page to hash passwords.');
  }

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Sign in</h2>
        <button onClick={() => { window.location.hash = '#/'; }} style={{ padding: '6px 10px' }}>Back</button>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />

        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>Remember</span>
          </label>

          <button type="submit" style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>
            Sign In
          </button>

          <button type="button" onClick={() => { setEmail(''); setPassword(''); }} style={{ padding: '8px 12px' }}>
            Clear
          </button>
        </div>

        {error && <div style={{ marginTop: 8, color: '#ef4444' }}>{error}</div>}
      </form>

      <hr style={{ margin: '18px 0' }} />

      <div style={{ color: '#6b7280' }}>
        Developer helpers:
        <div style={{ marginTop: 8 }}>
          <button onClick={createTestAccounts} style={{ padding: '8px 12px', marginRight: 8 }}>Create test accounts</button>
          <button onClick={() => {
            localStorage.removeItem(OWNER_KEY); localStorage.removeItem(SUPERADMINS_KEY); localStorage.removeItem(ADMINS_KEY); localStorage.removeItem(LECTURERS_KEY);
            localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); setHasData(false); showError('Test data cleared');
          }} style={{ padding: '8px 12px' }}>
            Clear test data
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          To migrate existing plain-text passwords to bcrypt: go to #/migrate and click Run migration.
        </div>

        {!hasData && <div style={{ marginTop: 12, color: '#b91c1c' }}>No saved users found. Create test accounts or run migration.</div>}
      </div>
    </div>
  );
}

