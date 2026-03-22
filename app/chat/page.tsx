"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import {
  connectSocket,
  disconnectSocket,
  readUserIdFromToken,
  sendMessage,
  type ChatSocketPayload,
  type SocketStatus,
} from "@/lib/socket";
import { getChats, searchUsers, startChat } from "@/service/api";
import type { MyChatSummary } from "@/service/type";

type UserRow = {
  id: string;
  username: string;
};

type SelectedChat = {
  userId: string;
  name: string;
  chatId: string;
};

type ChatMessage = {
  id: string;
  text: string;
  outbound: boolean;
  pending?: boolean;
  createdAt?: string;
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function IconAttach({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
    </svg>
  );
}

function IconEmoji({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}

function IconBack({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

function Avatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const sizeClass =
    size === "lg"
      ? "h-12 w-12 text-lg"
      : size === "sm"
        ? "h-9 w-9 text-sm"
        : "h-10 w-10 text-base";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] font-medium text-[#54656f] ${sizeClass}`}
    >
      {initial}
    </span>
  );
}

function normalizeMyChatSummary(row: unknown): MyChatSummary | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (r.id == null) return null;

  const otherRaw = r.otherUser;
  if (!otherRaw || typeof otherRaw !== "object") return null;
  const ou = otherRaw as Record<string, unknown>;
  if (ou.id == null) return null;

  const lastMessageRaw = r.lastMessage;
  const lastMessage =
    lastMessageRaw === null || lastMessageRaw === undefined
      ? null
      : typeof lastMessageRaw === "string"
        ? lastMessageRaw
        : null;

  const groupNameRaw = r.groupName;
  const groupName =
    groupNameRaw === null || groupNameRaw === undefined
      ? null
      : String(groupNameRaw);

  const lastTimeRaw = r.lastMessageTime;
  const lastMessageTime =
    lastTimeRaw === null || lastTimeRaw === undefined
      ? null
      : String(lastTimeRaw);

  return {
    id: String(r.id),
    createdAt: r.createdAt != null ? String(r.createdAt) : "",
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : "",
    deleted: Boolean(r.deleted),
    group: Boolean(r.group),
    groupName,
    lastMessage,
    lastMessageTime,
    otherUser: {
      id: String(ou.id),
      username: typeof ou.username === "string" ? ou.username : "",
      name: typeof ou.name === "string" ? ou.name : "",
      email: typeof ou.email === "string" ? ou.email : "",
      createdAt: ou.createdAt != null ? String(ou.createdAt) : "",
      updatedAt: ou.updatedAt != null ? String(ou.updatedAt) : "",
      deleted: Boolean(ou.deleted),
      userRole:
        ou.userRole === null || ou.userRole === undefined
          ? null
          : String(ou.userRole),
    },
    participants: r.participants ?? null,
    unreadCount:
      typeof r.unreadCount === "number" && Number.isFinite(r.unreadCount)
        ? r.unreadCount
        : 0,
  };
}

function chatPeerDisplayName(chat: MyChatSummary): string {
  if (chat.group) {
    return chat.groupName?.trim() || "Group";
  }
  const u = chat.otherUser;
  return u.name?.trim() || u.username || "Chat";
}

function formatListTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(iso?: string): string {
  if (!iso) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [chats, setChats] = useState<MyChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("disconnected");

  const activeChatIdRef = useRef<string | null>(null);
  const selfUserIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeChatIdRef.current = selectedChat?.chatId ?? null;
  }, [selectedChat?.chatId]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
  }, [selectedChat?.chatId]);

  useEffect(() => {
    const userId = readUserIdFromToken() ?? "";
    selfUserIdRef.current = userId || null;

    const onIncoming = (payload: ChatSocketPayload) => {
      const activeId = activeChatIdRef.current;
      if (!activeId || payload.chatId !== activeId) return;

      const selfId = selfUserIdRef.current ?? "";
      const isOwnMessage = Boolean(selfId) && payload.senderId === selfId;

      setMessages((prev) => {
        const serverId = payload.id ?? `ws-${Date.now()}`;
        const withoutMatchingPending = prev.filter(
          (m) =>
            !(
              m.pending &&
              m.outbound &&
              m.text === payload.content &&
              isOwnMessage
            ),
        );
        if (withoutMatchingPending.some((m) => m.id === serverId)) {
          return prev;
        }
        return [
          ...withoutMatchingPending,
          {
            id: serverId,
            text: payload.content,
            outbound: isOwnMessage,
            createdAt: payload.createdAt,
          },
        ];
      });
    };

    const onStatus = (status: SocketStatus, detail?: string) => {
      setSocketStatus(status);
      if (detail && status === "error") {
        console.warn("[chat]", detail);
      }
    };

    if (!userId) {
      setSocketStatus("error");
      return;
    }

    connectSocket(userId, onIncoming, onStatus);
    return () => disconnectSocket();
  }, []);

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    setChatsError(null);
    try {
      const res = await getChats();
      const raw = res.data.allChats;
      const list = Array.isArray(raw)
        ? raw
            .map(normalizeMyChatSummary)
            .filter((c): c is MyChatSummary => c !== null)
        : [];
      setChats(list);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        setChatsError(
          typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : "Could not load your chats",
        );
      } else {
        setChatsError("Could not load your chats");
      }
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSearchBusy(true);
    try {
      const res = await searchUsers<UserRow[]>(query);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        setError(
          typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : "Search failed",
        );
      } else {
        setError("Search failed");
      }
    } finally {
      setSearchBusy(false);
    }
  };

  const handleOpenChat = async (user: UserRow) => {
    setError(null);
    setOpenBusy(true);
    setMessages([]);
    setDraft("");
    try {
      const res = await startChat<{ id: string | number }>(user.id);
      const payload = res.data;
      let chatId = "";
      if (payload && typeof payload === "object" && "id" in payload) {
        const id = (payload as { id: unknown }).id;
        if (id != null) chatId = String(id);
      }

      setSelectedChat({
        userId: user.id,
        name: user.username,
        chatId,
      });
      void loadChats();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        setError(
          typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : "Could not open chat",
        );
      } else {
        setError("Could not open chat");
      }
    } finally {
      setOpenBusy(false);
    }
  };

  const handleSelectExistingChat = (chat: MyChatSummary) => {
    setError(null);
    setSelectedChat({
      chatId: chat.id,
      userId: chat.group ? "" : chat.otherUser.id,
      name: chatPeerDisplayName(chat),
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedChat) return;
    if (!selectedChat.userId) {
      setError("Messaging in groups is not set up yet — open a direct chat.");
      return;
    }
    setError(null);

    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text,
        outbound: true,
        pending: true,
      },
    ]);
    setDraft("");

    const sent = sendMessage({
      chatId: selectedChat.chatId,
      receiverId: selectedChat.userId,
      content: text,
      type: "TEXT",
    });

    if (!sent) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Not connected — message was not sent.");
    }
  };

  const closeChatMobile = () => {
    setSelectedChat(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sidebarHiddenOnMobile = selectedChat !== null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f0f2f5] text-[#111b21] antialiased">
      {/* —— Sidebar (chat list) —— */}
      <aside
        className={`flex min-h-0 w-full min-w-0 flex-col border-[#d1d7db] md:w-[400px] md:max-w-[40vw] md:border-r ${sidebarHiddenOnMobile ? "hidden md:flex" : "flex"}`}
      >
        <header className="flex h-[60px] shrink-0 items-center justify-between gap-3 bg-[#008069] px-4 text-white">
          <h1 className="text-xl font-medium tracking-tight">Chats</h1>
          <LogoutButton className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-white/95 transition hover:bg-white/15">
            Log out
          </LogoutButton>
        </header>

        <div className="shrink-0 bg-[#f0f2f5] px-3 py-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <IconSearch className="shrink-0 text-[#54656f]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-[#111b21] placeholder:text-[#667781] outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searchBusy}
              className="shrink-0 rounded-lg bg-[#008069] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#006d5b] disabled:opacity-50"
            >
              {searchBusy ? "…" : "Search"}
            </button>
          </form>
        </div>

        {error ? (
          <p
            className="mx-3 mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {chatsError ? (
          <p
            className="mx-3 mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {chatsError}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {chatsLoading ? (
            <p className="px-4 py-8 text-center text-sm text-[#667781]">
              Loading your chats…
            </p>
          ) : (
            <>
              {chats.length > 0 ? (
                <ul className="divide-y divide-[#f0f2f5]">
                  {chats.map((chat) => {
                    const active = selectedChat?.chatId === chat.id;
                    const title = chatPeerDisplayName(chat);
                    const preview =
                      chat.lastMessage ??
                      (chat.group ? "Group chat" : "No messages yet");
                    return (
                      <li key={chat.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectExistingChat(chat)}
                          className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#f5f6f6] ${active ? "bg-[#f0f2f5]" : ""}`}
                        >
                          <Avatar label={title} />
                          <div className="min-w-0 flex-1 border-b border-[#f0f2f5] py-0.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate font-medium text-[#111b21]">
                                {title}
                              </p>
                              {chat.lastMessageTime ? (
                                <span className="shrink-0 text-[11px] text-[#667781]">
                                  {formatListTime(chat.lastMessageTime)}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-[#667781]">
                              {preview}
                            </p>
                          </div>
                          {chat.unreadCount > 0 ? (
                            <span className="shrink-0 self-center rounded-full bg-[#008069] px-2 py-0.5 text-xs font-medium text-white">
                              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {users.length > 0 ? (
                <>
                  <div className="sticky top-0 z-10 bg-[#f0f2f5] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#667781]">
                    Search results
                  </div>
                  <ul className="divide-y divide-[#f0f2f5]">
                    {users.map((user) => {
                      const active = selectedChat?.userId === user.id;
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            disabled={openBusy}
                            onClick={() => handleOpenChat(user)}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#f5f6f6] disabled:opacity-60 ${active ? "bg-[#f0f2f5]" : ""}`}
                          >
                            <Avatar label={user.username} />
                            <div className="min-w-0 flex-1 border-b border-[#f0f2f5] pb-3">
                              <p className="truncate font-medium text-[#111b21]">
                                {user.username}
                              </p>
                              <p className="truncate text-sm text-[#667781]">
                                Tap to start or open chat
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              {!chatsLoading &&
              chats.length === 0 &&
              users.length === 0 &&
              !chatsError ? (
                <p className="px-4 py-8 text-center text-sm text-[#667781]">
                  No conversations yet. Search above to find people.
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {/* —— Conversation —— */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col bg-[#e5ddd5] ${selectedChat ? "flex" : "hidden md:flex"}`}
      >
        {selectedChat ? (
          <>
            <header className="flex h-[60px] shrink-0 items-center gap-2 bg-[#008069] px-2 text-white md:px-4">
              <button
                type="button"
                onClick={closeChatMobile}
                className="rounded-full p-2 hover:bg-white/10 md:hidden"
                aria-label="Back to chats"
              >
                <IconBack />
              </button>
              <Avatar label={selectedChat.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium leading-tight">
                  {selectedChat.name}
                </p>
                <p className="truncate text-xs text-white/85">
                  {socketStatus === "connected"
                    ? "Connected · live messages"
                    : socketStatus === "connecting"
                      ? "Connecting…"
                      : socketStatus === "reconnecting"
                        ? "Reconnecting…"
                        : socketStatus === "error"
                          ? "Connection issue — check login"
                          : "Offline"}
                </p>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <span className="rounded-full p-2 opacity-90 hover:bg-white/10">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </span>
                <span className="rounded-full p-2 opacity-90 hover:bg-white/10">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                </span>
              </div>
            </header>

            <div
              className="relative min-h-0 flex-1 overflow-y-auto"
              style={{
                backgroundColor: "#e5ddd5",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <div className="flex min-h-full flex-col justify-end px-4 py-3 pb-2">
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                    <div className="max-w-sm rounded-lg border border-[#d1d7db] bg-[#ffecb3]/90 px-4 py-3 text-center text-sm text-[#54656f] shadow-sm">
                      <span className="font-medium text-[#111b21]">
                        No messages yet
                      </span>
                      <p className="mt-1 text-[13px] leading-snug">
                        Send a message to start the conversation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className={`flex ${m.outbound ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-[14.2px] leading-snug shadow-sm ${
                            m.outbound
                              ? "rounded-br-none bg-[#d9fdd3] text-[#111b21]"
                              : "rounded-bl-none bg-white text-[#111b21]"
                          } ${m.pending ? "opacity-75 ring-1 ring-[#008069]/25" : ""}`}
                        >
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {m.text}
                          </p>
                          <p className="mt-0.5 text-right text-[11px] text-[#667781]">
                            {formatMessageTime(m.createdAt)}
                            {m.pending ? " · sending" : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                    <li aria-hidden>
                      <div ref={messagesEndRef} className="h-1" />
                    </li>
                  </ul>
                )}
              </div>
            </div>

            <footer className="shrink-0 bg-[#f0f2f5] px-2 py-2 md:px-4">
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2"
              >
                <button
                  type="button"
                  className="mb-1 shrink-0 rounded-full p-2 text-[#54656f] hover:bg-[#e9edef]"
                  aria-label="Attach"
                >
                  <IconAttach />
                </button>
                <button
                  type="button"
                  className="mb-1 shrink-0 rounded-full p-2 text-[#54656f] hover:bg-[#e9edef]"
                  aria-label="Emoji"
                >
                  <IconEmoji />
                </button>
                <div className="mb-1 flex min-h-[42px] min-w-0 flex-1 items-center rounded-lg bg-white px-3 py-1 shadow-sm">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message"
                    className="min-h-[36px] w-full bg-transparent py-2 text-[15px] text-[#111b21] placeholder:text-[#667781] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white shadow-md transition hover:bg-[#006d5b] disabled:opacity-40"
                  disabled={
                    !draft.trim() ||
                    !selectedChat.userId ||
                    socketStatus !== "connected"
                  }
                  aria-label="Send"
                >
                  <IconSend className="ml-0.5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-[#f8f9fa] px-8 text-center">
            <div className="rounded-full border-2 border-dashed border-[#00a884]/35 p-10">
              <svg
                viewBox="0 0 24 24"
                className="mx-auto h-24 w-24 text-[#00a884]"
                fill="currentColor"
                aria-hidden
              >
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </div>
            <h2 className="mt-8 text-[32px] font-light text-[#41525d]">
              ChatApp Web
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#667781]">
              Search for a contact on the left, then pick a chat. Send messages
              are shown on your side in green bubbles—like WhatsApp.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
