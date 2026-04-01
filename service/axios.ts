import axios from "axios";
import { clearAuthSession } from "@/lib/auth-storage";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const path = config.url ?? "";
  const isAuthRoute = path === "/auth" || path.startsWith("/auth/");

  if (!isAuthRoute) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const data = error.response?.data;
    const code =
      data &&
      typeof data === "object" &&
      "errorCode" in data &&
      typeof (data as { errorCode: unknown }).errorCode === "string"
        ? (data as { errorCode: string }).errorCode
        : null;

    const reauthCodes = new Set([
      "TOKEN_EXPIRED",
      "INVALID_TOKEN",
      "AUTH_REQUIRED",
    ]);

    if (code && reauthCodes.has(code) && typeof window !== "undefined") {
      clearAuthSession();
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.assign("/auth");
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
