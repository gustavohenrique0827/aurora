import type { ChatChunkEvent, ChatCompleteEvent, ChatErrorEvent, ChatSendPayload } from "./chat.types";
import type { DashboardSnapshot } from "./dashboard.types";

/** Server -> client events */
export interface ServerToClientEvents {
  "connection:ack": (payload: { streamingEnabled: boolean }) => void;
  "chat:chunk": (payload: ChatChunkEvent) => void;
  "chat:complete": (payload: ChatCompleteEvent) => void;
  "chat:error": (payload: ChatErrorEvent) => void;
  "dashboard:update": (payload: DashboardSnapshot) => void;
}

/** Client -> server events */
export interface ClientToServerEvents {
  "chat:send": (payload: ChatSendPayload) => void;
}

export const SOCKET_EVENTS = {
  CONNECTION_ACK: "connection:ack",
  CHAT_SEND: "chat:send",
  CHAT_CHUNK: "chat:chunk",
  CHAT_COMPLETE: "chat:complete",
  CHAT_ERROR: "chat:error",
  DASHBOARD_UPDATE: "dashboard:update",
} as const;
