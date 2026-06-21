import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [menu, setMenu]       = useState([]);
  const [loading, setLoading] = useState(true);

  const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken',  accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setMenu(res.data.menu);
    } catch {
      clearTokens();
      setUser(null);
      setMenu([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) loadMe().finally(() => setLoading(false));
    else setLoading(false);
  }, [loadMe]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    storeTokens(res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
    setMenu([]);
    const meRes = await api.get('/auth/me');
    setMenu(meRes.data.menu);
    return res.data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    clearTokens();
    setUser(null);
    setMenu([]);
  };

  const hasPermission = (code) => user?.permissions?.includes(code) ?? false;

  return (
    <AuthContext.Provider value={{ user, menu, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
