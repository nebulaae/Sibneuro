'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AuthContext, TelegramUser } from '@/hooks/useAuth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('tg_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);
        // Срок жизни сессии 24ч
        if (now - parsed.auth_date < 86400) {
          setUser(parsed);
        } else {
          sessionStorage.removeItem('tg_user');
        }
      }
    } catch (e) {
      console.error('Auth hydration error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: TelegramUser) => {
    setUser(userData);
    sessionStorage.setItem('tg_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('tg_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
