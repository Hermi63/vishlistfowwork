"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

type User = { id: number; email: string; name: string } | null;

interface AuthContextType {
  user: User;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

/**
 * Безопасность: базовая валидация формата JWT токена перед сохранением.
 * Предотвращает хранение мусорных/инъекционных данных в localStorage.
 */
function isValidTokenFormat(token: string): boolean {
  // JWT состоит из 3 частей, разделённых точками, каждая — base64url
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  // Проверяем что каждая часть — валидный base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => base64urlRegex.test(part));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    // Безопасность: проверяем формат токена перед использованием
    if (!token || !isValidTokenFormat(token)) {
      if (token) localStorage.removeItem("token");
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, userData: User) => {
    // Безопасность: валидируем формат перед сохранением
    if (!isValidTokenFormat(token)) {
      console.error("Получен невалидный токен, сохранение отменено");
      return;
    }
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
