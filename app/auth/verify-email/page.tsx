"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/service/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setSuccess(false);
        setMessage("Verification token is missing.");
        return;
      }
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        setSuccess(true);
        setMessage(res.data || "Email verified successfully.");
      } catch {
        if (cancelled) return;
        setSuccess(false);
        setMessage("Invalid or expired verification link.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-linear-to-b from-(--accent-100) to-zinc-100 px-4 py-12 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Email verification
        </h1>
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            success
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {message}
        </p>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/auth"
            className="text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
          >
            Go to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-linear-to-b from-(--accent-100) to-zinc-100 px-4 py-12 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Email verification
        </h1>
        <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          Verifying your email...
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
