import { AuthOrChatLink } from "@/components/auth-or-chat-link";
import { HomeNavAuth } from "@/components/home-nav-auth";
import {
  MessageSquare,
  Mic,
  Palette,
  Phone,
  Shield,
  Smile,
  Users,
  Video,
  Zap,
} from "@/lib/icons";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-(--accent-100) via-white to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:via-black dark:to-zinc-950 dark:text-zinc-50">

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">ChatApp</h1>
        <HomeNavAuth />
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="text-center md:text-left">
          <span className="rounded-full bg-(--accent-100) px-3 py-1 text-xs font-semibold uppercase tracking-wide text-(--accent-600)">
            Direct · Groups · Calls · Themes
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Chat, call, and customize in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Real-time direct and group threads over WebSockets, browser voice and
            video, read receipts and typing indicators, emoji picker, and
            light/dark themes with accent presets—saved to your account.
          </p>
          <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:gap-4 md:justify-start">
            <AuthOrChatLink className="rounded-full bg-(--accent-500) px-6 py-3 text-center text-white shadow-sm transition hover:bg-(--accent-600)">
              Start chatting
            </AuthOrChatLink>
            <AuthOrChatLink className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-center transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              Sign in
            </AuthOrChatLink>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Team standup
              </p>
              <p className="text-[11px] text-(--accent-600) dark:text-(--accent-500)">
                Alex is typing…
              </p>
            </div>
            <div className="flex gap-1 text-zinc-500 dark:text-zinc-400">
              <span className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Phone className="h-4 w-4" aria-hidden />
              </span>
              <span className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Video className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
            <div className="mb-3 flex justify-end">
              <div className="max-w-[82%] rounded-xl rounded-br-md bg-(--accent-100) px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                Sprint demo at 4—join the group? 📅
              </div>
            </div>
            <div className="mb-3 flex justify-start">
              <div className="max-w-[82%] rounded-xl rounded-bl-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <span className="text-xs font-medium text-(--accent-600) dark:text-(--accent-500)">
                  Jordan
                </span>
                <span className="mt-0.5 block">In. Shared the doc in chat.</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex max-w-[82%] justify-end">
                <div className="rounded-xl rounded-br-md bg-(--accent-100) px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                  On my way—✓✓
                </div>
              </div>
              <span
                className="shrink-0 rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                aria-hidden
              >
                <Smile className="h-4 w-4" />
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
            Themes & preferences sync when you sign in
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          What you get
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <Zap className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Live messaging</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              STOMP over WebSockets for instant delivery; optimistic UI and
              smooth history loading.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Direct & group chats</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              One-to-one threads plus groups with admins, rename, add or remove
              members, and leave.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <Mic className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Voice & video calls</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              In-browser WebRTC for 1:1 audio and video, with signaling through
              your existing chat connection.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <MessageSquare className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Receipts & typing</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sent, delivered, and read states where supported, plus live typing
              indicators as you message.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <Palette className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Themes & emoji</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Light, dark, or system mode with accent presets stored in your
              profile; rich emoji picker in the composer.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 inline-flex rounded-xl bg-(--accent-100) p-2.5 text-(--accent-600) dark:text-(--accent-500)">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Secure auth</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              JWT for REST and WebSocket connect; Spring Boot API with MongoDB
              for durable chat data.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} ChatApp · Next.js · Spring Boot · MongoDB
      </footer>
    </div>
  );
}
