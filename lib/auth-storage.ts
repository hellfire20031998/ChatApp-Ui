import {
  clearAuthSessionCookie,
  setAuthSessionCookie,
} from "@/lib/auth-session-cookie";
import type { AuthUser, UserPreference } from "@/service/type";

const USER_JSON_KEY = "user";
const DEFAULT_PREFERENCE: UserPreference = {
  themeMode: "SYSTEM",
  themePreset: "EMERALD",
};

export function persistAuthSession(token: string, user: AuthUser): void {
  const normalizedUser: AuthUser = {
    ...user,
    userPreference: user.userPreference ?? DEFAULT_PREFERENCE,
  };
  localStorage.setItem("token", token);
  localStorage.setItem(USER_JSON_KEY, JSON.stringify(normalizedUser));
  setAuthSessionCookie();
}

export function clearAuthSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem(USER_JSON_KEY);
  clearAuthSessionCookie();
}

export function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_JSON_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed;
  } catch {
    return null;
  }
}

export function readUserPreference(): UserPreference {
  const user = readStoredUser();
  if (!user?.userPreference) return DEFAULT_PREFERENCE;
  return {
    themeMode: user.userPreference.themeMode ?? DEFAULT_PREFERENCE.themeMode,
    themePreset: user.userPreference.themePreset ?? DEFAULT_PREFERENCE.themePreset,
  };
}

export function updateStoredUserPreference(preference: UserPreference): void {
  const user = readStoredUser();
  if (!user) return;
  const next: AuthUser = { ...user, userPreference: preference };
  localStorage.setItem(USER_JSON_KEY, JSON.stringify(next));
}

/**
 * `user.id` from localStorage (set at login/register). No JWT parsing.
 */
export function readAuthenticatedUserId(): string | null {
  const user = readStoredUser();
  return typeof user?.id === "string" ? user.id : null;
}

export function isAuthenticated(): boolean {
  return readStoredToken() !== null && readStoredUser() !== null;
}
