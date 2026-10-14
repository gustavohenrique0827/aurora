import type { TokenUsageSnapshot } from "@jarvis/shared";

const API_BASE = ""; // same-origin — Vercel serves /api/* from the serverless function, the vite proxy handles it in dev

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? `request_failed_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (token: string) => request<{ ok: true }>("/api/auth/login", { method: "POST", body: JSON.stringify({ token }) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ ok: true; sub: string }>("/api/auth/me"),
  askDirector: (directorId: string, message: string, conversationId: string) =>
    request(`/api/directors/${directorId}/ask`, { method: "POST", body: JSON.stringify({ message, conversationId }) }),
  dashboardSnapshot: <T>() => request<T>("/api/dashboard/snapshot"),
  chat: <T>(payload: unknown) => request<T>("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  tokenUsageSummary: () => request<TokenUsageSnapshot>("/api/token-usage/summary"),
};
