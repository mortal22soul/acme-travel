"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, readError } from "@/lib/api";
import { authUser, type AuthUser } from "@/lib/contracts";

type AuthContextValue = {
  user: AuthUser | null;
  login: () => Promise<void>;
  reload: (signal?: AbortSignal) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isReady: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const reload = useCallback(async (signal?: AbortSignal) => {
    const response = await apiFetch("/me", { signal });
    if (response.status === 401) {
      setUser(null);
      setError(null);
      return null;
    }
    if (!response.ok) throw new Error(await readError(response, "Unable to restore your session"));
    const actor = authUser.parse(await response.json());
    setUser(actor);
    setError(null);
    return actor;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const restore = () => {
      void reload(controller.signal).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to restore your session");
      }).finally(() => { if (!controller.signal.aborted) setReady(true); });
    };
    const ended = () => setUser(null);
    const sessionChanged = (event: StorageEvent) => { if (event.key === "acme:session-change") restore(); };
    window.addEventListener("acme:session-ended", ended);
    window.addEventListener("storage", sessionChanged);
    restore();
    return () => {
      controller.abort();
      window.removeEventListener("acme:session-ended", ended);
      window.removeEventListener("storage", sessionChanged);
    };
  }, [reload]);

  const notifyOtherTabs = () => {
    try { localStorage.setItem("acme:session-change", String(Date.now())); } catch { /* Storage is optional. */ }
  };
  const login = async () => {
    const actor = await reload();
    if (!actor) throw new Error("Unable to sign in");
    setReady(true);
    notifyOtherTabs();
    const missing = (actor.role === "customer" && !actor.customerId) || (actor.role === "agent" && !actor.agentId);
    router.push(missing ? "/user" : "/destinations");
  };
  const logout = async () => {
    const response = await apiFetch("/logout", { method: "POST" });
    if (!response.ok) throw new Error(await readError(response, "Unable to sign out. Try again."));
    clearSession();
    notifyOtherTabs();
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, login, reload, logout, isAuthenticated: !!user, isReady, error }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
