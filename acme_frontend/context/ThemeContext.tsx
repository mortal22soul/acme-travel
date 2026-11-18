"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
type ThemeContextValue = { theme: ThemeMode; setTheme: (theme: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children, initialTheme = "system" }: { children: React.ReactNode; initialTheme?: ThemeMode }) {
  const [theme, setThemeState] = useState(initialTheme);
  useEffect(() => {
    const initial = document.documentElement.dataset.theme;
    if (initial === "light" || initial === "dark") setThemeState(initial);
  }, []);

  function setTheme(next: ThemeMode) {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `acme_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    try { localStorage.removeItem("acme:theme"); } catch { /* The cookie persists the preference. */ }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
