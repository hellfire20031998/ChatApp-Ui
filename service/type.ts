export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  username: string;
};

/** Backend `ApiResponse<T>` — `timestamp` is `Instant` (typically ISO-8601 in JSON). */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode?: string | null;
  timestamp: string;
  data: T;
};

/** Logged-in user returned with JWT from `/auth/login` and `/auth/register`. */
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  userRole: string | null;
};

/** `data` for successful auth responses (`token` + `user`). */
export type AuthSessionPayload = {
  token: string;
  user: AuthUser;
};

/** Nested user on a chat row from `GET /chats/my-chats`. */
export type ChatOtherUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  userRole: string | null;
};

/** One row inside `data.allChats` from `GET /chats/my-chats`. */
export type MyChatSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  group: boolean;
  groupName: string | null;
  createdBy?: string | null;
  adminIds?: string[] | null;
  canManageGroup?: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  otherUser: ChatOtherUser;
  participants: unknown;
  unreadCount: number;
};

/** `data` object from `GET /chats/my-chats`. */
export type MyChatsPayload = {
  allChats: MyChatSummary[];
};

/** One message row from `GET /messages/{chatId}`. */
export type ChatMessageDto = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  sender?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
  };
  content: string;
  timeStamp: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
};

/** `data` object from paginated `GET /messages/{chatId}`. */
export type ChatMessagesPagePayload = {
  messageDtoList: ChatMessageDto[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
};
