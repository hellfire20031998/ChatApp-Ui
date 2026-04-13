/**
 * Mirrors “signed in” for Next.js middleware (Edge has no localStorage).
 * Real credentials stay in localStorage; AuthGuard + API still enforce access.
 */
export const AUTH_SESSION_COOKIE = "chatapp_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function setAuthSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_SESSION_COOKIE}=1; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearAuthSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
