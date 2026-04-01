"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readUserPreference,
  updateStoredUserPreference,
} from "@/lib/auth-storage";
import type { ThemeMode, ThemePreset, UserPreference } from "@/service/type";

type ThemeContextValue = {
  preference: UserPreference;
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setPreference: (preference: UserPreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDom(preference: UserPreference): void {
  const root = document.documentElement;
  const darkSystem = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedDark =
    preference.themeMode === "DARK" ||
    (preference.themeMode === "SYSTEM" && darkSystem);
  root.classList.toggle("dark", resolvedDark);
  root.setAttribute("data-theme-preset", preference.themePreset.toLowerCase());
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<UserPreference>(() =>
    readUserPreference(),
  );

  useEffect(() => {
    applyToDom(preference);
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setPreferenceState((prev) => {
        if (prev.themeMode !== "SYSTEM") return prev;
        applyToDom(prev);
        return prev;
      });
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setPreferenceState((prev) => {
      const next = { ...prev, themeMode: mode };
      updateStoredUserPreference(next);
      return next;
    });
  }, []);

  const setThemePreset = useCallback((preset: ThemePreset) => {
    setPreferenceState((prev) => {
      const next = { ...prev, themePreset: preset };
      updateStoredUserPreference(next);
      return next;
    });
  }, []);

  const setPreference = useCallback((next: UserPreference) => {
    updateStoredUserPreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setThemeMode,
      setThemePreset,
      setPreference,
    }),
    [preference, setPreference, setThemeMode, setThemePreset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}
