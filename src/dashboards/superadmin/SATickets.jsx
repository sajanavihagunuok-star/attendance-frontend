// src/pages/SATickets.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_support_tickets_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} }

export default function SATickets() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ subject: '', details: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // prefer server endpoint; fallback to local if unavailable
        const res = await api.get('/support/tickets').catch(() => api.get('/tickets').catch(() => ({ data: null })));
        const data = Array.isArray(res.data) ? res.data : null;
        if (mounted) setList(data && data.length ? data : lsRead());
      } catch (e) {
        if (mounted) {
          setError('Unable to load tickets from server, using local data.');
          setList(lsRead());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function flash(msg) {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }

  async function create() {
    if (!form.subject || !form.subject.trim()) return flash('Subject required');
    const ticket = {
      subject: form.subject.trim(),
      details: (form.details || '').trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: user?.email || user?.name || 'superadmin'
    };

    setSaving(true);
    try {
      const res = await api.post('/support/tickets', ticket).catch(() => api.post('/tickets', ticket).catch(() => ({ data: null })));
      const created = res?.data || { id: `local-${Date.now()}`, ...ticket };
      setList(prev => [created, ...prev]);
      lsSave([created, ...lsRead()]);
      setForm({ subject: '', details: '' });
    } catch (e) {
      // local fallback
      const local = { id: `local-${Date.now()}`, ...ticket };
      const updated = [local, ...lsRead()];
      lsSave(updated);
      setList(updated);
      flash('Created locally (server error)');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id) {
    const prev = list.slice();
    const item = prev.find(t => t.id === id);
    if (!item) return;
    const newStatus = item.status === 'open' ? 'closed' : 'open';
    // optimistic update
    setList(prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      // attempt server update
      await api.put(`/support/tickets/${id}`, { status: newStatus }).catch(() => api.put(`/tickets/${id}`, { status: newStatus }).catch(() => null));
      lsSave(list.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (e) {
      setList(prev);
      flash('Update failed, reverted.');
    }
  }

  function view(ticket) {
    window.alert(JSON.stringify(ticket, null, 2));
  }

  return (
    <div style={{ padding: 12, maxWidth: 820 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Support Tickets</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name}` : 'Not signed in'}</div>
        </div>
      </header>

      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}
      {loading ? <div>Loading tickets…</div> : null}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '200px 1fr', maxWidth: 720 }}>
        <label style={{ alignSelf: 'center' }}>Subject</label>
        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        <label style={{ alignSelf: 'center' }}>Details</label>
        <input value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={create} disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Creating...' : 'Create Ticket'}</button>
      </div>

      <hr style={{ margin: '18px 0' }} />

      {(!list || list.length === 0) ? (
        <div style={{ color: '#6b7280' }}>No tickets.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>Subject</th>
              <th>Details</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id}>
                <td style={{ padding: 8 }}>{t.subject}</td>
                <td>{t.details}</td>
                <td>{t.status}</td>
                <td>
                  <button onClick={() => toggle(t.id)} style={{ marginRight: 8 }}>{t.status === 'open' ? 'Close' : 'Reopen'}</button>
                  <button onClick={() => view(t)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

