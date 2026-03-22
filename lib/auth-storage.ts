import type { AuthUser } from "@/service/type";

const USER_JSON_KEY = "user";

export function persistAuthSession(token: string, user: AuthUser): void {
  localStorage.setItem("token", token);
  localStorage.setItem(USER_JSON_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem(USER_JSON_KEY);
}

/**
 * `user.id` from localStorage (set at login/register). No JWT parsing.
 */
export function readAuthenticatedUserId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_JSON_KEY);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { id?: unknown };
    return typeof u.id === "string" ? u.id : null;
  } catch {
    return null;
  }
}
