import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      // optionally fetch profile
      (async () => {
        try {
          const res = await api.get('/me');
          setUser(res.data || null);
        } catch {
          setUser(null);
        }
      })();
    } else {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common.Authorization;
      setUser(null);
    }
  }, [token]);

  const login = ({ token: newToken, user: u }) => {
    setToken(newToken);
    if (u) setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

