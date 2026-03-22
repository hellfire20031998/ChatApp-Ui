import axiosInstance from "./axios";
import type {
  ApiResponse,
  AuthSessionPayload,
  LoginRequest,
  MyChatsPayload,
  RegisterRequest,
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
