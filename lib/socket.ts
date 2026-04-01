import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { readAuthenticatedUserId } from "@/lib/auth-storage";

const USER_MESSAGES_QUEUE = "/user/queue/messages";

function wsBaseUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return api.replace(/\/$/, "");
}

function sockJsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return `${wsBaseUrl()}/ws`;
}

function sendDestination(): string {
  return (
    process.env.NEXT_PUBLIC_STOMP_SEND_DESTINATION ?? "/app/chat.send"
  );
}

function deliveredDestination(): string {
  return process.env.NEXT_PUBLIC_STOMP_DELIVERED_DESTINATION ?? "/app/chat.delivered";
}

function readDestination(): string {
  return process.env.NEXT_PUBLIC_STOMP_READ_DESTINATION ?? "/app/chat.read";
}

function typingDestination(): string {
  return process.env.NEXT_PUBLIC_STOMP_TYPING_DESTINATION ?? "/app/chat.typing";
}

function callSignalDestination(): string {
  return process.env.NEXT_PUBLIC_STOMP_CALL_DESTINATION ?? "/app/call.signal";
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export type SocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type OutgoingChatMessage = {
  chatId: string;
  receiverId?: string;
  content: string;
  type: "TEXT";
};

type MessageReceipt = {
  messageId: string;
  chatId: string;
};

type TypingEvent = {
  chatId: string;
  receiverId?: string;
  typing: boolean;
};

export type CallIceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

export type ChatSocketPayload = {
  eventType?: string;
  chatId: string;
  content: string;
  typing?: boolean;
  senderId?: string;
  senderUsername?: string;
  receiverId?: string;
  type?: string;
  status?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  /** WebRTC signaling (eventType === "CALL") */
  action?: string;
  callId?: string;
  mediaType?: string;
  sdp?: string;
  iceCandidate?: CallIceCandidate;
  fromUserId?: string;
};

let stompClient: Client | null = null;
let subscription: StompSubscription | null = null;
let messageHandler: ((msg: ChatSocketPayload) => void) | null = null;
let statusHandler: ((status: SocketStatus, detail?: string) => void) | null =
  null;
let connecting = false;

function logStatus(status: SocketStatus, detail?: string): void {
  const line = detail ? `[socket] ${status} — ${detail}` : `[socket] ${status}`;
  console.log(line);
  statusHandler?.(status, detail);
}

function parseIncomingBody(raw: string): ChatSocketPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeIncomingPayload(parsed);
  } catch {
    return null;
  }
}

function normalizeIncomingPayload(parsed: unknown): ChatSocketPayload | null {
  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;
  const o =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  if (o.chatId === undefined || o.chatId === null) return null;

  const eventType = typeof o.eventType === "string" ? o.eventType : undefined;
  const iceRaw = o.iceCandidate;
  let iceCandidate: CallIceCandidate | undefined;
  if (iceRaw && typeof iceRaw === "object" && iceRaw !== null) {
    const ic = iceRaw as Record<string, unknown>;
    if (typeof ic.candidate === "string") {
      iceCandidate = {
        candidate: ic.candidate,
        sdpMid: ic.sdpMid != null ? String(ic.sdpMid) : null,
        sdpMLineIndex:
          typeof ic.sdpMLineIndex === "number"
            ? ic.sdpMLineIndex
            : ic.sdpMLineIndex != null
              ? Number(ic.sdpMLineIndex)
              : null,
      };
    }
  }

  const content =
    typeof o.content === "string"
      ? o.content
      : o.message != null
        ? String(o.message)
        : "";

  const senderFromObject =
    o.sender && typeof o.sender === "object"
      ? (o.sender as Record<string, unknown>).id
      : undefined;
  const senderUsername =
    o.sender && typeof o.sender === "object"
      ? (() => {
          const s = o.sender as Record<string, unknown>;
          if (typeof s.username === "string") return s.username;
          if (typeof s.name === "string") return s.name;
          return undefined;
        })()
      : undefined;

  const createdAt =
    o.timeStamp != null
      ? formatServerTimestamp(o.timeStamp)
      : o.createdAt != null
        ? String(o.createdAt)
        : undefined;

  return {
    eventType,
    chatId: String(o.chatId),
    content,
    senderId:
      o.senderId != null
        ? String(o.senderId)
        : senderFromObject != null
          ? String(senderFromObject)
          : undefined,
    senderUsername,
    receiverId: o.receiverId != null ? String(o.receiverId) : undefined,
    type: typeof o.type === "string" ? o.type : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    typing: typeof o.typing === "boolean" ? o.typing : undefined,
    id: o.id != null ? String(o.id) : undefined,
    createdAt,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
    deleted: typeof o.deleted === "boolean" ? o.deleted : undefined,
    action: typeof o.action === "string" ? o.action : undefined,
    callId: o.callId != null ? String(o.callId) : undefined,
    mediaType: typeof o.mediaType === "string" ? o.mediaType : undefined,
    sdp: typeof o.sdp === "string" ? o.sdp : undefined,
    iceCandidate,
    fromUserId: o.fromUserId != null ? String(o.fromUserId) : undefined,
  };
}

