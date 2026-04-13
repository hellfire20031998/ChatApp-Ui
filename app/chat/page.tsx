"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Paperclip,
  Phone,
  PhoneOff,
  Search,
  SendHorizontal,
  Smile,
  Video,
  VideoOff,
} from "@/lib/icons";
import { ChatEmojiPicker } from "@/components/chat-emoji-picker";
import { ChatUserMenu } from "@/components/chat-user-menu";
import { useAppTheme } from "@/components/app-theme-provider";
import { readStoredUser } from "@/lib/auth-storage";
import { useWebRtcCall } from "@/hooks/use-webrtc-call";
import {
  connectSocket,
  disconnectSocket,
  readUserIdFromToken,
  sendDeliveredReceipt,
  sendMessage,
  sendReadReceipt,
  sendTypingEvent,
  type ChatSocketPayload,
  type SocketStatus,
} from "@/lib/socket";
import {
  addGroupMembers,
  createUserPreferences,
  createGroup,
  deleteMessage,
  getChatMessages,
  getChats,
  getUserPreferences,
  leaveGroup,
  renameGroup,
  searchUsers,
  startChat,
  updateMessage,
  updateUserPreferences,
} from "@/service/api";
import type {
  AuthUser,
  ChatMessageDto,
  MyChatSummary,
  ThemeMode,
  ThemePreset,
  UserPreference,
} from "@/service/type";

type UserRow = {
  id: string;
  username: string;
};

type SelectedChat = {
  userId: string;
  name: string;
  chatId: string;
  group: boolean;
  canManageGroup: boolean;
};

type ChatMessage = {
  id: string;
  chatId?: string;
  text: string;
  outbound: boolean;
  senderUsername?: string;
  pending?: boolean;
  deleted?: boolean;
  createdAt?: string;
  status?: string;
};

function MessageStatusTick({ status }: { status?: string }) {
  if (!status) return null;
  const normalized = status.toUpperCase();
  if (normalized === "SENT") {
    return <span className="ml-1 text-[11px] text-zinc-500">✓</span>;
  }
  if (normalized === "DELIVERED") {
    return <span className="ml-1 text-[11px] text-zinc-500">✓✓</span>;
  }
  if (normalized === "READ") {
    return <span className="ml-1 text-[11px] text-[#34b7f1]">✓✓</span>;
  }
  return (
    <span className="ml-1 text-[11px] text-zinc-500">
      {normalized.toLowerCase()}
    </span>
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
      className={`flex shrink-0 items-center justify-center rounded-full bg-(--accent-100) font-medium text-(--accent-600) ${sizeClass}`}
    >
      {initial}
    </span>
  );
}

function normalizeMyChatSummary(row: unknown): MyChatSummary | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (r.id == null) return null;
  const isGroup = Boolean(r.group);

  const otherRaw = r.otherUser;
  const ou =
    otherRaw && typeof otherRaw === "object"
      ? (otherRaw as Record<string, unknown>)
      : null;
  if (!isGroup && (!ou || ou.id == null)) return null;

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
  const canManageGroup = Boolean(r.canManageGroup);

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
    group: isGroup,
    groupName,
    createdBy: r.createdBy != null ? String(r.createdBy) : null,
    adminIds: Array.isArray(r.adminIds)
      ? r.adminIds.map((id) => String(id))
      : null,
    canManageGroup,
    lastMessage,
    lastMessageTime,
    otherUser: {
      id: ou?.id != null ? String(ou.id) : "",
      username: ou && typeof ou.username === "string" ? ou.username : "",
      name: ou && typeof ou.name === "string" ? ou.name : "",
      email: ou && typeof ou.email === "string" ? ou.email : "",
      createdAt: ou?.createdAt != null ? String(ou.createdAt) : "",
      updatedAt: ou?.updatedAt != null ? String(ou.updatedAt) : "",
      deleted: Boolean(ou?.deleted),
      userRole:
        ou?.userRole === null || ou?.userRole === undefined
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

function normalizeMessageDto(
  row: unknown,
  selfUserId: string | null,
): ChatMessage | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<ChatMessageDto>;
  if (!r.id || !r.chatId) return null;
  const content =
    typeof r.content === "string"
      ? r.content
      : r.content != null
        ? String(r.content)
        : "";
  return {
    id: String(r.id),
    chatId: String(r.chatId),
    text: content,
    outbound: Boolean(selfUserId) && r.senderId === selfUserId,
    senderUsername:
      r.sender && typeof r.sender === "object"
        ? (() => {
            const s = r.sender as { username?: unknown; name?: unknown };
            if (typeof s.username === "string") return s.username;
            if (typeof s.name === "string") return s.name;
            return undefined;
          })()
        : undefined,
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.timeStamp === "string"
          ? r.timeStamp
          : undefined,
    status: typeof r.status === "string" ? r.status : undefined,
    deleted: Boolean(r.deleted),
  };
}

