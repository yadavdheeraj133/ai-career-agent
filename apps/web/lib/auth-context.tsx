"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  apiRequest,
  clearToken,
  getToken,
  setToken,
  UNAUTHORIZED_EVENT,
} from "./api";
import type { AuthUser } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface LoginResponse {
  user: AuthUser;
  token: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadCurrentUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const response = await apiRequest<AuthUser>("/auth/me");
      setUser(response.data);
      setStatus("authenticated");
    } catch {
      clearToken();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("unauthenticated");
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    setToken(response.data.token);
    setUser(response.data.user);
    setStatus("authenticated");

    return response.data.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await apiRequest<AuthUser>("/auth/register", {
        method: "POST",
        body: { name, email, password },
        auth: false,
      });

      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refresh: loadCurrentUser }),
    [user, status, login, register, logout, loadCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