/** Spring/Jackson may send `LocalDateTime` as ISO string or as a numeric array. */
function formatServerTimestamp(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const y = Number(value[0]);
  const month = Number(value[1]);
  const day = Number(value[2]);
  const hour = value.length > 3 ? Number(value[3]) : 0;
  const minute = value.length > 4 ? Number(value[4]) : 0;
  const second = value.length > 5 ? Number(value[5]) : 0;
  const nano = value.length > 6 ? Number(value[6]) : 0;
  if (![y, month, day, hour, minute, second].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  const ms = Math.floor(nano / 1_000_000);
  const d = new Date(Date.UTC(y, month - 1, day, hour, minute, second, ms));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** `user.id` from localStorage only (same as `readAuthenticatedUserId`). */
export function readUserIdFromToken(): string | null {
  if (typeof window === "undefined") return null;
  return readAuthenticatedUserId();
}

/**
 * Singleton STOMP-over-SockJS client. Subscribes to `/user/queue/messages`.
 */
export function connectSocket(
  userId: string,
  onMessageReceived: (msg: ChatSocketPayload) => void,
  onConnectionStatus?: (status: SocketStatus, detail?: string) => void,
): void {
  messageHandler = onMessageReceived;
  statusHandler = onConnectionStatus ?? null;

  const token = readToken();
  if (!token) {
    logStatus("error", "No JWT in localStorage");
    return;
  }

  if (stompClient?.connected) {
    logStatus("connected", `already connected (userId=${userId})`);
    return;
  }

  if (connecting) return;

  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch {
      /* noop */
    }
    stompClient = null;
  }
  subscription = null;

  connecting = true;
  logStatus("connecting", `SockJS → ${sockJsUrl()} (userId=${userId})`);

  const client = new Client({
    webSocketFactory: () => new SockJS(sockJsUrl()) as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (msg) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[STOMP]", msg);
      }
    },
    beforeConnect: (c) => {
      const fresh = readToken();
      c.connectHeaders = fresh
        ? { Authorization: `Bearer ${fresh}` }
        : {};
    },
    onConnect: () => {
      connecting = false;
      logStatus("connected", USER_MESSAGES_QUEUE);
      try {
        subscription?.unsubscribe();
      } catch {
        /* noop */
      }
      subscription = client.subscribe(USER_MESSAGES_QUEUE, (frame: IMessage) => {
        if (!frame.body) return;
        const payload = parseIncomingBody(frame.body);
        if (payload && messageHandler) messageHandler(payload);
      });
    },
    onDisconnect: () => {
      connecting = false;
      subscription = null;
      logStatus("disconnected", "STOMP disconnected");
    },
    onStompError: (frame) => {
      const detail = frame.headers?.message ?? frame.body ?? "STOMP error";
      console.error("[socket] STOMP error:", detail);
      logStatus("error", String(detail));
    },
    onWebSocketClose: (evt) => {
      console.log(`[socket] WebSocket closed (code ${evt.code})`);
      if (stompClient?.active) {
        logStatus("reconnecting", "scheduled retry");
      }
    },
    onWebSocketError: (evt) => {
      console.error("[socket] WebSocket error:", evt);
      logStatus("error", "WebSocket error");
    },
  });

  stompClient = client;
  client.activate();
}

export function sendMessage(message: OutgoingChatMessage): boolean {
  if (!stompClient?.connected) {
    console.warn("[socket] sendMessage: not connected");
    return false;
  }
  stompClient.publish({
    destination: sendDestination(),
    body: JSON.stringify(message),
    headers: { "content-type": "application/json" },
  });
  return true;
}

function sendReceipt(destination: string, receipt: MessageReceipt): boolean {
  if (!stompClient?.connected) return false;
  stompClient.publish({
    destination,
    body: JSON.stringify(receipt),
    headers: { "content-type": "application/json" },
  });
  return true;
}

export function sendDeliveredReceipt(receipt: MessageReceipt): boolean {
  return sendReceipt(deliveredDestination(), receipt);
}

export function sendReadReceipt(receipt: MessageReceipt): boolean {
  return sendReceipt(readDestination(), receipt);
}

export function sendTypingEvent(event: TypingEvent): boolean {
  if (!stompClient?.connected) return false;
  stompClient.publish({
    destination: typingDestination(),
    body: JSON.stringify(event),
    headers: { "content-type": "application/json" },
  });
  return true;
}

export type OutgoingCallSignal = {
  action: string;
  chatId: string;
  callId: string;
  mediaType: "AUDIO" | "VIDEO";
  sdp?: string;
  iceCandidate?: CallIceCandidate;
};

export function sendCallSignal(payload: OutgoingCallSignal): boolean {
  if (!stompClient?.connected) {
    console.warn("[socket] sendCallSignal: not connected");
    return false;
  }
  stompClient.publish({
    destination: callSignalDestination(),
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
  return true;
}

export function disconnectSocket(): void {
  try {
    subscription?.unsubscribe();
  } catch {
    /* noop */
  }
  subscription = null;
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
  connecting = false;
  messageHandler = null;
  statusHandler = null;
  console.log("[socket] disconnected (manual teardown)");
}
