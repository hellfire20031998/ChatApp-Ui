"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthOrChatLinkProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Hero CTAs that normally go to sign-in; if a token exists, go to chat instead.
 */
export function AuthOrChatLink({ className, children }: AuthOrChatLinkProps) {
  const router = useRouter();

  return (
    <Link
      href="/auth"
      className={className}
      onClick={(e) => {
        if (typeof window !== "undefined" && localStorage.getItem("token")) {
          e.preventDefault();
          router.push("/chat");
        }
      }}
    >
      {children}
    </Link>
  );
}
