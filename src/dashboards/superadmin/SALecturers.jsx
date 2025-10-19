// src/pages/SALecturers.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_lecturers_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} }

export default function SALecturers() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', email: '' });
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
        // try server endpoint first, fallback to local storage
        const res = await api.get('/lecturers').catch(() => ({ data: null }));
        const data = Array.isArray(res.data) ? res.data : null;
        if (mounted) setList(data && data.length ? data : lsRead());
      } catch (e) {
        if (mounted) {
          setError('Unable to load lecturers from server, using local data.');
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
    if (!f.name || !f.name.trim()) return 'Lecturer name required';
    if (!f.email || !f.email.trim()) return 'Lecturer email required';
    return null;
  }

  async function handleAddOrUpdate(e) {
    e && e.preventDefault();
    const v = { ...form, name: (form.name || '').trim(), email: (form.email || '').trim() };
    const vErr = validate(v);
    if (vErr) return flash(vErr, 'error');

    // prevent duplicate email locally
    const exists = lsRead().some(l => l.email === v.email && l.id !== v.id);
    if (exists) return flash('Email already exists', 'error');

    setSaving(true);
    setError(null);
    const prev = list.slice();
    try {
      if (v.id) {
        // update
        const payload = { name: v.name, email: v.email };
        const res = await api.put(`/lecturers/${v.id}`, payload).catch(async () => {
          return await api.put(`/users/${v.id}`, payload).catch(() => ({ data: null }));
        });
        const updated = res?.data || { id: v.id, ...payload };
        setList(prevList => prevList.map(it => it.id === v.id ? { ...it, ...updated } : it));
        flash('Lecturer updated');
      } else {
        // create
        const payload = { name: v.name, email: v.email, role: 'lecturer' };
        const res = await api.post('/lecturers', payload).catch(async () => {
          return await api.post('/users', payload).catch(() => ({ data: null }));
        });
        const created = res?.data || { id: `local-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
        setList(prevList => [created, ...prevList]);
        flash('Lecturer added');
      }
      lsSave(list);
      setForm({ id: null, name: '', email: '' });
    } catch (err) {
      // fallback: update localStorage only
      if (v.id) {
        setList(prevList => prevList.map(it => it.id === v.id ? { ...it, name: v.name, email: v.email } : it));
      } else {
        const local = { id: `local-${Date.now()}`, name: v.name, email: v.email, role: 'lecturer', createdAt: new Date().toISOString() };
        setList(prevList => [local, ...prevList]);
      }
      lsSave(list);
      flash('Saved locally (server error)', 'warn');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove lecturer?')) return;
    const prev = list.slice();
    setList(prev.filter(l => l.id !== id));
    try {
      await api.delete(`/lecturers/${id}`).catch(async () => {
        return await api.delete(`/users/${id}`).catch(() => null);
      });
      flash('Lecturer removed');
      lsSave(list.filter(l => l.id !== id));
    } catch (e) {
      setList(prev);
      setError('Remove failed, reverted.');
    }
  }

  function startEdit(item) {
    setForm({ id: item.id, name: item.name || '', email: item.email || '' });
    setMsg(null);
  }

  function clearForm() {
    setForm({ id: null, name: '', email: '' });
    setMsg(null);
  }

  return (
    <div style={{ padding: 12, maxWidth: 820 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Lecturers</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div>
          <button onClick={() => clearForm()} style={{ padding: '8px 10px' }}>New</button>
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

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Saving...' : form.id ? 'Update Lecturer' : 'Add Lecturer'}</button>
            <button type="button" onClick={clearForm} style={{ padding: '8px 12px' }}>Clear</button>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>If backend is unavailable, lecturers are stored locally for dev testing only.</div>
        </div>
      </form>

      <hr style={{ margin: '12px 0' }} />

      {loading ? <div>Loading lecturers…</div> : list.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No lecturers yet.</div>
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
            {list.map(l => (
              <tr key={l.id}>
                <td style={{ padding: 8 }}>{l.name}</td>
                <td>{l.email}</td>
                <td>{l.role || 'lecturer'}</td>
                <td>{l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}</td>
                <td>
                  <button onClick={() => startEdit(l)} style={{ marginRight: 8, padding: '6px 8px' }}>Edit</button>
                  <button onClick={() => handleRemove(l.id)} style={{ padding: '6px 8px', background: '#ef4444', color: '#fff', border: 'none' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

