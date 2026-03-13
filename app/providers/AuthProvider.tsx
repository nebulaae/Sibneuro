"use client";

import { ReactNode, useEffect, useState } from "react";
import { AuthContext, TelegramUser } from "@/hooks/useAuth";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tg_user");
      if (stored) {
        setUser(JSON.parse(stored));
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("auth_token");
      if (token) {
        const decoded = parseJwt(token);
        if (decoded?.user) {
          setUser(decoded.user);
          sessionStorage.setItem("tg_user", JSON.stringify(decoded.user));
        }
      }
    } catch (e) {
      console.error("Auth hydrate error", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: TelegramUser) => {
    setUser(userData);
    sessionStorage.setItem("tg_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("tg_user");
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};