function normalizePreference(input: Partial<UserPreference> | null | undefined): UserPreference {
  const mode = input?.themeMode;
  const preset = input?.themePreset;
  return {
    themeMode:
      mode === "LIGHT" || mode === "DARK" || mode === "SYSTEM" ? mode : "SYSTEM",
    themePreset:
      preset === "EMERALD" || preset === "OCEAN" || preset === "SUNSET"
        ? preset
        : "EMERALD",
  };
}

export default function ChatPage() {
  const { preference, setPreference } = useAppTheme();
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
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextPage, setNextPage] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageBusyIds, setMessageBusyIds] = useState<Record<string, boolean>>(
    {},
  );
  const [typingByChat, setTypingByChat] = useState<Record<string, boolean>>({});
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupSettingsBusy, setGroupSettingsBusy] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "users">("chats");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [preferenceInitialized, setPreferenceInitialized] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const selfUserIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isPrependingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const emojiAnchorRef = useRef<HTMLDivElement | null>(null);

  const emojiPickerTheme = useMemo((): "light" | "dark" => {
    if (preference.themeMode === "DARK") return "dark";
    if (preference.themeMode === "LIGHT") return "light";
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, [preference.themeMode]);

  const webrtcCallHandlerRef = useRef<(p: ChatSocketPayload) => void>(() => {});

  const getDisplayNameForChat = useCallback((chatId: string) => {
    const c = chats.find((x) => x.id === chatId);
    return c ? chatPeerDisplayName(c) : "Someone";
  }, [chats]);

  const webrtc = useWebRtcCall({
    chatId: selectedChat?.chatId ?? null,
    peerUserId: selectedChat?.userId ?? null,
    isGroup: Boolean(selectedChat?.group),
    selfUserId: readUserIdFromToken(),
    getDisplayNameForChat,
  });

  useEffect(() => {
    webrtcCallHandlerRef.current = webrtc.handleRemoteSignal;
  }, [webrtc.handleRemoteSignal]);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const stream = webrtc.remoteStream;
    if (!stream) return;
    const v = remoteVideoRef.current;
    const a = remoteAudioRef.current;
    if (stream.getVideoTracks().length > 0 && v) {
      v.srcObject = stream;
      void v.play().catch(() => {});
    } else if (a) {
      a.srcObject = stream;
      void a.play().catch(() => {});
    }
  }, [webrtc.remoteStream]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (el && webrtc.localStream) {
      el.srcObject = webrtc.localStream;
      void el.play().catch(() => {});
    }
  }, [webrtc.localStream]);

  const applyPreference = useCallback(
    async (next: UserPreference) => {
      const previous = preference;
      setPreference(next);
      setThemeBusy(true);
      try {
        const updated = preferenceInitialized
          ? await updateUserPreferences(next)
          : await createUserPreferences(next);
        setPreference(normalizePreference(updated.data));
        setPreferenceInitialized(true);
      } catch {
        try {
          const fallback = preferenceInitialized
            ? await createUserPreferences(next)
            : await updateUserPreferences(next);
          setPreference(normalizePreference(fallback.data));
          setPreferenceInitialized(true);
        } catch {
          setPreference(previous);
          setError("Failed to save theme settings");
        }
      } finally {
        setThemeBusy(false);
      }
    },
    [preference, preferenceInitialized, setPreference],
  );

  const onThemeModeChange = useCallback(
    (mode: ThemeMode) => {
      if (themeBusy) return;
      const next = normalizePreference({ ...preference, themeMode: mode });
      void applyPreference(next);
    },
    [applyPreference, preference, themeBusy],
  );

  const onThemePresetChange = useCallback(
    (preset: ThemePreset) => {
      if (themeBusy) return;
      const next = normalizePreference({ ...preference, themePreset: preset });
      void applyPreference(next);
    },
    [applyPreference, preference, themeBusy],
  );

  useEffect(() => {
    setCurrentUser(readStoredUser());
  }, []);

  useEffect(() => {
    activeChatIdRef.current = selectedChat?.chatId ?? null;
    setGroupMenuOpen(false);
  }, [selectedChat?.chatId]);

  useEffect(() => {
    let ignore = false;
    const syncPreference = async () => {
      try {
        const res = await getUserPreferences();
        if (ignore) return;
        setPreference(normalizePreference(res.data));
        setPreferenceInitialized(true);
      } catch {
        // Ignore silently: local stored preference is already applied.
      }
    };
    void syncPreference();
    return () => {
      ignore = true;
    };
  }, [setPreference]);

  useEffect(() => {
    const userId = readUserIdFromToken() ?? "";
    selfUserIdRef.current = userId || null;

    const onIncoming = (payload: ChatSocketPayload) => {
      const activeId = activeChatIdRef.current;
      if (payload.eventType === "CALL") {
        webrtcCallHandlerRef.current(payload);
        return;
      }
      if (payload.eventType === "TYPING") {
        const selfId = selfUserIdRef.current ?? "";
        if (!payload.chatId || payload.senderId === selfId) return;
        setTypingByChat((prev) => ({ ...prev, [payload.chatId]: Boolean(payload.typing) }));
        return;
      }

      const selfId = selfUserIdRef.current ?? "";
      const isOwnMessage = Boolean(selfId) && payload.senderId === selfId;
      const isActiveChat = Boolean(activeId) && payload.chatId === activeId;
      const status = payload.status?.toUpperCase();
      const isNewIncomingMessage = !isOwnMessage && status === "SENT";

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== payload.chatId) return c;
          const nextUnread =
            isNewIncomingMessage && !isActiveChat ? c.unreadCount + 1 : c.unreadCount;
          return {
            ...c,
            lastMessage: payload.deleted ? "Message deleted" : payload.content,
            lastMessageTime:
              payload.createdAt ?? payload.updatedAt ?? c.lastMessageTime,
            unreadCount: nextUnread,
          };
        }),
      );

      const canAckDirect =
        Boolean(selfId) && payload.receiverId != null && payload.receiverId === selfId;
      if (isNewIncomingMessage && payload.id && canAckDirect) {
        sendDeliveredReceipt({ messageId: payload.id, chatId: payload.chatId });
        if (isActiveChat) {
          sendReadReceipt({ messageId: payload.id, chatId: payload.chatId });
          setTypingByChat((prev) => ({ ...prev, [payload.chatId]: false }));
        }
      }

      if (!isActiveChat) return;

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
        const existingIndex = withoutMatchingPending.findIndex(
          (m) => m.id === serverId,
        );
        if (existingIndex >= 0) {
          const copy = [...withoutMatchingPending];
          copy[existingIndex] = {
            ...copy[existingIndex],
            text: payload.content,
            outbound: isOwnMessage,
            senderUsername: payload.senderUsername ?? copy[existingIndex].senderUsername,
            createdAt: payload.createdAt ?? copy[existingIndex].createdAt,
            status: payload.status ?? copy[existingIndex].status,
            deleted: payload.deleted ?? copy[existingIndex].deleted,
          };
          return copy;
        }
        return [
          ...withoutMatchingPending,
          {
            id: serverId,
            chatId: payload.chatId,
            text: payload.content,
            outbound: isOwnMessage,
            senderUsername: payload.senderUsername,
            createdAt: payload.createdAt,
            status: payload.status,
            deleted: payload.deleted,
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

  const loadMessagesPage = useCallback(
    async (
      chatId: string,
      page: number,
      mode: "replace" | "prepend",
      scrollSnapshot?: { prevHeight: number; prevTop: number },
    ) => {
      if (mode === "replace") {
        setMessagesLoading(true);
        setMessages([]);
        setHasMoreMessages(false);
        setNextPage(0);
      } else {
        setLoadingOlder(true);
        isPrependingRef.current = true;
      }

      try {
        const res = await getChatMessages(chatId, page, 20);
        if (activeChatIdRef.current !== chatId) return;

        const data = res.data;
        const list = Array.isArray(data.messageDtoList)
          ? data.messageDtoList
              .map((row) => normalizeMessageDto(row, selfUserIdRef.current))
              .filter((m): m is ChatMessage => m !== null)
          : [];

        setMessages((prev) => {
          const merged = mode === "replace" ? list : [...list, ...prev];
          const byId = new Map<string, ChatMessage>();
          for (const item of merged) byId.set(item.id, item);
          return [...byId.values()].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
          });
        });

        setHasMoreMessages(data.currentPage + 1 < data.totalPages);
        setNextPage(data.currentPage + 1);

        if (mode === "replace") {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          });
        } else if (scrollSnapshot) {
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (!container) return;
            const newHeight = container.scrollHeight;
            container.scrollTop =
              newHeight - scrollSnapshot.prevHeight + scrollSnapshot.prevTop;
          });
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const body = err.response?.data;
          setError(
            typeof body === "object" &&
              body !== null &&
              "message" in body &&
              typeof (body as { message: unknown }).message === "string"
              ? (body as { message: string }).message
              : "Could not load messages",
          );
        } else {
          setError("Could not load messages");
        }
      } finally {
        setMessagesLoading(false);
        setLoadingOlder(false);
        isPrependingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const chatId = selectedChat?.chatId;
    setEditingMessageId(null);
    setEditDraft("");
    if (!chatId) {
      setMessages([]);
      setDraft("");
      setMessagesLoading(false);
      setLoadingOlder(false);
      setHasMoreMessages(false);
      setNextPage(0);
      setMessageBusyIds({});
      return;
    }

    void loadMessagesPage(chatId, 0, "replace");
  }, [selectedChat?.chatId, loadMessagesPage]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSearchBusy(true);
    try {
      const res = await searchUsers<UserRow[]>(query);
      setUsers(Array.isArray(res.data) ? res.data : []);
      setSidebarTab("users");
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

  const toggleGroupMember = (userId: string) => {
    setGroupMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    const name = groupNameDraft.trim();
    if (!name) {
      setError("Enter a group name.");
      return;
    }
    if (groupMemberIds.length === 0) {
      setError("Select at least one member.");
      return;
    }
    setError(null);
    setGroupBusy(true);
    try {
      const res = await createGroup<{ id: string | number; groupName?: string }>(
        name,
        groupMemberIds,
      );
      const payload = res.data;
      const chatId = payload?.id != null ? String(payload.id) : "";
      setSelectedChat({
        chatId,
        userId: "",
        group: true,
        canManageGroup: true,
        name:
          payload &&
          typeof payload === "object" &&
          "groupName" in payload &&
          typeof payload.groupName === "string" &&
          payload.groupName.trim()
            ? payload.groupName
            : name,
      });
      setGroupModalOpen(false);
      setGroupNameDraft("");
      setGroupMemberIds([]);
      setUsers([]);
      setQuery("");
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
            : "Could not create group",
        );
      } else {
        setError("Could not create group");
      }
    } finally {
      setGroupBusy(false);
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
        group: false,
        canManageGroup: false,
      });
      setSidebarTab("chats");
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
    setTypingByChat((prev) => ({ ...prev, [chat.id]: false }));
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)),
    );
    setSelectedChat({
      chatId: chat.id,
      userId: chat.group ? "" : chat.otherUser.id,
      name: chatPeerDisplayName(chat),
      group: chat.group,
      canManageGroup: Boolean(chat.canManageGroup),
    });
    setSidebarTab("chats");
  };

  const handleAddMembersToSelectedGroup = async () => {
    if (!selectedChat || !selectedChat.group) return;
    if (groupMemberIds.length === 0) {
      setError("Select at least one user to add.");
      return;
    }
    setGroupSettingsBusy(true);
    setError(null);
    try {
      await addGroupMembers(selectedChat.chatId, groupMemberIds);
      setGroupMemberIds([]);
      setUsers([]);
      setQuery("");
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
            : "Could not add members",
        );
      } else {
        setError("Could not add members");
      }
    } finally {
      setGroupSettingsBusy(false);
    }
  };

  const handleRenameSelectedGroup = async () => {
    if (!selectedChat || !selectedChat.group) return;
    const next = window.prompt("Enter new group name", selectedChat.name)?.trim();
    if (!next) return;
    setGroupSettingsBusy(true);
    setError(null);
    try {
      await renameGroup(selectedChat.chatId, next);
      setSelectedChat((prev) => (prev ? { ...prev, name: next } : prev));
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
            : "Could not rename group",
        );
      } else {
        setError("Could not rename group");
      }
    } finally {
      setGroupSettingsBusy(false);
    }
  };

  const handleLeaveSelectedGroup = async () => {
    if (!selectedChat || !selectedChat.group) return;
    if (!window.confirm(`Leave "${selectedChat.name}"?`)) return;
    setGroupSettingsBusy(true);
    setError(null);
    try {
      await leaveGroup(selectedChat.chatId);
      setSelectedChat(null);
      setMessages([]);
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
            : "Could not leave group",
        );
      } else {
        setError("Could not leave group");
      }
    } finally {
      setGroupSettingsBusy(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedChat) return;
    setEmojiPickerOpen(false);
    setError(null);

    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        chatId: selectedChat.chatId,
        text,
        outbound: true,
        pending: true,
        status: "SENDING",
        createdAt: new Date().toISOString(),
      },
    ]);
    if (typingActiveRef.current) {
      sendTypingEvent({
        chatId: selectedChat.chatId,
        receiverId: selectedChat.userId || undefined,
        typing: false,
      });
      typingActiveRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setDraft("");

    const sent = sendMessage({
      chatId: selectedChat.chatId,
      receiverId: selectedChat.userId || undefined,
      content: text,
      type: "TEXT",
    });

    if (!sent) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Not connected — message was not sent.");
    }
  };

  const closeChatMobile = () => {
    if (typingActiveRef.current && selectedChat?.chatId) {
      sendTypingEvent({
        chatId: selectedChat.chatId,
        receiverId: selectedChat.userId || undefined,
        typing: false,
      });
      typingActiveRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setSelectedChat(null);
  };

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (!selectedChat?.chatId || socketStatus !== "connected") return;
      const text = value.trim();
      if (text.length > 0 && !typingActiveRef.current) {
        sendTypingEvent({
          chatId: selectedChat.chatId,
          receiverId: selectedChat.userId || undefined,
          typing: true,
        });
        typingActiveRef.current = true;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (!typingActiveRef.current) return;
        sendTypingEvent({
          chatId: selectedChat.chatId,
          receiverId: selectedChat.userId || undefined,
          typing: false,
        });
        typingActiveRef.current = false;
      }, 1200);
      if (text.length === 0 && typingActiveRef.current) {
        sendTypingEvent({
          chatId: selectedChat.chatId,
          receiverId: selectedChat.userId || undefined,
          typing: false,
        });
        typingActiveRef.current = false;
      }
    },
    [selectedChat?.chatId, selectedChat?.userId, socketStatus],
  );

  const insertEmojiInDraft = useCallback(
    (emoji: string) => {
      const el = draftInputRef.current;
      let start = draft.length;
      let end = draft.length;
      if (el && document.activeElement === el) {
        start = el.selectionStart ?? draft.length;
        end = el.selectionEnd ?? draft.length;
      }
      const next = draft.slice(0, start) + emoji + draft.slice(end);
      handleDraftChange(next);
      setEmojiPickerOpen(false);
      const caret = start + emoji.length;
      requestAnimationFrame(() => {
        const input = draftInputRef.current;
        if (!input) return;
        input.focus();
        input.setSelectionRange(caret, caret);
      });
    },
    [draft, handleDraftChange],
  );

  useEffect(() => {
    if (!emojiPickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!emojiAnchorRef.current?.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiPickerOpen]);

  useEffect(() => {
    setEmojiPickerOpen(false);
  }, [selectedChat?.chatId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    };
  }, []);

  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditDraft(message.text);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditDraft("");
  };

  const saveEditMessage = async (messageId: string) => {
    const content = editDraft.trim();
    if (!content) {
      setError("Message cannot be empty.");
      return;
    }
    const current = messages.find((m) => m.id === messageId);
    if (!current) return;
    const previousText = current.text;

    setMessageBusyIds((prev) => ({ ...prev, [messageId]: true }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, text: content, status: "UPDATING" }
          : m,
      ),
    );
    setEditingMessageId(null);
    setEditDraft("");

    try {
      const res = await updateMessage(messageId, { content, type: "TEXT" });
      const updated = normalizeMessageDto(res.data, selfUserIdRef.current);
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m)),
        );
      }
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: previousText } : m,
        ),
      );
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        setError(
          typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : "Could not edit message",
        );
      } else {
        setError("Could not edit message");
      }
    } finally {
      setMessageBusyIds((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const previous = messages.find((m) => m.id === messageId);
    if (!previous) return;
    setMessageBusyIds((prev) => ({ ...prev, [messageId]: true }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted: true, text: "Message deleted", status: "DELETED" }
          : m,
      ),
    );
    if (editingMessageId === messageId) cancelEditMessage();

    try {
      const res = await deleteMessage(messageId);
      const deleted = normalizeMessageDto(res.data, selfUserIdRef.current);
      if (deleted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...deleted, deleted: true } : m)),
        );
      }
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? previous : m)),
      );
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        setError(
          typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : "Could not delete message",
        );
      } else {
        setError("Could not delete message");
      }
    } finally {
      setMessageBusyIds((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  };

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!selectedChat?.chatId) return;
    if (el.scrollTop > 60) return;
    if (loadingOlder || messagesLoading || !hasMoreMessages) return;
    const snapshot = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
    void loadMessagesPage(selectedChat.chatId, nextPage, "prepend", snapshot);
  };

  useEffect(() => {
    if (isPrependingRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (socketStatus !== "connected") return;
    const chatId = selectedChat?.chatId;
    if (!chatId || !selectedChat?.userId) return;
    const toMarkRead = messages.filter(
      (m) =>
        m.chatId === chatId &&
        !m.outbound &&
        !m.deleted &&
        Boolean(m.id) &&
        m.status?.toUpperCase() !== "READ",
    );
    if (toMarkRead.length === 0) return;
    toMarkRead.forEach((m) => {
      sendReadReceipt({ messageId: m.id, chatId });
    });
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [messages, selectedChat?.chatId, socketStatus]);

  const sidebarHiddenOnMobile = selectedChat !== null;

  return (
    <>
    <div className="flex h-dvh w-full overflow-hidden bg-linear-to-b from-(--accent-100) to-zinc-100 text-zinc-900 antialiased dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      {/* —— Sidebar (chat list) —— */}
      <aside
        className={`flex min-h-0 w-full min-w-0 flex-col border-zinc-200/80 bg-white/80 backdrop-blur md:w-[400px] md:max-w-[40vw] md:border-r dark:border-zinc-800 dark:bg-zinc-900/80 ${sidebarHiddenOnMobile ? "hidden md:flex" : "flex"}`}
      >
        <header className="flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-zinc-200/80 bg-white/90 px-3 text-zinc-900 sm:gap-3 sm:px-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          <h1 className="min-w-0 shrink text-xl font-medium tracking-tight">Chats</h1>
          <ChatUserMenu
            user={currentUser}
            preference={preference}
            themeBusy={themeBusy}
            onThemeModeChange={onThemeModeChange}
            onThemePresetChange={onThemePresetChange}
          />
        </header>

        <div className="shrink-0 bg-zinc-50/70 px-3 py-2 dark:bg-zinc-900/40">
          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <Search className="h-[18px] w-[18px] shrink-0 text-zinc-500 dark:text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-zinc-900 placeholder:text-zinc-500 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <button
                type="submit"
                disabled={searchBusy}
                className="min-h-11 w-full rounded-lg bg-(--accent-500) px-4 py-2 text-sm font-medium text-white transition hover:bg-(--accent-600) disabled:opacity-50 sm:min-h-0 sm:w-auto"
              >
                {searchBusy ? "…" : "Search"}
              </button>
              <button
                type="button"
                onClick={() => setGroupModalOpen(true)}
                className="min-h-11 w-full rounded-lg border border-(--accent-500) bg-white px-3 py-2 text-sm font-medium text-(--accent-600) transition hover:bg-(--accent-100) dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:min-h-0 sm:w-auto"
              >
                New group
              </button>
            </div>
          </form>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSidebarTab("chats")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sidebarTab === "chats"
                  ? "bg-(--accent-500) text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Chats
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("users")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sidebarTab === "users"
                  ? "bg-(--accent-500) text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Users
            </button>
          </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-white/80 dark:bg-zinc-900/80">
          {chatsLoading ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading your chats…
            </p>
          ) : (
            <>
              {sidebarTab === "chats" && chats.length > 0 ? (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                          className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-zinc-100/80 dark:hover:bg-zinc-800 ${active ? "bg-(--accent-100) dark:bg-zinc-800" : ""}`}
                        >
                          <Avatar label={title} />
                          <div className="min-w-0 flex-1 border-b border-zinc-100 py-0.5 dark:border-zinc-800">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                {title}
                              </p>
                              {chat.lastMessageTime ? (
                                <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {formatListTime(chat.lastMessageTime)}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                              {preview}
                            </p>
                          </div>
                          {chat.unreadCount > 0 ? (
                            <span className="shrink-0 self-center rounded-full bg-(--accent-500) px-2 py-0.5 text-xs font-medium text-white">
                              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {sidebarTab === "users" && users.length > 0 ? (
                <>
                  <div className="sticky top-0 z-10 bg-zinc-50/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-400">
                    Search results
                  </div>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {users.map((user) => {
                      const active = selectedChat?.userId === user.id;
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            disabled={openBusy}
                            onClick={() => {
                              if (selectedChat?.group) {
                                toggleGroupMember(user.id);
                              } else {
                                void handleOpenChat(user);
                              }
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-zinc-100/80 disabled:opacity-60 dark:hover:bg-zinc-800 ${active ? "bg-(--accent-100) dark:bg-zinc-800" : ""}`}
                          >
                            <Avatar label={user.username} />
                            <div className="min-w-0 flex-1 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                {user.username}
                              </p>
                              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                {selectedChat?.group
                                  ? groupMemberIds.includes(user.id)
                                    ? "Selected for adding"
                                    : "Tap to select member"
                                  : "Tap to start or open chat"}
                              </p>
                            </div>
                            {selectedChat?.group ? (
                              <input
                                type="checkbox"
                                checked={groupMemberIds.includes(user.id)}
                                onChange={() => toggleGroupMember(user.id)}
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              {!chatsLoading &&
              ((sidebarTab === "chats" && chats.length === 0) ||
                (sidebarTab === "users" && users.length === 0)) &&
              !chatsError ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {sidebarTab === "chats"
                    ? "No conversations yet. Search above to find people."
                    : "No users found. Try another search."}
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {/* —— Conversation —— */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col bg-zinc-50/70 dark:bg-zinc-950 ${selectedChat ? "flex" : "hidden md:flex"}`}
      >
        {selectedChat ? (
          <>
            <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white/90 px-2 text-zinc-900 md:px-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
              <button
                type="button"
                onClick={closeChatMobile}
                className="rounded-full p-2 hover:bg-white/10 md:hidden"
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <Avatar label={selectedChat.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium leading-tight">
                  {selectedChat.name}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {typingByChat[selectedChat.chatId]
                    ? `${selectedChat.name} is typing...`
                    : socketStatus === "connected"
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
              {selectedChat.group ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setGroupMenuOpen((v) => !v)}
                    className="rounded-full px-2 py-1 text-xl leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Group actions"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {groupMenuOpen ? (
                    <div className="absolute right-0 top-9 z-20 w-40 rounded-md border border-zinc-200 bg-white py-1 text-sm text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                      {selectedChat.canManageGroup ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleAddMembersToSelectedGroup();
                              setGroupMenuOpen(false);
                            }}
                            disabled={groupSettingsBusy || groupMemberIds.length === 0}
                            className="block w-full px-3 py-2 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                          >
                            Add members
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRenameSelectedGroup();
                              setGroupMenuOpen(false);
                            }}
                            disabled={groupSettingsBusy}
                            className="block w-full px-3 py-2 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                          >
                            Rename group
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          void handleLeaveSelectedGroup();
                          setGroupMenuOpen(false);
                        }}
                        disabled={groupSettingsBusy}
                        className="block w-full px-3 py-2 text-left text-red-600 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                      >
                        Leave group
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!selectedChat.group && selectedChat.userId ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void webrtc.startCall("AUDIO")}
                    disabled={
                      webrtc.callPhase !== "idle" || socketStatus !== "connected"
                    }
                    className="rounded-full p-2.5 text-zinc-600 opacity-90 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Voice call"
                  >
                    <Phone className="h-[22px] w-[22px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void webrtc.startCall("VIDEO")}
                    disabled={
                      webrtc.callPhase !== "idle" || socketStatus !== "connected"
                    }
                    className="rounded-full p-2.5 text-zinc-600 opacity-90 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Video call"
                  >
                    <Video className="h-[22px] w-[22px]" />
                  </button>
                </div>
              ) : null}
            </header>

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="relative min-h-0 flex-1 overflow-y-auto"
              style={{
                backgroundColor: "#f8fafc",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <div className="flex min-h-full flex-col justify-end px-4 py-3 pb-2">
                {loadingOlder ? (
                  <p className="pb-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Loading older messages...
                  </p>
                ) : null}
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                    <div className="max-w-sm rounded-lg border border-zinc-200 bg-white/90 px-4 py-3 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {messagesLoading ? "Loading messages..." : "No messages yet"}
                      </span>
                      <p className="mt-1 text-[13px] leading-snug">
                        {messagesLoading
                          ? "Please wait while we load this chat history."
                          : "Send a message to start the conversation."}
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
                          className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 text-[14.2px] leading-snug shadow-sm ${
                            m.outbound
                              ? "rounded-br-none bg-(--accent-100) text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                              : "rounded-bl-none bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                          } ${m.pending ? "opacity-75 ring-1 ring-(--accent-500)/25" : ""}`}
                        >
                          {!m.outbound && m.senderUsername ? (
                            <p className="mb-1 text-xs font-medium text-(--accent-600) dark:text-(--accent-500)">
                              {m.senderUsername}
                            </p>
                          ) : null}
                          {editingMessageId === m.id ? (
                            <div className="mb-1 flex items-center gap-2">
                              <input
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                                maxLength={2000}
                              />
                              <button
                                type="button"
                                onClick={() => void saveEditMessage(m.id)}
                                disabled={Boolean(messageBusyIds[m.id]) || !editDraft.trim()}
                                className="rounded bg-(--accent-500) px-2 py-1 text-xs text-white disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditMessage}
                                disabled={Boolean(messageBusyIds[m.id])}
                                className="rounded bg-zinc-500 px-2 py-1 text-xs text-white disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p
                              className={`wrap-break-word whitespace-pre-wrap ${
                                m.deleted ? "italic text-zinc-500" : ""
                              }`}
                            >
                              {m.deleted ? "Message deleted" : m.text}
                            </p>
                          )}
                          {m.outbound && !m.pending && !m.deleted ? (
                            <div className="mt-1 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditMessage(m)}
                                disabled={Boolean(messageBusyIds[m.id])}
                                className="text-[11px] font-medium text-(--accent-600) hover:underline disabled:opacity-50 dark:text-(--accent-500)"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteMessage(m.id)}
                                disabled={Boolean(messageBusyIds[m.id])}
                                className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                          <p className="mt-0.5 flex items-center justify-end text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>{formatMessageTime(m.createdAt)}</span>
                            {m.pending ? (
                              <span className="ml-1">sending</span>
                            ) : m.outbound ? (
                              <MessageStatusTick status={m.status} />
                            ) : null}
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

            <footer className="shrink-0 border-t border-zinc-200/80 bg-white/90 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4 dark:border-zinc-800 dark:bg-zinc-900">
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2"
              >
                <button
                  type="button"
                  className="mb-1 min-h-11 min-w-11 shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:min-h-0 sm:min-w-0"
                  aria-label="Attach"
                >
                  <Paperclip className="h-6 w-6" />
                </button>
                <div ref={emojiAnchorRef} className="relative mb-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmojiPickerOpen((o) => !o)}
                    className={`min-h-11 min-w-11 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:min-h-0 sm:min-w-0 ${emojiPickerOpen ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                    aria-label="Emoji"
                    aria-expanded={emojiPickerOpen}
                    aria-haspopup="dialog"
                  >
                    <Smile className="h-6 w-6" />
                  </button>
                  {emojiPickerOpen ? (
                    <div
                      className="absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-xl border border-zinc-200 shadow-xl dark:border-zinc-700"
                      role="dialog"
                      aria-label="Emoji picker"
                    >
                      <ChatEmojiPicker
                        theme={emojiPickerTheme}
                        onSelect={insertEmojiInDraft}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="mb-1 flex min-h-[42px] min-w-0 flex-1 items-center rounded-lg border border-transparent bg-white px-3 py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <input
                    ref={draftInputRef}
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder="Type a message"
                    className="min-h-[36px] w-full bg-transparent py-2 text-[15px] text-zinc-900 placeholder:text-zinc-500 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400"
                  />
                </div>
                <button
                  type="submit"
                  className="mb-1 flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-(--accent-500) text-white shadow-md transition hover:bg-(--accent-600) disabled:opacity-40"
                  disabled={
                    !draft.trim() ||
                    socketStatus !== "connected"
                  }
                  aria-label="Send"
                >
                  <SendHorizontal className="ml-0.5 h-[22px] w-[22px]" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-zinc-50 px-8 text-center dark:bg-zinc-950">
            <div className="rounded-full border-2 border-dashed border-(--accent-500)/45 p-10">
              <MessageSquare className="mx-auto h-24 w-24 text-(--accent-500)" />
            </div>
            <h2 className="mt-8 text-[32px] font-light text-zinc-700 dark:text-zinc-200">
              ChatApp Web
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Search for a contact on the left, then pick a chat. Send messages
              are shown with the same ChatApp look and feel across pages.
            </p>
          </div>
        )}
      </section>
    </div>
    {webrtc.callPhase !== "idle" ? (
      <div className="fixed inset-0 z-60 flex flex-col bg-zinc-950/95 text-white">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {webrtc.callError ? (
          <p className="bg-red-600/90 px-4 py-2 text-center text-sm">{webrtc.callError}</p>
        ) : null}
        {webrtc.callPhase === "incoming" && webrtc.incoming ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <p className="text-sm text-zinc-400">Incoming call</p>
            <p className="text-2xl font-semibold">{webrtc.incoming.displayName}</p>
            <p className="text-zinc-400">
              {webrtc.incoming.mediaType === "VIDEO" ? "Video" : "Voice"}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => void webrtc.acceptCall()}
                className="rounded-full bg-(--accent-500) px-8 py-3 text-sm font-medium hover:bg-(--accent-600)"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => webrtc.rejectCall()}
                className="rounded-full bg-red-600 px-8 py-3 text-sm font-medium hover:bg-red-500"
              >
                Decline
              </button>
            </div>
          </div>
        ) : null}
        {webrtc.callPhase === "outgoing" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <p className="text-sm text-zinc-400">Calling…</p>
            <p className="text-2xl font-semibold">
              {selectedChat?.name ?? "Contact"}
            </p>
            <button
              type="button"
              onClick={() => webrtc.cancelOutgoing()}
              className="rounded-full border border-white/30 px-8 py-3 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        ) : null}
        {webrtc.callPhase === "connecting" ? (
          <div className="flex flex-1 items-center justify-center text-zinc-400">
            Connecting…
          </div>
        ) : null}
        {webrtc.callPhase === "connected" ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            {webrtc.remoteStream &&
            webrtc.remoteStream.getVideoTracks().length > 0 ? (
              <video
                ref={remoteVideoRef}
                className="h-full min-h-[200px] w-full flex-1 bg-black object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-900">
                <Phone className="h-16 w-16 text-zinc-500" />
                <p className="text-lg text-zinc-300">{selectedChat?.name}</p>
              </div>
            )}
            {webrtc.localStream &&
            webrtc.localStream.getVideoTracks().length > 0 ? (
              <video
                ref={localVideoRef}
                className="absolute bottom-24 right-4 h-28 w-36 rounded-lg border border-white/20 bg-black object-cover shadow-xl sm:h-36 sm:w-48"
                autoPlay
                playsInline
                muted
              />
            ) : null}
            <div className="flex shrink-0 items-center justify-center gap-4 border-t border-white/10 bg-zinc-900/90 py-4">
              <button
                type="button"
                onClick={() => webrtc.toggleMute()}
                className="rounded-full bg-white/10 p-4 hover:bg-white/20"
                aria-label={webrtc.muted ? "Unmute" : "Mute"}
              >
                {webrtc.muted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>
              {webrtc.localStream &&
              webrtc.localStream.getVideoTracks().length > 0 ? (
                <button
                  type="button"
                  onClick={() => webrtc.toggleVideo()}
                  className="rounded-full bg-white/10 p-4 hover:bg-white/20"
                  aria-label={webrtc.videoOff ? "Camera on" : "Camera off"}
                >
                  {webrtc.videoOff ? (
                    <VideoOff className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => webrtc.endCall()}
                className="rounded-full bg-red-600 p-4 hover:bg-red-500"
                aria-label="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null}
    {groupModalOpen ? (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
        <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create group</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Search users, select members, and create a group chat.
          </p>
          <input
            value={groupNameDraft}
            onChange={(e) => setGroupNameDraft(e.target.value)}
            placeholder="Group name"
            className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
          <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
            {users.length === 0 ? (
              <p className="p-3 text-sm text-zinc-500 dark:text-zinc-400">Search users first to add members.</p>
            ) : (
              <ul>
                {users.map((u) => {
                  const checked = groupMemberIds.includes(u.id);
                  return (
                    <li key={u.id}>
                      <label className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroupMember(u.id)}
                        />
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{u.username}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-white pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => {
                if (groupBusy) return;
                setGroupModalOpen(false);
                setGroupNameDraft("");
                setGroupMemberIds([]);
              }}
              className="min-h-11 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateGroup()}
              disabled={groupBusy}
              className="min-h-11 rounded-md bg-(--accent-500) px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {groupBusy ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
