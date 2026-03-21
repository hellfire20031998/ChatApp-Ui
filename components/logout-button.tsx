"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

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
        localStorage.removeItem("token");
        router.replace("/auth");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
