import axiosInstance from "./axios";
import type {
  ApiResponse,
  AuthSessionPayload,
  ChatMessageDto,
  ChatMessagesPagePayload,
  LoginRequest,
  MyChatsPayload,
  RegisterRequest,
  UserPreference,
} from "./type";

export const searchUsers = async <T = unknown>(
  query: string,
): Promise<ApiResponse<T>> => {
  const res = await axiosInstance.get<ApiResponse<T>>(`/chats/search`, {
    params: { q: query },
  });

  return res.data;
};

export const startChat = async <T = unknown>(
  userId: string,
): Promise<ApiResponse<T>> => {
  const res = await axiosInstance.post<ApiResponse<T>>(`/chats/start`, {
    userId,
  });

  return res.data;
};

export const createGroup = async <T = unknown>(
  groupName: string,
  participantIds: string[],
): Promise<ApiResponse<T>> => {
  const res = await axiosInstance.post<ApiResponse<T>>(`/chats/group`, {
    groupName,
    participantIds,
  });
  return res.data;
};

export const renameGroup = async <T = unknown>(
  chatId: string,
  groupName: string,
): Promise<ApiResponse<T>> => {
  const res = await axiosInstance.patch<ApiResponse<T>>(`/chats/${chatId}/group`, {
    groupName,
  });
  return res.data;
};

export const addGroupMembers = async <T = unknown>(
  chatId: string,
  participantIds: string[],
): Promise<ApiResponse<T>> => {
  const res = await axiosInstance.post<ApiResponse<T>>(`/chats/${chatId}/participants`, {
    participantIds,
  });
  return res.data;
};

export const leaveGroup = async (chatId: string): Promise<ApiResponse<string>> => {
  const res = await axiosInstance.post<ApiResponse<string>>(`/chats/${chatId}/leave`);
  return res.data;
};

export const login = async (
  payload: LoginRequest,
): Promise<ApiResponse<AuthSessionPayload>> => {
  const res = await axiosInstance.post<ApiResponse<AuthSessionPayload>>(
    `/auth/login`,
    payload,
  );
  return res.data;
};

export const register = async (
  payload: RegisterRequest,
): Promise<ApiResponse<AuthSessionPayload>> => {
  const res = await axiosInstance.post<ApiResponse<AuthSessionPayload>>(
    `/auth/register`,
    payload,
  );
  return res.data;
};

export const getChats = async (): Promise<ApiResponse<MyChatsPayload>> => {
  const res = await axiosInstance.get<ApiResponse<MyChatsPayload>>(
    `/chats/my-chats`,
  );
  return res.data;
};

export const getChatMessages = async (
  chatId: string,
  page = 0,
  size = 20,
): Promise<ApiResponse<ChatMessagesPagePayload>> => {
  const res = await axiosInstance.get<ApiResponse<ChatMessagesPagePayload>>(
    `/messages/${chatId}`,
    {
      params: { page, size },
    },
  );
  return res.data;
};

export const updateMessage = async (
  messageId: string,
  payload: { content: string; type: "TEXT" },
): Promise<ApiResponse<ChatMessageDto>> => {
  const res = await axiosInstance.patch<ApiResponse<ChatMessageDto>>(
    `/messages/${messageId}`,
    payload,
  );
  return res.data;
};

export const deleteMessage = async (
  messageId: string,
): Promise<ApiResponse<ChatMessageDto>> => {
  const res = await axiosInstance.delete<ApiResponse<ChatMessageDto>>(
    `/messages/${messageId}`,
  );
  return res.data;
};

export const getUserPreferences = async (): Promise<ApiResponse<UserPreference>> => {
  const res = await axiosInstance.get<ApiResponse<UserPreference>>(`/users/preferences`);
  return res.data;
};

export const updateUserPreferences = async (
  payload: Partial<UserPreference>,
): Promise<ApiResponse<UserPreference>> => {
  const res = await axiosInstance.patch<ApiResponse<UserPreference>>(
    `/users/preferences`,
    payload,
  );
  return res.data;
};

export const createUserPreferences = async (
  payload: Partial<UserPreference>,
): Promise<ApiResponse<UserPreference>> => {
  const res = await axiosInstance.post<ApiResponse<UserPreference>>(
    `/users/preferences`,
    payload,
  );
  return res.data;
};
