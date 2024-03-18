import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_KEY));
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return null;
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken: refresh });
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  const fetchUser = useCallback(async (token) => {
    try {
      const { data } = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      return data;
    } catch {
      const newToken = await refreshAccessToken();
      if (newToken) return fetchUser(newToken);
      return null;
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    fetchUser(accessToken).finally(() => setLoading(false));
  }, [accessToken, fetchUser]);

  const login = (userData, tokens) => {
    setUser(userData);
    setAccessToken(tokens.accessToken);
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {}
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const value = {
    user,
    accessToken,
    loading,
    login,
    logout,
    updateUser,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
