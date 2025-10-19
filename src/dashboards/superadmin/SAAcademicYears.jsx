// src/pages/SAAcademicYears.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_academic_years_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export default function SAAcademicYears() {
  const { user } = useAuth();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [val, setVal] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/academic-years');
        const data = Array.isArray(res.data) ? res.data : [];
        if (mounted) {
          if (data.length) setYears(data);
          else setYears(lsRead());
        }
      } catch (e) {
        // if API unreachable or 401/403, fallback to local storage
        setError('Unable to load from server, using local data.');
        if (mounted) setYears(lsRead());
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

  async function createOrUpdate(e) {
    e && e.preventDefault();
    const name = (val || '').trim();
    if (!name) return flash('Enter academic year (e.g. 2025/2026)', 'error');
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // Expect backend PUT /academic-years/:id -> { id, name, startYear, endYear } or similar
        const payload = { name };
        const res = await api.put(`/academic-years/${editing.id}`, payload);
        const updated = res.data || { id: editing.id, name };
        setYears(prev => prev.map(y => (y.id === editing.id ? updated : y)));
        flash('Updated');
      } else {
        // Expect backend POST /academic-years -> created resource
        const res = await api.post('/academic-years', { name });
        const created = res.data || { id: `local-${Date.now()}`, name };
        setYears(prev => [created, ...prev]);
        flash('Created');
      }
      lsSave(years); // keep local copy consistent
      setVal('');
      setEditing(null);
    } catch (err) {
      // fallback: update local storage only
      if (editing) {
        setYears(prev => prev.map(y => (y.id === editing.id ? { ...y, name } : y)));
      } else {
        const local = { id: `local-${Date.now()}`, name };
        setYears(prev => [local, ...prev]);
      }
      lsSave(editing ? years : [ { id: `local-${Date.now()}`, name }, ...years ]);
      flash('Saved locally (server error)', 'warn');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!confirm('Remove this academic year?')) return;
    const prev = years;
    setYears(prev.filter(y => y.id !== item.id));
    try {
      await api.delete(`/academic-years/${item.id}`);
      flash('Removed');
      lsSave(years.filter(y => y.id !== item.id));
    } catch (e) {
      setYears(prev);
      setError('Delete failed, reverted.');
    }
  }

  function startEdit(item) {
    setEditing(item);
    setVal(item.name || '');
    setMsg(null);
  }

  function cancelEdit() {
    setEditing(null);
    setVal('');
  }

  return (
    <div style={{ padding: 12, maxWidth: 780 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Academic Years</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div>
          <button onClick={() => { setEditing(null); setVal(''); }} style={{ padding: '8px 10px' }}>New</button>
        </div>
      </header>

      {msg && <div style={{ marginBottom: 8, color: msg.type === 'error' ? 'crimson' : msg.type === 'warn' ? '#b45309' : '#065f46' }}>{msg.text || msg}</div>}
      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}

      <form onSubmit={createOrUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. 2025/2026" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ padding: '8px 12px' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
          {editing && <button type="button" onClick={cancelEdit} style={{ padding: '8px 12px' }}>Cancel</button>}
        </div>
      </form>

      <div>
        {loading ? (
          <div>Loading…</div>
        ) : years.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No academic years.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {years.map(y => (
              <li key={y.id || y.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                <div>{y.name}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(y)} style={{ padding: '4px 8px' }}>Edit</button>
                  <button onClick={() => remove(y)} style={{ padding: '4px 8px', color: 'crimson' }}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

