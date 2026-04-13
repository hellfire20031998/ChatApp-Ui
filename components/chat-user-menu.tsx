"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Palette,
  User,
} from "@/lib/icons";
import { clearAuthSession } from "@/lib/auth-storage";
import { disconnectSocket } from "@/lib/socket";
import type { AuthUser, ThemeMode, ThemePreset, UserPreference } from "@/service/type";
import { useRouter } from "next/navigation";

type PanelView = "menu" | "profile" | "theme";

type ChatUserMenuProps = {
  user: AuthUser | null;
  preference: UserPreference;
  themeBusy: boolean;
  onThemeModeChange: (mode: ThemeMode) => void;
  onThemePresetChange: (preset: ThemePreset) => void;
};

function InitialAvatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const sizeClass =
    size === "lg"
      ? "h-12 w-12 text-lg"
      : size === "sm"
        ? "h-9 w-9 text-sm"
        : "h-10 w-10 text-base";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-(--accent-100) font-medium text-(--accent-600) ${sizeClass}`}
    >
      {initial}
    </span>
  );
}

function menuRowClass(disabled?: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
    disabled
      ? "cursor-not-allowed opacity-50"
      : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
  }`;
}

export function ChatUserMenu({
  user,
  preference,
  themeBusy,
  onThemeModeChange,
  onThemePresetChange,
}: ChatUserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("menu");
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name?.trim() || user?.username || "You";
  const subtitle = user?.username ? `@${user.username}` : "";

  const closeAll = useCallback(() => {
    setOpen(false);
    setView("menu");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        closeAll();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeAll]);

  const handleLogout = () => {
    disconnectSocket();
    clearAuthSession();
    closeAll();
    router.replace("/auth");
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setView("menu");
        }}
        className="flex items-center gap-2 rounded-full border border-zinc-200/90 p-0.5 pr-2 transition hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Account menu"
      >
        <InitialAvatar label={displayName} size="sm" />
        <span className="hidden max-w-[120px] truncate text-left text-sm font-medium text-zinc-800 sm:inline dark:text-zinc-100">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(calc(100vw-1.5rem),280px)] rounded-xl border border-zinc-200 bg-white py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          role="dialog"
          aria-label="Account"
        >
          {view === "menu" ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-100 px-3 pb-3 dark:border-zinc-800">
                <InitialAvatar label={displayName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                    {displayName}
                  </p>
                  {subtitle ? (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="px-2 pt-2">
                <button
                  type="button"
                  className={menuRowClass(!user)}
                  disabled={!user}
                  onClick={() => setView("profile")}
                >
                  <User className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span className="flex-1">Profile</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
                <button
                  type="button"
                  className={menuRowClass()}
                  onClick={() => setView("theme")}
                >
                  <Palette className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span className="flex-1">Theme</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${menuRowClass()} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="flex-1 font-medium">Log out</span>
                </button>
              </div>
            </>
          ) : null}

          {view === "profile" ? (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {user ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-center py-2">
                    <InitialAvatar label={displayName} size="lg" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Name
                    </p>
                    <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">{user.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Username
                    </p>
                    <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">@{user.username}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Email
                    </p>
                    <p className="mt-0.5 break-all text-zinc-900 dark:text-zinc-50">{user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No profile in this session.</p>
              )}
            </div>
          ) : null}

          {view === "theme" ? (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Theme mode
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["LIGHT", "DARK", "SYSTEM"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onThemeModeChange(mode)}
                    disabled={themeBusy}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      preference.themeMode === mode
                        ? "border-(--accent-500) bg-(--accent-100) text-(--accent-600)"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {mode.toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Accent
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["EMERALD", "OCEAN", "SUNSET"] as ThemePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onThemePresetChange(preset)}
                    disabled={themeBusy}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      preference.themePreset === preset
                        ? "border-(--accent-500) bg-(--accent-100) text-(--accent-600)"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {preset.toLowerCase()}
                  </button>
                ))}
              </div>
              {themeBusy ? (
                <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">Saving theme…</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
