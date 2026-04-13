"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth-storage";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-sm text-zinc-600 dark:text-zinc-400">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-(--accent-500) dark:border-zinc-600"
          aria-hidden
        />
        <p>Checking session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
