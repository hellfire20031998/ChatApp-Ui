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

export type AuthTokenPayload = {
  token: string;
};
