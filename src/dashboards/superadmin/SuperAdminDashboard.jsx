// src/pages/SuperAdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../../components/AuthGuard';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

import SAAdmins from './SAAdmins';
import SALecturers from './SALecturers';
import SAReports from './SAReports';
import SAAcademicYears from './SAAcademicYears';
import SABranding from './SABranding';
import SASubscription from './SASubscription';
import SAAnalytics from './SAAnalytics';
import SAProfile from './SAProfile';
import SATickets from './SATickets';

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        border: 'none',
        borderBottom: active ? '2px solid #0b79f7' : '2px solid transparent',
        background: 'transparent',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

const TAB_KEY = 'sa_active_tab_v1';
const ALL_TABS = ['admins','lecturers','reports','years','branding','subscription','analytics','tickets','profile'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(() => sessionStorage.getItem(TAB_KEY) || 'admins');

  useEffect(() => {
    // ensure tab is valid
    if (!ALL_TABS.includes(tab)) setTab('admins');
    sessionStorage.setItem(TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    // attach token from localStorage to api if present (keeps api instance consistent)
    const tok = localStorage.getItem('auth_token');
    if (tok) api.defaults.headers.common.Authorization = `Bearer ${tok}`;
    else delete api.defaults.headers.common.Authorization;
  }, []);

  function safeSetTab(t) {
    if (!ALL_TABS.includes(t)) return;
    setTab(t);
  }

  function doLogout() {
    // clear local session keys commonly used in this app
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('app_user_v1');
      sessionStorage.removeItem(TAB_KEY);
      // clear auth context
      if (typeof logout === 'function') logout();
    } catch (e) { /* ignore */ }

    // remove Authorization header
    delete api.defaults.headers.common.Authorization;

    // navigate to login route
    navigate('/login', { replace: true });
  }

  // if user is missing or role not authorized, AuthGuard will handle block, but hide tabs defensively
  const role = user?.role || (user?.roles && user.roles[0]) || 'n/a';
  const canView = role === 'superadmin' || role === 'owner' || role === 'admin';

  return (
    <AuthGuard allowed={['superadmin']}>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => window.history.back()} style={{ padding: '6px 10px' }}>Back</button>
            <h2 style={{ margin: 0 }}>Super Admin Console</h2>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ color: '#374151' }}>{user ? (user.name || user.email || 'Super Admin') : 'Super Admin'}</div>
            <button
              onClick={doLogout}
              style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e5e7eb', marginBottom: 16, flexWrap: 'wrap' }}>
          <TabButton active={tab === 'admins'} onClick={() => safeSetTab('admins')}>Admins</TabButton>
          <TabButton active={tab === 'lecturers'} onClick={() => safeSetTab('lecturers')}>Lecturers</TabButton>
          <TabButton active={tab === 'reports'} onClick={() => safeSetTab('reports')}>Reports</TabButton>
          <TabButton active={tab === 'years'} onClick={() => safeSetTab('years')}>Academic Years</TabButton>
          <TabButton active={tab === 'branding'} onClick={() => safeSetTab('branding')}>Branding</TabButton>
          <TabButton active={tab === 'subscription'} onClick={() => safeSetTab('subscription')}>Subscription</TabButton>
          <TabButton active={tab === 'analytics'} onClick={() => safeSetTab('analytics')}>Analytics</TabButton>
          <TabButton active={tab === 'tickets'} onClick={() => safeSetTab('tickets')}>Tickets</TabButton>
          <TabButton active={tab === 'profile'} onClick={() => safeSetTab('profile')}>Profile</TabButton>
        </div>

        <div style={{ minHeight: 420 }}>
          {!canView ? (
            <div style={{ color: 'crimson' }}>You do not have permission to view this console.</div>
          ) : (
            <>
              {tab === 'admins' && <SAAdmins />}
              {tab === 'lecturers' && <SALecturers />}
              {tab === 'reports' && <SAReports />}
              {tab === 'years' && <SAAcademicYears />}
              {tab === 'branding' && <SABranding />}
              {tab === 'subscription' && <SASubscription />}
              {tab === 'analytics' && <SAAnalytics />}
              {tab === 'tickets' && <SATickets />}
              {tab === 'profile' && <SAProfile />}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}