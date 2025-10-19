// src/pages/SABranding.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const LS_KEY = 'app_institute_branding_v1';
function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; } }
function lsSave(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {} }

export default function SABranding() {
  const { user } = useAuth();
  const [branding, setBranding] = useState({ name: '', color: '#0b79f7', logo: '' });
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
        // try server first (expects GET /branding)
        const res = await api.get('/branding').catch(() => ({ data: null }));
        const data = res && res.data ? res.data : null;
        if (mounted) setBranding(Object.keys(data || {}).length ? data : lsRead());
      } catch (e) {
        if (mounted) {
          setError('Could not load branding from server; using local settings.');
          setBranding(lsRead());
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

  function validate(b) {
    if (!b.name || !b.name.trim()) return 'Institute name is required';
    if (!b.color || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(b.color)) return 'Primary color must be a hex value like #0b79f7';
    return null;
  }

  async function handleSave() {
    const b = { ...branding, name: (branding.name || '').trim() };
    const v = validate(b);
    if (v) return flash(v, 'error');

    setSaving(true);
    setError(null);

    try {
      // Attempt to POST or PUT depending on backend shape
      // Prefer PUT /branding if exists
      const tryPut = await api.put('/branding', b).catch(() => null);
      if (tryPut && tryPut.status >= 200 && tryPut.status < 300) {
        const server = tryPut.data || b;
        setBranding(server);
        lsSave(server);
        flash('Branding saved to server');
        return;
      }
      // fallback to POST
      const tryPost = await api.post('/branding', b).catch(() => null);
      if (tryPost && tryPost.status >= 200 && tryPost.status < 300) {
        const server = tryPost.data || b;
        setBranding(server);
        lsSave(server);
        flash('Branding saved to server');
        return;
      }

      // If both fail, store locally
      lsSave(b);
      flash('Saved locally (server unavailable)', 'warn');
    } catch (e) {
      lsSave(b);
      setError('Save failed, stored locally.');
      flash('Saved locally (error)', 'warn');
    } finally {
      setSaving(false);
    }
  }

  function handlePreview() {
    const b = { ...branding };
    lsSave(b);
    window.alert('Preview saved locally. You can now see the preview below.');
  }

  return (
    <div style={{ padding: 12, maxWidth: 780 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Branding</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div>
          <button onClick={() => { setBranding(lsRead()); flash('Reset to local saved preview'); }} style={{ padding: '6px 10px' }}>Reset</button>
        </div>
      </header>

      {msg && <div style={{ marginBottom: 8, color: msg.type === 'error' ? 'crimson' : msg.type === 'warn' ? '#b45309' : '#065f46' }}>{msg.text}</div>}
      {error && <div style={{ marginBottom: 8, color: 'crimson' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '200px 1fr', maxWidth: 720 }}>
        <label style={{ alignSelf: 'center' }}>Institute name (for preview)</label>
        <input value={branding.name} onChange={e => setBranding({ ...branding, name: e.target.value })} />

        <label style={{ alignSelf: 'center' }}>Primary color (hex)</label>
        <input value={branding.color} onChange={e => setBranding({ ...branding, color: e.target.value })} placeholder="#0b79f7" />

        <label style={{ alignSelf: 'center' }}>Logo URL</label>
        <input value={branding.logo} onChange={e => setBranding({ ...branding, logo: e.target.value })} placeholder="https://..." />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{saving ? 'Saving...' : 'Save Branding'}</button>
        <button onClick={handlePreview} style={{ marginLeft: 8, padding: '8px 12px' }}>Save and Preview</button>
      </div>

      <hr style={{ margin: '18px 0' }} />

      <section>
        <h4 style={{ marginTop: 0 }}>Live preview</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
          <div style={{ width: 64, height: 64, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, overflow: 'hidden' }}>
            {branding.logo ? <img src={branding.logo} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%' }} onError={(e) => { e.target.style.display = 'none'; flash('Logo failed to load', 'warn'); }} /> : <div style={{ width: 40, height: 40, background: branding.color }} />}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: '600', color: branding.color }}>{branding.name || 'Institute name'}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Primary color: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{branding.color}</code></div>
          </div>
        </div>
      </section>
    </div>
  );
}

