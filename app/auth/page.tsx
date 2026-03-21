"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, register } from "@/service/api";

const inputClass =
  "mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

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
        localStorage.setItem("token", res.data.token);
        router.replace("/chat");
        return;
      }

      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        username: form.username,
      });
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
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isLogin ? "Sign in" : "Create account"}
        </h1>

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
              <label className="mt-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
            className="mt-6 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
  );
}
