import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppThemeProvider } from "@/components/app-theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatApp",
  description: "Chat client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme-preset="emerald"
    >
      <body
        className="flex min-h-full flex-col bg-white text-zinc-900 [font-family:var(--font-geist-sans)] dark:bg-zinc-950 dark:text-zinc-50"
      >
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
