// src/pages/SAAdmins.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_admins_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export default function SAAdmins() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', email: '', password: '' });
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
        // Prefer backend admins endpoint; fallback to /users if /admins missing
        let res;
        try { res = await api.get('/admins'); } catch (e) {
          res = await api.get('/users').catch(() => ({ data: [] }));
        }
        const data = Array.isArray(res.data) ? res.data : [];
        if (mounted) setList(data.length ? data : lsRead());
      } catch (e) {
        if (mounted) {
          setError('Unable to load from server, using local data.');
          setList(lsRead());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function flash(text, type = 'info') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  function validate(f) {
    if (!f.name.trim()) return 'Name required';
    if (!f.email.trim()) return 'Email required';
    if (!f.id && !f.password) return 'Password required';
    return null;
  }

  async function handleAddOrUpdate(e) {
    e && e.preventDefault();
    const v = { ...form, name: (form.name || '').trim(), email: (form.email || '').trim() };
    const vErr = validate(v);
    if (vErr) return flash(vErr, 'error');

    setSaving(true);
    setError(null);

    // optimistic snapshot
    const prev = list.slice();
    try {
      if (v.id) {
        // Update existing admin
        const payload = { name: v.name };
        // If password provided, send it (backend should hash it)
        if (v.password) payload.password = v.password;
        const res = await api.put(`/admins/${v.id}`, payload).catch(async () => {
          // try /users endpoint
          return await api.put(`/users/${v.id}`, payload);
        });
        const updated = res?.data || { id: v.id, ...payload };
        setList(prevList => prevList.map(it => it.id === v.id ? { ...it, ...updated } : it));
        flash('Admin updated');
      } else {
        // Create new admin
        const payload = { name: v.name, email: v.email, password: v.password, role: 'admin' };
        const res = await api.post('/admins', payload).catch(async () => {
          // try /users fallback
          return await api.post('/users', payload);
        });
        const created = res?.data || { id: `local-${Date.now()}`, name: v.name, email: v.email, role: 'admin', createdAt: new Date().toISOString() };
        setList(prevList => [created, ...prevList]);
        flash('Admin added');
      }
      // clear form
      setForm({ id: null, name: '', email: '', password: '' });
      lsSave(list);
    } catch (err) {
      // fallback: store locally
      if (v.id) {
        setList(prevList => prevList.map(it => it.id === v.id ? { ...it, name: v.name } : it));
      } else {
        const local = { id: `local-${Date.now()}`, name: v.name, email: v.email, role: 'admin', createdAt: new Date().toISOString() };
        setList(prevList => [local, ...prevList]);
      }
      lsSave(list);
      flash('Saved locally (server error)', 'warn');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove admin?')) return;
    const prev = list.slice();
    setList(prev.filter(a => a.id !== id));
    try {
      await api.delete(`/admins/${id}`).catch(async () => {
        return await api.delete(`/users/${id}`);
      });
      flash('Admin removed');
      lsSave(list.filter(a => a.id !== id));
    } catch (e) {
      setList(prev);
      setError('Delete failed, reverted.');
    }
  }

  function startEdit(a) {
    setForm({ id: a.id, name: a.name || '', email: a.email || '', password: '' });
    setMsg(null);
  }

  function clearForm() {
    setForm({ id: null, name: '', email: '', password: '' });
    setMsg(null);
  }

  return (
    <div style={{ padding: 12, maxWidth: 820 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admins</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div>
          <button onClick={() => { clearForm(); }} style={{ padding: '8px 10px' }}>New</button>
        </div>
      </header>

      {msg && <div style={{ marginBottom: 8, color: msg.type === 'error' ? 'crimson' : msg.type === 'warn' ? '#b45309' : '#065f46' }}>{msg.text}</div>}
      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}

      <form onSubmit={handleAddOrUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13 }}>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label style={{ fontSize: 13 }}>Email</label>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13 }}>{form.id ? 'Change Password (optional)' : 'Password'}</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Saving...' : form.id ? 'Update Admin' : 'Add Admin'}</button>
            <button type="button" onClick={clearForm} style={{ padding: '8px 12px' }}>Clear</button>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Passwords are sent to the backend for hashing. If the backend is unavailable, admins are stored locally (not secure).
          </div>
        </div>
      </form>

      <hr style={{ margin: '12px 0' }} />

      {loading ? <div>Loading admins…</div> : list.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No admins yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id}>
                <td style={{ padding: 8 }}>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.role || 'admin'}</td>
                <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</td>
                <td>
                  <button onClick={() => startEdit(a)} style={{ marginRight: 8, padding: '6px 8px' }}>Edit</button>
                  <button onClick={() => handleRemove(a.id)} style={{ padding: '6px 8px', background: '#ef4444', color: '#fff', border: 'none' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

