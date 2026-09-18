"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

type ThemePref = "light" | "dark" | "system";

type ThemeContextValue = {
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (pref: ThemePref) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((!t||t==='system')&&m);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
  };
}

function getPref(): ThemePref {
  try {
    return (localStorage.getItem(STORAGE_KEY) as ThemePref | null) ?? "system";
  } catch {
    return "system";
  }
}

function getPrefServerSnapshot(): ThemePref {
  return "system";
}

function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function getResolvedSnapshot(): "light" | "dark" {
  return resolveTheme(getPref());
}

function getResolvedServerSnapshot(): "light" | "dark" {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pref = useSyncExternalStore(subscribe, getPref, getPrefServerSnapshot);
  const resolved = useSyncExternalStore(subscribe, getResolvedSnapshot, getResolvedServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setPref = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue apenas em memória nesta sessão.
    }
    notify();
  }, []);

  const toggle = useCallback(() => {
    setPref(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPref]);

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
