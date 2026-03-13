'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AuthContext, TelegramUser } from '@/hooks/useAuth';

function parseJwt(token: string) {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getInitialUser(): TelegramUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem('tg_user');
    if (stored) return JSON.parse(stored);

    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const decoded = parseJwt(token);
    if (decoded?.user) {
      sessionStorage.setItem('tg_user', JSON.stringify(decoded.user));
      return decoded.user;
    }
  } catch {}

  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(() => getInitialUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (userData: TelegramUser) => {
    setUser(userData);
    sessionStorage.setItem('tg_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('tg_user');
    localStorage.removeItem('auth_token');
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
