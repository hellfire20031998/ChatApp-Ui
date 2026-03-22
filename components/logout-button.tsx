"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/auth-storage";
import { disconnectSocket } from "@/lib/socket";

type LogoutButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function LogoutButton({ className, children = "Log out" }: LogoutButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        disconnectSocket();
        clearAuthSession();
        router.replace("/auth");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
