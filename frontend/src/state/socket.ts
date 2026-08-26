import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS, type ChatChunkEvent, type ChatCompleteEvent, type ChatErrorEvent, type DashboardSnapshot } from "@jarvis/shared";
import { useJarvisStore } from "./store";

let socket: Socket | null = null;
let streamingEnabled = false;

export function isStreamingEnabled(): boolean {
  return streamingEnabled;
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io("/", { withCredentials: true, autoConnect: true, transports: ["polling", "websocket"] });

  socket.on("connect", () => useJarvisStore.getState().setSocketConnected(true));
  socket.on("disconnect", () => useJarvisStore.getState().setSocketConnected(false));

  socket.on(SOCKET_EVENTS.CONNECTION_ACK, (payload: { streamingEnabled: boolean }) => {
    streamingEnabled = payload.streamingEnabled;
  });

  socket.on(SOCKET_EVENTS.DASHBOARD_UPDATE, (snapshot: DashboardSnapshot) => {
    useJarvisStore.getState().setDashboardSnapshot(snapshot);
  });

  socket.on(SOCKET_EVENTS.CHAT_CHUNK, (payload: ChatChunkEvent) => {
    useJarvisStore.getState().appendStreamingDelta(payload.conversationId, payload.delta);
  });

  socket.on(SOCKET_EVENTS.CHAT_COMPLETE, (payload: ChatCompleteEvent) => {
    const store = useJarvisStore.getState();
    store.clearStreamingBuffer(payload.conversationId);
    store.addMessage(payload.message);
    store.setAwaitingResponse(false);
    store.setSphereMode("speaking");
  });

  socket.on(SOCKET_EVENTS.CHAT_ERROR, (payload: ChatErrorEvent) => {
    const store = useJarvisStore.getState();
    store.clearStreamingBuffer(payload.conversationId);
    store.addMessage({
      id: `error-${Date.now()}`,
      conversationId: payload.conversationId,
      role: "assistant",
      content: payload.error,
      createdAt: new Date().toISOString(),
      error: payload.error,
    });
    store.setAwaitingResponse(false);
    store.setSphereMode("error");
  });

  return socket;
}
