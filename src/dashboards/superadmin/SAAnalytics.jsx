// src/pages/SAAnalytics.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const STUD_KEY = 'app_students_v1';
const LEC_KEY = 'app_lecturers_v1';
const ATT_KEY = 'app_attendance_v1';
const LS_RECENT = 'app_recent_events_v1';

function lsRead(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function lsSave(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }

export default function SAAnalytics() {
  const { user } = useAuth();
  const [totals, setTotals] = useState({ users: 0, lecturers: 0, sessions: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // helper to prepend a local event
  function pushLocalEvent(msg) {
    const ev = { msg, ts: new Date().toISOString() };
    const list = [ev, ...lsRead(LS_RECENT)].slice(0, 20);
    lsSave(LS_RECENT, list);
    setRecent(list);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // try server endpoints for accurate counts; backends vary so tolerate 404/401
        const [usersRes, lecsRes, sessionsRes, recentRes] = await Promise.all([
          api.get('/students').catch(() => ({ data: null })),
          api.get('/lecturers').catch(() => ({ data: null })),
          api.get('/sessions').catch(() => ({ data: null })),
          api.get('/events').catch(() => ({ data: null })) // optional server activity endpoint
        ]);

        const users = Array.isArray(usersRes.data) ? usersRes.data.length : null;
        const lecs = Array.isArray(lecsRes.data) ? lecsRes.data.length : null;
        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data.length : null;

        const recentServer = Array.isArray(recentRes.data) ? recentRes.data.slice(0, 20).map(r => ({ msg: r.msg || r.type || JSON.stringify(r), ts: r.ts || r.createdAt || new Date().toISOString() })) : null;

        if (!mounted) return;

        // if server provided counts, use them; otherwise fallback to localStorage keys
        const sLocal = lsRead(STUD_KEY);
        const lLocal = lsRead(LEC_KEY);
        const aLocal = lsRead(ATT_KEY);

        setTotals({
          users: users !== null ? users : sLocal.length,
          lecturers: lecs !== null ? lecs : lLocal.length,
          sessions: sessions !== null ? sessions : aLocal.length
        });

        const localRecent = lsRead(LS_RECENT);
        setRecent(recentServer || localRecent.length ? (recentServer || localRecent) : [{ msg: 'Institute data loaded', ts: new Date().toISOString() }]);
      } catch (e) {
        if (!mounted) return;
        setError('Unable to fetch analytics from server, using local data.');
        const sLocal = lsRead(STUD_KEY);
        const lLocal = lsRead(LEC_KEY);
        const aLocal = lsRead(ATT_KEY);
        setTotals({ users: sLocal.length, lecturers: lLocal.length, sessions: aLocal.length });
        const localRecent = lsRead(LS_RECENT);
        setRecent(localRecent.length ? localRecent : [{ msg: 'Institute data loaded', ts: new Date().toISOString() }]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // expose quick actions for testing
  async function refresh() {
    setLoading(true);
    try {
      // attempt a fresh load via effect by re-calling the effect logic: simple approach is to reload page data
      const sLocal = lsRead(STUD_KEY);
      const lLocal = lsRead(LEC_KEY);
      const aLocal = lsRead(ATT_KEY);
      setTotals({ users: sLocal.length, lecturers: lLocal.length, sessions: aLocal.length });
      setRecent(lsRead(LS_RECENT));
      pushLocalEvent('Manual refresh performed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 880 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Institute Analytics</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refresh} style={{ padding: '8px 10px' }}>Refresh</button>
          <button onClick={() => pushLocalEvent('Test event created')} style={{ padding: '8px 10px' }}>Add Test Event</button>
        </div>
      </header>

      {loading ? <div>Loading analytics…</div> : null}
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, minWidth: 140 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totals.users}</div>
          <div style={{ color: '#6b7280' }}>Users</div>
        </div>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, minWidth: 140 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totals.lecturers}</div>
          <div style={{ color: '#6b7280' }}>Lecturers</div>
        </div>
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, minWidth: 140 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totals.sessions}</div>
          <div style={{ color: '#6b7280' }}>Sessions</div>
        </div>
      </div>

      <section>
        <h4 style={{ marginTop: 0 }}>Recent Activity</h4>
        <ul style={{ paddingLeft: 18 }}>
          {recent.map((r, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 14 }}>{r.msg}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(r.ts).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

