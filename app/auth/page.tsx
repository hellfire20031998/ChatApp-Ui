"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { persistAuthSession } from "@/lib/auth-storage";
import { login, register } from "@/service/api";

const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-(--accent-500) placeholder:text-zinc-400 focus:border-(--accent-500) focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-(--accent-500)";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    username: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (isLogin) {
        const res = await login({
          email: form.email,
          password: form.password,
        });
        persistAuthSession(res.data.token, res.data.user);
        router.replace("/chat");
        return;
      }

      const reg = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        username: form.username,
      });
      persistAuthSession(reg.data.token, reg.data.user);
      router.replace("/chat");
      return;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data;
        setError(
          typeof msg === "object" &&
            msg !== null &&
            "message" in msg &&
            typeof (msg as { message: unknown }).message === "string"
            ? (msg as { message: string }).message
            : err.message || "Something went wrong",
        );
      } else {
        setError("Something went wrong");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-linear-to-b from-(--accent-100) to-zinc-100 px-4 py-12 dark:from-zinc-950 dark:to-black">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-(--accent-600) p-8 text-white md:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              ChatApp
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">
              Conversations that stay in flow.
            </h2>
            <p className="mt-3 text-sm text-white/85">
              Realtime messaging, group management, and read receipts in one clean workspace.
            </p>
          </div>
          <div className="space-y-2 text-sm text-white/85">
            <p>- Live message delivery and typing indicators</p>
            <p>- Direct and group conversations</p>
            <p>- Secure JWT-based authentication</p>
          </div>
        </div>
        <div className="p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-(--accent-600) dark:text-(--accent-500)">
          Welcome to ChatApp
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isLogin ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isLogin
            ? "Continue to your conversations"
            : "Create an account to start chatting"}
        </p>

        {error ? (
          <p
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form className="mt-6" onSubmit={handleSubmit}>
          {!isLogin ? (
            <>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required={!isLogin}
                  placeholder="Your name"
                  className={inputClass}
                  value={form.name}
                  onChange={handleChange}
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Username
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  required={!isLogin}
                  placeholder="username"
                  className={inputClass}
                  value={form.username}
                  onChange={handleChange}
                />
              </label>
            </>
          ) : null}

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={inputClass}
              value={form.email}
              onChange={handleChange}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              placeholder="••••••••"
              className={inputClass}
              value={form.password}
              onChange={handleChange}
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-xl bg-(--accent-500) py-2.5 text-sm font-medium text-white transition hover:bg-(--accent-600) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Please wait…" : isLogin ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {isLogin ? "No account yet?" : "Already registered?"}{" "}
          <button
            type="button"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p className="mt-4 text-center text-sm">
          <Link
            href="/"
            className="text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
          >
            Back to home
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
