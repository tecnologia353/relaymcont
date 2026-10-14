"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";

// Mesma chave e padrão do script inline em app/layout.tsx.
const STORAGE_KEY = "relay_theme";
const DEFAULT_THEME: ThemePreference = "light";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function readTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(preference: ThemePreference): void {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Sem armazenamento disponível: o tema vale só para esta sessão.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readTheme() === "system") applyTheme("system");
  };
  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

export function useTheme(): { theme: ThemePreference; setTheme: (preference: ThemePreference) => void } {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
  return { theme, setTheme };
}

export const themeLabel: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};
