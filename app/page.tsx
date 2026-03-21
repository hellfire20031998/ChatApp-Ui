import { AuthOrChatLink } from "@/components/auth-or-chat-link";
import { HomeNavAuth } from "@/components/home-nav-auth";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">

      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">ChatApp</h1>
        <HomeNavAuth />
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Real-time Chat. Simple & Fast.
        </h1>

        <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Connect with people instantly using our real-time chat platform powered by modern backend systems and WebSockets.
        </p>

        <div className="mt-6 flex gap-4">
          <AuthOrChatLink className="rounded-full bg-blue-500 px-6 py-3 text-white hover:bg-blue-600">
            Get Started
          </AuthOrChatLink>

          <AuthOrChatLink className="rounded-full border px-6 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Login
          </AuthOrChatLink>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8 text-center">
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h3 className="text-lg font-semibold">⚡ Real-time Messaging</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Instant chat experience with low latency using modern technologies.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h3 className="text-lg font-semibold">🔐 Secure</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            JWT-based authentication ensures safe and secure communication.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h3 className="text-lg font-semibold">🚀 Scalable</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Built on microservices architecture for high performance and scalability.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} ChatApp. Built with Next.js & Spring Boot.
      </footer>
    </div>
  );
}