// src/pages/SAReports.jsx
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const STUD_KEY = 'app_students_v1';
const ATT_KEY = 'app_attendance_v1';

function lsRead(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }

export default function SAReports() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [filters, setFilters] = useState({ studentId: '', year: '' });
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [stuRes, attRes] = await Promise.all([
          api.get('/students').catch(() => ({ data: null })),
          api.get('/attendance').catch(() => ({ data: null }))
        ]);

        const s = Array.isArray(stuRes.data) ? stuRes.data : lsRead(STUD_KEY);
        const a = Array.isArray(attRes.data) ? attRes.data : lsRead(ATT_KEY);

        if (!mounted) return;
        setStudents(s);
        setAttendance(a);
      } catch (e) {
        if (!mounted) return;
        setError('Unable to fetch from server, using local data.');
        setStudents(lsRead(STUD_KEY));
        setAttendance(lsRead(ATT_KEY));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function applyFilters(all = null) {
    const rows = (all || attendance).slice(); // clone
    let filtered = rows;
    if (filters.studentId) filtered = filtered.filter(r => String(r.studentId || r.student || '').includes(filters.studentId));
    if (filters.year) filtered = filtered.filter(r => (r.academicYear || r.year || '').toString() === filters.year.toString());
    return filtered;
  }

  function run() {
    setRunning(true);
    setError(null);
    try {
      const rows = applyFilters();
      setReport(rows);
      setPage(1);
    } catch (e) {
      setError('Failed to run report');
    } finally {
      setRunning(false);
    }
  }

  function downloadCSV() {
    if (!report || report.length === 0) return;
    // safe CSV generation with proper quoting
    const headers = ['Student ID', 'Course Code', 'Course Name', 'Time', 'Method', 'Academic Year'];
    const lines = report.map(r => {
      const cols = [
        r.studentId || r.student || '',
        r.courseCode || r.course || '',
        r.courseName || r.courseName || r.course_title || '',
        r.markedAt ? new Date(r.markedAt).toISOString() : r.markedAt || '',
        r.method || '',
        r.academicYear || r.year || ''
      ];
      return cols.map(c => {
        const s = c == null ? '' : String(c);
        if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      }).join(',');
    });

    const csv = [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil((report.length || 0) / PAGE_SIZE));
  const paged = report.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ padding: 12, maxWidth: 980 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Institute Reports</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{user ? `Signed in as ${user.email || user.name} • role: ${user.role || 'n/a'}` : 'Not signed in'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setFilters({ studentId: '', year: '' }); setReport([]); }} style={{ padding: '8px 10px' }}>Clear</button>
          <button onClick={() => { const rows = applyFilters(attendance); setReport(rows); setPage(1); }} style={{ padding: '8px 10px' }}>Quick Run</button>
        </div>
      </header>

      {loading ? <div>Loading data…</div> : null}
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '200px 1fr', maxWidth: 720 }}>
        <label style={{ alignSelf: 'center' }}>Filter Student ID (optional)</label>
        <input value={filters.studentId} onChange={e => setFilters({ ...filters, studentId: e.target.value })} placeholder="student id or partial" />
        <label style={{ alignSelf: 'center' }}>Academic Year (optional)</label>
        <input value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} placeholder="e.g. 2025/2026" />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={run} disabled={running} style={{ padding: '8px 12px', background: '#0b79f7', color: '#fff', border: 'none', borderRadius: 6 }}>{running ? 'Running...' : 'Run Report'}</button>
        <button onClick={downloadCSV} style={{ marginLeft: 8, padding: '8px 12px' }} disabled={!report || report.length === 0}>Export CSV</button>
      </div>

      <hr style={{ margin: '18px 0' }} />

      {(!report || report.length === 0) ? (
        <div style={{ color: '#6b7280' }}>No records. Run a report to view results.</div>
      ) : (
        <>
          <div style={{ marginBottom: 8, fontSize: 13 }}>{`Showing ${report.length} results • page ${page} of ${totalPages}`}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>Student ID</th>
                <th>Course</th>
                <th>Time</th>
                <th>Method</th>
                <th>Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => (
                <tr key={r.id || `${r.studentId}-${r.markedAt}`} >
                  <td style={{ padding: 8 }}>{r.studentId || r.student}</td>
                  <td>{(r.courseCode || '') + (r.courseName ? ` — ${r.courseName}` : '')}</td>
                  <td>{r.markedAt ? new Date(r.markedAt).toLocaleString() : ''}</td>
                  <td>{r.method || ''}</td>
                  <td>{r.academicYear || r.year || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 13 }}>{`Page ${page} / ${totalPages}`}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 10px' }}>Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 10px' }}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

