"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/api";

// Chaves já usadas pela versão anterior da interface e por lib/api.ts.
const TOKEN_KEY = "relay_token";
const USER_ID_KEY = "relay_user_id";

type SessionState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null };

interface SessionContextValue {
  session: SessionState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading", user: null });

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSession({ status: "unauthenticated", user: null });
      return;
    }
    api<User>("/me")
      .then((user) => !cancelled && setSession({ status: "authenticated", user }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setSession({ status: "unauthenticated", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(TOKEN_KEY, result.access_token);
    setSession({ status: "authenticated", user: result.user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setSession({ status: "unauthenticated", user: null });
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return context;
}

/** Usuário autenticado; use apenas dentro da área logada (AppShell garante a sessão). */
export function useCurrentUser(): User {
  const { session } = useSession();
  if (session.status !== "authenticated") throw new Error("useCurrentUser fora da área autenticada");
  return session.user;
}
