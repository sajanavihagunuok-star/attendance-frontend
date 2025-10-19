// src/pages/SASubscription.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_subscription_status_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; } }
function lsSave(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {} }

export default function SASubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState({ plan: 'Demo', expires: '', seats: 0, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/subscription').catch(() => ({ data: null }));
        const data = res && res.data ? res.data : null;
        if (mounted) setStatus(Object.keys(data || {}).length ? data : lsRead());
      } catch (e) {
        if (mounted) {
          setError('Unable to load from server, using local subscription.');
          setStatus(lsRead());
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
    setTimeout(() => setMsg(null), 3500);
  }

  function validate(s) {
    if (!s.plan || !s.plan.trim()) return 'Plan name required';
    if (s.seats < 0) return 'Seats used cannot be negative';
    if (s.limit <= 0) return 'Seat limit must be greater than zero';
    if (s.seats > s.limit) return 'Seats used cannot exceed seat limit';
    return null;
  }

  async function handleSave() {
    const s = { ...status, plan: (status.plan || '').trim() };
    const v = validate(s);
    if (v) return flash(v, 'error');

    setSaving(true);
    setError(null);
    try {
      // Prefer PUT /subscription then fallback to POST /subscription
      const tryPut = await api.put('/subscription', s).catch(() => null);
      if (tryPut && tryPut.status >= 200 && tryPut.status < 300) {
        const server = tryPut.data || s;
        setStatus(server);
        lsSave(server);
        flash('Subscription saved to server');
        return;
      }

      const tryPost = await api.post('/subscription', s).catch(() => null);
      if (tryPost && tryPost.status >= 200 && tryPost.status < 300) {
        const server = tryPost.data || s;
        setStatus(server);
        lsSave(server);
        flash('Subscription saved to server');
        return;
      }

      // server unavailable: persist locally
      lsSave(s);
      setStatus(s);
      flash('Saved locally (server unavailable)', 'warn');
    } catch (e) {
      lsSave(s);
      setStatus(s);
      setError('Save failed; stored locally.');
      flash('Saved locally (error)', 'warn');
    } finally {
      setSaving(false);
    }
  }

  const usagePercent = status.limit ? Math.round((Number(status.seats || 0) / Number(status.limit || 1)) * 100) : 0;

  return (
    <div style={{ padding: 12, maxWidth: 720 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Subscription Status</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
      </header>

      {msg && <div style={{ marginBottom: 8, color: msg.type === 'error' ? 'crimson' : msg.type === 'warn' ? '#b45309' : '#065f46' }}>{msg.text}</div>}
      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}
      {loading ? <div>Loading subscription…</div> : null}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '200px 1fr', maxWidth: 640 }}>
        <label style={{ alignSelf: 'center' }}>Plan name</label>
        <input value={status.plan} onChange={e => setStatus({ ...status, plan: e.target.value })} />

        <label style={{ alignSelf: 'center' }}>Expires</label>
        <input type="date" value={status.expires} onChange={e => setStatus({ ...status, expires: e.target.value })} />

        <label style={{ alignSelf: 'center' }}>Seats used</label>
        <input type="number" min="0" value={status.seats} onChange={e => setStatus({ ...status, seats: Number(e.target.value || 0) })} />

        <label style={{ alignSelf: 'center' }}>Seat limit</label>
        <input type="number" min="1" value={status.limit} onChange={e => setStatus({ ...status, limit: Number(e.target.value || 25) })} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={() => { lsSave(status); flash('Saved locally for preview'); }} style={{ marginLeft: 8, padding: '8px 12px' }}>Save Locally</button>
      </div>

      <hr style={{ margin: '18px 0' }} />

      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Plan</div>
          <div style={{ fontSize: 13 }}>{status.plan}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Expires</div>
          <div style={{ fontSize: 13 }}>{status.expires || 'Never'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Seats used / limit</div>
          <div style={{ fontSize: 13 }}>{`${status.seats} / ${status.limit}`}</div>
        </div>

        <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%`, height: '100%', background: usagePercent > 85 ? '#ef4444' : '#0b79f7' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{usagePercent}% seats used</div>
      </div>
    </div>
  );
}

