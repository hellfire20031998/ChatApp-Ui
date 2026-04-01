import { AuthOrChatLink } from "@/components/auth-or-chat-link";
import { HomeNavAuth } from "@/components/home-nav-auth";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-(--accent-100) via-white to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:via-black dark:to-zinc-950 dark:text-zinc-50">

      {/* Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">ChatApp</h1>
        <HomeNavAuth />
      </nav>

      {/* Hero Section */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="text-center md:text-left">
          <span className="rounded-full bg-(--accent-100) px-3 py-1 text-xs font-semibold uppercase tracking-wide text-(--accent-600)">
            Realtime Messaging
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
            Real-time chat that feels instant.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Fast one-to-one and group messaging with live delivery status, read receipts, and typing indicators.
          </p>
          <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:gap-4 md:justify-start">
            <AuthOrChatLink className="rounded-full bg-(--accent-500) px-6 py-3 text-white shadow-sm transition hover:bg-(--accent-600)">
              Start chatting
            </AuthOrChatLink>
            <AuthOrChatLink className="rounded-full border border-zinc-300 bg-white px-6 py-3 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              Sign in
            </AuthOrChatLink>
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-2xl bg-[#e5ddd5] p-4">
            <div className="mb-3 flex justify-end">
              <div className="max-w-[78%] rounded-lg rounded-br-none bg-[#d9fdd3] px-3 py-2 text-sm text-[#111b21]">
                Hey! Group call at 7?
              </div>
            </div>
            <div className="mb-3 flex justify-start">
              <div className="max-w-[78%] rounded-lg rounded-bl-none bg-white px-3 py-2 text-sm text-[#111b21]">
                Works for me. I will share agenda.
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-lg rounded-br-none bg-[#d9fdd3] px-3 py-2 text-sm text-[#111b21]">
                Perfect. See you in the group.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-10 text-center md:grid-cols-3 md:py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Live messaging</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Messages show up instantly with smooth realtime updates.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Secure auth</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            JWT-based authentication keeps access private and controlled.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Built to scale</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Spring Boot and WebSocket architecture designed for growth.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} ChatApp. Built with Next.js & Spring Boot.
      </footer>
    </div>
  );
}