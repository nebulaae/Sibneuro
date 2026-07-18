'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, TelegramUser } from '@/hooks/useAuth';

// Универсальный тип авторизованного пользователя
export interface AuthUser {
  id: number; // user_id (Telegram ID или внутренний id)
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
  name?: string; // для email/MAX пользователей
  email?: string;
  auth_method?: 'telegram' | 'max' | 'email' | 'session';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Bearer JWT токен (Telegram widget login / TMA)
      const token = localStorage.getItem('auth_token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
          const u = decoded?.user || decoded;
          if (u?.id || u?.user_id) {
            const userId = u.id ?? u.user_id;
            // Сохраняем user_id для interceptor
            localStorage.setItem('auth_user_id', String(userId));
            setUser({
              id: userId,
              first_name: u.first_name || u.name || 'User',
              last_name: u.last_name,
              username: u.username,
              photo_url: u.photo_url,
              auth_date: u.auth_date || 0,
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Сессия (email / MAX логин через /auth/session)
      const sessionUser = localStorage.getItem('session_user');
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        if (parsed?.id) {
          localStorage.setItem('auth_user_id', String(parsed.id));
          setUser({
            id: parsed.id,
            first_name: parsed.first_name || parsed.name || 'User',
            last_name: parsed.last_name,
            username: parsed.username,
            photo_url: parsed.photo_url,
            auth_date: parsed.auth_date || 0,
          });
          setIsLoading(false);
          return;
        }
      }

      // 3. Telegram TMA sessionStorage (legacy)
      const tgUser = sessionStorage.getItem('tg_user');
      if (tgUser) {
        const parsed = JSON.parse(tgUser);
        if (parsed?.id) {
          localStorage.setItem('auth_user_id', String(parsed.id));
          setUser(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('AuthProvider init error', e);
    }

    setIsLoading(false);
  }, []);

  const login = (u: TelegramUser) => {
    // Сохраняем user_id для interceptor
    localStorage.setItem('auth_user_id', String(u.id));
    setUser(u);
    // Тихий вход (initData) завершается ПОСЛЕ того, как useUser и другие
    // хуки уже сходили в API без токена и закэшировали пустой ответ.
    // Без инвалидации баланс/токены не появятся до перелогина.
    // Токен уже записан в localStorage вызывающей стороной, поэтому
    // рефетч уйдёт уже авторизованным.
    queryClient.invalidateQueries();
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_data');
    localStorage.removeItem('session_hash');
    localStorage.removeItem('session_user');
    localStorage.removeItem('auth_user_id');
    sessionStorage.removeItem('tg_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
