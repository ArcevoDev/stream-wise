import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

/**
 * BASE URL LOGIC
 * ─────────────
 * Dev:  Vite proxy rewrites /api → http://localhost:5000/api, so baseURL = "/api" works.
 * Prod: Set VITE_API_BASE_URL=https://your-server.railway.app in Vercel env vars.
 *       e.g. VITE_API_BASE_URL=https://dss-api.railway.app
 *       The axios instance will then send requests directly to the server origin,
 *       bypassing Vercel's static hosting (which can't forward to an external API).
 */
const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : "/api";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000, // raised from 10s to allow cold-start on free-tier hosts
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("dss_token");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/**
 * AuthContext registers this so a 401/403 can reset React state
 * (token + student) instead of relying on a hard window.location reload,
 * which leaves the app in a broken "logged in" state (roadmap item 4).
 */
let onAuthCleared: (() => void) | null = null;
export function registerAuthClearHandler(handler: () => void): void {
  onAuthCleared = handler;
}

// Global response error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    // 401 = no/invalid token, 403 = expired token or missing role.
    // Both mean the session is unusable. Clear it and send the user to login.
    if (status === 401 || status === 403) {
      localStorage.removeItem("dss_token");
      localStorage.removeItem("dss_student");
      onAuthCleared?.();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    // 429 = server rate limit (auth: 20/15min, api: 200/5min). Stay logged in.
    if (status === 429) {
      toast.error("Too many requests", {
        description: "Please wait a moment and try again.",
      });
    }

    return Promise.reject(err);
  }
);
