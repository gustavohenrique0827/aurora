import type { ChatMessage, ChatSendPayload, DashboardSnapshot } from "@jarvis/shared";
import { api } from "../lib/api";
import { useJarvisStore } from "./store";

const DASHBOARD_POLL_MS = 30_000;

let dashboardTimer: ReturnType<typeof setInterval> | null = null;

async function refreshDashboard(): Promise<void> {
  try {
    const snapshot = await api.dashboardSnapshot<DashboardSnapshot>();
    const store = useJarvisStore.getState();
    store.setDashboardSnapshot(snapshot);
    store.setApiConnected(true);
  } catch {
    useJarvisStore.getState().setApiConnected(false);
  }
}

/** Idempotent: starts the dashboard polling loop (replaces the old socket push) once per page load. */
export function startDashboardPolling(): void {
  if (dashboardTimer) return;
  void refreshDashboard();
  dashboardTimer = setInterval(() => void refreshDashboard(), DASHBOARD_POLL_MS);
}

/** Sends one chat turn and applies the reply/error to the store exactly like the old socket events did. */
export async function sendChat(payload: ChatSendPayload): Promise<void> {
  const store = useJarvisStore.getState();
  try {
    const message = await api.chat<ChatMessage>(payload);
    store.clearStreamingBuffer(payload.conversationId);
    store.addMessage(message);
    store.setAwaitingResponse(false);
    store.setSphereMode("speaking");
  } catch (err) {
    const error = err instanceof Error ? err.message : "Não foi possível falar com o JARVIS agora.";
    store.clearStreamingBuffer(payload.conversationId);
    store.addMessage({
      id: `error-${Date.now()}`,
      conversationId: payload.conversationId,
      role: "assistant",
      content: error,
      createdAt: new Date().toISOString(),
      error,
    });
    store.setAwaitingResponse(false);
    store.setSphereMode("error");
  }
}
