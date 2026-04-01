"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function HomeNavAuth() {
  if (typeof window === "undefined") {
    return <span className="inline-block h-10 w-32 shrink-0" aria-hidden />;
  }
  const hasToken = !!localStorage.getItem("token");

  if (hasToken) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/chat"
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Open chat
        </Link>
        <LogoutButton className="rounded-full bg-(--accent-500) px-4 py-2 text-sm font-medium text-white transition hover:bg-(--accent-600)">
          Log out
        </LogoutButton>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className="rounded-full bg-(--accent-500) px-4 py-2 text-sm font-medium text-white transition hover:bg-(--accent-600)"
    >
      Sign In
    </Link>
  );
}
